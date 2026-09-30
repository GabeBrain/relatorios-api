import { describe, expect, it } from 'vitest';
import { fiergsPeriodComparisons } from '../domain/period-comparisons';
import type { LaunchSeries } from '../types';

const row = (quarter: LaunchSeries['quarter'], vertical: number): LaunchSeries => ({ quarter, vertical, horizontal: 0, total: vertical });

describe('FIERGS · comparações editoriais por período', () => {
  const series = [row('1T2025', 40), row('2T2025', 60), row('1T2026', 50), row('2T2026', 75)];

  it('padroniza trimestre e primeiro semestre com anos completos', () => {
    expect(fiergsPeriodComparisons(series, '2T2026', { quarter: true, firstSemester: true })).toEqual([
      expect.objectContaining({ kind: 'quarter', leftLabel: '2T2025', rightLabel: '2T2026', left: 60, right: 75, variation: 25, complete: true }),
      expect.objectContaining({ kind: 'first_semester', leftLabel: '1S2025', rightLabel: '1S2026', left: 100, right: 125, variation: 25, complete: true }),
    ]);
  });

  it('não trata trimestre ausente como zero nem calcula semestre incompleto', () => {
    const pairs = fiergsPeriodComparisons(series.filter((item) => item.quarter !== '1T2025'), '2T2026', { firstSemester: true });
    expect(pairs[0]).toMatchObject({ left: null, right: 125, variation: null, complete: false });
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

  it('usa fotografia do 2T para comparar primeiro semestre de estoque ou IVV', () => {
    const pairs = fiergsPeriodComparisons(series, '2T2026', { firstSemester: true, firstSemesterSnapshot: true });
    expect(pairs[0]).toMatchObject({ left: 60, right: 75, leftLabel: '1S2025', rightLabel: '1S2026' });
  });
});
