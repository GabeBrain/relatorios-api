import { quarterEndMonth, isQuarter } from '@/features/panorama-secovi-fiergs/domain/quarters';
import { safeNumber } from '@/features/panorama-secovi-fiergs/lib/launches';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { monthOf, SP_INSTITUTIONAL, type SpPreview } from './model';
import { summarizeSpGroups } from './distribution';

export type SpTemporalRow = Record<string, unknown>;
export interface SpTemporalInput {
  /** Requested window limit; availability is discovered independently in all three municipal sources. */
  windowEnd?: string;
  groupBy?: 'Padrão' | 'Tipologia';
  origin: 'api' | 'recorded-api';
  uf: string;
  city: string;
  /** Root of a sampled building, not a city-wide granular collection. */
  rootPeriod: unknown;
  sampledBuildings: number;
  totalBuildings: number;
  sales: SpTemporalRow[];
  releases: SpTemporalRow[];
  stock: SpTemporalRow[];
  complete: { sales: boolean; releases: boolean; stock: boolean };
}
const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export function quarterMonths(quarter: Quarter): string[] {
  if (!isQuarter(quarter)) return [];
  return [0, 1, 2].map(offset => `${quarter.slice(2)}-${String(Number(quarter[0]) * 3 - 2 + offset).padStart(2, '0')}`);
}
export function priorMonth(month: string): string {
  const [year, value] = month.split('-').map(Number);
  return value === 1 ? `${year - 1}-12` : `${year}-${String(value - 1).padStart(2, '0')}`;
}
export function monthEnd(month: string): string {
  const [year, value] = month.split('-').map(Number);
  return `${month}-${String(new Date(Date.UTC(year, value, 0)).getUTCDate()).padStart(2, '0')}`;
}

/** Municipal comparison only. It never claims a complete city-wide granular report. */
export function buildSpTemporalPreview(input: SpTemporalInput, quarter: Quarter): SpPreview {
  const result: SpPreview = { entity: SP_INSTITUTIONAL.id, source: input.origin, quarter, status: 'incomplete', closingMonth: null, metrics: { projects: null, launches: null, sales: null, stock: null }, issues: [], checks: [], ignoredHistoryRows: 0, monthly: [], balanceByGroup: [] };
  const fail = (status: SpPreview['status'], message: string) => ({ ...result, status, issues: [message] });
  if (!isQuarter(quarter) || input.uf !== 'SP' || normalize(input.city) !== 'sao paulo') return fail('invalid', 'Selecione São Paulo capital e um trimestre válido.');
  const quarterPeriods = quarterMonths(quarter);
  if (input.windowEnd !== undefined && !quarterPeriods.includes(input.windowEnd)) return fail('invalid', 'O limite da janela não pertence ao trimestre selecionado.');
  if (!input.complete.sales || !input.complete.releases || !input.complete.stock) return fail('incomplete', 'A paginação das fontes municipais não foi concluída.');
  const requested = quarterPeriods.filter(month => !input.windowEnd || month <= input.windowEnd);
  const available = (['sales', 'releases', 'stock'] as const).map(source => new Set(input[source].map(row => monthOf(row.period)).filter((month): month is string => Boolean(month && requested.includes(month)))));
  // Each source must cover a consecutive prefix. Never hide a hole by returning an earlier partial.
  for (const periods of available) {
    const present = requested.filter(month => periods.has(month));
    if (present.join('|') !== requested.slice(0, present.length).join('|')) return fail('incomplete', 'Há mês ausente entre observações da série municipal. Ausência não representa zero.');
  }
  const months = requested.filter(month => available.every(periods => periods.has(month)));
  if (!months.length) return fail('awaiting-closure', 'Nenhum mês do trimestre está disponível nas três séries municipais.');
  result.closingMonth = result.throughMonth = months.at(-1)!;
  const previous = priorMonth(months[0]);

  function read(rows: SpTemporalRow[], field: string, periods: string[], negative: boolean) {
    const values = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const period = monthOf(row.period);
      if (!period || !periods.includes(period)) continue; // Later, unclosed months must not leak in.
      const group = normalize(row.group);
      const raw = row[field];
      const value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() ? safeNumber(raw) : null;
      if (!group || normalize(row.building_type) !== 'vertical' || value === null || !Number.isSafeInteger(value) || !negative && value < 0) return null;
      const groups = values.get(period) ?? new Map<string, number>();
      if (groups.has(group)) return null;
      groups.set(group, value); values.set(period, groups);
    }
    return periods.every(period => values.has(period)) ? values : null;
  }
  const stocks = read(input.stock, 'stock', [previous, ...months], false);
  const sales = read(input.sales, 'liquid_sales', months, true);
  const releases = read(input.releases, 'releases_in_period', months, false);
  if (!stocks || !sales || !releases) return fail('incomplete', 'Há mês ausente, valor inválido ou linha duplicada. Ausência não representa zero.');
  const expectedGroups = [...stocks.get(previous)!.keys()].sort().join('|');
  for (const source of [stocks, sales, releases]) {
    if ([...source.values()].some(groups => [...groups.keys()].sort().join('|') !== expectedGroups)) return fail('incomplete', 'Os grupos cobertos diferem entre meses ou fontes; confirme o universo antes de somar.');
  }
  const total = (source: Map<string, Map<string, number>>, month: string) => [...source.get(month)!.values()].reduce((a, b) => a + b, 0);
  for (const month of months) {
    const openingStock = total(stocks, priorMonth(month));
    const launches = total(releases, month), sold = total(sales, month), closingStock = total(stocks, month);
    const expected = openingStock + launches - sold;
    result.monthly!.push({ month, launches, sales: sold, openingStock, closingStock, delta: closingStock - expected });
    result.checks.push({ label: `Balanço ${month}`, expected, actual: closingStock, delta: closingStock - expected, kind: 'balance' });
    for (const [group, actual] of stocks.get(month)!) {
      const expectedGroup = stocks.get(priorMonth(month))!.get(group)! + releases.get(month)!.get(group)! - sales.get(month)!.get(group)!;
      const groupLabel = String(input.stock.find(row => normalize(row.group) === group)?.group ?? group);
      result.balanceByGroup!.push({ label: `Balanço ${month} · ${groupLabel}`, month, group: groupLabel, expected: expectedGroup, actual, delta: actual - expectedGroup, kind: 'balance' });
    }
  }
  return {
    ...result, status: months.length === 3 ? 'quarter-closed' : 'partial',
    patterns: input.groupBy === 'Tipologia' ? undefined : summarizeSpGroups(input, months, result.throughMonth),
    metrics: { projects: null, launches: result.monthly!.reduce((sum, row) => sum + row.launches, 0), sales: result.monthly!.reduce((sum, row) => sum + row.sales, 0), stock: result.monthly!.at(-1)!.closingStock },
    issues: [
      `Dados municipais disponíveis até ${result.throughMonth}; a cobertura granular de empreendimentos permanece pendente.`,
      ...result.monthly!.filter(row => row.delta !== 0).map(row => `Balanço ${row.month}: diferença de ${row.delta.toLocaleString('pt-BR')} unidades entre estoque informado e esperado. Valores da API preservados; causa não confirmada.`),
      ...(result.balanceByGroup!.some(row => row.delta !== 0) ? ['Há diferenças no balanço por grupo. Elas não são atribuídas automaticamente a distratos ou reclassificações; confira os detalhes.'] : []),
      ...(available.some(periods => periods.size !== months.length) ? ['As séries ainda não cobrem os mesmos meses; a parcial usa apenas os meses disponíveis nas três fontes.'] : []),
      ...(result.throughMonth < quarterEndMonth(quarter) ? ['O trimestre não está completo; somente os meses disponíveis nas três séries foram incluídos.'] : []),
      'Contagem de empreendimentos e reconciliação granular pendentes. Esta conferência municipal não libera exportação ou homologação.',
    ],
  };
}
