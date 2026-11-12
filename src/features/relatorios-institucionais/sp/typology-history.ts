import { buildSpTypologies } from './typologies';
import { buildSpTemporalPreview, quarterMonths, type SpTemporalInput } from './temporal';
import { priorYearQuarter } from './history-batch';
import { compareSpGroups, blockedSpComparison, type SpGroupComparison } from './comparisons';
import { isSpMunicipalPreview, type SpPreview, type SpHistoryMetric } from './model';
import { summarizeSpGroups } from './distribution';

export type SpTypologyHistory = Record<SpHistoryMetric, SpGroupComparison>;
export function blockedSpTypologyHistory(message: string): SpTypologyHistory {
  return { launches: blockedSpComparison(message), sales: blockedSpComparison(message), stock: blockedSpComparison(message) };
}
export function buildSpTypologyHistory(current: SpTemporalInput, previous: SpTemporalInput, municipal: SpPreview): SpTypologyHistory {
  const now = buildSpTypologies(current, municipal);
  const quarter = priorYearQuarter(municipal.quarter);
  const months = quarterMonths(quarter).slice(0, municipal.monthly?.length ?? 0);
  const before = buildSpTemporalPreview(previous, quarter);
  if (now.status !== 'ready' || previous.groupBy !== 'Tipologia' || previous.city !== 'São Paulo' || previous.uf !== 'SP' || !isSpMunicipalPreview(before) || before.monthly?.map(row => row.month).join('|') !== months.join('|')) return blockedSpTypologyHistory('As tipologias não comprovaram cobertura equivalente e os totais atuais.');
  const groups = summarizeSpGroups(previous, months, before.throughMonth!);
  if (groups.status !== 'ready') return blockedSpTypologyHistory('A cobertura das tipologias do ano anterior está incompleta.');
  return Object.fromEntries((['launches', 'sales', 'stock'] as const).map(metric => [metric, compareSpGroups(now.rows.map(row => ({ group: row.group, value: row[metric] })), groups.rows.map(row => ({ group: row.group, value: row[metric] })))])) as SpTypologyHistory;
}
/** If independent long series are available, also check the previous-year denominator. */
export function resolveSpTypologyComparison(report: SpPreview, metric: 'launches' | 'sales' | 'stock'): SpGroupComparison | undefined {
  const result = report.typologyHistory?.[metric];
  const independent = (metric === 'launches' ? report.launchSeries : metric === 'sales' ? report.salesSeries : report.stockSeries)?.comparison;
  if (result?.status === 'ready' && independent?.status === 'ready' && (result.currentTotal !== independent.currentTotal || result.previousTotal !== independent.previousTotal)) return blockedSpComparison('A soma por tipologia diverge da série municipal em um dos dois anos.');
  return result;
}
