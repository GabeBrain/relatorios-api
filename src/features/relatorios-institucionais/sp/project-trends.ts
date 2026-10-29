import { editorialWindow, shiftQuarter } from '@/features/panorama-secovi-fiergs/domain/quarters';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { quarterMonths } from './temporal';
import { SP_SEGMENT_RULE } from './segments';

export interface SpProjectTrends {
  quarterly: { label: string; value: number; partial: boolean }[];
  rolling: { month: string; start: string; value: number }[];
  quarterlyComparisons: SpProjectComparison[];
  rollingComparisons: SpProjectComparison[];
}
export interface SpProjectComparison { label: string; previous: number; current: number; variation: number | null }
export interface SpAnnualSegments { year: number; partial: boolean; total: number; segments: { name: string; value: number; share: number | null }[] }
export interface SpTrendBreakdown { status: 'ready' | 'blocked'; issues: string[]; mcmv?: SpProjectTrends; annual?: SpAnnualSegments[] }
const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export function spTrendSegment(value: unknown): string | undefined {
  return Object.entries(SP_SEGMENT_RULE.groups).find(([, patterns]) => patterns.some(pattern => normalize(pattern) === normalize(value)))?.[0];
}

export function buildSpTrendBreakdown(rows: { month: string; group: unknown; value: number }[], quarter: Quarter, throughMonth: string): SpTrendBreakdown {
  const relevant = rows.filter(row => row.month >= '2021-01' && row.month <= throughMonth);
  if (relevant.some(row => !spTrendSegment(row.group))) return { status: 'blocked', issues: ['Há lançamentos sem padrão reconhecido. Os recortes por segmento permanecem indisponíveis.'] };
  const mcmv = new Map<string, number>();
  for (const row of relevant) if (spTrendSegment(row.group) === 'MCMV') mcmv.set(row.month, (mcmv.get(row.month) ?? 0) + row.value);
  const annual = Array.from({ length: Number(throughMonth.slice(0, 4)) - 2020 }, (_, index) => {
    const year = 2021 + index;
    const segments = Object.keys(SP_SEGMENT_RULE.groups).map(name => ({ name, value: relevant.filter(row => row.month.startsWith(String(year)) && spTrendSegment(row.group) === name).reduce((sum, row) => sum + row.value, 0), share: null as number | null }));
    const total = segments.reduce((sum, row) => sum + row.value, 0);
    for (const segment of segments) segment.share = total > 0 ? segment.value / total * 100 : null;
    return { year, partial: year === Number(throughMonth.slice(0, 4)) && !throughMonth.endsWith('-12'), total, segments };
  });
  return { status: 'ready', issues: [], mcmv: buildSpProjectTrends(mcmv, quarter, throughMonth), annual };
}
export function shiftSpMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

/** Reconstructs launch cohorts from the complete current register, not historical snapshots. */
export function buildSpProjectTrends(monthly: ReadonlyMap<string, number>, quarter: Quarter, throughMonth: string): SpProjectTrends {
  const sum = (start: string, end: string) => [...monthly].reduce((total, [month, value]) => total + (month >= start && month <= end ? value : 0), 0);
  const currentMonths = quarterMonths(quarter).filter(month => month <= throughMonth);
  const quarterly = editorialWindow(quarter).map(label => {
    const months = quarterMonths(label).filter(month => month <= throughMonth);
    return { label, value: sum(months[0], months.at(-1)!), partial: months.length < 3 };
  });
  const rolling = Array.from({ length: 37 }, (_, index) => {
    const month = shiftSpMonth(throughMonth, index - 36), start = shiftSpMonth(month, -11);
    return { month, start, value: sum(start, month) };
  });
  const comparison = (label: string, previous: number, current: number): SpProjectComparison => ({ label, previous, current, variation: previous > 0 ? (current - previous) / previous * 100 : null });
  const quarterlyComparisons = [2, 1, 0].map(years => {
    const currentQuarter = shiftQuarter(quarter, -years * 4);
    const previousQuarter = shiftQuarter(currentQuarter, -4);
    const previousMonths = quarterMonths(previousQuarter).slice(0, currentMonths.length);
    const matchedCurrent = quarterMonths(currentQuarter).slice(0, currentMonths.length);
    return comparison(`${previousQuarter} × ${currentQuarter}`, sum(previousMonths[0], previousMonths.at(-1)!), sum(matchedCurrent[0], matchedCurrent.at(-1)!));
  });
  const rollingComparisons = [2, 1, 0].map(years => {
    const currentEnd = shiftSpMonth(throughMonth, -years * 12), previousEnd = shiftSpMonth(currentEnd, -12);
    return comparison(`${previousEnd} × ${currentEnd}`, sum(shiftSpMonth(previousEnd, -11), previousEnd), sum(shiftSpMonth(currentEnd, -11), currentEnd));
  });
  return { quarterly, rolling, quarterlyComparisons, rollingComparisons };
}
