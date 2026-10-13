import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanoramaExportDeck } from '../components/ReportPaginator';
import { MethodologyReference } from '../components/ReportReferencePanels';
import { panoramaManifestFor } from '../report/manifest';
import { FIERGS_RM_PORTO_ALEGRE_PRESET } from '../presets';
import { freeScopeReport } from './free-scopes.fixture';

describe('FIERGS — apresentação do recorte real', () => {
  const scope = { entity: 'fiergs-rs' as const, uf: 'RS', cities: ['Canoas'], startQuarter: '1T2023' as const, endQuarter: '2T2026' as const, engineVersion: 'v4' as const };
  it.each([{ ...scope }, { ...scope, cities: ['Canoas', 'Esteio'] }, { ...scope, uf: 'PR', cities: ['Curitiba'] }])('capa/metodologia sem marca territorial regional em $cities', (scope) => {
    const report = freeScopeReport(scope);
    const { container, unmount } = render(<PanoramaExportDeck report={report} rootRef={{ current: null }}/>);
    expect(container.querySelector('.panorama-fiergs-territorial')).toBeNull();
    expect(container.textContent).not.toContain('RM de Porto Alegre');
    expect(container.textContent).not.toContain('RM PORTO ALEGRE');
    expect(container.textContent).not.toContain('quatro produtos horizontais');
    const list = container.querySelector('.panorama-custom-territory');
    for (const city of scope.cities) expect(list?.textContent).toContain(city);
    expect(list?.textContent).toContain(scope.uf);
    const manifest = panoramaManifestFor(report);
    expect(container.querySelectorAll('.panorama-report-page')).toHaveLength(manifest.length);
    expect(manifest.some((page) => page.fiergsOfficialSlide === 31)).toBe(scope.cities.length > 1);
    expect(manifest.some((page) => page.sectionId === 'horizontal')).toBe(false);
    unmount();
    const method = render(<MethodologyReference entity="fiergs-rs" scope={scope}/>);
    expect(method.container.textContent).toContain(scope.cities.join(', '));
    expect(method.container.textContent).not.toContain('Porto Alegre não integra');
    method.unmount();
  });
  it.each(['2T2026', '4T2025'] as const)('preserva capa e mapa oficiais em %s', (endQuarter) => {
    const report = freeScopeReport({ ...scope, ...FIERGS_RM_PORTO_ALEGRE_PRESET.scope, endQuarter }, { horizontal: true });
    const manifest = panoramaManifestFor(report);
    expect(manifest.find((page) => page.fiergsOfficialSlide === 2)?.title).toContain(endQuarter);
    expect(manifest.find((page) => page.fiergsOfficialSlide === 7)?.title).toBe('Região Metropolitana de Porto Alegre');
    const { container, unmount } = render(<PanoramaExportDeck report={report} rootRef={{ current: null }}/>);
    expect(container.querySelector('.panorama-fiergs-territorial img')).not.toBeNull();
    expect(container.querySelector('.panorama-fiergs-about main section strong')?.textContent).toBe('10');
    expect(container.querySelectorAll('.panorama-report-page')).toHaveLength(manifest.length);
    unmount();
  });
  it('divide listas e comparativos sem descartar cidades de um conjunto grande', () => {
    const cities = Array.from({ length: 23 }, (_, index) => `Cidade ${index + 1}`);
    const report = freeScopeReport({ ...scope, cities, endQuarter: '4T2025' });
    const manifest = panoramaManifestFor(report);
    for (const [slide, count] of [[7, 2], [19, 3], [31, 3]]) {
      const pages = manifest.filter((page) => page.fiergsOfficialSlide === slide);
      expect(pages).toHaveLength(count);
      expect(pages.flatMap((page) => page.scopeCities ?? []).sort()).toEqual([...cities].sort());
    }
    expect(report.notices.some((notice) => notice.code === 'CITY_PAGES_PAGINATED')).toBe(true);
  });
  it('não remove zero nem negativos e registra omissões de segmento e comparação', () => {
    const report = freeScopeReport(scope, { sold: -2, final: 0 });
    expect(report.notices.find((notice) => notice.code === 'SCOPE_EDITORIAL_PAGES_OMITTED')?.affectedOfficialSlides).toEqual(expect.arrayContaining([31, 62, 63, 64, 65, 66]));
    expect(report.notices.some((notice) => notice.code === 'NEGATIVE_NET_SALES_OBSERVED')).toBe(true);
    expect(panoramaManifestFor(report).some((page) => page.fiergsOfficialSlide === 37)).toBe(true);
  });
});
