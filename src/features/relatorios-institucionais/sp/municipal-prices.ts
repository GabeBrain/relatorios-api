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
  bedroomFourGroup?: '4' | '4+';
  sources: { metric: SpPriceMetric; grouping: SpPriceGrouping; rows: number; issue?: string; coverage?: { month: string; groups: string[]; ticketValues: number; meterValues: number }[] }[];
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
  if (/^4\s*(quartos?|dormitorios?)?$/.test(group)) return '4';
  if (/^4\s*\+\s*(quartos?|dormitorios?)?$/.test(group) || /^4 ou mais (quartos|dormitorios)$/.test(group) || /^4 (quartos|dormitorios) ou mais$/.test(group)) return '4+';
  return null;
}
const change = (now: number | null, before: number | null) => {
  const value = now !== null && before !== null && before > 0 ? (now - before) / before * 100 : null;
  return value !== null && Number.isFinite(value) ? value : null;
};
export function buildSpMunicipalPrices(sources: SpPriceSource[], report: SpPreview): SpMunicipalPrices {
  const periods = spPricePeriods(report);
  // Keep exactly four distinct from an explicit four-or-more category. Never
  // fill gaps in one category with the other category's observations.
  const bedroomFourGroup = sources.some(source => source.grouping === 'Tipologia' && source.rows.some(row => groupOf(row, 'Tipologia') === '4+')) ? '4+' : '4';
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
  for (const [slide, grouping, group] of [[53, 'overall', 'Geral'], [54, 'Tipologia', '1'], [56, 'Tipologia', '2'], [58, 'Tipologia', '3'], [59, 'Tipologia', bedroomFourGroup]] as const) {
    const all = periods.map(period => ({ ...period, ...read('medium-prices-meter', grouping, group, period.month) }));
    series[slide] = all.slice(1).map((point, i) => ({ ...point, variation: change(point.value, all[i].value) }));
    const before = `${Number(report.throughMonth!.slice(0, 4)) - 1}${report.throughMonth!.slice(4)}`;
    annualChanges[slide] = change(all.at(-1)!.value, read('medium-prices-meter', grouping, group, before).value);
  }
  const closing = ([['overall', ['Geral']], ['Padrão', SP_PRICE_STANDARDS], ['Tipologia', ['1', '2', '3', bedroomFourGroup]]] as const).flatMap(([grouping, groups]) => groups.map(group => {
    const ticket = read('medium-prices', grouping, group, report.throughMonth!), meter = read('medium-prices-meter', grouping, group, report.throughMonth!);
    return { grouping, group, ticket: ticket.value, meter: meter.value, issues: [ticket.issue, meter.issue].filter((issue): issue is string => !!issue) };
  }));
  return { method: 'geobrain-reported-prices-v1', bedroomFourGroup, sources: sources.map(source => {
    const months = [...new Set(source.rows.map(row => monthOf(row.period)).filter((month): month is string => !!month))].sort();
    const coverage = months.map(month => {
      const rows = source.rows.filter(row => monthOf(row.period) === month && normalize(row.building_type) === 'vertical');
      const valid = (field: string) => rows.filter(row => (typeof row[field] === 'number' || typeof row[field] === 'string' && String(row[field]).trim()) && Number.isFinite(Number(row[field])) && Number(row[field]) > 0 && Number(row[field]) <= Number.MAX_SAFE_INTEGER / 100).length;
      return { month, groups: [...new Set(rows.map(row => String(row.group ?? '').slice(0, 80)))].sort(), ticketValues: valid('average_price'), meterValues: valid('average_price_per_meter') };
    });
    return { metric: source.metric, grouping: source.grouping, rows: source.rows.length, issue: source.issue, coverage };
  }), series, annualChanges, closing };
}

export type SpPriceMethod = 'municipal-reported' | 'granular-stock-weighted';

/** Select whole series, not individual points: gaps never bridge two methods. */
export function spDisplayPrices(report: SpPreview) {
  const granular = report.granularDetails?.status === 'ready' ? report.granularDetails.prices : undefined;
  const municipal = report.municipalPrices;
  const seriesMethods: Record<number, SpPriceMethod> = {};
  for (const slide of [53,54,55,56,57,58,59]) seriesMethods[slide] = 'granular-stock-weighted';
  const overallMethods: Record<'ticket' | 'meter', SpPriceMethod> = { ticket:'granular-stock-weighted', meter:'granular-stock-weighted' };
  const notices: { slides:number[]; reason:string }[] = [];
  if (!municipal) return granular ? { ...granular, seriesMethods, overallMethods, notices } : undefined;
  const series = { ...granular?.series, ...municipal.series };
  const annualChanges = { ...granular?.annualChanges, ...municipal.annualChanges };
  for (const slide of [53,54,56,58,59]) seriesMethods[slide] = 'municipal-reported';
  // The live ungrouped endpoint returned seven anonymous rows per month. It
  // does not establish a city mean. Keep the existing checked calculation,
  // identify its method everywhere, and retain all of its historical gaps.
  if (!municipal.series[53]?.some(point => point.value !== null) && granular?.series[53]?.some(point => point.value !== null)) {
    series[53] = granular.series[53];
    annualChanges[53] = granular.annualChanges[53];
    seriesMethods[53] = 'granular-stock-weighted';
    notices.push({ slides:[53], reason:'Sem média geral municipal única. Série calculada pelas unidades em oferta, com as lacunas da conferência granular preservadas.' });
  }
  const municipalOverall = municipal.closing.find(row => row.grouping === 'overall');
  const overall = { units:report.metrics.stock ?? 0, ticket:municipalOverall?.ticket ?? null, meter:municipalOverall?.meter ?? null, issues:municipalOverall?.issues ?? [] };
  for (const field of ['ticket','meter'] as const) {
    overallMethods[field] = 'municipal-reported';
    const checked = granular?.overall;
    if (overall[field] === null && checked && !checked.partial && checked[field] !== null) {
      overall[field] = checked[field];
      overallMethods[field] = 'granular-stock-weighted';
      notices.push({ slides:[field === 'ticket' ? 61 : 62], reason:'A linha geral é calculada pelas unidades em oferta; as barras por padrão são informadas pela Geobrain. Métodos distintos para conferência, sem média das médias dos padrões.' });
    }
  }
  return { series, annualChanges, seriesMethods, overallMethods, notices, overall,
    standards: SP_PRICE_STANDARDS.map(group => { const row = municipal.closing.find(row => row.grouping === 'Padrão' && row.group === group); return { group, ticket:row?.ticket ?? null, meter:row?.meter ?? null, issues:row?.issues ?? [], units:report.patterns?.rows.find(row => row.group === group)?.stock ?? 0 }; }) };
}

/** Bedroom cards require a common population and method for total/MCMV/MAP.
 * The municipal endpoint has no such cross-tabulation; keep the checked
 * granular card intact instead of blanking its calculated components.
 */
export function spDisplayMarket(report: SpPreview) {
  return report.granularDetails?.market;
}
