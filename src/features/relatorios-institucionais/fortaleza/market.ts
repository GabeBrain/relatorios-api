import { fortalezaPeriod, type FortalezaSelection } from './model';

export type MarketMetric = 'releases' | 'sales' | 'stock';
export type MarketRow = Record<string, unknown>;
export interface CityMarketInput {
  city: string;
  uf: 'CE';
  sampleConfirmed: boolean;
  releases: MarketRow[];
  sales: MarketRow[];
  stock: MarketRow[];
  complete: Record<MarketMetric, boolean>;
  startedAt: string;
  finishedAt: string;
  requests: number;
}
export interface MarketLine {
  city: string;
  month: string;
  group: string;
  openingStock: number;
  launches: number;
  sales: number;
  closingStock: number;
  delta: number;
}
export interface CityMarketReport {
  city: string;
  status: 'complete' | 'incomplete' | 'empty';
  issue: string | null;
  lines: MarketLine[];
  monthly: MarketLine[];
}
export interface FortalezaMarketReport {
  status: 'complete' | 'incomplete' | 'empty';
  segment: 'Vertical';
  period: ReturnType<typeof fortalezaPeriod>;
  cities: CityMarketReport[];
  monthly: MarketLine[];
  metrics: { launches: number; sales: number; stock: number } | null;
  provenance: { city: string; startedAt: string; finishedAt: string; requests: number }[];
  issues: string[];
}
export const normalizeMarketText = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const previousMonth = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
};
export function marketMonth(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return `${year}-${month}`;
}
function count(value: unknown, negative: boolean): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^-?\d+$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && (negative || number >= 0) ? number : null;
}
function sum(values: number[]) {
  const value = values.reduce((total, next) => total + next, 0);
  if (!Number.isSafeInteger(value)) throw new Error('Quantidade fora do limite seguro.');
  return value;
}
function readSource(input: CityMarketInput, source: MarketMetric, months: string[]) {
  const result = new Map<string, Map<string, { group: string; value: number }>>();
  const field = { releases: 'releases_in_period', sales: 'liquid_sales', stock: 'stock' }[source];
  for (const row of input[source]) {
    const month = marketMonth(row.period);
    const group = typeof row.group === 'string' ? row.group.trim() : '';
    const normalized = normalizeMarketText(group);
    const value = count(row[field], source === 'sales');
    if (!month || !months.includes(month) || !group || /^(total|subtotal)(\b|$)/.test(normalized) || value === null || normalizeMarketText(row.building_type) !== 'vertical') return null;
    if (row.city != null && normalizeMarketText(row.city) !== normalizeMarketText(input.city)) return null;
    if (row.state != null && String(row.state).trim().toUpperCase() !== 'CE') return null;
    const groups = result.get(month) ?? new Map();
    if (groups.has(normalized)) return null;
    groups.set(normalized, { group, value }); result.set(month, groups);
  }
  return months.every(month => result.has(month)) ? result : null;
}
export function buildCityMarket(input: CityMarketInput, selection: FortalezaSelection): CityMarketReport {
  const period = fortalezaPeriod(selection);
  const failure = (issue: string, status: CityMarketReport['status'] = 'incomplete'): CityMarketReport => ({ city: input.city, status, issue, lines: [], monthly: [] });
  if (!input.sampleConfirmed) return failure('A amostra não confirmou empreendimentos verticais neste recorte. Não há total de mercado disponível.', 'empty');
  if (input.uf !== 'CE' || !(['releases', 'sales', 'stock'] as const).every(source => input.complete[source] === true)) return failure('A coleta das fontes obrigatórias não foi concluída.');
  if (['releases', 'sales', 'stock'].every(source => !input[source as MarketMetric].length)) return failure('As fontes não retornaram observações para a janela. Ausência não representa zero.', 'empty');
  const stocks = readSource(input, 'stock', [period.opening, ...period.months]);
  const launches = readSource(input, 'releases', period.months);
  const sales = readSource(input, 'sales', period.months);
  if (!stocks || !launches || !sales) return failure('Há mês ausente, linha duplicada, recorte incompatível ou quantidade inválida. Os totais permanecem indisponíveis.');
  const expectedGroups = [...stocks.get(period.opening)!.keys()].sort().join('|');
  if ([stocks, launches, sales].some(source => [...source.values()].some(groups => [...groups.keys()].sort().join('|') !== expectedGroups))) return failure('Os padrões cobertos diferem entre meses ou fontes. Confirme o universo antes de somar.');
  const lines: MarketLine[] = [];
  const monthly: MarketLine[] = [];
  try {
    for (const month of period.months) {
      const monthLines: MarketLine[] = [];
      for (const [group, closing] of stocks.get(month)!) {
        const openingStock = stocks.get(previousMonth(month))!.get(group)!.value;
        const releases = launches.get(month)!.get(group)!.value, sold = sales.get(month)!.get(group)!.value;
        const delta = sum([closing.value, -openingStock, -releases, sold]);
        monthLines.push({ city: input.city, month, group: closing.group, openingStock, launches: releases, sales: sold, closingStock: closing.value, delta });
      }
      lines.push(...monthLines);
      const total = (field: keyof Pick<MarketLine, 'openingStock' | 'launches' | 'sales' | 'closingStock' | 'delta'>) => sum(monthLines.map(line => line[field]));
      monthly.push({ city: input.city, month, group: 'Total vertical', openingStock: total('openingStock'), launches: total('launches'), sales: total('sales'), closingStock: total('closingStock'), delta: total('delta') });
    }
  } catch { return failure('A soma excedeu o limite seguro. Confira as quantidades retornadas.'); }
  return { city: input.city, status: 'complete', issue: null, lines, monthly };
}

/** Combines complete observations only. It never turns missing cities/months into zeros. */
export function buildFortalezaMarket(selection: FortalezaSelection, requestedCities: string[], inputs: CityMarketInput[], failedCities: { city: string; error: string }[] = []): FortalezaMarketReport {
  const period = fortalezaPeriod(selection);
  const reports = requestedCities.map(city => {
    const matches = inputs.filter(input => normalizeMarketText(input.city) === normalizeMarketText(city));
    return matches.length === 1 ? buildCityMarket(matches[0], selection) : { city, status: 'incomplete' as const, issue: 'Não foi possível confirmar uma coleta única para este município.', lines: [], monthly: [] };
  });
  const report: FortalezaMarketReport = {
    status: reports.every(city => city.status === 'empty') ? 'empty' : 'incomplete', segment: 'Vertical', period, cities: reports, monthly: [], metrics: null,
    provenance: inputs.map(({ city, startedAt, finishedAt, requests }) => ({ city, startedAt, finishedAt, requests })),
    issues: [...failedCities.map(city => `${city.city}: ${city.error}`), ...reports.filter(city => city.issue).map(city => `${city.city}: ${city.issue}`)],
  };
  if (!requestedCities.length || new Set(requestedCities.map(normalizeMarketText)).size !== requestedCities.length || inputs.length !== reports.length || failedCities.length || reports.some(city => city.status !== 'complete')) return report;
  try {
    report.monthly = period.months.map(month => {
      const lines = reports.map(city => city.monthly.find(line => line.month === month)!);
      const total = (field: keyof Pick<MarketLine, 'openingStock' | 'launches' | 'sales' | 'closingStock' | 'delta'>) => sum(lines.map(line => line[field]));
      return { city: 'Conjunto selecionado', month, group: 'Total vertical', openingStock: total('openingStock'), launches: total('launches'), sales: total('sales'), closingStock: total('closingStock'), delta: total('delta') };
    });
    report.metrics = { launches: sum(report.monthly.map(line => line.launches)), sales: sum(report.monthly.map(line => line.sales)), stock: report.monthly.at(-1)!.closingStock };
    report.status = 'complete';
  } catch { report.monthly = []; report.metrics = null; report.issues.push('O consolidado excedeu o limite seguro.'); return report; }
  const divergent = reports.flatMap(city => city.lines).filter(line => line.delta !== 0);
  if (divergent.length) report.issues.push(`${divergent.length} balanço(s) por município, mês e padrão apresentam diferenças. Os valores informados foram preservados; a causa precisa ser reconciliada.`);
  return report;
}
