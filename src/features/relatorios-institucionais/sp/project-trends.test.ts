import { describe, expect, it } from 'vitest';
import { buildSpProjectTrends, buildSpTrendBreakdown } from './project-trends';
import { buildSpLaunchSeries } from './launch-series';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { syntheticLaunchSeries } from './__tests__/launch-series';

describe('SP — séries trimestrais, móveis e anuais', () => {
  it('inclui exatamente 12 meses por ponto, inclusive na virada do ano', () => {
    const monthly = new Map([['2025-08', 99], ['2025-09', 2], ['2025-12', 3], ['2026-01', 4], ['2026-08', 5], ['2026-09', 100]]);
    const result = buildSpProjectTrends(monthly, '3T2026', '2026-08');
    expect(result.rolling).toHaveLength(37);
    expect(result.rolling.at(-1)).toEqual({ month: '2026-08', start: '2025-09', value: 14 });
    expect(result.quarterly).toHaveLength(17);
    expect(result.quarterly.at(-1)).toEqual({ label: '3T2026', value: 5, partial: true });
  });
  it('compara somente meses equivalentes quando o trimestre está parcial', () => {
    const monthly = new Map([['2025-07', 2], ['2025-08', 2], ['2025-09', 100], ['2026-07', 3], ['2026-08', 3]]);
    const result = buildSpProjectTrends(monthly, '3T2026', '2026-08');
    expect(result.quarterlyComparisons.at(-1)).toMatchObject({ previous: 4, current: 6, variation: 50 });
    expect(result.quarterlyComparisons[0].variation).toBeNull();
  });
  it('segmentos conservam o total anual e ano atual exclui meses futuros', () => {
    const result = buildSpTrendBreakdown([{ month: '2026-01', group: 'Econômico', value: 3 }, { month: '2026-07', group: 'Standard', value: 1 }, { month: '2026-09', group: 'Compacto', value: 100 }], '3T2026', '2026-08');
    expect(result.status).toBe('ready');
    expect(result.annual!.at(-1)).toMatchObject({ year: 2026, partial: true, total: 4 });
    expect(result.annual!.at(-1)!.segments.find(row => row.name === 'MCMV')).toMatchObject({ value: 3, share: 75 });
    expect(result.annual![0].segments.every(row => row.share === null)).toBe(true);
    expect(result.mcmv!.rolling.at(-1)!.value).toBe(3);
  });
  it('padrão ausente/desconhecido bloqueia os segmentos sem inventar classificação', () => {
    expect(buildSpTrendBreakdown([{ month: '2026-01', group: null, value: 2 }], '3T2026', '2026-08').status).toBe('blocked');
  });
  it('confere cobertura mensal/padrão e releitura contra os dados municipais', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const rows = syntheticLaunchSeries();
    const result = buildSpLaunchSeries(rows, report);
    expect(result.status).toBe('ready');
    expect(result.trends!.quarterly.at(-1)!.value).toBe(report.metrics.launches);
    expect(result.breakdown!.annual!.at(-1)!.segments.reduce((sum, row) => sum + row.value, 0)).toBe(result.breakdown!.annual!.at(-1)!.total);
    expect(buildSpLaunchSeries(rows.slice(1), report).status).toBe('blocked');
    expect(buildSpLaunchSeries([...rows, rows[0]], report).status).toBe('blocked');
    const changed = structuredClone(rows); changed.at(-1)!.releases_in_period = Number(changed.at(-1)!.releases_in_period) + 1;
    expect(buildSpLaunchSeries(changed, report).issues.join()).toContain('diverge');
  });
  it.each([-1, .5, null, '', false, 'bad'])('recusa lançamento inválido: %s', value => {
    const rows = syntheticLaunchSeries(); rows[0].releases_in_period = value;
    expect(buildSpLaunchSeries(rows, buildSpTemporalPreview(recordedInput(), '3T2026')).status).toBe('blocked');
  });
});
