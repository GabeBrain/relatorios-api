import { describe, expect, it } from 'vitest';
import { buildCityMarket, buildMaceioMarket } from './market';
import { marketFixture, monthlySelection } from './__tests__/market-fixture';

describe('Maceió — reconciliação do núcleo vertical', () => {
  it('fecha o balanço mensal por padrão e no total, preservando vendas negativas', () => {
    const report = buildCityMarket(marketFixture(), monthlySelection);
    expect(report.status).toBe('complete');
    expect(report.lines.some(line => line.sales === -1)).toBe(true);
    expect(report.monthly).toHaveLength(1);
    expect(report.monthly[0]).toMatchObject({ openingStock: 150, launches: 10, sales: 14, closingStock: 146, delta: 0 });
  });
  it('não publica total com mês ausente', () => {
    const input = marketFixture();
    input.stock = input.stock.filter(row => row.period !== '2026-04-01');
    const report = buildCityMarket(input, monthlySelection);
    expect(report.status).toBe('incomplete');
    expect(report.lines).toHaveLength(0);
  });
  it('não publica total com linha duplicada ou padrão divergente entre fontes', () => {
    const duplicated = marketFixture();
    duplicated.sales.push({ ...duplicated.sales[0] });
    expect(buildCityMarket(duplicated, monthlySelection).status).toBe('incomplete');
    const divergent = marketFixture();
    divergent.releases = divergent.releases.map(row => row.group === 'Standard' ? { ...row, group: 'Luxo' } : row);
    expect(buildCityMarket(divergent, monthlySelection).status).toBe('incomplete');
  });
  it('recorte de outra UF não entra no balanço de AL', () => {
    const foreign = marketFixture();
    foreign.stock = foreign.stock.map(row => ({ ...row, state: 'CE' }));
    expect(buildCityMarket(foreign, monthlySelection).status).toBe('incomplete');
  });
  it('amostra vazia produz estado empty, nunca zeros', () => {
    const empty = marketFixture();
    empty.sampleConfirmed = false;
    const report = buildCityMarket(empty, monthlySelection);
    expect(report.status).toBe('empty');
    expect(report.monthly).toHaveLength(0);
  });
  it('consolidado exige todas as cidades completas e relata falhas', () => {
    const selection = { ...monthlySelection, territory: 'capital-rm' as const };
    const cities = ['Maceió', 'Pilar'];
    const complete = buildMaceioMarket(selection, cities, cities.map(city => marketFixture(selection, city)));
    expect(complete.status).toBe('complete');
    expect(complete.metrics).toEqual({ launches: 20, sales: 28, stock: 292 });
    const failed = buildMaceioMarket(selection, cities, [marketFixture(selection, 'Maceió')], [{ city: 'Pilar', error: 'sem resposta' }]);
    expect(failed.status).toBe('incomplete');
    expect(failed.metrics).toBeNull();
    expect(failed.issues.join(' ')).toContain('Pilar');
  });
  it('divergência de balanço vira aviso, sem ajustar os dados', () => {
    const selection = { ...monthlySelection };
    const input = marketFixture(selection);
    input.stock = input.stock.map(row => row.period === '2026-05-01' && row.group === 'Econômico' ? { ...row, stock: 90 } : row);
    const report = buildMaceioMarket(selection, ['Maceió'], [input]);
    expect(report.status).toBe('complete');
    expect(report.cities[0].lines.find(line => line.group === 'Econômico')!.delta).toBe(-5);
    expect(report.issues.join(' ')).toContain('diferenças');
  });
});
