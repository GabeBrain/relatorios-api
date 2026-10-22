import { describe, expect, it } from 'vitest';
import { read, utils, write } from 'xlsx';
import { buildReport, createWorkbook, dateBounds, FIXED_COLUMNS, isoDate, MEASURES, selectedReport, type ReportOptions } from './report';
import type { RawBuilding } from './api';

const building: RawBuilding = {
  building_id: 10, city: 'Cidade fora do catálogo AELO', state: 'MT', name: 'Teste', status: 'Ativo',
  standard: 'Alto', building_type: 'Vertical', release_date: '2026-01-01', down_payment_percentage: 8.5,
  typologies_history: [
    { typology_id: 20, period: '2026-01-10', qty: 100, price: 100_000, gross_sales: 2, distractions: 0, sold_in_period: 999, typology_stock: 98 },
    { typology_id: 20, period: '2026-01-31', qty: 100, price: 110_000, gross_sales: 3, distractions: 0, sold_in_period: 999, typology_stock: 95 },
    { typology_id: 20, period: '2026-02-28', qty: 120, price: 120_000, gross_sales: 4, distractions: 0, sold_in_period: 999, typology_stock: 91 },
    { typology_id: 20, period: '2026-03-31', qty: 120, price: 150_000, gross_sales: 0, distractions: 0, sold_in_period: 999, typology_stock: 91 },
    { typology_id: 20, period: '2026-04-30', qty: 125, price: 200_000, gross_sales: 1, distractions: 0, sold_in_period: 999, typology_stock: 90 },
  ],
};
const options: ReportOptions = { from: '2026-01-01', to: '2026-03-31', granularity: 'month',
  priceMode: 'current', buildingAverageMode: 'simple', layout: 'columns', statuses: ['Ativo', 'Esgotado'] };
const report = (changes: Partial<ReportOptions> = {}, data = [building]) => buildReport(data, { ...options, ...changes });

describe('Relatório API Excel — regras posteriores à coleta', () => {
  it('preserva cidades/padrões de fora do AELO, registros repetidos e valores mensais', () => {
    const result = report({}, [building, building]);
    expect(result.typologyCount).toBe(2);
    expect(result.periods.map((period) => period.label)).toEqual(['jan/2026', 'fev/2026', 'mar/2026']);
    expect(result.rows[0]['Vendas Líquidas jan/2026']).toBe(5);
    expect(result.rows[0]['Estoque jan/2026']).toBe(95);
    expect(result.rows[0]['VGV Lançado jan/2026']).toBe(15_000_000);
    expect(result.rows[0]['VGV Vendas Brutas jan/2026']).toBe(750_000);
  });
  it('usa preço atual até o fim selecionado, sem vazar o fechamento de abril', () => {
    expect(report().rows[0]['Preço Atual mar/2026']).toBe(150_000);
    expect(report({ to: '2026-02-28' }).rows[0]['VGV Vendas Brutas jan/2026']).toBe(600_000);
  });
  it('gera VGV lançado histórico com quantidade e preço próprios do mês', () => {
    const row = report({ priceMode: 'period' }).rows[0];
    expect(row['VGV Lançado jan/2026']).toBe(11_000_000);
    expect(row['VGV Lançado fev/2026']).toBe(14_400_000);
    expect(row['VGV Estoque jan/2026']).toBe(10_450_000);
    expect(row['VGV Vendas Brutas jan/2026']).toBe(530_000);
  });
  it('trimestre soma vendas, conserva a última posição e não soma VGV lançado mensal', () => {
    const row = report({ priceMode: 'period', granularity: 'quarter' }).rows[0];
    expect(row['Vendas Líquidas 1T/2026']).toBe(9);
    expect(row['Estoque 1T/2026']).toBe(91);
    expect(row['VGV Lançado 1T/2026']).toBe(18_000_000);
    expect(row['VGV Estoque 1T/2026']).toBe(13_650_000);
    expect(row['VGV Vendas Brutas 1T/2026']).toBe(1_010_000);
  });
  it('datas são inclusivas e períodos parciais incluem somente fechamentos dentro do intervalo', () => {
    const result = report({ from: '2026-01-31', to: '2026-02-28', granularity: 'quarter', priceMode: 'period' });
    expect(result.rows[0]['Vendas Líquidas 1T/2026']).toBe(7);
    expect(result.rows[0]['VGV Vendas Brutas 1T/2026']).toBe(810_000);
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
      { typology_id: 20, period: '2026-01-31', qty: 100, price: null, gross_sales: null, distractions: null, sold_in_period: 999, typology_stock: null },
    ] }];
    const row = report({ priceMode: 'period' }, data).rows[0];
    expect(row['VGV Vendas Brutas jan/2026']).toBeNull();
    expect(row['VGV Estoque jan/2026']).toBeNull();
    expect(row['VGV Lançado jan/2026']).toBeNull();
    expect(row['Vendas Líquidas jan/2026']).toBeNull();
    expect(row['Estoque jan/2026']).toBeNull();
  });
  it('zera períodos anteriores ao lançamento e deixa períodos sem fechamento vazios', () => {
    const data = [building, { ...building, building_id: 11, release_date: '2026-02-01', typologies_history: [
      { typology_id: 30, period: '2026-02-28', qty: 50, price: 100, gross_sales: 2, distractions: 0, sold_in_period: 999, typology_stock: 48 },
    ] }];
    const row = report({}, data).rows.find((item) => item['ID Empreendimento'] === '11')!;
    expect(row['VGV Lançado jan/2026']).toBe(0);
    expect(row['VGV Vendas Brutas jan/2026']).toBe(0);
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

  it.each(['current', 'period'] as const)('usa vendas/distratos reais e preserva saldo negativo no modo %s', (priceMode) => {
    const data = [{ ...building, typologies_history: (building.typologies_history as RawBuilding[]).map((entry, index) => ({
      ...entry, distractions: index === 0 ? 1 : index === 1 ? 6 : 0,
    })) }];
    const row = report({ priceMode }, data).rows[0];
    expect(row['Vendas Brutas jan/2026']).toBe(5);
    expect(row['Distratos jan/2026']).toBe(7);
    expect(row['Vendas Líquidas jan/2026']).toBe(-2);
    expect(row['VGV Vendas Brutas jan/2026']).toBe(priceMode === 'current' ? 750_000 : 530_000);
    expect(row['VGV Distratos jan/2026']).toBe(priceMode === 'current' ? 1_050_000 : 760_000);
    expect(row['VGV Vendas Líquidas jan/2026']).toBe(priceMode === 'current' ? -300_000 : -230_000);
    const quarter = report({ priceMode, granularity: 'quarter' }, data).rows[0];
    expect(quarter['Vendas Brutas 1T/2026']).toBe(9);
    expect(quarter['Distratos 1T/2026']).toBe(7);
    expect(quarter['Vendas Líquidas 1T/2026']).toBe(2);
    expect(quarter['VGV Vendas Líquidas 1T/2026']).toBe(priceMode === 'current' ? 300_000 : 250_000);
  });

  it('não usa sold_in_period como fallback nem entrega totais parciais de vendas/distratos', () => {
    const data = [{ ...building, typologies_history: [
      { typology_id: 20, period: '2026-01-10', price: 100, gross_sales: 2, distractions: 1, sold_in_period: 900 },
      { typology_id: 20, period: '2026-01-31', price: 200, gross_sales: null, distractions: null, sold_in_period: 800 },
    ] }];
    const row = report({}, data).rows[0];
    for (const metric of ['Vendas Brutas', 'Distratos', 'Vendas Líquidas', 'VGV Vendas Brutas', 'VGV Distratos', 'VGV Vendas Líquidas']) {
      expect(row[`${metric} jan/2026`]).toBeNull();
    }
  });

  it.each(['month', 'quarter'] as const)('preserva exatamente a ordem das 12 métricas na visão %s e nos dois layouts', (granularity) => {
    const expected = ['Vendas Brutas', 'Distratos', 'Vendas Líquidas', 'Estoque', 'Preço Atual',
      'Preço Médio Empreendimento', 'Preço m²', 'VGV Lançado', 'VGV Vendas Brutas', 'VGV Distratos', 'VGV Vendas Líquidas', 'VGV Estoque'];
    expect([...MEASURES]).toEqual(expected);
    const wide = report({ granularity });
    expect(wide.columns.slice(FIXED_COLUMNS.length)).toEqual(expected.flatMap((metric) => wide.periods.map(({ label }) => `${metric} ${label}`)));
    const tabular = report({ granularity, layout: 'rows' });
    expect(tabular.columns.slice(FIXED_COLUMNS.length)).toEqual(['Período', ...expected]);
    expect(FIXED_COLUMNS).not.toContain('VGV Lançado');
    for (const row of tabular.rows) for (const metric of expected) {
      expect(row[metric]).toBe(wide.rows[0][`${metric} ${row['Período']}`]);
    }
  });

  const multiTypology: RawBuilding = { ...building, typologies_history: [
    { typology_id: 1, period: '2026-01-10', price: 50, qty: 1000, typology_stock: 1000, price_private_area: 5 },
    { typology_id: 1, period: '2026-01-31', price: 100, qty: 10, typology_stock: 8, price_private_area: 10 },
    { typology_id: 2, period: '2026-01-31', price: 300, qty: 30, typology_stock: 2, price_private_area: 30 },
    { typology_id: 1, period: '2026-02-28', price: 900, qty: 10, typology_stock: 5, price_private_area: 90 },
  ] };

  it.each([
    ['simple', 200], ['quantity', 250], ['stock', 140],
  ] as const)('calcula média %s com uma posição por tipologia e por período', (buildingAverageMode, expected) => {
    const result = report({ buildingAverageMode, to: '2026-01-31' }, [multiTypology]);
    expect(result.rows).toHaveLength(2);
    for (const row of result.rows) expect(row['Preço Médio Empreendimento jan/2026']).toBe(expected);
    expect(result.rows[0]['Preço Atual jan/2026']).toBe(100);
    expect(result.rows[0]['Preço m² jan/2026']).toBe(10);
    const quarter = report({ buildingAverageMode, to: '2026-01-31', granularity: 'quarter' }, [multiTypology]);
    expect(quarter.rows[0]['Preço Médio Empreendimento 1T/2026']).toBe(expected);
  });

  it.each(['quantity', 'stock'] as const)('deixa média %s vazia quando todos os pesos são ausentes ou não positivos', (buildingAverageMode) => {
    const data = [{ ...multiTypology, typologies_history: [
      { typology_id: 1, period: '2026-01-31', price: 100, qty: 0, typology_stock: -1 },
      { typology_id: 2, period: '2026-01-31', price: 300, qty: null, typology_stock: null },
    ] }];
    const result = report({ buildingAverageMode }, data);
    expect(result.rows[0]['Preço Médio Empreendimento jan/2026']).toBeNull();
  });

  it('não soma preços nos gráficos nem conta a média do empreendimento por tipologia', () => {
    const other: RawBuilding = { ...building, building_id: 11, typologies_history: [
      { typology_id: 1, period: '2026-01-31', price: 1000 },
    ] };
    const result = report({ to: '2026-01-31' }, [multiTypology, other]);
    expect(result.series[0]['Preço Médio Empreendimento']).toBe(600);
    expect(result.series[0]['Preço Atual']).toBe(466.67);
  });
});
