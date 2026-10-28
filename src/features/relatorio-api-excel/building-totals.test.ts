import { expect, it } from 'vitest';
import { read, utils, write } from 'xlsx';
import { buildReport, BUILDING_TOTALS, createWorkbook, selectReportFields, type ReportOptions } from './report';
const history = [
  { typology_id: 1, type_of_typology: 'Padrão', period: '2026-01-31', price: 100, gross_sales: 10, distractions: 2, typology_stock: 90, qty: 100 },
  { typology_id: 1, type_of_typology: 'Padrão', period: '2026-02-28', price: 200, gross_sales: 20, distractions: 5, typology_stock: 75, qty: 100 },
  { typology_id: 2, type_of_typology: 'Garden', period: '2026-01-31', price: 300, gross_sales: 4, distractions: 1, typology_stock: 47, qty: 50 },
  { typology_id: 2, type_of_typology: 'Garden', period: '2026-02-28', price: 400, gross_sales: 6, distractions: 2, typology_stock: 43, qty: 50 },
];
const building = { building_id: 1, name: 'Teste', status: 'Ativo', building_type: 'Vertical', standard: 'Econômico', city: 'Sinop', state: 'MT', release_date: '2026-01-01', total_units: 150, typologies_history: history };
const options: ReportOptions = { level: 'building', layout: 'rows', granularity: 'month', priceMode: 'period', buildingAverageMode: 'quantity-standard', from: '2026-01-01', to: '2026-02-28', statuses: ['Ativo'], vgvScale: 'thousand' };

it.each(['period', 'current'] as const)('soma todas as tipologias por mês, conservando regras VGV %s e estoque sem somar meses', async (priceMode) => {
  for (const layout of ['rows', 'columns'] as const) {
    const report = buildReport([building], { ...options, layout, priceMode });
    const cell = (metric: string, month = 'jan/2026') => layout === 'rows' ? report.rows.find((r) => r['Período'] === month)![metric] : report.rows[0][`${metric} ${month}`];
    expect(report.rows).toHaveLength(layout === 'rows' ? 2 : 1);
    expect(cell('Vendas Brutas')).toBe(14); expect(cell('Distratos')).toBe(3); expect(cell('Vendas Líquidas')).toBe(11); expect(cell('Estoque')).toBe(137);
    expect(cell('VGV Vendas Brutas')).toBe(priceMode === 'period' ? 2200 : 3600);
    expect(cell('VGV Distratos')).toBe(priceMode === 'period' ? 500 : 800);
    expect(cell('VGV Vendas Líquidas')).toBe(priceMode === 'period' ? 1700 : 2800);
    expect(cell('VGV Estoque')).toBe(priceMode === 'period' ? 23100 : 36800);
    expect(cell('Estoque', 'fev/2026')).toBe(118);
    expect(report.rows[0]['Unidades Totais do Empreendimento']).toBe(150);
    const selected = selectReportFields(report, [...BUILDING_TOTALS]);
    const wb = await createWorkbook(selected);
    const reread = read(write(wb, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
    const rows = utils.sheet_to_json<Record<string, number>>(reread.Sheets[reread.SheetNames[0]]);
    expect(rows[0][layout === 'rows' ? 'VGV Vendas Brutas' : 'VGV Vendas Brutas jan/2026']).toBe(priceMode === 'period' ? 2.2 : 3.6);
  }
});
it.each(['period', 'current'] as const)('soma fluxos no trimestre e usa último estoque por tipologia, VGV %s', (priceMode) => {
  const row = buildReport([building], { ...options, granularity: 'quarter', priceMode }).rows[0];
  expect(row['Vendas Brutas']).toBe(40); expect(row.Distratos).toBe(10); expect(row['Vendas Líquidas']).toBe(30); expect(row.Estoque).toBe(118);
  expect(row['VGV Vendas Brutas']).toBe(priceMode === 'period' ? 8600 : 10000);
  expect(row['VGV Distratos']).toBe(priceMode === 'period' ? 2300 : 2600);
  expect(row['VGV Vendas Líquidas']).toBe(priceMode === 'period' ? 6300 : 7400);
  expect(row['VGV Estoque']).toBe(32200);
});
it('não publica totais parciais quando um fechamento tem campo ausente; preserva zero/negativo', () => {
  const missing = { ...building, typologies_history: history.map((r, i) => i === 2 ? { ...r, gross_sales: null } : r) };
  const row = buildReport([missing], options).rows[0];
  expect(row['Vendas Brutas']).toBeNull(); expect(row['VGV Vendas Brutas']).toBeNull(); expect(row['Vendas Líquidas']).toBeNull(); expect(row.Estoque).toBe(137);
  const negative = { ...building, typologies_history: history.map((r) => ({ ...r, gross_sales: 0, distractions: 1 })) };
  const result = buildReport([negative], options).rows[0];
  expect(result['Vendas Brutas']).toBe(0); expect(result['Vendas Líquidas']).toBe(-2);
});
it('mantém paridade entre layouts com tipologia que só tem fechamento em fevereiro', () => {
  const sparse = { ...building, typologies_history: history.filter((_, i) => i !== 2) };
  const rows = buildReport([sparse], options).rows;
  const wide = buildReport([sparse], { ...options, layout: 'columns' }).rows[0];
  for (const row of rows) for (const metric of BUILDING_TOTALS) expect(wide[`${metric} ${row['Período']}`]).toBe(row[metric]);
  expect(rows[0].Estoque).toBe(90);
});
it('não soma registros idênticos da mesma tipologia duas vezes e bloqueia duplicatas conflitantes', () => {
  expect(buildReport([building, building], options).rows[0].Estoque).toBe(137);
  const conflict = { ...building, typologies_history: history.map((r) => ({ ...r, gross_sales: 999 })) };
  expect(() => buildReport([building, conflict], options)).toThrow('Históricos divergentes');
  expect(buildReport([building], { ...options, level: 'typology' }).rows).toHaveLength(4);
});
