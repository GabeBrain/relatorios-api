import { describe, expect, it } from 'vitest';
import { buildCityMarket, buildFortalezaMarket } from './market';
import { marketFixture, monthlySelection } from './__tests__/market-fixture';

describe('Fortaleza — contrato municipal vertical', () => {
  it('preserva venda negativa e zero observado, com oferta de abertura distinta do fechamento', () => {
    const report = buildFortalezaMarket(monthlySelection, ['Fortaleza'], [marketFixture()]);
    expect(report.status).toBe('complete');
    expect(report.metrics).toEqual({ launches: 10, sales: 14, stock: 146 });
    expect(report.cities[0].lines.find(line => line.group === 'Standard')).toMatchObject({ launches: 0, sales: -1, openingStock: 50, closingStock: 51, delta: 0 });
  });
  it('soma fluxos do trimestre, mas usa apenas o estoque de fechamento', () => {
    const selection = { ...monthlySelection, periodicity: 'quarterly' as const, position: 2 };
    const report = buildFortalezaMarket(selection, ['Fortaleza'], [marketFixture(selection)]);
    expect(report.metrics).toEqual({ launches: 30, sales: 42, stock: 138 });
    expect(report.monthly.map(line => line.month)).toEqual(['2026-04', '2026-05', '2026-06']);
  });
  it.each(['missing-month', 'missing-opening', 'missing-group', 'duplicate', 'null', 'fractional', 'negative-stock', 'wrong-city', 'wrong-segment', 'total-row', 'incomplete-page'])('não publica totais com %s', mode => {
    const input = marketFixture();
    if (mode === 'missing-month') input.sales = [];
    if (mode === 'missing-opening') input.stock = input.stock.filter(row => row.period !== '2026-05-01');
    if (mode === 'missing-group') input.releases.pop();
    if (mode === 'duplicate') input.sales.push({ ...input.sales[0] });
    if (mode === 'null') input.stock[0].stock = null;
    if (mode === 'fractional') input.sales[0].liquid_sales = 1.5;
    if (mode === 'negative-stock') input.stock[0].stock = -1;
    if (mode === 'wrong-city') input.sales[0].city = 'Recife';
    if (mode === 'wrong-segment') input.sales[0].building_type = 'Horizontal';
    if (mode === 'total-row') input.sales[0].group = 'Total';
    if (mode === 'incomplete-page') input.complete.stock = false;
    const report = buildFortalezaMarket(monthlySelection, ['Fortaleza'], [input]);
    expect(report.status).toBe('incomplete');
    expect(report.metrics).toBeNull();
    expect(report.monthly).toHaveLength(0);
  });
  it('trimestre com mês faltante não vira mês ou parcial silenciosa', () => {
    const selection = { ...monthlySelection, periodicity: 'quarterly' as const, position: 2 };
    const input = marketFixture(selection);
    input.sales = input.sales.filter(row => row.period !== '2026-05-01');
    expect(buildCityMarket(input, selection).status).toBe('incomplete');
  });
  it('diferenças por padrão não desaparecem quando compensam no total', () => {
    const input = marketFixture();
    input.stock[2].stock = Number(input.stock[2].stock) + 1;
    input.stock[3].stock = Number(input.stock[3].stock) - 1;
    const report = buildFortalezaMarket(monthlySelection, ['Fortaleza'], [input]);
    expect(report.metrics.stock).toBe(146);
    expect(report.monthly[0].delta).toBe(0);
    expect(report.cities[0].lines.map(line => line.delta)).toEqual([1, -1]);
    expect(report.issues[0]).toMatch(/2 balanço/);
  });
  it('fonte vazia ou amostra não confirmada não produz zero', () => {
    const input = marketFixture(); input.sales = []; input.releases = []; input.stock = [];
    const report = buildFortalezaMarket(monthlySelection, ['Fortaleza'], [input]);
    expect(report.status).toBe('empty'); expect(report.metrics).toBeNull();
    expect(buildCityMarket({ ...marketFixture(), sampleConfirmed: false }, monthlySelection).status).toBe('empty');
  });
  it('cidade faltante impede consolidar o conjunto e não apaga diagnóstico da concluída', () => {
    const report = buildFortalezaMarket(monthlySelection, ['Fortaleza', 'Aquiraz'], [marketFixture()], [{ city: 'Aquiraz', error: 'Fonte incompleta.' }]);
    expect(report.metrics).toBeNull();
    expect(report.cities[0].monthly).toHaveLength(1);
    expect(report.issues.join(' ')).toContain('Aquiraz');
  });
  it('não mistura dados duplicados ou de outro recorte', () => {
    expect(buildFortalezaMarket(monthlySelection, ['Fortaleza'], [marketFixture(), marketFixture()]).metrics).toBeNull();
    const input = marketFixture(); input.sales[0].period = '2026-07-01';
    expect(buildCityMarket(input, monthlySelection).status).toBe('incomplete');
  });
});
