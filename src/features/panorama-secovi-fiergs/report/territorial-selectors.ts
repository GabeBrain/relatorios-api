import type { PanoramaReportModel, ReportSeries, TerritorialProjection } from '../types';
import type { ReportPageDefinition } from './manifest';
import { quarterIndex } from '../domain/quarters';
import { fiergsPeriodComparisons } from '../domain/period-comparisons';
import { observedComparison } from './editorial-contracts';
import { granularPriceChartRows, fiergsTemporalTypologyTotal } from './price-chart';
import { territorialReportView } from './territorial-projections';
import { STANDARD_ORDER, TYPOLOGY_ORDER } from '../domain/taxonomy';

export const TERRITORIAL_COLORS = ['#5d7737', '#ffc000', '#4472c4'];
export function territorialTrendDefinition(def: ReportPageDefinition) {
  const official = def.fiergsOfficialSlide; const ref = def.contentReferenceSlide ?? def.referenceSlide;
  const rolling = official !== undefined && [11,14,22,26,33].includes(official);
  const metric = official !== undefined
    ? [9,11].includes(official) ? 'projects' : [12,14].includes(official) ? 'launches' : [20,22].includes(official) ? 'vgl'
      : [24,26].includes(official) ? 'sales' : [32,33].includes(official) ? 'vgv' : official === 35 ? 'stock' : official === 39 ? 'ivv' : 'meter'
    : ref === 14 ? 'projects' : ref === 16 ? 'launches' : ref === 18 ? 'vgl' : ref === 23 ? 'sales' : ref === 24 ? 'vgv' : 'meter';
  const snapshot = ['stock', 'ivv', 'meter'].includes(metric);
  return { metric, rolling, snapshot, monetary: ['vgl','vgv'].includes(metric), percent: metric === 'ivv' };
}
function temporalRows(data: TerritorialProjection, metric: string, official?: number) {
  if (metric === 'projects') return data.launches.projects;
  if (metric === 'launches') return data.launches.units;
  if (metric === 'vgl') return data.launches.vgv;
  if (metric === 'sales') return data.sales.units.series;
  if (metric === 'vgv') return data.sales.vgv.series;
  if (metric === 'stock') return data.stock.units.series;
  if (metric === 'ivv') return data.ivv.series;
  if (official && official >= 44 && official <= 47) {
    const bedroom = official - 43;
    return data.prices.meterByTypology.groupSeries.find((g) => Number(g.label.match(/\d+/)?.[0]) === bedroom)?.series ?? [];
  }
  return data.prices.meter.series;
}
export function territorialTrend(report: PanoramaReportModel, def: ReportPageDefinition) {
  const config = territorialTrendDefinition(def);
  const series = (report.territorial?.units ?? []).map(({ unit, data }, index) => {
    const base = temporalRows(data, config.metric, def.fiergsOfficialSlide).map((r) => ({ quarter: r.quarter,
      value: (r as ReportSeries).observed?.vertical === false ? null : r.vertical }));
    const plotted = config.rolling ? base.map((r, i) => ({ quarter: r.quarter,
      value: i < 3 || quarterIndex(r.quarter) - quarterIndex(base[i - 3].quarter) !== 3 || base.slice(i - 3, i + 1).some((p) => p.value === null)
        ? null : base.slice(i - 3, i + 1).reduce((s, p) => s + p.value!, 0) })).slice(3) : base;
    // Drop missing rows before the existing comparison selector: absence then remains null.
    const comparable = plotted.filter((r) => r.value !== null).map((r) => ({ quarter: r.quarter, vertical: r.value!, horizontal: 0, total: r.value! }));
    const comparisons = fiergsPeriodComparisons(comparable, report.scope.endQuarter, { quarter: !config.rolling, contextual: !config.rolling && !config.snapshot, snapshot: config.snapshot, rolling12Months: config.rolling })
      .filter((p) => observedComparison(p.left, p.right, p.complete).visible);
    return { unit, color: TERRITORIAL_COLORS[index], base, plotted, comparisons };
  });
  const quarters = [...new Set(series.flatMap((s) => s.plotted.map((r) => r.quarter)))].sort((a,b) => quarterIndex(a) - quarterIndex(b));
  const rows = quarters.map((quarter) => Object.fromEntries([['quarter',quarter], ...series.map((s,i) => [`v${i}`, s.plotted.find((r) => r.quarter === quarter)?.value ?? null])]));
  const start = report.scope.startQuarter ?? report.scope.endQuarter;
  const years = [...new Set(quarters.map((q) => q.slice(2)))].filter((y) => quarterIndex(`1T${Number(y)}`) >= quarterIndex(start) && quarterIndex(`4T${Number(y)}`) <= quarterIndex(report.scope.endQuarter));
  const annual = series.map((s) => ({ unit: s.unit, values: years.map((year) => {
    const points = s.plotted.filter((r) => r.quarter.endsWith(year));
    const value = config.snapshot || config.rolling ? points.find((p) => p.quarter.startsWith('4T'))?.value ?? null
      : points.length === 4 && points.every((p) => p.value !== null) ? points.reduce((sum,p) => sum+p.value!,0) : null;
    return { year, value };
  }) }));
  return { ...config, series, rows, annual };
}

export function territorialOfferRows(report: PanoramaReportModel, kind: string) {
  const units = report.territorial?.units ?? [];
  const rows = (data: TerritorialProjection) => kind === 'offer-standard' ? data.granular.offerByStandard : kind === 'offer-typology' ? data.granular.offerByTypology : data.granular.cohortsVertical;
  const labels = [...new Set(units.flatMap(({data}) => rows(data).filter((r) => r.kind !== 'subtotal').map((r) => r.label)))].sort((a,b)=>{
    const rank=(label:string)=>/total/i.test(label)?10000:kind==='offer-cohort'?(/até/i.test(label)?0:Number(label.match(/\d{4}/)?.[0]??9999))
      :Math.max(0,(kind==='offer-standard'?STANDARD_ORDER:TYPOLOGY_ORDER as readonly string[]).indexOf(label));
    return rank(a)-rank(b);
  });
  return labels.map((label) => ({ label, values: units.map(({ data }) => {
    const all = rows(data); const item = all.find((r) => r.label === label); const total = all.find((r) => r.kind === 'total')?.finalUnits;
    const value = item?.finalUnits ?? null;
    return { value, percentage: value !== null && total != null && total > 0 ? value / total * 100 : null };
  }) }));
}
export function territorialPriceRows(report: PanoramaReportModel, kind: string) {
  const units = report.territorial?.units ?? [];
  const rows = (data: TerritorialProjection) => kind.includes('standard') ? data.granular.pricesByStandard : data.granular.pricesByTypology;
  const field = kind.includes('ticket') ? 'averageTicket' : 'averagePricePerMeter';
  const labels = [...new Set(units.flatMap(({data}) => rows(data).filter((r) => r.kind === 'row').map((r) => r.label)))];
  const temporal = kind === 'meter-typology' && report.scope.entity === 'fiergs-rs';
  const values = units.map(({unit,data}) => temporal ? granularPriceChartRows(territorialReportView(report,unit.id),'typology').rows.map((r)=>({label:r.label,value:r.value}))
    : rows(data).map((r)=>({label:r.label,value:r[field]})));
  const observed = labels.filter((label)=>values.some((rows)=>rows.some((r)=>r.label===label&&r.value!==null)));
  return { rows: observed.map((label) => Object.fromEntries([['label',label],...units.map((_,i) => [`v${i}`,values[i].find((r)=>r.label===label)?.value??null])])),
    omittedLabels:labels.filter((label)=>!observed.includes(label)),
    averages: units.map(({unit,data}) => ({ unit, value: temporal ? fiergsTemporalTypologyTotal(territorialReportView(report,unit.id)) : rows(data).find((r) => r.kind === 'total')?.[field] ?? null })) };
}

/** Only show annual columns with at least one observed, active comparison. */
export function territorialAnnualColumns(annual: ReturnType<typeof territorialTrend>['annual']): number[] {
  return (annual[0]?.values.slice(1) ?? []).flatMap((_, index) =>
    annual.some(({values}) => observedComparison(values[index]?.value ?? null, values[index+1]?.value ?? null).visible) ? [index+1] : []);
}


/** Ponte visual apenas entre duas observações: não cria valores, cobertura ou comparativos. */
export function temporalGapBridges(points: {quarter: string; value: number | null}[]) {
  const result: {from:{quarter:string;value:number};to:{quarter:string;value:number}}[]=[];
  let previous: number | null = null;
  points.forEach((point,index)=>{
    if(point.value===null || !Number.isFinite(point.value)) return;
    if(previous!==null && index>previous+1) result.push({from:{quarter:points[previous].quarter,value:points[previous].value!},to:{quarter:point.quarter,value:point.value}});
    previous=index;
  });
  return result;
}
