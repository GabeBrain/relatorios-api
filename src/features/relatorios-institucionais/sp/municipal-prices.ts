import { shiftQuarter } from '@/features/panorama-secovi-fiergs/domain/quarters';
import type { SpPreview } from './model';
import { monthOf } from './model';
import { quarterMonths } from './temporal';
import { SP_PRICE_STANDARDS, type SpPricePoint } from './granular-details';

export type SpPriceGrouping = 'overall' | 'Padrão' | 'Tipologia';
export type SpPriceMetric = 'medium-prices' | 'medium-prices-meter';
export interface SpPriceSource {
  metric: SpPriceMetric; grouping: SpPriceGrouping;
  rows: Record<string, unknown>[]; issue?: string;
}
export interface SpMunicipalPrices {
  method: 'geobrain-reported-prices-v1';
  sources: { metric: SpPriceMetric; grouping: SpPriceGrouping; rows: number; issue?: string }[];
  series: Record<number, SpPricePoint[]>;
  annualChanges: Record<number, number | null>;
  closing: { grouping: SpPriceGrouping; group: string; ticket: number | null; meter: number | null; issues: string[] }[];
}
export function spPricePeriods(report: SpPreview) {
  return Array.from({ length: 14 }, (_, i) => {
    const label = shiftQuarter(report.quarter, i - 13);
    return { label, month: i === 13 ? report.throughMonth! : quarterMonths(label)[2] };
  });
}
const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
function groupOf(row: Record<string, unknown>, grouping: SpPriceGrouping): string | null {
  const group = normalize(row.group);
  // An ungrouped query may default to pattern groups on the provider. Those
  // rows must never be averaged or mistaken for an explicit city aggregate.
  if (grouping === 'overall') return ['', 'geral', 'total', 'vertical'].includes(group) ? 'Geral' : null;
  if (grouping === 'Padrão') return SP_PRICE_STANDARDS.find(label => normalize(label) === group) ?? null;
  if (/^(1|2|3)$/.test(group)) return group;
  if (/^([123])\s*(quartos?|dormitorios?)$/.test(group)) return group[0];
  if (/^4\s*\+\s*(quartos?|dormitorios?)?$/.test(group) || /^4 ou mais (quartos|dormitorios)$/.test(group) || /^4 (quartos|dormitorios) ou mais$/.test(group)) return '4+';
  return null;
}
const change = (now: number | null, before: number | null) => {
  const value = now !== null && before !== null && before > 0 ? (now - before) / before * 100 : null;
  return value !== null && Number.isFinite(value) ? value : null;
};
export function buildSpMunicipalPrices(sources: SpPriceSource[], report: SpPreview): SpMunicipalPrices {
  const periods = spPricePeriods(report);
  const read = (metric: SpPriceMetric, grouping: SpPriceGrouping, group: string, month: string) => {
    const source = sources.find(item => item.metric === metric && item.grouping === grouping);
    const missing = { value: null, issue: source?.issue ?? `Preço municipal de ${group} não informado em ${month}; nenhuma média de grupos foi presumida.` };
    if (!source || source.issue) return missing;
    const monthly = source.rows.filter(row => monthOf(row.period) === month && normalize(row.building_type) === 'vertical');
    if (grouping === 'Padrão' && monthly.some(row => ['super luxo','super-luxo'].includes(normalize(row.group)))) return { value: null, issue: `Classificação legada de padrões em ${month}; confirme o mapeamento antes de comparar os preços.` };
    const candidates = monthly.filter(row => groupOf(row, grouping) === group);
    if (candidates.length !== 1) return { value: null, issue: candidates.length > 1 ? `Preço municipal duplicado para ${group} em ${month}.` : missing.issue };
    const row = candidates[0], raw = row[metric === 'medium-prices' ? 'average_price' : 'average_price_per_meter'];
    const value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
    return Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER / 100 ? { value, issue: undefined } : { value: null, issue: `Preço municipal ausente ou inválido para ${group} em ${month}.` };
  };
  const series: SpMunicipalPrices['series'] = {}, annualChanges: SpMunicipalPrices['annualChanges'] = {};
  for (const [slide, grouping, group] of [[53, 'overall', 'Geral'], [54, 'Tipologia', '1'], [56, 'Tipologia', '2'], [58, 'Tipologia', '3'], [59, 'Tipologia', '4+']] as const) {
    const all = periods.map(period => ({ ...period, ...read('medium-prices-meter', grouping, group, period.month) }));
    series[slide] = all.slice(1).map((point, i) => ({ ...point, variation: change(point.value, all[i].value) }));
    const before = `${Number(report.throughMonth!.slice(0, 4)) - 1}${report.throughMonth!.slice(4)}`;
    annualChanges[slide] = change(all.at(-1)!.value, read('medium-prices-meter', grouping, group, before).value);
  }
  const closing = ([['overall', ['Geral']], ['Padrão', SP_PRICE_STANDARDS], ['Tipologia', ['1', '2', '3', '4+']]] as const).flatMap(([grouping, groups]) => groups.map(group => {
    const ticket = read('medium-prices', grouping, group, report.throughMonth!), meter = read('medium-prices-meter', grouping, group, report.throughMonth!);
    return { grouping, group, ticket: ticket.value, meter: meter.value, issues: [ticket.issue, meter.issue].filter((issue): issue is string => !!issue) };
  }));
  return { method: 'geobrain-reported-prices-v1', sources: sources.map(source => ({ metric: source.metric, grouping: source.grouping, rows: source.rows.length, issue: source.issue })), series, annualChanges, closing };
}

/** Preserve the granular calculation as an audit baseline, never a silent fallback. */
export function spDisplayPrices(report: SpPreview) {
  const granular = report.granularDetails?.prices, municipal = report.municipalPrices;
  if (!municipal) return granular;
  const overall = municipal.closing.find(row => row.grouping === 'overall')!;
  return { series: { ...granular?.series, ...municipal.series }, annualChanges: { ...granular?.annualChanges, ...municipal.annualChanges },
    overall: { units: report.metrics.stock ?? 0, ticket: overall.ticket, meter: overall.meter, issues: overall.issues },
    standards: SP_PRICE_STANDARDS.map(group => { const row = municipal.closing.find(row => row.grouping === 'Padrão' && row.group === group)!; return { ...row, units: report.patterns?.rows.find(row => row.group === group)?.stock ?? 0 }; }) };
}

export function spDisplayMarket(report: SpPreview) {
  const market = report.granularDetails?.market;
  if (!market || !report.municipalPrices) return market;
  return { ...market, prices: market.prices.map(price => {
    const source = report.municipalPrices!.closing.find(row => row.grouping === 'Tipologia' && row.group === (price.bedroom === 4 ? '4+' : String(price.bedroom)))!;
    const unavailable = { ticket: null, meter: null, issues: ['Detalhamento municipal por dormitório e MCMV/MAP ainda não informado.'] };
    return { ...price, ticket: source.ticket, meter: source.meter, issues: source.issues, mcmv: { ...price.mcmv, ...unavailable }, map: { ...price.map, ...unavailable } };
  }) };
}
