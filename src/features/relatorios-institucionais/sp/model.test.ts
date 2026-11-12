import { describe, expect, it } from 'vitest';
import { spFixture } from './fixture';
import { buildSpPreview, limitHistoryToClosing, monthOf } from './model';

const closed = () => { const data = spFixture(); data.buildings.forEach(row => { row.period = '2026-09-01'; }); return data; };

describe('SP institucional — contrato próprio de fechamento', () => {
  it('recorta pelo mínimo entre fechamento da raiz e fim solicitado, sem mutar o original', () => {
    const data = spFixture();
    const source = JSON.stringify(data);
    const rows = limitHistoryToClosing(data.buildings[0], '2026-09');
    expect(rows?.at(-1)?.period).toBe('2026-08-01');
    expect(limitHistoryToClosing(data.buildings[0], '2026-06')?.at(-1)?.period).toBe('2026-06-01');
    expect(JSON.stringify(data)).toBe(source);
  });
  it('não usa histórico de setembro para promover fechamento de agosto ao 3T', () => {
    const report = buildSpPreview(spFixture(), '3T2026');
    expect(report.status).toBe('awaiting-closure');
    expect(report.closingMonth).toBe('2026-08');
    expect(report.ignoredHistoryRows).toBe(3);
    expect(Object.values(report.metrics)).toEqual([null, null, null, null]);
  });
  it('reconcilia trimestre completo, contando estoque de empreendimentos anteriores à janela', () => {
    const report = buildSpPreview(closed(), '3T2026');
    expect(report.entity).toBe('sp-institucional');
    expect(report.status).toBe('ready');
    expect(report.metrics).toEqual({ projects: 1, launches: 30, sales: 26, stock: 104 });
    expect(report.checks).toHaveLength(4);
    expect(report.checks.every(row => row.delta === 0)).toBe(true);
  });
  it('trimestre histórico fechado ignora observações posteriores ao trimestre selecionado', () => {
    expect(buildSpPreview(spFixture(), '2T2026').metrics).toEqual({ projects: 1, launches: 20, sales: 20, stock: 100 });
  });
  it('não infere fechamento quando a raiz está ausente, mesmo com histórico preenchido', () => {
    const data = closed(); delete data.buildings[0].period;
    expect(buildSpPreview(data, '3T2026').status).toBe('incomplete');
  });
  it('bloqueia fechamentos divergentes em vez de escolher o mais recente', () => {
    const data = closed(); data.buildings[0].period = '2026-08-01';
    expect(buildSpPreview(data, '3T2026').status).toBe('incomplete');
  });
  it('não preenche mês ausente com zero', () => {
    const data = closed(); data.sales = data.sales.filter(row => row.period !== '2026-08-01');
    const report = buildSpPreview(data, '3T2026');
    expect(report.status).toBe('incomplete'); expect(report.metrics.sales).toBeNull();
  });
  it('aceita zero observado e preserva vendas negativas quando o balanço fecha', () => {
    const data = closed();
    data.sales.find(row => row.period === '2026-08-01')!.liquid_sales = -2;
    data.stock.find(row => row.period === '2026-08-01')!.stock = 125;
    data.stock.find(row => row.period === '2026-09-01')!.stock = 116;
    const rows = data.buildings[0].typologies_history as Record<string, unknown>[];
    rows.find(row => row.period === '2026-09-01')!.typology_stock = 82;
    const report = buildSpPreview(data, '3T2026');
    expect(report.status).toBe('ready'); expect(report.metrics.sales).toBe(14);
  });
  it('um zero mensal é dado observado', () => {
    const data = closed();
    data.sales.find(row => row.period === '2026-08-01')!.liquid_sales = 0;
    data.stock.find(row => row.period === '2026-08-01')!.stock = 123;
    data.stock.find(row => row.period === '2026-09-01')!.stock = 114;
    (data.buildings[0].typologies_history as Record<string, unknown>[]).find(row => row.period === '2026-09-01')!.typology_stock = 80;
    expect(buildSpPreview(data, '3T2026').metrics.sales).toBe(16);
  });
  it('não transforma null em unidade lançada zero', () => {
    const data = closed(); data.buildings[2].total_units = null;
    (data.buildings[2].typologies_history as Record<string, unknown>[]).forEach(row => { row.qty = null; });
    expect(buildSpPreview(data, '3T2026').metrics.launches).toBeNull();
  });
  it('deduplica registros idênticos e bloqueia versões conflitantes', () => {
    const data = closed(); data.buildings.push(structuredClone(data.buildings[2]));
    expect(buildSpPreview(data, '3T2026').metrics.projects).toBe(1);
    data.buildings[3].total_units = 99;
    expect(buildSpPreview(data, '3T2026').status).toBe('incomplete');
  });
  it('bloqueia séries duplicadas e valores ausentes', () => {
    const data = closed(); data.sales.push({ ...data.sales.at(-1)! });
    expect(buildSpPreview(data, '3T2026').metrics.sales).toBeNull();
    data.sales.pop(); data.sales.at(-1)!.liquid_sales = null;
    expect(buildSpPreview(data, '3T2026').metrics.sales).toBeNull();
  });
  it('bloqueia incoerência temporal e granular, sem corrigir os números para fechar', () => {
    const data = closed(); data.stock.at(-1)!.stock = 1;
    const report = buildSpPreview(data, '3T2026');
    expect(report.status).toBe('incomplete'); expect(report.metrics.stock).toBeNull();
    expect(report.checks.some(row => row.delta !== 0)).toBe(true);
  });
  it('exige observação granular no fechamento; campo de estoque atual não substitui histórico', () => {
    const data = closed(); data.buildings[0].stock = 104;
    data.buildings[0].typologies_history = (data.buildings[0].typologies_history as Record<string, unknown>[]).filter(row => row.period !== '2026-09-01');
    expect(buildSpPreview(data, '3T2026').status).toBe('incomplete');
  });
  it('trata universo vazio e cobertura incompleta sem produzir zeros', () => {
    const data = closed(); data.coverage.buildings = false;
    expect(buildSpPreview(data, '3T2026').metrics.projects).toBeNull();
    data.coverage.buildings = true; data.buildings = [];
    expect(buildSpPreview(data, '3T2026').status).toBe('empty');
  });
  it('recusa outro município, segmento ou mês inválido', () => {
    const data = closed(); data.city = 'Campinas';
    expect(buildSpPreview(data, '3T2026').status).toBe('invalid');
    data.city = 'São Paulo'; data.buildings[0].building_type = 'Horizontal';
    expect(buildSpPreview(data, '3T2026').status).toBe('invalid');
    expect(monthOf('2026-13-01')).toBeNull();
  });
});
