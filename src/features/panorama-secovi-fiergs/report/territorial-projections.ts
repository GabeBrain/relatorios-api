import type { PanoramaReportModel, PanoramaScope, ReportMarketBlock, TerritorialComparison, TerritorialProjection, TerritorialUnit } from '../types';
import { normalizeText } from '../domain/taxonomy';

function projection(report: PanoramaReportModel): TerritorialProjection {
  const { scope, launches, sales, stock, ivv, prices, granular, closingFacts, dataState } = report;
  return { scope, launches, sales, stock, ivv, prices, granular, closingFacts, dataState };
}
type Metric = { metric: string; period: string; dimension: string; source: string; value: number | null };
function metrics(data: TerritorialProjection): Map<string, Metric> {
  const rows: Metric[] = [];
  for (const key of ['projects', 'units', 'vgv'] as const) for (const row of data.launches[key]) {
    for (const segment of ['vertical', 'horizontal'] as const) rows.push({ metric: `launch.${key}`, period: row.quarter, dimension: segment, source: 'lançamento / cubo homologado', value: row[segment] });
  }
  const block = (name: string, source: ReportMarketBlock) => {
    for (const row of source.series) for (const segment of ['vertical', 'horizontal'] as const)
      rows.push({ metric: name, period: row.quarter, dimension: segment, source: source.source,
        value: row.observed?.[segment] === false ? null : row[segment] });
    for (const group of source.groupSeries) for (const row of group.series) for (const segment of ['vertical', 'horizontal'] as const)
      rows.push({ metric: name, period: row.quarter, dimension: `${segment}/${group.label}`, source: source.source,
        value: row.observed?.[segment] === false ? null : row[segment] });
  };
  block('sales.units', data.sales.units); block('sales.vgv', data.sales.vgv);
  block('stock.units', data.stock.units); block('stock.vgv', data.stock.vgv);
  block('sales.unitsByTypology', data.sales.unitsByTypology); block('stock.unitsByTypology', data.stock.unitsByTypology);
  for (const name of ['offerByStandard', 'offerByTypology', 'cohortsVertical', 'cohortsHorizontal'] as const)
    for (const row of data.granular[name].filter((r) => r.kind !== 'subtotal')) for (const metric of ['projects', 'launchedUnits', 'finalUnits', 'soldUnits'] as const)
      rows.push({ metric: `${name}.${metric}`, period: data.scope.endQuarter, dimension: row.label, source: 'cubo / agregação homologada', value: row[metric] });
  return new Map(rows.map((r) => [`${r.metric}|${r.period}|${r.dimension}`, r]));
}
const strictSum = (values: (number | null)[]) => values.some((v) => v === null) ? null : (values as number[]).reduce((a, b) => a + b, 0);

/** Shares source facts and the numerical builder. Never retains full child reports or recursively builds presentations. */
export function buildTerritorialComparison(scope: PanoramaScope, consolidated: PanoramaReportModel,
  build: (cities: string[]) => PanoramaReportModel): TerritorialComparison | undefined {
  if (scope.presentation?.mode !== 'comparison') return undefined;
  const requested = scope.presentation.units ?? [];
  const municipal = new Map(scope.cities.map((city) => [normalizeText(city), projection(build([city]))]));
  const units = requested.map((unit) => {
    const data = unit.cities.length === 1 ? municipal.get(normalizeText(unit.cities[0]))! : projection(build(unit.cities));
    const members = unit.cities.map((c) => municipal.get(normalizeText(c))!);
    const covered = (block: import('../types').ReportMarketBlock, sources: import('../types').ReportMarketBlock[]) => ({ ...block,
      series: block.series.map((row) => ({ ...row, observed: {
        vertical: sources.every((s) => s.series.find((r) => r.quarter === row.quarter)?.observed?.vertical !== false && s.series.some((r) => r.quarter === row.quarter)),
        horizontal: sources.every((s) => s.series.find((r) => r.quarter === row.quarter)?.observed?.horizontal !== false && s.series.some((r) => r.quarter === row.quarter)),
      } })) });
    return { unit, data: { ...data,
      sales: Object.fromEntries(Object.entries(data.sales).map(([key,b])=>[key,covered(b,members.map((m)=>m.sales[key as keyof typeof m.sales]))])) as typeof data.sales,
      stock: Object.fromEntries(Object.entries(data.stock).map(([key,b])=>[key,covered(b,members.map((m)=>m.stock[key as keyof typeof m.stock]))])) as typeof data.stock,
      prices: Object.fromEntries(Object.entries(data.prices).map(([key,b])=>[key,covered(b,members.map((m)=>m.prices[key as keyof typeof m.prices]))])) as typeof data.prices,
      ivv: covered(data.ivv,members.map((m)=>m.ivv)),
    } };
  });
  const baseline = metrics(consolidated); const cityMetrics = [...municipal].map(([city, data]) => ({ city, metrics: metrics(data) }));
  const unitMetrics = units.map(({ unit, data }) => ({ unit, metrics: metrics(data) }));
  const checks = [...baseline].map(([key, r]) => {
    const cities = cityMetrics.map(({ city, metrics: values }) => ({ label: scope.cities.find((c) => normalizeText(c) === city)!, value: values.get(key)?.value ?? null }));
    const values = unitMetrics.map(({ unit, metrics: values }) => ({ id: unit.id, label: unit.label, value: values.get(key)?.value ?? null }));
    const summed = strictSum(values.map((v) => v.value)); const citySum = strictSum(cities.map((v) => v.value));
    const delta = r.value === null || summed === null ? null : summed - r.value;
    return { metric: r.metric, period: r.period, dimension: r.dimension, source: r.source, canonical: r.value,
      grouped: summed, delta, cities, units: values,
      status: delta === null || citySum === null ? 'unavailable' as const
        : Math.abs(delta) <= 1e-6 && Math.abs(citySum - r.value!) <= 1e-6 ? 'match' as const : 'different' as const };
  });
  for (const { unit, metrics: values } of unitMetrics) for (const [key, r] of values) {
    const members = cityMetrics.filter(({ city }) => unit.cities.some((c) => normalizeText(c) === city));
    const cities = members.map(({ city, metrics: source }) => ({ label: city, value: source.get(key)?.value ?? null }));
    const sum = strictSum(cities.map((c) => c.value)); const delta = sum === null || r.value === null ? null : r.value - sum;
    checks.push({ metric: r.metric, period: r.period, dimension: `${unit.id}/${r.dimension}`, source: r.source,
      canonical: sum, grouped: r.value, delta, cities, units: [{ id: unit.id, label: unit.label, value: r.value }],
      status: delta === null ? 'unavailable' : Math.abs(delta) <= 1e-6 ? 'match' : 'different' });
  }
  return { units, checks };
}

/** Lightweight view for existing page renderers, with a genuinely filtered cube, not just a changed label. */
export function territorialReportView(report: PanoramaReportModel, unitId: string): PanoramaReportModel {
  const item = report.territorial?.units.find(({ unit }) => unit.id === unitId);
  if (!item) throw new Error(`Território ausente: ${unitId}`);
  const belongs = (city: string) => item.unit.cities.some((c) => normalizeText(c) === normalizeText(city));
  return { ...report, ...item.data, territorialLabel: item.unit.label, scope: { ...item.data.scope, presentation: { mode: 'consolidated' } }, territorial: undefined,
    cube: { ...report.cube, projects: report.cube.projects.filter((p) => belongs(p.city)), rejections: report.cube.rejections.filter((p) => belongs(p.city)), cities: item.unit.cities },
    locations: report.locations.filter((p) => belongs(p.city)),
    cityComparisons: { enabled: false, sales: [], market: [], availabilityByStandard: [] } };
}

export function territorialTitle(unit: TerritorialUnit): string { return unit.label.trim(); }
