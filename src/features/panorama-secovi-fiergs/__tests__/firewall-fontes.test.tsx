import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { buildPanoramaReportModel } from '../report/model';
import { buildCityCube } from '../domain/cube';
import { MarketSummarySlide, NarrativeSlide } from '../components/MarketSlides';
import { PanoramaExportDeck } from '../components/ReportPaginator';
import type { PanoramaReportModel, PanoramaScope } from '../types';

/**
 * Firewall de fontes — o furo que a entrega anterior não pegou.
 *
 * Os contratos `temporal-analysis-city/*` são municipais: agregam todo o horizontal e devolvem
 * rótulos de produto (`Loteamento Fechado`) como se fossem padrão socioeconômico. O Jundiaí
 * pós-correções expôs o resultado: `0 empreendimentos` ao lado de `6.055` unidades lançadas, vendas
 * de "Condomínio de Casas" onde não há nenhum aceito, e a narrativa afirmando que "o padrão com
 * maior oferta final é Loteamento Fechado" — justamente a palavra que a analista mandou excluir.
 *
 * Os fixtures anteriores usavam contratos temporais vazios ou já limpos, e por isso o caminho que
 * falhava nunca era exercitado. Aqui ele é: o contrato **contém** loteamento, de propósito.
 */

const scope: PanoramaScope = { uf: 'SP', cities: ['Jundiaí'], endQuarter: '2T2026', engineVersion: 'v3' };
const src = (rows: Record<string, unknown>[]) => ({ rows, available: true, source: 'fixture' });

/** O contrato municipal devolve o loteamento como um grupo de `Padrão`, com oferta e vendas. */
const stockRows = [
  { period: '2026-06-01', building_type: 'Vertical', group: 'Standard', stock: 1414, vgv_stock: 891_800_000 },
  { period: '2026-06-01', building_type: 'Horizontal', group: 'Loteamento Fechado', stock: 6230, vgv_stock: 500_000_000 },
];
const salesRows = [
  { period: '2026-06-01', building_type: 'Vertical', group: 'Standard', liquid_sales: 374, vgv_liquid_sales: 200_000_000 },
  { period: '2026-06-01', building_type: 'Horizontal', group: 'Loteamento Fechado', liquid_sales: 82, vgv_liquid_sales: 58_500_000 },
];

const vertical = {
  building_id: 'V1', name: 'Residencial Alfa', building_type: 'Vertical', standard: 'Standard',
  release_date: '2025-02-10', total_units: 100, latitude: -23.18, longitude: -46.88,
  typologies_history: [
    { period: '2025-02-01', number_bedroom: '2', qty: 100, release_price: 400_000, private_area: 62 },
    { period: '2026-06-01', number_bedroom: '2', typology_stock: 30, liquid_sales: 70, price: 420_000, private_area: 62 },
  ],
};
const loteamento = {
  building_id: 'H1', name: 'Terras da Alvorada', building_type: 'Horizontal', standard: 'Loteamento Fechado',
  release_date: '2025-02-10', total_units: 80,
  typologies_history: [{ period: '2025-02-01', number_bedroom: '3', qty: 80, release_price: 260_000, private_area: 250 }],
};
const condominio = {
  building_id: 'H2', name: 'Condomínio Évora', building_type: 'Horizontal', standard: 'Condomínio de Casas/Sobrados',
  release_date: '2025-03-10', total_units: 48,
  typologies_history: [
    { period: '2025-03-01', number_bedroom: '3', qty: 48, release_price: 520_000, private_area: 92 },
    { period: '2026-06-01', number_bedroom: '3', typology_stock: 14, liquid_sales: 6, price: 545_000, private_area: 92 },
  ],
};

function modelOf(buildings: Record<string, unknown>[]): PanoramaReportModel {
  const cube = buildCityCube(buildings, { city: 'Jundiaí', uf: 'SP', endQuarter: '2T2026', engineVersion: 'v3' });
  return buildPanoramaReportModel(scope, [], {
    sales: src(salesRows), salesTypology: src([]), stock: src(stockRows), stockTypology: src([]),
    ivv: src([]), ivvTypology: src([]), ticket: src([]), ticketTypology: src([]), meter: src([]), meterTypology: src([]),
  }, [], { cubes: [cube], provenance: { engineVersion: 'v3', completedCities: ['Jundiaí'] } });
}

const flat = (element: HTMLElement) => (element.textContent ?? '').replace(/\s+/g, ' ');

describe('Firewall de fontes · o rótulo de produto não atravessa o contrato municipal', () => {
  it('remove o grupo de loteamento das agregações por padrão', () => {
    const report = modelOf([vertical, loteamento]);
    for (const block of [report.stock.units, report.sales.units, report.stock.vgv, report.sales.vgv]) {
      expect(block.byGroup.map((row) => row.label)).not.toContain('Loteamento Fechado');
      expect(block.groupSeries.map((group) => group.label)).not.toContain('Loteamento Fechado');
    }
  });

  it('lê o contrato municipal como Vertical: o horizontal não herda o agregado', () => {
    const closing = modelOf([vertical, loteamento]).stock.units.series.at(-1)!;
    expect(closing.horizontal).toBe(0);
    expect(closing.total).toBe(closing.vertical);
  });

  it('universo vazio: a série horizontal é zero verdadeiro, e isso é declarado', () => {
    const report = modelOf([vertical, loteamento]);
    expect(report.cube.projects.filter((project) => project.segment === 'Horizontal')).toHaveLength(0);
    expect(report.horizontalSeries.attributable).toBe(true);
    expect(report.horizontalSeries.acceptedProjects).toBe(0);
  });

  it('com condomínio aceito, a série municipal deixa de ser atribuível', () => {
    const report = modelOf([vertical, loteamento, condominio]);
    expect(report.horizontalSeries.attributable).toBe(false);
    expect(report.horizontalSeries.acceptedProjects).toBe(1);
  });
});

describe('Firewall de fontes · páginas', () => {
  it('o resumo geral nasce do cubo e não imprime empreendimento zero com unidades', () => {
    const { container } = render(<MarketSummarySlide report={modelOf([vertical, loteamento])} />);
    const text = flat(container);
    // A contradição do PDF: 0 empreendimentos ao lado de 6.230 unidades do contrato municipal.
    expect(text).not.toContain('6.230');
    expect(text).toContain('Condomínio de Casas');
    const cells = [...container.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent));
    // Universo horizontal vazio: zeros verdadeiros, não números de loteamento.
    expect(cells[1]?.slice(1, 4)).toEqual(['0', '0', '0']);
    // Sem horizontal aceito, vertical e total geral coincidem.
    expect(cells[0]?.[1]).toBe(cells[2]?.[1]);
  });

  it('a narrativa nunca nomeia um produto fora da política', () => {
    for (const continuation of [false, true]) {
      const { container, unmount } = render(<NarrativeSlide report={modelOf([vertical, loteamento])} continuation={continuation} />);
      expect(flat(container).toLowerCase()).not.toContain('loteamento');
      unmount();
    }
  });

  it('nenhuma lâmina do deck publica o rótulo de loteamento', () => {
    const { container } = render(<PanoramaExportDeck report={modelOf([vertical, loteamento])} rootRef={{ current: null }} />);
    expect(flat(container).toLowerCase()).not.toContain('loteamento');
  });

  it('com condomínio aceito, a venda horizontal municipal não é publicada', () => {
    const { container } = render(<PanoramaExportDeck report={modelOf([vertical, loteamento, condominio])} rootRef={{ current: null }} />);
    const text = flat(container);
    expect(text.toLowerCase()).not.toContain('loteamento');
    // O motivo da indisponibilidade é declarado ao leitor, em vez de sumir em silêncio.
    expect(text).toContain('não permite separá-los');
  });
});

describe('Firewall de fontes · reconciliação entre páginas', () => {
  it('empreendimentos e oferta batem entre a oferta por padrão e o VGV geral', () => {
    const report = modelOf([vertical, loteamento]);
    const vgvTotal = report.granular.vgv.find((row) => row.kind === 'total')!;
    const offerTotal = report.granular.offerByStandard.find((row) => row.kind === 'total')!;
    expect(vgvTotal.projects).toBe(new Set(report.cube.projects.map((project) => project.key)).size);
    expect(offerTotal.launchedUnits).toBe(vgvTotal.launchedUnits);
    expect(offerTotal.finalUnits).toBe(vgvTotal.finalUnits);
  });

  it('o resumo geral publica os mesmos números da oferta por padrão', () => {
    const report = modelOf([vertical, loteamento]);
    const { container } = render(<MarketSummarySlide report={report} />);
    const total = [...container.querySelectorAll('tbody tr')].at(-1)!;
    const cells = [...total.querySelectorAll('td')].map((cell) => cell.textContent);
    const offerTotal = report.granular.offerByStandard.find((row) => row.kind === 'total')!;
    expect(cells[2]).toBe(offerTotal.launchedUnits?.toLocaleString('pt-BR'));
    expect(cells[3]).toBe(offerTotal.finalUnits?.toLocaleString('pt-BR'));
  });
});
