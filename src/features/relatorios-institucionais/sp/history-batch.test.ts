import { describe, expect, it } from 'vitest';
import { buildSpHistoryBatch } from './history-batch';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { syntheticHistoryBatch } from './__tests__/history-batch';

const baseline = () => buildSpTemporalPreview(recordedInput(), '3T2026');
describe('SP — lote histórico com 2025 fictício, sem consultas reais', () => {
  it('libera três comparativos juntos, somando fluxos e usando somente a oferta final', () => {
    const result = buildSpHistoryBatch(syntheticHistoryBatch(), baseline());
    expect(result.status).toBe('ready');
    expect(result.comparisons.launches?.totals).toMatchObject({ current: 24351, previous: 21000, delta: 3351 });
    expect(result.comparisons.sales?.totals).toMatchObject({ current: 26824, previous: 20000, delta: 6824 });
    expect(result.comparisons.stock?.totals).toMatchObject({ current: 124706, previous: 101000, delta: 23706 });
    expect(result.comparisons.stock?.rows.map(row => row.current)).toEqual([128819, 124706]);
    expect(result.segments?.current.rows.find(row => row.group === 'MCMV')?.launches).toBe(20328);
    for (const metric of ['launches', 'sales', 'stock'] as const) {
      expect(result.segments?.previous.rows.reduce((sum, row) => sum + row[metric], 0)).toBe(result.comparisons[metric]?.totals?.previous);
    }
    expect(result.checks).toHaveLength(36);
    expect(result.checks.every(check => check.delta === 0)).toBe(true);
  });
  it('mantém a raiz real da amostra sem fingir um fechamento histórico', () => {
    const input = syntheticHistoryBatch();
    const previous = buildSpTemporalPreview(input.previous, '3T2025');
    expect(previous.closingMonth).toBe('2026-08');
    expect(previous.throughMonth).toBe('2025-08');
    expect(previous.monthly).toHaveLength(2);
    input.previous.windowEnd = '2025-12';
    expect(buildSpHistoryBatch(input, baseline()).status).toBe('blocked');
  });
  it('divergência no balanço anterior bloqueia as três páginas, inclusive lançamentos', () => {
    const input = syntheticHistoryBatch(); input.previous.sales[0].liquid_sales = Number(input.previous.sales[0].liquid_sales) + 1;
    const result = buildSpHistoryBatch(input, baseline());
    expect(result.status).toBe('blocked'); expect(result.comparisons).toEqual({});
  });
  it('não aceita mudanças na releitura mesmo que o balanço atual continue fechando', () => {
    const input = syntheticHistoryBatch();
    input.current.sales[0].liquid_sales = Number(input.current.sales[0].liquid_sales) + 1;
    input.current.releases[0].releases_in_period = Number(input.current.releases[0].releases_in_period) + 1;
    expect(buildSpHistoryBatch(input, baseline()).status).toBe('blocked');
  });
  it('rejeita realocação por padrão que não altera o total mensal', () => {
    const input = syntheticHistoryBatch();
    input.current.sales[0].liquid_sales = Number(input.current.sales[0].liquid_sales) + 1;
    input.current.sales[1].liquid_sales = Number(input.current.sales[1].liquid_sales) - 1;
    expect(buildSpHistoryBatch(input, baseline()).status).toBe('blocked');
  });
  it('preserva vendas negativas e não calcula porcentagem com base negativa', () => {
    const result = buildSpHistoryBatch(syntheticHistoryBatch([-700, -1400]), baseline());
    expect(result.status).toBe('ready');
    expect(result.comparisons.sales?.totals).toMatchObject({ previous: -2100, variation: null, current: 26824 });
    expect(result.comparisons.sales?.rows.map(row => row.previous)).toEqual([-700, -1400]);
  });
  it('base anterior zero permanece explícita, sem infinito ou zero percentual inventado', () => {
    const result = buildSpHistoryBatch(syntheticHistoryBatch([0, 0], [0, 0]), baseline());
    expect(result.status).toBe('ready');
    expect(result.comparisons.launches?.totals?.variation).toBeNull();
    expect(result.comparisons.sales?.totals?.variation).toBeNull();
  });
  it('bloqueia mês/grupo ausente, nulo, duplicado ou paginação parcial', () => {
    for (const mode of ['month', 'group', 'value', 'duplicate', 'coverage']) {
      const input = syntheticHistoryBatch();
      if (mode === 'month') input.previous.releases = input.previous.releases.filter(row => row.period !== '2025-08-01');
      if (mode === 'group') input.previous.stock.pop();
      if (mode === 'value') input.previous.sales[0].liquid_sales = null;
      if (mode === 'duplicate') input.previous.sales.push({ ...input.previous.sales[0] });
      if (mode === 'coverage') input.previous.complete = { ...input.previous.complete, stock: false };
      expect(buildSpHistoryBatch(input, baseline()).comparisons).toEqual({});
    }
  });
  it('não permite setembro em somente um dos anos nem janela de escopo diferente', () => {
    const input = syntheticHistoryBatch(); input.previous.sales.push({ ...input.previous.sales[0], period: '2025-09-01' });
    expect(buildSpHistoryBatch(input, baseline()).status).toBe('blocked');
    const wrong = syntheticHistoryBatch(); wrong.previous.city = 'Campinas';
    expect(buildSpHistoryBatch(wrong, baseline()).status).toBe('blocked');
  });
  it('bloqueia fechamento alterado e universo de padrões diferente entre anos', () => {
    const changed = syntheticHistoryBatch(); changed.previous.rootPeriod = '2026-09-01';
    expect(buildSpHistoryBatch(changed, baseline()).status).toBe('blocked');
    const groups = syntheticHistoryBatch();
    for (const source of [groups.previous.releases, groups.previous.sales, groups.previous.stock]) for (const row of source) if (row.group === 'Alto') row.group = 'Outro';
    expect(buildSpHistoryBatch(groups, baseline()).status).toBe('blocked');
  });
  it('não modifica a fonte e exige baseline real válido', () => {
    const input = syntheticHistoryBatch(), snapshot = JSON.stringify(input);
    buildSpHistoryBatch(input, baseline()); expect(JSON.stringify(input)).toBe(snapshot);
    expect(buildSpHistoryBatch(input, { ...baseline(), source: 'fixture' }).status).toBe('blocked');
    expect(buildSpHistoryBatch({ current: input.current }, baseline()).status).toBe('blocked');
  });
});
