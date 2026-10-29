import { isSpMunicipalPreview, monthOf, type SpPreview } from './model';
import { SP_API_PATTERNS } from './segments';
import { buildSpProjectTrends, buildSpTrendBreakdown, shiftSpMonth, spTrendSegment, type SpProjectTrends, type SpTrendBreakdown } from './project-trends';
import { compareSpGroups, type SpGroupComparison } from './comparisons';
import { quarterMonths } from './temporal';
import type { SpTemporalRow } from './temporal';

export interface SpLaunchSeries { status: 'ready' | 'blocked'; issues: string[]; trends?: SpProjectTrends; breakdown?: SpTrendBreakdown; comparison?: SpGroupComparison }
export const blockedSpLaunchSeries = (message: string): SpLaunchSeries => ({ status: 'blocked', issues: [message] });
export function buildSpLaunchSeries(rows: SpTemporalRow[], report: SpPreview): SpLaunchSeries {
  return buildSpFlowSeries(rows, report, 'launches');
}
export function buildSpSalesSeries(rows: SpTemporalRow[], report: SpPreview): SpLaunchSeries {
  return buildSpFlowSeries(rows, report, 'sales');
}
function buildSpFlowSeries(rows: SpTemporalRow[], report: SpPreview, metric: 'launches' | 'sales'): SpLaunchSeries {
  if (!isSpMunicipalPreview(report) || !report.throughMonth || report.patterns?.status !== 'ready') return blockedSpLaunchSeries('Confira os totais municipais antes das séries de lançamentos.');
  const months: string[] = [];
  for (let month = '2021-01'; month <= report.throughMonth; month = shiftSpMonth(month, 1)) months.push(month);
  const seen = new Set<string>(), monthly = new Map<string, number>();
  const parsed: { month: string; group: string; value: number }[] = [];
  for (const row of rows) {
    const month = monthOf(row.period), group = String(row.group ?? '');
    const raw = row[metric === 'launches' ? 'releases_in_period' : 'liquid_sales'];
    const value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
    if (!month || !months.includes(month) || row.building_type !== 'Vertical' || !(SP_API_PATTERNS as readonly string[]).includes(group) || !Number.isSafeInteger(value) || metric === 'launches' && value < 0 || seen.has(`${month}/${group}`)) return blockedSpLaunchSeries('Há valores, recortes ou observações duplicadas incompatíveis na série histórica.');
    seen.add(`${month}/${group}`); parsed.push({ month, group, value });
    monthly.set(month, (monthly.get(month) ?? 0) + value);
  }
  if (months.some(month => SP_API_PATTERNS.some(group => !seen.has(`${month}/${group}`)))) return blockedSpLaunchSeries('Faltam meses ou padrões desde janeiro de 2021. A série não preenche ausências com zero.');
  if (report.monthly?.some(row => monthly.get(row.month) !== row[metric])) return blockedSpLaunchSeries('A releitura histórica diverge dos totais municipais atuais. Gere os dados municipais novamente.');
  const currentMonths = new Set(report.monthly?.map(row => row.month));
  if (report.patterns.rows.some(row => parsed.filter(item => currentMonths.has(item.month) && item.group === row.group).reduce((sum, item) => sum + item.value, 0) !== row[metric])) return blockedSpLaunchSeries('A releitura histórica diverge dos padrões municipais atuais.');
  if ([...monthly.values()].some(value => !Number.isSafeInteger(value))) return blockedSpLaunchSeries('Os totais excedem a precisão segura.');
  const beforeQuarter = `${report.quarter.slice(0, 2)}${Number(report.quarter.slice(2)) - 1}` as SpPreview['quarter'];
  const previousMonths = new Set(quarterMonths(beforeQuarter).slice(0, currentMonths.size));
  const segments = (window: Set<string>) => ['Compactos', 'MCMV', 'Médio Padrão', 'Luxo'].map(group => ({ group, value: parsed.filter(row => window.has(row.month) && spTrendSegment(row.group) === group).reduce((sum, row) => sum + row.value, 0) }));
  return { status: 'ready', issues: [], trends: buildSpProjectTrends(monthly, report.quarter, report.throughMonth), breakdown: buildSpTrendBreakdown(parsed, report.quarter, report.throughMonth), comparison: compareSpGroups(segments(currentMonths), segments(previousMonths)) };
}
