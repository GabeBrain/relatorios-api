import { describe, expect, it } from 'vitest';
import { buildSpLaunchHistory, matchedLaunchMonths } from './history';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { syntheticLaunchHistory } from './__tests__/history';

const baseline = () => buildSpTemporalPreview(recordedInput(), '3T2026');
describe('SP — comparação de janelas equivalentes, anterior fictício', () => {
  it('compara apenas julho/agosto dos dois anos e calcula a variação do acumulado', () => {
    const result = buildSpLaunchHistory(syntheticLaunchHistory(), baseline());
    expect(result.status).toBe('ready');
    expect(result.rows.map(row => [row.previousMonth, row.currentMonth])).toEqual([['2025-07', '2026-07'], ['2025-08', '2026-08']]);
    expect(result.totals).toMatchObject({ previous: 20000, current: 24351, delta: 4351 });
    expect(result.totals?.variation).toBeCloseTo(21.755);
    expect(result.checks).toHaveLength(9);
    expect(result.checks.every(check => check.delta === 0)).toBe(true);
  });
  it('não preenche mês/grupo ausente ou aceita duplicações', () => {
    for (const mode of ['month', 'group', 'duplicate', 'coverage']) {
      const input = syntheticLaunchHistory();
      if (mode === 'month') input.previous = input.previous.filter(row => row.period !== '2025-08-01');
      if (mode === 'group') input.previous.pop();
      if (mode === 'duplicate') input.previous.push({ ...input.previous[0] });
      if (mode === 'coverage') input.complete.previous = false;
      expect(buildSpLaunchHistory(input, baseline()).status).toBe('blocked');
    }
  });
  it('bloqueia um trimestre anterior completo misturado à parcial atual', () => {
    const input = syntheticLaunchHistory();
    input.previous.push({ ...input.previous[0], period: '2025-09-01' });
    expect(buildSpLaunchHistory(input, baseline()).status).toBe('blocked');
  });
  it('não aceita valores inválidos, fracionários ou negativos', () => {
    for (const value of [null, '', ' ', false, -1, .5, NaN, Infinity]) {
      const input = syntheticLaunchHistory(); input.previous[0].releases_in_period = value;
      expect(buildSpLaunchHistory(input, baseline()).status).toBe('blocked');
    }
  });
  it('bloqueia releitura atual alterada, mas não o período de uma amostra isolada', () => {
    const changed = syntheticLaunchHistory(); changed.current[0].releases_in_period = 192;
    expect(buildSpLaunchHistory(changed, baseline()).status).toBe('blocked');
    const closure = syntheticLaunchHistory(); closure.rootPeriod = '2026-09-01';
    expect(buildSpLaunchHistory(closure, baseline()).status).toBe('ready');
  });
  it('detecta realocação entre padrões mesmo com os totais mensais iguais', () => {
    const input = syntheticLaunchHistory();
    input.current[0].releases_in_period = Number(input.current[0].releases_in_period) + 1;
    input.current[1].releases_in_period = Number(input.current[1].releases_in_period) - 1;
    expect(buildSpLaunchHistory(input, baseline()).status).toBe('blocked');
  });
  it('base anterior zero não vira infinito nem variação zero', () => {
    const input = syntheticLaunchHistory();
    input.previous.forEach(row => { row.releases_in_period = 0; });
    const result = buildSpLaunchHistory(input, baseline());
    expect(result.status).toBe('ready'); expect(result.totals?.variation).toBeNull();
    expect(result.rows.every(row => row.variation === null)).toBe(true);
  });
  it('não aceita escopo errado, fixture ou sequência de meses inválida', () => {
    const input = syntheticLaunchHistory(); input.city = 'Campinas';
    expect(buildSpLaunchHistory(input, baseline()).status).toBe('blocked');
    expect(matchedLaunchMonths({ ...baseline(), source: 'fixture' })).toBeNull();
    const report = baseline(); report.monthly = report.monthly!.slice(1);
    expect(matchedLaunchMonths(report)).toBeNull();
  });
  it('mantém a entrada intacta e rejeita universo diferente entre anos', () => {
    const input = syntheticLaunchHistory(), snapshot = JSON.stringify(input);
    buildSpLaunchHistory(input, baseline()); expect(JSON.stringify(input)).toBe(snapshot);
    input.previous[0].group = 'Outro padrão';
    expect(buildSpLaunchHistory(input, baseline()).status).toBe('blocked');
  });
});
