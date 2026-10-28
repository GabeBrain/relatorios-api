import { describe, expect, it } from 'vitest';
import { read, utils, write } from 'xlsx';
import { mcmvBand } from './mcmv';
import { buildReport, createWorkbook, selectReportFields, type ReportOptions } from './report';
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
      expect(result.rows.every((row) => row['Faixa MCMV'] === 'Econômico - Faixa 3' && row['Padrão'] === 'Econômico')).toBe(true);
      const selected = selectReportFields(result, ['Padrão', 'Faixa MCMV']);
      const workbook = await createWorkbook(selected);
      const reopened = read(write(workbook, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
      const rows = utils.sheet_to_json(reopened.Sheets[reopened.SheetNames[0]], { header: 1 });
      expect(rows[0]).toEqual(['Padrão', 'Faixa MCMV']);
      expect(rows[1]).toEqual(['Econômico', 'Econômico - Faixa 3']);
    }
    expect(JSON.stringify(building)).toBe(original);
    const noStandard = { ...building, typologies_history: [{ typology_id: 1, type_of_typology: 'Garden', period: '2026-02-28', price: 200000, qty: 10 }] };
    expect(buildReport([noStandard], { ...options, layout }).rows[0]['Faixa MCMV']).toBe('');
  });
});
