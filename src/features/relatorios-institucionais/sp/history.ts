import { safeNumber } from '@/features/panorama-secovi-fiergs/lib/launches';
import { isSpMunicipalPreview, monthOf, type SpPreview, type SpLaunchHistory } from './model';
import { quarterMonths, type SpTemporalRow } from './temporal';

export interface SpLaunchHistoryInput {
  city: string;
  uf: string;
  rootPeriod: unknown;
  current: SpTemporalRow[];
  previous: SpTemporalRow[];
  complete: { current: boolean; previous: boolean };
}

export function matchedLaunchMonths(report: SpPreview): { current: string[]; previous: string[] } | null {
  if (!isSpMunicipalPreview(report) || !['api', 'recorded-api'].includes(report.source ?? '') || !report.throughMonth || !report.closingMonth || report.throughMonth > report.closingMonth) return null;
  const current = quarterMonths(report.quarter).filter(month => month <= report.throughMonth!);
  if (!current.length || current.join('|') !== report.monthly?.map(row => row.month).join('|') || current.at(-1) !== report.throughMonth) return null;
  return { current, previous: current.map(month => `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`) };
}

export function buildSpLaunchHistory(input: SpLaunchHistoryInput, municipal: SpPreview): SpLaunchHistory {
  const blocked = (message: string): SpLaunchHistory => ({ status: 'blocked', issues: [message], rows: [], totals: null, checks: [] });
  const months = matchedLaunchMonths(municipal);
  if (!months || input.city !== 'São Paulo' || input.uf !== 'SP' || municipal.patterns?.status !== 'ready') return blocked('Confira os totais municipais e seus padrões antes do histórico.');
  if (monthOf(input.rootPeriod) !== municipal.closingMonth) return blocked('O fechamento mudou entre consultas. Confira os dados municipais novamente antes do histórico.');
  if (!input.complete.current || !input.complete.previous) return blocked('A paginação do comparativo não foi concluída.');
  const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const expectedGroups = municipal.patterns.rows.map(row => normalize(row.group)).sort().join('|');
  function read(rows: SpTemporalRow[], periods: string[]) {
    const values = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const period = monthOf(row.period);
      if (!period || !periods.includes(period)) return null; // No silent widening or unclosed months.
      const group = normalize(row.group), raw = row.releases_in_period;
      const value = typeof raw === 'number' || typeof raw === 'string' && raw.trim() ? safeNumber(raw) : null;
      if (!group || normalize(row.building_type) !== 'vertical' || value === null || !Number.isSafeInteger(value) || value < 0) return null;
      const groups = values.get(period) ?? new Map<string, number>();
      if (groups.has(group)) return null;
      groups.set(group, value); values.set(period, groups);
    }
    if (periods.some(period => !values.has(period) || [...values.get(period)!.keys()].sort().join('|') !== expectedGroups)) return null;
    return values;
  }
  const current = read(input.current, months.current), previous = read(input.previous, months.previous);
  if (!current || !previous) return blocked('Falta mês ou padrão, há duplicação/valor inválido ou os universos diferem. Os gráficos históricos permanecem indisponíveis.');
  const total = (groups: Map<string, number>) => [...groups.values()].reduce((a, b) => a + b, 0);
  const checks: SpLaunchHistory['checks'] = [];
  for (const row of municipal.monthly!) {
    const actual = total(current.get(row.month)!);
    checks.push({ label: `Lançamentos ${row.month}`, actual, expected: row.launches, delta: actual - row.launches });
  }
  for (const row of municipal.patterns.rows) {
    const actual = months.current.reduce((sum, period) => sum + current.get(period)!.get(normalize(row.group))!, 0);
    checks.push({ label: `Padrão ${row.group}`, actual, expected: row.launches, delta: actual - row.launches });
  }
  if (checks.some(check => check.delta !== 0)) return { ...blocked('A releitura dos lançamentos diverge da consulta municipal. Confira os dados reais novamente.'), checks };
  const comparison = (now: number, before: number) => ({ current: now, previous: before, delta: now - before, variation: before > 0 ? (now - before) / before * 100 : null });
  const rows = months.current.map((period, index) => ({ currentMonth: period, previousMonth: months.previous[index], ...comparison(total(current.get(period)!), total(previous.get(months.previous[index])!)) }));
  const totals = comparison(rows.reduce((sum, row) => sum + row.current, 0), rows.reduce((sum, row) => sum + row.previous, 0));
  if (![totals.current, totals.previous, ...rows.flatMap(row => [row.current, row.previous])].every(Number.isSafeInteger) || totals.current !== municipal.metrics.launches) return blocked('Os totais do comparativo não foram comprovados.');
  return { status: 'ready', issues: [], rows, totals, checks };
}
