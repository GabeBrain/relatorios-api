import type { Quarter } from '../types';
import { periodToQuarter } from '../lib/launches';
import { quarterEndDate, quarterIndex } from './quarters';

export type TemporalMetricKind = 'flow' | 'snapshot';
export type TemporalPeriodKind = 'month' | 'quarter' | 'unknown';

type TemporalRow = Record<string, unknown>;

function explicitQuarter(value: unknown): Quarter | null {
  const compact = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const direct = /^(?:([1-4])(?:º|O)?T)\/?(20\d{2})$/.exec(compact);
  return direct ? `${direct[1]}T${direct[2]}` as Quarter : null;
}

export function temporalPeriod(value: unknown): { quarter: Quarter | null; kind: TemporalPeriodKind; order: number } {
  const quarter = explicitQuarter(value);
  if (quarter) return { quarter, kind: 'quarter', order: Date.parse(quarterEndDate(quarter)) };
  const parsed = periodToQuarter(value);
  if (!parsed) return { quarter: null, kind: 'unknown', order: -1 };
  const match = String(value).trim().match(/^(\d{4})-(\d{1,2})|^(\d{1,2})\/(\d{4})/);
  const year = Number(match?.[1] ?? match?.[4]); const month = Number(match?.[2] ?? match?.[3]);
  return { quarter: parsed, kind: 'month', order: Date.UTC(year, month - 1, 1) };
}

/**
 * Normaliza uma série municipal antes de qualquer soma entre cidades. Fluxos mensais somam dentro
 * do trimestre; se a API também publicar o total trimestral, ele tem precedência. Snapshots/taxas
 * usam somente a última observação disponível no trimestre.
 */
export function normalizeCityTemporalRows(city: string, rows: TemporalRow[], metric: TemporalMetricKind, targetQuarters?: Quarter[]): TemporalRow[] {
  const buckets = new Map<string, { row: TemporalRow; quarter: Quarter; kind: TemporalPeriodKind; order: number }[]>();
  for (const row of rows) {
    const parsed = temporalPeriod(row.period);
    if (!parsed.quarter) continue;
    const group = String(row.group ?? row.pattern ?? row.standard ?? row.typology ?? '').trim();
    const segment = String(row.building_type ?? row.type ?? '').trim();
    const key = `${parsed.quarter}\u0000${group}\u0000${segment}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push({ row, quarter: parsed.quarter, kind: parsed.kind, order: parsed.order });
    buckets.set(key, bucket);
  }
  if (metric === 'snapshot') {
    const dimensions = new Map<string, { row: TemporalRow; quarter: Quarter; kind: TemporalPeriodKind; order: number }[]>();
    for (const bucket of buckets.values()) {
      for (const item of bucket) {
        const group = String(item.row.group ?? item.row.pattern ?? item.row.standard ?? item.row.typology ?? '').trim();
        const segment = String(item.row.building_type ?? item.row.type ?? '').trim();
        const key = `${group}\u0000${segment}`;
        const values = dimensions.get(key) ?? [];
        values.push(item);
        dimensions.set(key, values);
      }
    }
    const quarters = targetQuarters?.length
      ? [...targetQuarters]
      : [...new Set([...buckets.values()].flatMap((items) => items.map((item) => item.quarter)))].sort((a, b) => quarterIndex(a) - quarterIndex(b));
    return [...dimensions.values()].flatMap((items) => quarters.flatMap((quarter) => {
      const closing = Date.parse(quarterEndDate(quarter));
      const eligible = items.filter((item) => item.order <= closing && quarterIndex(item.quarter) <= quarterIndex(quarter));
      if (!eligible.length) return [];
      const latest = eligible.reduce((current, item) => item.order > current.order ? item : current);
      return [{ ...latest.row, city, period: quarter, temporal_period_kind: latest.kind, temporal_observed_period: latest.row.period }];
    }));
  }
  const normalized: TemporalRow[] = [];
  for (const bucket of buckets.values()) {
    const quarterly = bucket.filter((item) => item.kind === 'quarter');
    const selected = quarterly.length ? quarterly : bucket.filter((item) => item.kind === 'month');
    for (const item of selected) normalized.push({ ...item.row, city, period: item.quarter, temporal_period_kind: item.kind });
  }
  return normalized;
}
