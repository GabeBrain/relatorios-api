import { describe, expect, it } from 'vitest';
import { fiergsPeriodComparisons } from '../domain/period-comparisons';
import type { LaunchSeries } from '../types';

const row = (quarter: LaunchSeries['quarter'], vertical: number): LaunchSeries => ({ quarter, vertical, horizontal: 0, total: vertical });

describe('FIERGS · comparações editoriais por período', () => {
  const series = [
    row('1T2024', 10), row('2T2024', 20), row('3T2024', 30), row('4T2024', 40),
    row('1T2025', 20), row('2T2025', 30), row('3T2025', 40), row('4T2025', 60),
    row('1T2026', 50), row('2T2026', 75),
  ];

  it('mantém 2T como comparação trimestral e primeiro semestre completo', () => {
    expect(fiergsPeriodComparisons(series, '2T2026', { quarter: true, contextual: true })).toEqual([
      expect.objectContaining({ kind: 'quarter', leftLabel: '2T2025', rightLabel: '2T2026', left: 30, right: 75, variation: 150, complete: true }),
      expect.objectContaining({ kind: 'first_semester', leftLabel: '1S2025', rightLabel: '1S2026', left: 50, right: 125, variation: 150, complete: true }),
    ]);
  });

  it('não trata trimestre ausente como zero nem calcula acumulado incompleto', () => {
    const pairs = fiergsPeriodComparisons(series.filter((item) => item.quarter !== '1T2025'), '2T2026', { contextual: true });
    expect(pairs[0]).toMatchObject({ left: null, right: 125, variation: null, complete: false });
  });

  it('usa 1T, 9M e ano completo conforme o trimestre de fechamento', () => {
    expect(fiergsPeriodComparisons(series, '1T2025', { quarter: true, contextual: true })).toEqual([
      expect.objectContaining({ kind: 'quarter', title: 'COMPARATIVO 1º TRIMESTRE', leftLabel: '1T2024', rightLabel: '1T2025', left: 10, right: 20 }),
    ]);
    expect(fiergsPeriodComparisons(series, '3T2025', { contextual: true })).toEqual([
      expect.objectContaining({ kind: 'nine_months', title: 'COMPARATIVO 9 MESES', leftLabel: '9M2024', rightLabel: '9M2025', left: 60, right: 90, variation: 50 }),
    ]);
    expect(fiergsPeriodComparisons(series, '4T2025', { contextual: true })).toEqual([
      expect.objectContaining({ kind: 'year_to_date', title: 'COMPARATIVO ANUAL', leftLabel: '2024', rightLabel: '2025', left: 100, right: 150, variation: 50 }),
    ]);
  });

  it('não divide por zero', () => {
    const pairs = fiergsPeriodComparisons([row('2T2025', 0), row('2T2026', 10)], '2T2026', { quarter: true });
    expect(pairs[0]).toMatchObject({ left: 0, right: 10, variation: null, complete: true });
  });

  it('rotula acumulado móvel como 12 meses, nunca como semestre', () => {
    const pairs = fiergsPeriodComparisons([row('2T2025', 200), row('2T2026', 250)], '2T2026', { rolling12Months: true });
    expect(pairs[0]).toMatchObject({ title: 'COMPARATIVO ACUMULADO 12 MESES', leftLabel: '12M até 2T2025', rightLabel: '12M até 2T2026', variation: 25 });
    expect(pairs[0].title).not.toMatch(/semestre/i);
  });

  it('usa a fotografia do trimestre final para estoque ou IVV', () => {
    expect(fiergsPeriodComparisons(series, '2T2026', { contextual: true, snapshot: true })[0]).toMatchObject({ left: 30, right: 75, leftLabel: '1S2025', rightLabel: '1S2026' });
    expect(fiergsPeriodComparisons(series, '4T2025', { contextual: true, snapshot: true })[0]).toMatchObject({ left: 40, right: 60, leftLabel: '2024', rightLabel: '2025' });
  });
});
