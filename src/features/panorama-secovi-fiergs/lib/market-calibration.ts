import type { MarketCalibrationCell, MarketMetric, Quarter, Segment } from '../types';
import type { MarketReferenceSeries } from '../reference/piracicaba-1t26-market';

type SegmentKey = 'vertical' | 'horizontal' | 'total';
type TemporalRow = Record<string, unknown>;

function segmentOf(value: unknown): Segment | null {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('vertical')) return 'Vertical';
  if (raw.includes('horizontal') || raw.includes('casa')) return 'Horizontal';
  return null;
}
function numberOf(value: unknown): number {
  const parsed = typeof value === 'string'
    ? Number(value.replace('%', '').replace(/\./g, '').replace(',', '.'))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function quarterOf(value: unknown): Quarter | null {
  const match = String(value ?? '').match(/(20\d{2})-(\d{2})/);
  if (!match) return null;
  return `${Math.ceil(Number(match[2]) / 3)}T${match[1]}` as Quarter;
}
function put(values: Map<string, number>, period: Quarter, segment: Segment, value: number) {
  for (const key of [segment.toLowerCase(), 'total']) values.set(`${period}:${key}`, (values.get(`${period}:${key}`) ?? 0) + value);
}

export function aggregateTemporal(rows: TemporalRow[], field: string): Map<string, number> {
  const values = new Map<string, number>();
  for (const row of rows) { const period = quarterOf(row.period); const segment = segmentOf(row.building_type); if (period && segment) put(values, period, segment, numberOf(row[field])); }
  return values;
}

function expected(reference: MarketReferenceSeries, metric: MarketMetric, period: Quarter, segment: SegmentKey): number | null {
  const index = reference.quarters.indexOf(period);
  if (metric === 'Estoque final') return segment === 'total' ? reference.finalStock.vertical + reference.finalStock.horizontal : reference.finalStock[segment];
  if (metric === 'VGV estoque (R$ mi)' || metric === 'IVV' || index < 0) return null;
  const series = metric === 'Unidades vendidas' ? reference.salesUnits : reference.salesVgvMillions;
  return segment === 'total' ? series.vertical[index] + series.horizontal[index] : series[segment][index];
}

export function buildMarketCells(block: MarketCalibrationCell['block'], method: string, metric: MarketMetric, source: string, reference: MarketReferenceSeries, values: Map<string, number>, available: boolean, periods = reference.quarters): MarketCalibrationCell[] {
  return periods.flatMap((period) => (['vertical', 'horizontal', 'total'] as SegmentKey[]).map((segment) => {
    const wanted = expected(reference, metric, period, segment);
    const actual = available ? (values.get(`${period}:${segment}`) ?? 0) : null;
    return { block, method, metric, source, period, segment, expected: wanted, actual, difference: wanted === null || actual === null ? null : actual - wanted, status: !available ? 'missing_api' : wanted === null ? 'not_comparable' : actual === wanted ? 'match' : 'different' };
  }));
}
