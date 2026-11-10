import { expect, it } from 'vitest';
import { read, write } from 'xlsx';
import { buildReport, createWorkbook, selectReportFields, type ReportOptions } from './report';
const building = { building_id: 1, status: 'Ativo', release_date: '2026-01-15', typologies_history: [
  { typology_id: 1, period: '2026-01-15', price: 100, qty: 10, typology_stock: 8 },
  { typology_id: 1, period: '2026-01-31', price: 150, qty: 10, typology_stock: 7 },
  { typology_id: 1, period: '2026-02-28', price: 200, qty: 20, typology_stock: 15 },
  { typology_id: 1, period: '2026-03-31', price: 999, qty: 99 },
  { typology_id: 2, period: '2026-01-15', price: 300, qty: 5, typology_stock: 5 },
  { typology_id: 2, period: '2026-01-31', price: 350, qty: 5, typology_stock: 4 },
  { typology_id: 2, period: '2026-02-28', price: 400, qty: 5, typology_stock: 3 },
] };
const options: ReportOptions = { statuses: ['Ativo'], from: '2026-01-01', to: '2026-02-28', layout: 'rows', granularity: 'month', priceMode: 'period', buildingAverageMode: 'simple', vgvScale: 'thousand' };

it.each(['launch', 'current'] as const)('VGL %s é independente de VGV nos dois níveis, visões e layouts', async (vglPriceMode) => {
  for (const level of ['building', 'typology'] as const) for (const granularity of ['month', 'quarter'] as const) for (const layout of ['rows', 'columns'] as const) {
    const result = buildReport([building], { ...options, level, layout, granularity, vglPriceMode });
    const label = granularity === 'month' ? 'jan/2026' : '1T/2026';
    const col = layout === 'rows' ? 'VGL' : `VGL ${label}`;
    const expected = granularity === 'month' ? level === 'building' ? vglPriceMode === 'launch' ? 2500 : 4000 : vglPriceMode === 'launch' ? 1000 : 2000
      : level === 'building' ? vglPriceMode === 'launch' ? 3500 : 6000 : vglPriceMode === 'launch' ? 2000 : 4000;
    expect(result.rows[0][col]).toBe(expected);
    const other = buildReport([building], { ...options, level, layout, granularity, vglPriceMode, priceMode: 'current' });
    expect(other.rows[0][col]).toBe(expected);
    const selected = selectReportFields(result, ['VGL']);
    expect(selected.columns.every((column) => column === 'VGL' || column.startsWith('VGL '))).toBe(true);
    expect(result.columns.some((column) => column.startsWith('VGV Lançado'))).toBe(false);
    const workbook = await createWorkbook(selected);
    const reopened = read(write(workbook, { type: 'array', bookType: 'xlsx' }), { type: 'array', cellNF: true });
    const cell = reopened.Sheets[reopened.SheetNames[0]].A2;
    expect(cell.v).toBe(expected / 1000); expect(cell.t).toBe('n'); expect(cell.z).toBe('0.00');
  }
});
it('lançamento exige data exata sem fallback; preço pode estar antes do início do filtro', () => {
  const result = buildReport([building], { ...options, from: '2026-02-01', vglPriceMode: 'launch' });
  expect(result.rows[0].VGL).toBe(2000);
  const absent = { ...building, release_date: '2026-01-16' };
  expect(buildReport([absent], { ...options, vglPriceMode: 'launch' }).rows[0].VGL).toBeNull();
  expect(buildReport([absent], { ...options, vglPriceMode: 'current' }).rows[0].VGL).toBe(2000);
  const partial = { ...building, typologies_history: building.typologies_history.filter((r) => !(r.typology_id === 2 && r.period === '2026-01-15')) };
  expect(buildReport([partial], { ...options, level: 'building', vglPriceMode: 'launch' }).rows[0].VGL).toBeNull();
});
it('trocar cálculo VGL não altera VGV Estoque ou a quantidade lançada; padrão usa preço atual', () => {
  const current = buildReport([building], options);
  const launch = buildReport([building], { ...options, vglPriceMode: 'launch' });
  expect(current.rows[0].VGL).toBe(2000);
  expect(launch.rows[0].VGL).toBe(1000);
  expect(launch.rows[0]['VGV Estoque']).toBe(current.rows[0]['VGV Estoque']);
  expect(launch.rows[0]['Unidades por Tipologia']).toBe(current.rows[0]['Unidades por Tipologia']);
});
