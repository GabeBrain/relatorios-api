import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CustomFiergsStudyCover, CustomFiergsTerritoryCover } from '../components/CustomFiergsCovers';
import { customCoverLayout, customTerritoryLayout, customTerritoryPages } from '../report/custom-cover-layout';
import { panoramaManifestFor } from '../report/manifest';
import { observedDormitoryPriceGroup } from '../report/dormitory-price-series';
import { buildGenerationNotices } from '../report/generation-notices';
import { freeScopeReport } from './free-scopes.fixture';

const scope = { entity: 'fiergs-rs' as const, uf: 'RS', cities: ['Canoas', 'Esteio', 'São Leopoldo'], startQuarter: '1T2023' as const, endQuarter: '2T2026' as const };

describe('composição de capas personalizadas', () => {
  it('prioriza nomes reais de conjuntos pequenos e separa janela/fechamento', () => {
    const { container } = render(<CustomFiergsStudyCover scope={scope}/>);
    expect(container.querySelector('h1')?.textContent).toBe('Panorama de mercado');
    expect([...container.querySelectorAll('li')].map((item) => item.textContent)).toEqual(scope.cities);
    expect(container.textContent).toContain('1T 2023 — 2T 2026');
    expect(container.textContent).not.toContain('CONJUNTO DE');
  });
  it('uma cidade tem destaque sem repetição na lista de capa', () => {
    const { container } = render(<CustomFiergsStudyCover scope={{ ...scope, cities: ['Canoas'] }}/>);
    expect(container.querySelector('h1')?.textContent).toBe('Canoas');
    expect(container.querySelectorAll('li')).toHaveLength(0);
    expect(container.textContent).not.toContain('município(s)');
  });
  it.each([1, 2, 3, 4, 5, 12, 13, 23])('preserva nomes e distribui continuações para %i municípios', (count) => {
    const cities = Array.from({ length: count }, (_, index) => `Cidade ${String(index + 1).padStart(2, '0')}`);
    const pages = customTerritoryPages({ cities });
    expect(pages.flat()).toEqual(cities);
    expect(pages.every((page) => page.length <= 12)).toBe(true);
    if (pages.length > 1) expect(Math.max(...pages.map((page) => page.length)) - Math.min(...pages.map((page) => page.length))).toBeLessThanOrEqual(1);
    for (const names of pages) {
      const { container, unmount } = render(<CustomFiergsTerritoryCover scope={{ ...scope, cities }} cities={names}/>);
      expect([...container.querySelectorAll('li strong')].map((item) => item.textContent)).toEqual(names);
      expect(container.textContent).not.toContain('município(s)');
      unmount();
    }
  });
  it('limita densidade para nomes longos sem truncar ou perder municípios', () => {
    const cities = Array.from({ length: 13 }, (_, index) => `São José do Vale das Palmeiras e da Serra ${index + 1}`);
    const layout = customCoverLayout({ ...scope, cities });
    expect(layout.showCoverNames).toBe(false);
    const pages = customTerritoryPages({ cities });
    expect(pages).toHaveLength(2);
    expect(pages.flat().sort()).toEqual([...cities].sort());
    expect(customTerritoryLayout(pages[0]).columns).toBe(2);
    expect(customTerritoryPages({ cities: [...cities].reverse() })).toEqual(pages);
  });
});

describe('preço por dormitório sem placeholder', () => {
  it('usa a própria série e conserva zero finito', () => {
    const block = { groupSeries: [{ label: '2 Dormitórios', series: [{ vertical: 0 }] }, { label: '4 ou mais Dormitórios', series: [{ vertical: null }, { vertical: NaN }] }] };
    expect(observedDormitoryPriceGroup(block, 2)).toBe(block.groupSeries[0]);
    expect(observedDormitoryPriceGroup(block, 4)).toBeUndefined();
    expect(observedDormitoryPriceGroup(block, 1)).toBeUndefined();
  });
  it.each(['2T2026', '4T2025'] as const)('omite somente a tipologia ausente em %s e leva aviso para auditoria', (endQuarter) => {
    const report = freeScopeReport({ ...scope, endQuarter });
    const seriesRow = (vertical: number) => ({ quarter: endQuarter, vertical, horizontal: 0, total: vertical,
      methodStatus: 'reconciled' as const, dataStatus: 'ready' as const, source: 'fixture de série observada' });
    report.prices.meterByTypology = { ...report.prices.meterByTypology, dataStatus: 'ready', groupSeries: [
      { label: '1 Dormitório', series: [seriesRow(7000)] },
      { label: '2 Dormitórios', series: [seriesRow(0)] },
      { label: '3 Dormitórios', series: [seriesRow(8000)] },
    ] };
    const manifest = panoramaManifestFor(report);
    expect(manifest.some((page) => page.fiergsOfficialSlide === 47)).toBe(false);
    for (const slide of [44, 45, 46]) expect(manifest.some((page) => page.fiergsOfficialSlide === slide)).toBe(true);
    const notices = buildGenerationNotices(report);
    expect(notices.find((notice) => notice.code === 'DORMITORY_PRICE_SERIES_PAGE_OMITTED')?.affectedOfficialSlides).toEqual([47]);
  });
});
