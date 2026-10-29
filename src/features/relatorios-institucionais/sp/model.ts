import { isQuarter, quarterEndMonth } from '@/features/panorama-secovi-fiergs/domain/quarters';
import { safeNumber } from '@/features/panorama-secovi-fiergs/lib/launches';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';

export const SP_INSTITUTIONAL = { id: 'sp-institucional', label: 'SP institucional', uf: 'SP', city: 'São Paulo' } as const;
type Raw = Record<string, unknown>;
export interface SpInput {
  origin: 'fixture'; // Live transport/method approval is a later gate. No production export in this slice.
  uf: string;
  city: string;
  buildings: Raw[];
  sales: Raw[];
  stock: Raw[];
  coverage: { buildings: boolean; sales: boolean; stock: boolean };
}
export interface SpMetrics { projects: number | null; launches: number | null; sales: number | null; stock: number | null }
export interface SpCheck { label: string; expected: number; actual: number; delta: number; kind?: 'balance' }
export interface SpDistribution {
  status: 'ready' | 'blocked';
  issues: string[];
  rows: { group: string; launches: number; sales: number; stock: number }[];
  checks: SpCheck[];
}
export type SpTypologies = SpDistribution;
export interface SpLaunchHistory {
  status: 'ready' | 'blocked';
  issues: string[];
  rows: { currentMonth: string; previousMonth: string; current: number; previous: number; delta: number; variation: number | null }[];
  totals: { current: number; previous: number; delta: number; variation: number | null } | null;
  checks: SpCheck[];
}
export type SpHistoryMetric = 'launches' | 'sales' | 'stock';
export interface SpHistoryBatch {
  status: 'ready' | 'blocked';
  issues: string[];
  comparisons: Partial<Record<SpHistoryMetric, SpLaunchHistory>>;
  segments?: { current: SpDistribution; previous: SpDistribution; currentMonth: string; previousMonth: string };
  segmentDetails?: Record<string, Record<SpHistoryMetric, SpLaunchHistory>>;
  patternDetails?: Record<string, Record<SpHistoryMetric, SpLaunchHistory>>;
  checks: SpCheck[];
}
export interface SpPreview {
  entity: typeof SP_INSTITUTIONAL.id;
  quarter: Quarter;
  status: 'ready' | 'partial' | 'quarter-closed' | 'awaiting-closure' | 'incomplete' | 'empty' | 'invalid';
  closingMonth: string | null;
  metrics: SpMetrics;
  issues: string[];
  checks: SpCheck[];
  ignoredHistoryRows: number;
  balanceByGroup?: (SpCheck & { month: string; group: string })[];
  source?: 'fixture' | 'api' | 'recorded-api';
  throughMonth?: string;
  monthly?: { month: string; launches: number; sales: number; openingStock: number; closingStock: number; delta: number }[];
  typologies?: SpTypologies;
  patterns?: SpDistribution;
  launchHistory?: SpLaunchHistory;
  historyBatch?: SpHistoryBatch;
}
/** Municipal coverage is independent of granular coverage and final report approval. */
export function isSpMunicipalPreview(report: SpPreview | null | undefined): report is SpPreview & { status: 'partial' | 'quarter-closed' } {
  return Boolean(report && ['api', 'recorded-api'].includes(report.source ?? '') && ['partial', 'quarter-closed'].includes(report.status));
}

export function spPeriodLabel(report: SpPreview): string {
  if (!report.throughMonth) return 'Exemplo com dados fictícios';
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${report.throughMonth}-01T12:00:00Z`));
  return report.status === 'quarter-closed' ? `Trimestre completo até ${month}` : `Parcial até ${month}`;
}

const emptyMetrics = (): SpMetrics => ({ projects: null, launches: null, sales: null, stock: null });
const normalized = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** API periods are monthly references; the day 01 does not imply a calendar closing date. */
export function monthOf(value: unknown): string | null {
  const match = /^(\d{4})-(\d{2})(?:-\d{2}(?:T.*)?)?$/.exec(String(value ?? ''));
  return match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? `${match[1]}-${match[2]}` : null;
}
function count(value: unknown, allowNegative = false): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = safeNumber(value);
  return number !== null && Number.isInteger(number) && (allowNegative || number >= 0) ? number : null;
}

/** Never infer the official closing from max(history.period). Does not mutate the source. */
export function limitHistoryToClosing(building: Raw, requestedEnd: string): Raw[] | null {
  const closing = monthOf(building.period);
  if (!closing || !Array.isArray(building.typologies_history)) return null;
  const limit = closing < requestedEnd ? closing : requestedEnd;
  return building.typologies_history.filter((row: Raw) => {
    const period = monthOf(row?.period);
    return period !== null && period <= limit;
  });
}

export function buildSpPreview(input: SpInput, quarter: Quarter): SpPreview {
  const result: SpPreview = { entity: SP_INSTITUTIONAL.id, quarter, status: 'incomplete', closingMonth: null, metrics: emptyMetrics(), issues: [], checks: [], ignoredHistoryRows: 0 };
  const fail = (status: SpPreview['status'], message: string) => ({ ...result, status, issues: [...result.issues, message] });
  if (!isQuarter(quarter) || input.origin !== 'fixture' || input.uf !== 'SP' || normalized(input.city) !== normalized(SP_INSTITUTIONAL.city)) {
    return fail('invalid', 'Esta primeira fatia contempla somente São Paulo capital e dados de teste.');
  }
  if (!Object.values(input.coverage).every(Boolean)) return fail('incomplete', 'A cobertura das fontes ainda não foi confirmada.');
  if (!input.buildings.length) return fail('empty', 'Nenhum empreendimento disponível para comprovar o fechamento.');
  const end = quarterEndMonth(quarter);
  const startNumber = Number(quarter[0]) * 3 - 2;
  const year = quarter.slice(2);
  const months = [0, 1, 2].map(offset => `${year}-${String(startNumber + offset).padStart(2, '0')}`);
  const previous = startNumber === 1 ? `${Number(year) - 1}-12` : `${year}-${String(startNumber - 1).padStart(2, '0')}`;
  const byId = new Map<string, Raw>();
  for (const building of input.buildings) {
    if (normalized(building.building_type) !== 'vertical' || normalized(building.city) !== normalized(input.city) || String(building.state) !== input.uf) {
      return fail('invalid', 'A fonte contém um empreendimento fora do recorte vertical autorizado.');
    }
    const id = String(building.building_id ?? '').trim();
    if (!id || !monthOf(building.period)) return fail('incomplete', 'Há empreendimento sem identificador ou fechamento válido na raiz.');
    if (byId.has(id) && JSON.stringify(byId.get(id)) !== JSON.stringify(building)) return fail('incomplete', 'Há versões conflitantes do mesmo empreendimento.');
    byId.set(id, building);
  }
  const buildings = [...byId.values()];
  const closings = [...new Set(buildings.map(building => monthOf(building.period)!))].sort();
  result.closingMonth = closings[0];
  if (closings.length !== 1) return fail('incomplete', 'Os empreendimentos informam fechamentos diferentes; confirme o fechamento da cidade.');
  for (const building of buildings) {
    if (!Array.isArray(building.typologies_history) || building.typologies_history.some((row: Raw) => !row || !monthOf(row.period))) {
      return fail('incomplete', 'Há histórico ausente ou com período inválido.');
    }
    result.ignoredHistoryRows += building.typologies_history.filter((row: Raw) => monthOf(row.period)! > result.closingMonth!).length;
  }
  if (end > result.closingMonth) return fail('awaiting-closure', 'O trimestre selecionado ultrapassa o último fechamento informado.');

  function temporal(rows: Raw[], field: 'stock' | 'liquid_sales', periods: string[]): Map<string, number> | null {
    const totals = new Map<string, number>();
    const keys = new Set<string>();
    for (const row of rows) {
      const period = monthOf(row.period);
      if (!period || !periods.includes(period)) continue;
      const group = normalized(row.group);
      const key = `${period}/${group}`;
      const value = count(row[field], field === 'liquid_sales');
      if (!group || normalized(row.building_type) !== 'vertical' || value === null || keys.has(key)) return null;
      keys.add(key);
      totals.set(period, (totals.get(period) ?? 0) + value);
    }
    return periods.every(period => totals.has(period)) ? totals : null;
  }
  const sales = temporal(input.sales, 'liquid_sales', months);
  const stock = temporal(input.stock, 'stock', [previous, ...months]);
  if (!sales || !stock) return fail('incomplete', 'Faltam observações válidas ou há duplicações nas séries mensais. Ausência não representa zero.');
  const launches = new Map(months.map(month => [month, 0]));
  let projects = 0;
  let granularStock = 0;
  for (const building of buildings) {
    const release = monthOf(building.release_date);
    if (!release) return fail('incomplete', 'Há empreendimento sem data de lançamento válida.');
    if (release > end) continue;
    const history = limitHistoryToClosing(building, end)!;
    if (months.includes(release)) {
      const releaseRows = history.filter(row => monthOf(row.period) === release);
      const quantities = releaseRows.map(row => count(row.qty));
      const units = count(building.total_units) ?? (quantities.length && quantities.every(value => value !== null) ? quantities.reduce((sum, value) => sum + value!, 0) : null);
      if (units === null) return fail('incomplete', 'Unidades lançadas sem cobertura suficiente; o valor permanece indisponível.');
      projects += 1;
      launches.set(release, launches.get(release)! + units);
    }
    const closingRows = history.filter(row => monthOf(row.period) === end);
    const closingValues = closingRows.map(row => count(row.typology_stock));
    if (!closingValues.length || closingValues.some(value => value === null)) return fail('incomplete', 'O histórico granular não comprova o estoque no mês de fechamento escolhido.');
    granularStock += closingValues.reduce((sum, value) => sum + value!, 0);
  }
  let opening = stock.get(previous)!;
  for (const month of months) {
    const expected = opening + launches.get(month)! - sales.get(month)!;
    const actual = stock.get(month)!;
    result.checks.push({ label: `Balanço ${month}`, expected, actual, delta: actual - expected });
    opening = actual;
  }
  result.checks.push({ label: 'Estoque temporal × histórico de tipologias', expected: granularStock, actual: stock.get(end)!, delta: stock.get(end)! - granularStock });
  if (result.checks.some(check => check.delta !== 0)) return fail('incomplete', 'As fontes não reconciliam. Os indicadores definitivos permanecem indisponíveis.');
  return { ...result, status: 'ready', metrics: { projects, launches: [...launches.values()].reduce((a, b) => a + b, 0), sales: [...sales.values()].reduce((a, b) => a + b, 0), stock: stock.get(end)! } };
}
