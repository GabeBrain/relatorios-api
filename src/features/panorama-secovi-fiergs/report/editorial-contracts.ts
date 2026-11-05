import type { PanoramaReportModel, ReportMarketBlock } from '../types';
import { quarterLabel } from '../lib/launches';
import { panoramaScopeIdentity } from '../scope-identity';
import { orderTypologies } from '../domain/taxonomy';

/** Finoti D09: categories have equal weight; observed zero is not absence. */
export function meanCategoryRates(rows: { kind?: string; value: number | null | undefined }[]): number | null {
  const values = rows.filter((r) => !r.kind || r.kind === 'row').map((r) => r.value)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function monetaryTitle(text: string): string {
  return text.replace(/VGV lan[çc]ado/gi, 'VGL — Valor Geral Lançado').replace(/VGV vendido/gi, 'VGV — Valor Geral Vendido');
}

export function observedComparison(left: number | null, right: number | null, complete = true) {
  const visible = complete && left !== null && right !== null && Number.isFinite(left) && Number.isFinite(right)
    && (left !== 0 || right !== 0);
  return { visible, percentage: visible && left! > 0 ? (right! - left!) / left! * 100 : null,
    difference: visible ? right! - left! : null };
}

/** Counts of categories with net cancellations remain in the market total. */
export function reconcileAggregateIvv(block: ReportMarketBlock, sales: ReportMarketBlock, stock: ReportMarketBlock): ReportMarketBlock {
  if (sales.dataStatus === 'unavailable' || stock.dataStatus === 'unavailable') return block;
  const salesByQuarter = new Map(sales.series.map((r) => [r.quarter, r]));
  const stockByQuarter = new Map(stock.series.map((r) => [r.quarter, r]));
  return { ...block, series: block.series.map((row) => {
    const s = salesByQuarter.get(row.quarter), f = stockByQuarter.get(row.quarter);
    if (!s || !f) return row;
    const value = (key: 'vertical' | 'horizontal' | 'total') => Number.isFinite(s[key]) && Number.isFinite(f[key])
      && s[key] >= 0 && s[key] + f[key] > 0 ? s[key] / (s[key] + f[key]) * 100 : row[key];
    // The diagnosed contract is the canonical vertical market. Horizontal and total
    // temporal policies are independent and must not change as a side effect.
    return { ...row, vertical: value('vertical') };
  }) };
}

export function analyticContext(report: PanoramaReportModel, temporal = false, rolling = false): string {
  const identity = panoramaScopeIdentity(report.scope);
  const list = identity.cities.join(' e ');
  const comparison = report.territorial?.units.map(({unit})=>unit.label).join(' × ');
  const territory = report.territorialLabel ?? (comparison
    ? `${comparison.length<=105?comparison:`Comparação de ${report.territorial!.units.length} territórios`} · ${identity.uf}`
    : identity.official ? identity.shortLabel : list.length <= 105 ? `${list} · ${identity.uf}` : identity.shortLabel);
  const closing = quarterLabel(report.scope.endQuarter);
  const period = rolling ? `12 meses até ${closing}` : temporal
    ? `${quarterLabel(report.scope.startQuarter ?? report.scope.endQuarter)} – ${closing}` : closing;
  return `${territory} · ${period}`;
}

/** The series must be observed; lack of an MCMV classification is not proof of zero activity. */
export function mcmvActivity(report: Pick<PanoramaReportModel, 'launches' | 'sales' | 'cube'>, kind: 'launches' | 'sales') {
  const classified = report.cube.projects.filter((p) => p.segment === 'Vertical')
    .every((p) => Boolean(p.releaseQuarter && p.standard) && p.standard !== 'Não classificado');
  if (kind === 'launches') return { known: classified && report.launches.unitStandards.length > 0,
    active: report.launches.unitStandards.some((r) => r.economic !== 0) };
  const groups = report.sales.units.groupSeries;
  const selected = groups.filter((g) => /mcmv|econ[oô]mico/i.test(g.label));
  return { known: classified && groups.length > 0 && report.sales.units.dataStatus !== 'unavailable' && !groups.some((g) => /classificad/i.test(g.label)) && selected.every((g) => g.series.length > 0
      && g.series.every((r) => Number.isFinite(r.vertical))),
    active: selected.some((g) => g.series.some((r) => r.vertical !== 0)) };
}

/** D10: extremes and weighted averages use the same observed closing-stock universe. */
export function closingTypologyPriceRanges(report: PanoramaReportModel) {
  const grouped = new Map<string, { meter: number | null; area: number | null; weight: number }[]>();
  for (const p of report.cube.projects.filter((p) => p.segment === 'Vertical')) for (const t of p.typologies) {
    if (t.finalUnits === null || !Number.isFinite(t.finalUnits) || t.finalUnits <= 0) continue;
    const metric = (v: number | null) => v !== null && Number.isFinite(v) && v > 0 ? v : null;
    const entry = { meter: metric(t.averagePricePerMeter), area: metric(t.averageArea), weight: t.finalUnits };
    if (entry.meter === null && entry.area === null) continue;
    grouped.set(t.typology, [...(grouped.get(t.typology) ?? []), entry]);
  }
  const metric = (rows: { meter: number | null; area: number | null; weight: number }[], key: 'meter' | 'area') => {
    const eligible = rows.filter((r) => r[key] !== null);
    const values = eligible.map((r) => r[key]!);
    const weights = eligible.reduce((s, r) => s + r.weight, 0);
    return { min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null,
      average: weights > 0 ? eligible.reduce((s, r) => s + r[key]! * r.weight, 0) / weights : null };
  };
  return orderTypologies([...grouped.keys()] as never).map((label) => {
    const entries = grouped.get(label)!;
    const meter = metric(entries, 'meter'), area = metric(entries, 'area');
    return { label, areaMin: area.min, areaAverage: area.average, areaMax: area.max,
      meterMin: meter.min, meterAverage: meter.average, meterMax: meter.max,
      offer: entries.reduce((s, r) => s + r.weight, 0) };
  });
}

/** Keep the approved black heading / green analytical qualifier for every new family. */
export function territorialHeading(title: string) {
  const match = title.match(/^(.*?)\s+(POR TRIMESTRE|ACUMULADO 12 MESES|POR PADRÃO|POR TIPOLOGIA|POR ANO DE LANÇAMENTO|POR ANO|POR FAIXA.*|EVOLUÇÃO.*)$/i);
  return { title: (match?.[1] ?? title).replace(/\s*·\s*$/, ''), subtitle: match?.[2] ?? '' };
}
