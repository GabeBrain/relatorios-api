import type { PriceCollection } from './monthly-prices';
import { fortalezaPeriod, type FortalezaSelection } from './model';
import { marketMonth, normalizeMarketText, type MarketRow } from './market';
import type { IntroData } from './intro-data';
import { introMonth } from './intro-view';
import type { MonthlyMarketData } from './monthly-market';

export const FORTALEZA_STANDARDS = ['Econômico', 'Compacto', 'Standard', 'Médio', 'Médio-Alto', 'Alto', 'Luxo'] as const;
export interface LaunchBin { month: string; label: string; economic: number; other: number; total: number }
export interface LaunchSeries {
  status: 'ready' | 'blocked'; issue: string | null;
  history: LaunchBin[]; accumulated: LaunchBin[];
  changes: { total: number | null; economic: number | null; other: number | null };
}
export interface MonthlyLaunchSource {
  city: string; rows: MarketRow[]; complete: boolean; requests: number; startedAt: string; finishedAt: string;
}
export interface MonthlyLaunchData { scopeKey?: string; sources: MonthlyLaunchSource[]; issues: string[]; market?: MonthlyMarketData; prices?: PriceCollection }
export function monthlyLaunchMonths(selection: FortalezaSelection) {
  if (selection.periodicity !== 'monthly') throw new Error('O histórico mensal exige uma referência mensal.');
  fortalezaPeriod(selection);
  return Array.from({ length: 25 }, (_, index) => new Date(Date.UTC(selection.year, selection.position - 25 + index, 1)).toISOString().slice(0, 7));
}
export const blockedLaunchSeries = (issue: string): LaunchSeries => ({ status: 'blocked', issue, history: [], accumulated: [], changes: { total: null, economic: null, other: null } });
const blankBin = (month: string): LaunchBin => ({ month, label: `${introMonth(Number(month.slice(5)), true)}/${month.slice(2, 4)}`, economic: 0, other: 0, total: 0 });
const standardKey = (value: unknown) => FORTALEZA_STANDARDS.find(standard => normalizeMarketText(standard) === normalizeMarketText(value));
export function monthlyLaunchSourceIssue(source: MonthlyLaunchSource, selection: FortalezaSelection): string | null {
  const months = monthlyLaunchMonths(selection), seen = new Set<string>();
  if (!source.complete) return `${source.city}: histórico mensal não concluído.`;
  for (const row of source.rows) {
    const month = marketMonth(row.period), standard = standardKey(row.group);
    const value = typeof row.releases_in_period === 'number' ? row.releases_in_period : typeof row.releases_in_period === 'string' && /^\d+$/.test(row.releases_in_period) ? Number(row.releases_in_period) : NaN;
    if (!month || !months.includes(month) || !standard || !Number.isSafeInteger(value) || value < 0 || normalizeMarketText(row.building_type) !== 'vertical' || row.city != null && normalizeMarketText(row.city) !== normalizeMarketText(source.city) || row.state != null && normalizeMarketText(row.state) !== 'ce') return `${source.city}: linha inválida ou fora do recorte do histórico de lançamentos.`;
    const key = `${month}/${standard}`;
    if (seen.has(key)) return `${source.city}: há mês/padrão duplicado.`;
    seen.add(key);
  }
  return seen.size === months.length * FORTALEZA_STANDARDS.length ? null : `${source.city}: faltam meses ou padrões explícitos. Ausência não representa zero.`;
}
function finish(history: LaunchBin[], selection: FortalezaSelection): LaunchSeries {
  const accumulated = [selection.year - 1, selection.year].map(year => {
    const bins = history.filter(bin => bin.month >= `${year}-01` && bin.month <= `${year}-${String(selection.position).padStart(2, '0')}`);
    const economic = bins.reduce((sum, bin) => sum + bin.economic, 0), other = bins.reduce((sum, bin) => sum + bin.other, 0);
    return { month: `${year}-${String(selection.position).padStart(2, '0')}`, label: `Jan-${introMonth(selection.position, true)}/${year}`, economic, other, total: economic + other };
  });
  if ([...history, ...accumulated].some(bin => ![bin.economic, bin.other, bin.total].every(Number.isSafeInteger))) return blockedLaunchSeries('A soma excedeu o limite numérico seguro.');
  const difference = (now: number, before: number) => before === 0 ? null : (now - before) / before * 100;
  return { status: 'ready', issue: null, history, accumulated, changes: {
    total: difference(history.at(-1)!.total, history.at(-13)!.total),
    economic: difference(accumulated[1].economic, accumulated[0].economic),
    other: difference(accumulated[1].other, accumulated[0].other),
  } };
}
/** Distinct projects from the checked registry. This is not a reconstruction of historical samples. */
export function monthlyProjectLaunches(data: IntroData | null, selection: FortalezaSelection, cities: string[]): LaunchSeries {
  const failure = (issue: string) => blockedLaunchSeries(issue);
  if (!cities.some(city => normalizeMarketText(city) === 'fortaleza')) return failure('Fortaleza não integra o recorte autorizado.');
  if (data?.status !== 'ready') return failure('O cadastro de empreendimentos ainda não foi conferido.');
  const months = monthlyLaunchMonths(selection), bins = new Map(months.map(month => [month, blankBin(month)]));
  const seen = new Set<string>();
  for (const project of data.projects) {
    if (normalizeMarketText(project.city) !== 'fortaleza' || normalizeMarketText(project.type) !== 'vertical') continue;
    const month = marketMonth(project.date);
    if (!month) return failure('Há empreendimento vertical da capital sem data válida.');
    if (!bins.has(month)) continue;
    const standard = standardKey(project.standard);
    if (!standard || !project.id || seen.has(project.id)) return failure('Há padrão desconhecido ou ID ausente/duplicado no cadastro vertical da capital.');
    seen.add(project.id);
    const bin = bins.get(month)!;
    bin[standard === 'Econômico' ? 'economic' : 'other']++; bin.total++;
  }
  return finish([...bins.values()], selection);
}
/** All seven standard rows must be explicit, including real zeros, in every city/month. */
export function monthlyUnitLaunches(data: MonthlyLaunchData | null, selection: FortalezaSelection, cities: string[], region: 'capital' | 'rm'): LaunchSeries {
  const required = region === 'capital' ? ['Fortaleza'] : ['Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú'];
  if (required.some(city => !cities.some(value => normalizeMarketText(value) === normalizeMarketText(city)))) return blockedLaunchSeries('O recorte não inclui todos os municípios desta análise.');
  const months = monthlyLaunchMonths(selection), bins = new Map(months.map(month => [month, blankBin(month)]));
  for (const city of required) {
    const sources = data?.sources.filter(source => normalizeMarketText(source.city) === normalizeMarketText(city)) ?? [];
    if (sources.length !== 1 || !sources[0].complete) return blockedLaunchSeries(`${city}: histórico mensal não concluído.`);
    const issue = monthlyLaunchSourceIssue(sources[0], selection);
    if (issue) return blockedLaunchSeries(issue);
    for (const row of sources[0].rows) {
      const month = marketMonth(row.period)!;
      const standard = standardKey(row.group)!;
      const value = Number(row.releases_in_period);
      const bin = bins.get(month)!;
      bin[standard === FORTALEZA_STANDARDS[0] ? 'economic' : 'other'] += value;
      bin.total += value;
    }
  }
  return finish([...bins.values()], selection);
}
