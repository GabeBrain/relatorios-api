import { describe, expect, it } from 'vitest';
import { read, utils, write } from 'xlsx';
import { buildReport, createWorkbook, dateBounds, isoDate, selectedReport, type ReportOptions } from './report';
import type { RawBuilding } from './api';

const building: RawBuilding = {
  building_id: 10, city: 'Cidade fora do catálogo AELO', state: 'MT', name: 'Teste', status: 'Ativo',
  standard: 'Alto', building_type: 'Vertical', release_date: '2026-01-01', down_payment_percentage: 8.5,
  typologies_history: [
    { typology_id: 20, period: '2026-01-10', qty: 100, price: 100_000, sold_in_period: 2, typology_stock: 98 },
    { typology_id: 20, period: '2026-01-31', qty: 100, price: 110_000, sold_in_period: 3, typology_stock: 95 },
    { typology_id: 20, period: '2026-02-28', qty: 120, price: 120_000, sold_in_period: 4, typology_stock: 91 },
    { typology_id: 20, period: '2026-03-31', qty: 120, price: 150_000, sold_in_period: 0, typology_stock: 91 },
    { typology_id: 20, period: '2026-04-30', qty: 125, price: 200_000, sold_in_period: 1, typology_stock: 90 },
  ],
};
const options: ReportOptions = { from: '2026-01-01', to: '2026-03-31', granularity: 'month',
  priceMode: 'current', layout: 'columns', statuses: ['Ativo', 'Esgotado'] };
const report = (changes: Partial<ReportOptions> = {}, data = [building]) => buildReport(data, { ...options, ...changes });

describe('Relatório API Excel — regras posteriores à coleta', () => {
  it('preserva cidades/padrões de fora do AELO, registros repetidos e valores mensais', () => {
    const result = report({}, [building, building]);
    expect(result.typologyCount).toBe(2);
    expect(result.periods.map((period) => period.label)).toEqual(['jan/2026', 'fev/2026', 'mar/2026']);
    expect(result.rows[0]['Vendas líquidas jan/2026']).toBe(5);
    expect(result.rows[0]['Estoque jan/2026']).toBe(95);
    expect(result.rows[0]['VGV Lançado jan/2026']).toBe(15_000_000);
    expect(result.rows[0]['VGV jan/2026']).toBe(750_000);
  });
  it('usa preço atual até o fim selecionado, sem vazar o fechamento de abril', () => {
    expect(report().rows[0]['Preço atual']).toBe(150_000);
    expect(report({ to: '2026-02-28' }).rows[0]['VGV jan/2026']).toBe(600_000);
  });
  it('gera VGV lançado histórico com quantidade e preço próprios do mês', () => {
    const row = report({ priceMode: 'period' }).rows[0];
    expect(row['VGV Lançado jan/2026']).toBe(11_000_000);
    expect(row['VGV Lançado fev/2026']).toBe(14_400_000);
    expect(row['VGV Estoque jan/2026']).toBe(10_450_000);
    expect(row['VGV jan/2026']).toBe(530_000);
  });
  it('trimestre soma vendas, conserva a última posição e não soma VGV lançado mensal', () => {
    const row = report({ priceMode: 'period', granularity: 'quarter' }).rows[0];
    expect(row['Vendas líquidas 1T/2026']).toBe(9);
    expect(row['Estoque 1T/2026']).toBe(91);
    expect(row['VGV Lançado 1T/2026']).toBe(18_000_000);
    expect(row['VGV Estoque 1T/2026']).toBe(13_650_000);
    expect(row['VGV 1T/2026']).toBe(1_010_000);
  });
  it('datas são inclusivas e períodos parciais incluem somente fechamentos dentro do intervalo', () => {
    const result = report({ from: '2026-01-31', to: '2026-02-28', granularity: 'quarter', priceMode: 'period' });
    expect(result.rows[0]['Vendas líquidas 1T/2026']).toBe(7);
    expect(result.rows[0]['VGV 1T/2026']).toBe(810_000);
    expect(report({ from: '2026-05-01', to: '2026-05-31' }).rows).toEqual([]);
    expect(report({ from: '2026-04-01' }).rows).toEqual([]);
  });
  it('layouts em linhas e colunas têm a mesma série e permitem seleção exata', () => {
    const wide = report({ priceMode: 'period' });
    const tabular = report({ priceMode: 'period', layout: 'rows' });
    expect(tabular.rows).toHaveLength(3);
    for (const row of tabular.rows) {
      expect(row['VGV Lançado']).toBe(wide.rows[0][`VGV Lançado ${row['Período']}`]);
    }
    const selected = selectedReport(tabular, ['ID Empreendimento', 'Período', 'VGV Lançado']);
    expect(selected.columns).toEqual(['ID Empreendimento', 'Período', 'VGV Lançado']);
    expect(Object.keys(selected.rows[0])).toEqual(selected.columns);
    expect(selectedReport(wide, []).columns).toEqual([]);
  });
  it('não converte dados ausentes em zeros de preço, estoque ou venda', () => {
    const data = [{ ...building, typologies_history: [
      { typology_id: 20, period: '2026-01-31', qty: 100, price: null, sold_in_period: null, typology_stock: null },
    ] }];
    const row = report({ priceMode: 'period' }, data).rows[0];
    expect(row['VGV jan/2026']).toBeNull();
    expect(row['VGV Estoque jan/2026']).toBeNull();
    expect(row['VGV Lançado jan/2026']).toBeNull();
    expect(row['Vendas líquidas jan/2026']).toBeNull();
    expect(row['Estoque jan/2026']).toBeNull();
  });
  it('zera períodos anteriores ao lançamento e deixa períodos sem fechamento vazios', () => {
    const data = [building, { ...building, building_id: 11, release_date: '2026-02-01', typologies_history: [
      { typology_id: 30, period: '2026-02-28', qty: 50, price: 100, sold_in_period: 2, typology_stock: 48 },
    ] }];
    const row = report({}, data).rows.find((item) => item['ID Empreendimento'] === '11')!;
    expect(row['VGV Lançado jan/2026']).toBe(0);
    expect(row['VGV jan/2026']).toBe(0);
    expect(row['Estoque mar/2026']).toBeNull();
  });
  it('aplica status localmente e identifica os limites do histórico bruto', () => {
    expect(report({ statuses: ['Esgotado'] }).rows).toEqual([]);
    expect(dateBounds([building])).toEqual({ from: '2026-01-10', to: '2026-04-30' });
    expect(isoDate('31/01/2026')).toBe('2026-01-31');
    expect(isoDate('02/2026')).toBe('2026-02-01');
    expect(isoDate('2026-02-30')).toBeNull();
  });
  it.each(['columns', 'rows'] as const)('grava e reabre Excel %s com somente colunas escolhidas, números e formatos', async (layout) => {
    const name = layout === 'rows' ? 'VGV Lançado' : 'VGV Lançado jan/2026';
    const selected = selectedReport(report({ layout, priceMode: 'period' }), ['Entrada', name]);
    const workbook = await createWorkbook(selected);
    const reopened = read(write(workbook, { bookType: 'xlsx', type: 'array' }), { type: 'array', cellNF: true });
    const sheet = reopened.Sheets[reopened.SheetNames[0]];
    expect(utils.sheet_to_json(sheet, { header: 1 })[0]).toEqual(['Entrada', name]);
    expect(sheet.A2.v).toBe(0.085);
    expect(sheet.A2.z).toBe('0.00%');
    expect(sheet.B2.v).toBe(11);
    expect(sheet.B2.z).toBe('0.00');
  });
  it('bloqueia exportação sem dados ou sem colunas', async () => {
    await expect(createWorkbook(selectedReport(report(), []))).rejects.toThrow('Selecione colunas');
    await expect(createWorkbook(report({ statuses: [] }))).rejects.toThrow('Selecione colunas');
  });
});
