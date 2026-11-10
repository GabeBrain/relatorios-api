import { FORTALEZA_CITIES, fortalezaPeriod, type FortalezaSelection } from './model';
import { marketMonth, normalizeMarketText, type MarketRow } from './market';
import { FORTALEZA_STANDARDS, monthlyLaunchMonths } from './monthly-launches';
import { introMonth } from './intro-view';
import incc from './incc-di.json';

export type MonthlySegment = 'Vertical' | 'Horizontal' | 'Comercial';
export type MonthlyMetric = 'releases' | 'sales' | 'stock';
export interface MonthlyMarketSource { city: string; segment: MonthlySegment; metric: MonthlyMetric; complete: boolean; rows: MarketRow[]; issue: string | null; requests: number; startedAt: string; finishedAt: string }
export interface MonthlyMarketData { scopeKey: string; months: string[]; sources: MonthlyMarketSource[]; issues: string[] }
export interface MonthlyBin { month: string; label: string; first: number; second: number; total: number }
export interface MonthlySlideData {
  status: 'ready' | 'blocked'; issue: string | null; warnings: string[];
  history: MonthlyBin[]; accumulated: MonthlyBin[];
  changes: { total: number | null; first: number | null; second: number | null };
  labels: [string, string]; unit: 'unidades' | 'milhões'; baseMonth?: string; sourceKeys: string[];
  rolling?: { month: string; label: string; launches: number; sales: number }[];
  stockChanges?: { year:number|null; twoYears:number|null };
}
export function monthlyMarketMonths(selection: FortalezaSelection) {
  return monthlyLaunchMonths(selection);
}
const socioeconomic = new Set(FORTALEZA_STANDARDS.map(normalizeMarketText));
const houseLabels = new Set(['condominio de casas/sobrados', 'condominio de casas e sobrados', 'condominio de casas', 'casas em condominio', 'casas em condominio fechado']);
const lotLabels = new Set(['loteamento aberto', 'loteamento fechado']);
export type MonthlyProduct = 'vertical' | 'houses' | 'lots' | 'commercial' | 'excluded' | 'unknown';
/** Own Fortaleza contract: the original tables distinguish socioeconomic houses from named lot products. No name heuristics. */
export function monthlyProduct(segment: MonthlySegment, group: unknown): MonthlyProduct {
  const key = normalizeMarketText(group);
  if (segment === 'Vertical') return socioeconomic.has(key) ? 'vertical' : 'unknown';
  if (segment === 'Comercial') return socioeconomic.has(key) || ['comercial', 'salas comerciais', 'lojas'].includes(key) ? 'commercial' : 'unknown';
  if (lotLabels.has(key)) return 'lots';
  if (houseLabels.has(key) || socioeconomic.has(key)) return 'houses';
  if (['condominio de chacaras', 'loteamento comercial', 'terreno'].includes(key)) return 'excluded';
  return 'unknown';
}
export function monthlyMarketSourceIssue(source: MonthlyMarketSource, months: string[]): string | null {
  if (!source.complete) return source.issue || 'Coleta não concluída.';
  if (!source.rows.length) return 'A fonte não retornou observações. Ausência não representa zero.';
  const seen = new Set<string>(), groups = new Set<string>(), observed = new Set<string>();
  for (const row of source.rows) {
    const month = marketMonth(row.period), group = normalizeMarketText(row.group);
    if (!month || !months.includes(month) || !group || monthlyProduct(source.segment, group) === 'unknown' || normalizeMarketText(row.building_type) !== normalizeMarketText(source.segment)
      || row.city != null && normalizeMarketText(row.city) !== normalizeMarketText(source.city) || row.state != null && normalizeMarketText(row.state) !== 'ce') return 'Linha fora do recorte, competência ou categoria não reconhecida.';
    const value = readMonthlyNumber(row[{ releases:'releases_in_period',sales:'liquid_sales',stock:'stock' }[source.metric]], source.metric === 'sales', true);
    if (value === null) return 'Quantidade ausente ou inválida.';
    const key = `${month}/${group}`;
    if (seen.has(key)) return 'Mês/padrão duplicado na fonte.';
    seen.add(key); groups.add(group); observed.add(month);
  }
  if (source.segment === 'Vertical' && (groups.size !== FORTALEZA_STANDARDS.length || FORTALEZA_STANDARDS.some(group => !groups.has(normalizeMarketText(group))))) return 'Faltam padrões verticais explícitos.';
  if (observed.size !== months.length || seen.size !== months.length * groups.size) return 'Faltam meses ou categorias explícitas. Ausência não representa zero.';
  return null;
}
export function readMonthlyNumber(raw: unknown, signed = false, integer = false): number | null {
  if (typeof raw !== 'number' && (typeof raw !== 'string' || !raw.trim())) return null;
  const value = Number(raw);
  return Number.isFinite(value) && (signed || value >= 0) && (!integer || Number.isSafeInteger(value)) && Math.abs(value) <= Number.MAX_SAFE_INTEGER / (integer ? 1 : 100) ? value : null;
}
export function blockedMonthlySlide(issue: string, labels: [string, string] = ['Fortaleza', 'Região Metropolitana']): MonthlySlideData {
  return { status: 'blocked', issue, warnings: [], history: [], accumulated: [], changes: { total: null, first: null, second: null }, labels, unit: 'unidades', sourceKeys: [] };
}
const dateLabel = (month: string) => `${introMonth(Number(month.slice(5)), true)}/${month.slice(2, 4)}`;
const blank = (month: string): MonthlyBin => ({ month, label: dateLabel(month), first: 0, second: 0, total: 0 });
const difference = (now: number, before: number) => before <= 0 ? null : (now - before) / before * 100;
export const monthlySourceKey = (source: Pick<MonthlyMarketSource, 'city' | 'segment' | 'metric'>) => `${source.city}/${source.segment}/${source.metric}`;

/** Month-by-month aggregation first, then equal-window YTD. Monetary correction never applies to unit counts. */
export function buildMonthlySlide(page: number, data: MonthlyMarketData | null, selection: FortalezaSelection, cities: string[], indices: Readonly<Record<string, number>> = incc.indices): MonthlySlideData {
  const pattern = [17,23,25,28,34,35].includes(page), rmOnly = [14,25,26,35].includes(page), lots = [19,20,30,31].includes(page), money = [16,17,20,27,28,31].includes(page);
  const stockPage = [33,34,35].includes(page), rollingPage = page === 24 || page === 26;
  const labels: [string, string] = pattern ? ['Padrão Econômico', 'Demais Padrões'] : page === 14 ? ['Residencial Vertical', 'Casas e Sobrados'] : ['Fortaleza', 'Região Metropolitana'];
  const block = (issue: string) => ({ ...blockedMonthlySlide(issue, labels), unit: money ? 'milhões' as const : 'unidades' as const });
  if (![12,14,16,17,19,20,22,23,24,25,26,27,28,30,31,33,34,35].includes(page)) return block('Lâmina sem contrato de cálculo.');
  const required = rmOnly ? FORTALEZA_CITIES.filter(city => city !== 'Fortaleza') : pattern || page === 24 || page === 34 ? ['Fortaleza'] : [...FORTALEZA_CITIES];
  if (required.some(city => !cities.some(value => normalizeMarketText(value) === normalizeMarketText(city)))) return block('O recorte não inclui todos os municípios desta análise.');
  const months = monthlyMarketMonths(selection), visibleMonths = months.slice(-25), bins = new Map(months.map(month => [month, blank(month)]));
  const metrics: MonthlyMetric[] = rollingPage ? ['releases','sales'] : stockPage ? ['stock'] : [22,23,25,27,28,30,31].includes(page) ? ['sales'] : ['releases'];
  const segments: MonthlySegment[] = pattern || rollingPage || page === 34 || page === 35 ? ['Vertical'] : lots ? ['Horizontal'] : page === 14 || page === 33 ? ['Vertical','Horizontal'] : ['Vertical','Horizontal','Comercial'];
  const baseMonth = fortalezaPeriod(selection).end.slice(0,7), warnings = new Set<string>(), sourceKeys: string[] = [];
  if (money && (!Number.isFinite(indices[baseMonth]) || indices[baseMonth] <= 0)) return block(`Falta INCC-DI para ${baseMonth}. Atualize os índices; não usamos uma base anterior silenciosamente.`);
  for (const city of required) for (const segment of segments) for (const metric of metrics) {
    const sources = data?.sources.filter(source => normalizeMarketText(source.city) === normalizeMarketText(city) && source.segment === segment && source.metric === metric) ?? [];
    if (sources.length !== 1) return block(`${city}/${segment}/${metric}: fonte não concluída.`);
    const source = sources[0], issue = monthlyMarketSourceIssue(source, months);
    if (issue) return block(`${city}/${segment}/${metric}: ${issue}`);
    if (segment === 'Horizontal' && !source.rows.some(row => monthlyProduct(segment,row.group) === (lots ? 'lots' : 'houses'))) return block(`${city}: a fonte horizontal não identifica explicitamente ${lots ? 'loteamentos' : 'casas e sobrados'}, inclusive zeros.`);
    sourceKeys.push(monthlySourceKey(source));
    for (const row of source.rows) {
      const product = monthlyProduct(segment, row.group);
      if (product === 'excluded') { warnings.add(`${city}: produtos fora do universo do bloco foram preservados na auditoria e excluídos do cálculo.`); continue; }
      if (lots ? product !== 'lots' : product === 'lots') continue;
      const month = marketMonth(row.period)!, bin = bins.get(month)!;
      let value = readMonthlyNumber(row[{ releases:'releases_in_period',sales:'liquid_sales',stock:'stock' }[metric]], metric === 'sales', true)!;
      if (money) {
        const nominal = readMonthlyNumber(row[metric === 'sales' ? 'vgv_liquid_sales' : 'vgv_release'],metric === 'sales');
        if (nominal === null || !Number.isFinite(indices[month]) || indices[month] <= 0) return block(`${city}: faltam valores nominais ou INCC-DI na competência ${month}.`);
        value = nominal * indices[baseMonth] / indices[month] / 1_000_000;
      }
      const first = rollingPage ? metric === 'releases' : pattern ? normalizeMarketText(row.group) === 'economico' : page === 14 ? segment === 'Vertical' : city === 'Fortaleza';
      bin[first ? 'first' : 'second'] += value; bin.total += value;
    }
  }
  if ([...bins.values()].some(bin => ![bin.first,bin.second,bin.total].every(value => Number.isFinite(value) && Math.abs(value) < Number.MAX_SAFE_INTEGER / 100))) return block('O agregado excede a precisão numérica segura.');
  const history = visibleMonths.map(month => bins.get(month)!);
  const accumulated = stockPage ? [] : [selection.year - 1, selection.year].map(year => {
    const values = [...bins.values()].filter(bin => bin.month >= `${year}-01` && bin.month <= `${year}-${String(selection.position).padStart(2,'0')}`);
    const first = values.reduce((sum, bin) => sum + bin.first,0), second = values.reduce((sum, bin) => sum + bin.second,0);
    return { month: `${year}-${String(selection.position).padStart(2,'0')}`, label: `Jan-${introMonth(selection.position,true)}/${year}`, first, second, total: first + second };
  });
  if (accumulated.some(bin => ![bin.first,bin.second,bin.total].every(value => Number.isFinite(value) && Math.abs(value) < Number.MAX_SAFE_INTEGER / 100))) return block('O acumulado excede a precisão numérica segura.');
  const result: MonthlySlideData = { status: 'ready', issue: null, warnings: [...warnings], history, accumulated, changes: { total: difference(history.at(-1)!.total, history.at(-13)!.total), first: stockPage ? null : difference(accumulated[1].first,accumulated[0].first), second: stockPage ? null : difference(accumulated[1].second,accumulated[0].second) }, labels, unit: money ? 'milhões' : 'unidades', ...(money ? { baseMonth } : {}), sourceKeys };
  if (rollingPage) result.rolling = visibleMonths.slice(-13).map(month => {
    const index = months.indexOf(month), window = months.slice(index - 11,index + 1).map(key => bins.get(key)!);
    return { month, label: dateLabel(month), launches: window.reduce((sum, bin) => sum + bin.first,0), sales: window.reduce((sum, bin) => sum + bin.second,0) };
  });
  if (stockPage) {
    result.accumulated = []; // Snapshots never become a YTD stock sum.
    result.stockChanges = { year:difference(history.at(-1)!.total,history.at(-13)!.total),twoYears:difference(history.at(-1)!.total,history[0].total) };
    result.changes = { total:result.stockChanges.year,first:null,second:null };
  }
  if (result.rolling?.some(row => !Number.isSafeInteger(row.launches) || !Number.isSafeInteger(row.sales))) return block('A janela móvel excede o limite numérico seguro.');
  return result;
}
