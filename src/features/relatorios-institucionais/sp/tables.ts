import { isSpMunicipalPreview, type SpHistoryMetric, type SpPreview } from './model';

export function buildSpTable(report: SpPreview, dimension: 'patterns' | 'typologies', metric: SpHistoryMetric) {
  const source = report[dimension], total = report.metrics[metric];
  if (!isSpMunicipalPreview(report) || !['api', 'recorded-api'].includes(report.source ?? '') || source?.status !== 'ready' || total === null || !Number.isSafeInteger(total)) return null;
  if (!source.rows.length || source.rows.length > 12 || source.rows.some(row => !Number.isSafeInteger(row[metric]) || metric !== 'sales' && row[metric] < 0)) return null;
  const sum = source.rows.reduce((value, row) => value + row[metric], 0);
  if (!Number.isSafeInteger(sum) || sum !== total) return null;
  return { total, rows: source.rows.map(row => ({ group: row.group, value: row[metric], share: total > 0 ? row[metric] / total * 100 : null })) };
}
