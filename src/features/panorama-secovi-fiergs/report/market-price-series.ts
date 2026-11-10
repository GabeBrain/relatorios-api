import type { MarketCube } from '../domain/cube';
import { closingPlants, pricePlant } from '../domain/market-observations';
import { quarterRange } from '../domain/quarters';
import type { PanoramaScope, ReportMarketBlock, ReportSeries, Quarter } from '../types';

/** Aggregate primitive contributions for the whole territory. Never average city/group averages. */
export function marketPriceSeries(block: ReportMarketBlock, cube: MarketCube, scope: PanoramaScope,
  metric: 'averageTicket' | 'averagePricePerMeter', dimension: 'standard' | 'typology'): ReportMarketBlock {
  if (cube.entity !== 'fiergs-rs' || !cube.projects.some((p) => p.marketObservations)) return block;
  const periods = scope.startQuarter ? quarterRange(scope.startQuarter, scope.endQuarter) : block.series.map((r) => r.quarter);
  const labels = new Set(cube.projects.flatMap((p) => (p.marketObservations ?? []).filter(pricePlant).map((r) => r[dimension])));
  const source = 'geobrain-market-v1 / plantas Padrão com estoque positivo / contribuições de quantidade, preço e área';
  type Contribution = { quantity: number; value: number; meterValue: number; area: number };
  const facts = new Map<string, Contribution>();
  const key = (quarter: Quarter, segment: string, label?: string) => JSON.stringify([quarter, segment, label ?? null]);
  for (const quarter of periods) for (const p of cube.projects) for (const r of closingPlants(p, quarter)) {
    if (!pricePlant(r) || r.quantity === null || r.quantity <= 0 || r.ticket === null) continue;
    for (const segment of [p.segment, 'Total']) for (const label of [undefined, r[dimension]]) {
      const k = key(quarter, segment, label), c = facts.get(k) ?? { quantity: 0, value: 0, meterValue: 0, area: 0 };
      c.quantity += r.quantity; c.value += r.quantity * r.ticket;
      if (r.area !== null && r.area > 0) { c.meterValue += r.quantity * r.ticket; c.area += r.quantity * r.area; }
      facts.set(k, c);
    }
  }
  const value = (quarter: Quarter, segment: string, label?: string) => {
    const c = facts.get(key(quarter, segment, label));
    if (!c) return null;
    return metric === 'averageTicket' ? c.quantity > 0 ? c.value / c.quantity : null : c.area > 0 ? c.meterValue / c.area : null;
  };
  const series = (label?: string): ReportSeries[] => periods.map((quarter) => {
    const v = value(quarter, 'Vertical', label), h = value(quarter, 'Horizontal', label), total = value(quarter, 'Total', label);
    return { quarter, vertical: v ?? 0, horizontal: h ?? 0, total: total ?? 0,
      observed: { vertical: v !== null, horizontal: h !== null },
      source, methodStatus: 'open_method', dataStatus: 'ready' };
  });
  const rows = series();
  const groupSeries = [...labels].map((label) => ({ label, series: series(label) }));
  return { ...block, source, formula: metric === 'averageTicket' ? 'Σ(qty × preço) ÷ Σqty das plantas elegíveis.' : 'Σ(qty × preço) ÷ Σ(qty × área privativa) das mesmas plantas elegíveis.',
    dataStatus: rows.some((r) => r.observed?.vertical || r.observed?.horizontal) ? 'ready' : 'unavailable',
    series: rows, groupSeries,
    byGroup: groupSeries.map((g) => ({ label: g.label, ...pickClosing(g.series, scope.endQuarter) })),
  };
}
function pickClosing(series: ReportSeries[], quarter: Quarter) {
  const r = series.find((r) => r.quarter === quarter)!;
  return { vertical: r.vertical, horizontal: r.horizontal, total: r.total };
}
