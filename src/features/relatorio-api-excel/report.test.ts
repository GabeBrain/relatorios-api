import { describe, expect, it } from 'vitest';
import { read, utils, write } from 'xlsx';
import { buildReport, createWorkbook, dateBounds, exportValue, FIXED_COLUMNS, isoDate, MEASURES, REPORT_FIELDS, selectReportFields, selectedReport, type ReportOptions } from './report';
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
  vgvScale: 'million', priceMode: 'current', buildingAverageMode: 'simple', layout: 'columns', statuses: ['Ativo', 'Esgotado'] };
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

  it('filtra município e tipo apenas na geração e restringe também os períodos', () => {
    const other = { ...building, building_id: 11, city: 'Outra', building_type: 'Hotel', typologies_history: [
      { typology_id: 1, period: '2026-05-31', gross_sales: 1 },
    ] };
    const result = report({ to: '2026-06-30', municipalities: ['Outra/MT'], buildingTypes: ['Hotel'] }, [building, other]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]['ID Empreendimento']).toBe('11');
    expect(result.periods.map((period) => period.label)).toEqual(['mai/2026']);
    expect(report({ buildingTypes: [] }).rows).toEqual([]);
    expect(report({ municipalities: ['Outra/MT'] }).rows).toEqual([]);
  });

  it('aceita múltiplos municípios sem duplicar registros e não trata seleção vazia como todos', () => {
    const second = { ...building, building_id: 11, city: 'Outra' };
    const third = { ...building, building_id: 12, city: 'Terceira' };
    const data = [building, second, third];
    const result = report({ municipalities: ['Cidade fora do catálogo AELO/MT', 'Outra/MT'] }, data);
    expect(result.rows.map((row) => row['ID Empreendimento'])).toEqual(['10', '11']);
    expect(report({ municipalities: [] }, data).rows).toEqual([]);
    expect(report({}, data).rows).toHaveLength(3);
  });

  it('filtra o padrão cadastral combinado com os tipos, sem misturar tipologia ou padrão histórico', () => {
    const second = { ...building, building_id: 11, building_type: 'Horizontal', standard: 'Loteamento Aberto' };
    const third = { ...building, building_id: 12, building_type: 'Vertical', standard: 'Médio' };
    const data = [building, second, third];
    expect(report({ standards: ['Alto', 'Loteamento Aberto'], buildingTypes: ['Vertical'] }, data).rows.map((row) => row['ID Empreendimento'])).toEqual(['10']);
    expect(report({ standards: ['Loteamento Aberto'] }, data).rows.map((row) => row['ID Empreendimento'])).toEqual(['11']);
    expect(report({ standards: [] }, data).rows).toEqual([]);
  });

  it.each([
    ['simple', 850, 'simple-standard', 200],
    ['quantity', 750, 'quantity-standard', 250],
    ['stock', 820, 'stock-standard', 140],
  ] as const)('preserva média %s com Garden/Cobertura e restringe somente %s na opção nova', (mode, expectedAll, restricted, expectedStandard) => {
    const data = [{ ...building, typologies_history: [
      { typology_id: 1, period: '2026-01-31', type_of_typology: 'Padrão', price: 100, qty: 10, typology_stock: 8 },
      { typology_id: 2, period: '2026-01-31', type_of_typology: ' Padrao ', price: 300, qty: 30, typology_stock: 2 },
      { typology_id: 3, period: '2026-01-31', type_of_typology: 'Garden', price: 1000, qty: 5, typology_stock: 5 },
      { typology_id: 4, period: '2026-01-31', type_of_typology: 'Cobertura', price: 2000, qty: 15, typology_stock: 5 },
    ] }];
    for (const granularity of ['month', 'quarter'] as const) {
      const label = granularity === 'month' ? 'jan/2026' : '1T/2026';
      const all = report({ buildingAverageMode: mode, granularity }, data);
      const standard = report({ buildingAverageMode: restricted, granularity }, data);
      expect(all.rows).toHaveLength(4);
      expect(standard.rows).toHaveLength(4);
      for (const row of all.rows) expect(row[`Preço Médio Empreendimento ${label}`]).toBe(expectedAll);
      for (const row of standard.rows) expect(row[`Preço Médio Empreendimento ${label}`]).toBe(expectedStandard);
    }
  });

  it('não faz fallback para Garden ou tipologia ausente nas médias restritas', () => {
    const data = [{ ...building, typologies_history: [
      { typology_id: 1, period: '2026-01-31', type_of_typology: 'Garden', price: 100, qty: 10, typology_stock: 5 },
      { typology_id: 2, period: '2026-01-31', price: 1000, qty: 10, typology_stock: 5 },
    ] }];
    for (const mode of ['simple-standard', 'quantity-standard', 'stock-standard'] as const) {
      const result = report({ buildingAverageMode: mode }, data);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]['Preço Médio Empreendimento jan/2026']).toBeNull();
    }
  });

  it('concatena incorporadoras, distingue região/área administrativa/tipo/padrão e usa a tipologia até o corte', () => {
    const data = [{ ...building, region: 'Centro-Oeste', administrative_area: 'Norte',
      incorporators: [{ name: 'Empresa 1' }, { name: 'Empresa 2' }, { name: '' }, { name: 'Empresa 3' }],
      typologies_history: [{ typology_id: 20, period: '2026-01-31', qty: 10, private_area: 50,
        type_of_typology: 'Padrao', number_bedroom: 2, garage: 0 }],
    }];
    const row = report({}, data).rows[0];
    expect(row.Incorporadoras).toBe('Empresa 1, Empresa 2, Empresa 3');
    expect(row.Região).toBe('Centro-Oeste');
    expect(row['Região Administrativa']).toBe('Norte');
    expect(row.Tipo).toBe('Vertical');
    expect(row.Padrão).toBe('Alto');
    expect(row.Tipologia).toBe('Padrao');
    expect(row.Quartos).toBe(2);
    expect(row.Garagem).toBe(0);
    expect(row['Unidades por Tipologia']).toBe(10);
    expect(row['M² Lançado']).toBe(500);
    expect(exportValue('Data de Lançamento', row['Data de Lançamento'])).toBe('01/01/2026');
  });

  it('usa preço e área da data exata de lançamento, mesmo fora do intervalo de vendas', () => {
    const data = [{ ...building, typologies_history: [
      { typology_id: 20, period: '2026-01-01', qty: 10, price: 100_000, private_area: 50 },
      { typology_id: 20, period: '2026-02-28', qty: 12, price: 250_000, private_area: 60 },
    ] }];
    const row = report({ from: '2026-02-01' }, data).rows[0];
    expect(row['Preço de Lançamento']).toBe(100_000);
    expect(row['R$/m² Lançado']).toBe(2_000);
    expect(row['M² Lançado']).toBe(720);
    const absent = report({ from: '2026-02-01' }, [{ ...data[0], release_date: '2026-01-02' }]).rows[0];
    expect(absent['Preço de Lançamento']).toBeNull();
    expect(absent['R$/m² Lançado']).toBeNull();
  });

  it('mantém os campos novos nas posições solicitadas, sem nomes antigos duplicados', () => {
    const after = (field: string, length: number) => FIXED_COLUMNS.slice(FIXED_COLUMNS.indexOf(field) + 1, FIXED_COLUMNS.indexOf(field) + 1 + length);
    expect(after('Região', 1)).toEqual(['Região Administrativa']);
    expect(after('Cidade/UF', 1)).toEqual(['Tipo']);
    expect(after('Padrão', 1)).toEqual(['Tipologia']);
    expect(after('Tipologia', 3)).toEqual(['Preço de Lançamento', 'M² Lançado', 'R$/m² Lançado']);
    expect(after('Data de Entrega', 2)).toEqual(['Quartos', 'Garagem']);
    for (const obsolete of ['Urbanizadora', 'Lançamento', 'Entrega', 'Oferta por Lotes', 'm² Lançado']) expect(FIXED_COLUMNS).not.toContain(obsolete);
  });

  it.each(['columns', 'rows'] as const)('expande seleção por nome do campo apenas no resultado %s', (layout) => {
    expect(REPORT_FIELDS.some((field) => /\dT\/|\/2026/.test(field))).toBe(false);
    const result = selectReportFields(report({ layout }), ['Incorporadoras', 'Vendas Líquidas', 'Estoque']);
    expect(result.columns).toEqual(layout === 'columns' ? ['Incorporadoras',
      'Vendas Líquidas jan/2026', 'Vendas Líquidas fev/2026', 'Vendas Líquidas mar/2026',
      'Estoque jan/2026', 'Estoque fev/2026', 'Estoque mar/2026',
    ] : ['Incorporadoras', 'Vendas Líquidas', 'Estoque']);
    expect(Object.keys(result.rows[0])).toEqual(result.columns);
  });

  it.each(['month', 'quarter'] as const)('filtra period por competências completas na visão %s, sem usar release_date como recorte', (granularity) => {
    const result = report({ from: '2026-02-01', to: '2026-02-01', periodRange: 'month', granularity });
    expect(result.rows).toHaveLength(1);
    const label = granularity === 'month' ? 'fev/2026' : '1T/2026';
    expect(result.periods.map((period) => period.label)).toEqual([label]);
    expect(result.rows[0][`Vendas Brutas ${label}`]).toBe(4);
    expect(result.rows[0][`Preço Atual ${label}`]).toBe(120_000);
    expect(result.rows[0][`Estoque ${label}`]).toBe(91);
  });

  it('inclui o dia 29 de fevereiro em ano bissexto e exclui março', () => {
    const data = [{ ...building, release_date: '2024-01-01', typologies_history: [
      { typology_id: 1, period: '2024-02-29', gross_sales: 5, distractions: 1 },
      { typology_id: 1, period: '2024-03-01', gross_sales: 99, distractions: 0 },
    ] }];
    const result = report({ from: '2024-02-01', to: '2024-02-01', periodRange: 'month' }, data);
    expect(result.rows[0]['Vendas Brutas fev/2024']).toBe(5);
    expect(result.periods).toHaveLength(1);
  });

  it.each([
    ['standard', 1], ['thousand', 1_000], ['million', 1_000_000],
  ] as const)('aplica escala %s só ao VGV na prévia e no Excel, mantendo os cálculos originais', async (vgvScale, divisor) => {
    for (const layout of ['columns', 'rows'] as const) {
      const complete = report({ vgvScale, layout, priceMode: 'period' });
      const column = layout === 'columns' ? 'VGV Lançado jan/2026' : 'VGV Lançado';
      const price = layout === 'columns' ? 'Preço Atual jan/2026' : 'Preço Atual';
      expect(complete.rows[0][column]).toBe(11_000_000);
      expect(exportValue(column, complete.rows[0][column], vgvScale)).toBe(11_000_000 / divisor);
      expect(exportValue(price, 110_000, vgvScale)).toBe(110_000);
      expect(exportValue(column, null, vgvScale)).toBeNull();
      expect(exportValue(column, -1_234_567.89, vgvScale)).toBe(-1_234_567.89 / divisor);
      const workbook = await createWorkbook(selectedReport(complete, [column]));
      const reopened = read(write(workbook, { bookType: 'xlsx', type: 'array' }), { type: 'array' });
      const sheet = reopened.Sheets[reopened.SheetNames[0]];
      expect(sheet.A2.v).toBe(11_000_000 / divisor);
      expect(complete.rows[0][column]).toBe(11_000_000);
    }
  });
});
