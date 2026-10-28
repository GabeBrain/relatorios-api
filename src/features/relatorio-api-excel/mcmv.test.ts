import { describe, expect, it } from 'vitest';
import { read, utils, write } from 'xlsx';
import { mcmvBand } from './mcmv';
import { buildReport, createWorkbook, selectReportFields, selectedReport, type ReportOptions } from './report';
import type { RawBuilding } from './api';

const building: RawBuilding = { building_id: 1, city: 'Sinop', state: 'MT', standard: 'Econômico', building_type: 'Vertical', status: 'Ativo',
  typologies_history: [
    { typology_id: 1, type_of_typology: 'Padrão', period: '2026-01-31', price: 100000, qty: 1 },
    { typology_id: 1, type_of_typology: 'Padrão', period: '2026-02-28', price: 200000, qty: 1 },
    { typology_id: 2, type_of_typology: 'Padrao', period: '2026-02-28', price: 300000, qty: 3 },
    { typology_id: 3, type_of_typology: 'Garden', period: '2026-02-28', price: 900000, qty: 100 },
    { typology_id: 1, type_of_typology: 'Padrão', period: '2026-03-31', price: 700000, qty: 1 },
  ] };
const options: ReportOptions = { from: '2026-01-01', to: '2026-02-28', statuses: ['Ativo'], granularity: 'month', layout: 'columns', buildingAverageMode: 'simple', priceMode: 'current' };

describe('Faixa MCMV — regras locais do Relatório API Excel', () => {
  it.each([[235000, 2], [235000.01, 3], [400000, 3], [400000.01, 4], [400000.99, 4], [600000, 4], [600000.01, null]])('classifica limite %s', (price, band) => {
    expect(mcmvBand(building, price)).toBe(band === null ? '' : `Econômico - Faixa ${band}`);
  });
  it('considera UF e cidade, normaliza acentos e não infere teto desconhecido', () => {
    expect(mcmvBand({ ...building, city: ' ACRELÂNDIA ', state: ' ac ', standard: 'Standard' }, 210000)).toBe('Standard - Faixa 2');
    expect(mcmvBand({ ...building, city: 'Sinop', state: 'AC' }, 200000)).toBe('');
    expect(mcmvBand({ ...building, city: 'Inexistente' }, 300000)).toBe('');
  });
  it('não classifica outros produtos/padrões nem preços inválidos', () => {
    for (const building_type of ['Horizontal', 'Comercial', 'Hotel']) expect(mcmvBand({ ...building, building_type }, 200000)).toBe('');
    expect(mcmvBand({ ...building, standard: 'Alto' }, 200000)).toBe('');
    for (const price of [null, NaN, 0, -1]) expect(mcmvBand(building, price)).toBe('');
  });
  it.each(['columns', 'rows'] as const)('exporta %s com média exclusiva, sem Garden, mantendo padrão e dados brutos', async (layout) => {
    const original = JSON.stringify(building);
    for (const granularity of ['month', 'quarter'] as const) {
      const result = buildReport([building], { ...options, layout, granularity });
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => row['Padrão'] === 'Econômico')).toBe(true);
      const selected = selectedReport(result, ['Padrão', 'Faixa MCMV']);
      const workbook = await createWorkbook(selected);
      const reopened = read(write(workbook, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
      const rows = utils.sheet_to_json(reopened.Sheets[reopened.SheetNames[0]], { header: 1 });
      expect(rows[0]).toEqual(['Padrão', 'Faixa MCMV']);
      expect(rows[1]).toEqual(['Econômico', layout === 'rows' && granularity === 'month' ? 'Econômico - Faixa 2' : 'Econômico - Faixa 3']);
    }
    expect(JSON.stringify(building)).toBe(original);
    const noStandard = { ...building, typologies_history: [{ typology_id: 1, type_of_typology: 'Garden', period: '2026-02-28', price: 200000, qty: 10 }] };
    expect(buildReport([noStandard], { ...options, layout }).rows[0]['Faixa MCMV']).toBe('');
  });
  it('classifica cada mês sem copiar a faixa final e expande a seleção histórica ao lado de Padrão', () => {
    const wide = buildReport([building], options);
    expect(wide.rows[0]['Faixa MCMV']).toBe('Econômico - Faixa 3');
    expect(wide.rows[0]['Faixa MCMV jan/2026']).toBe('Econômico - Faixa 2');
    expect(wide.rows[0]['Faixa MCMV fev/2026']).toBe('Econômico - Faixa 3');
    expect(selectReportFields(wide, ['Padrão', 'Faixa MCMV']).columns).toEqual(['Padrão', 'Faixa MCMV', 'Faixa MCMV jan/2026', 'Faixa MCMV fev/2026']);
    const tabular = buildReport([building], { ...options, layout: 'rows' });
    expect(tabular.rows.map((row) => [row['ID Tipologia'], row['Período'], row['Faixa MCMV']])).toEqual([
      ['1', 'jan/2026', 'Econômico - Faixa 2'], ['1', 'fev/2026', 'Econômico - Faixa 3'],
      ['2', 'fev/2026', 'Econômico - Faixa 3'], ['3', 'fev/2026', 'Econômico - Faixa 3'],
    ]);
  });
  it.each(['columns', 'rows'] as const)('exporta o preço exato usado na faixa MCMV no layout %s, sem escala VGV', async (layout) => {
    const field = 'Preço Médio para Faixa MCMV';
    const result = buildReport([building], { ...options, layout, buildingAverageMode: 'simple', vgvScale: 'million' });
    expect(result.rows[0][field]).toBe(layout === 'rows' ? 100000 : 275000);
    if (layout === 'columns') {
      expect(result.rows[0][`${field} jan/2026`]).toBe(100000);
      expect(result.rows[0][`${field} fev/2026`]).toBe(275000);
    } else {
      expect(result.rows.find((row) => row['Período'] === 'fev/2026')![field]).toBe(275000);
    }
    const selected = selectReportFields(result, [field]);
    const workbook = await createWorkbook(selected);
    const reopened = read(write(workbook, { bookType: 'xlsx', type: 'array' }), { type: 'array', cellNF: true });
    const sheet = reopened.Sheets[reopened.SheetNames[0]];
    expect(sheet.A2.v).toBe(layout === 'rows' ? 100000 : 275000);
    expect(sheet.A2.t).toBe('n');
    expect(sheet.A2.z).toBe('0.00');
    expect(selected.columns).toEqual(layout === 'rows' ? [field] : [field, `${field} jan/2026`, `${field} fev/2026`]);
    const absent = { ...building, typologies_history: [{ typology_id: 1, type_of_typology: 'Garden', period: '2026-02-28', price: 200000, qty: 10 }] };
    expect(buildReport([absent], { ...options, layout }).rows[0][field]).toBeNull();
  });
  it.each(['month', 'quarter'] as const)('exclui históricos anteriores ao mês de lançamento e linhas sem fechamento em %s', (granularity) => {
    const data = { ...building, release_date: '2026-02-15' };
    const result = buildReport([data], { ...options, granularity, layout: 'rows' });
    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((row) => row['Faixa MCMV'] === 'Econômico - Faixa 3')).toBe(true);
    expect(result.rows.every((row) => row['Preço Atual'] !== null)).toBe(true);
    expect(result.periods.map((p) => p.label)).toEqual([granularity === 'month' ? 'fev/2026' : '1T/2026']);
  });
});
