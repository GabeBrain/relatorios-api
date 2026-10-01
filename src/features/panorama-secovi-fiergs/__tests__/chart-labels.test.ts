import { describe, expect, it } from 'vitest';
import type { LaunchSeries } from '../types';
import { compactQuarterLabel, visiblePointLabelIndexes, visibleQuarterTickIndexes } from '../lib/chart-labels';

const series = (count: number): LaunchSeries[] => Array.from({ length: count }, (_, index) => {
  const year = 2021 + Math.floor(index / 4);
  const quarter = index % 4 + 1;
  return { quarter: `${quarter}T${year}` as LaunchSeries['quarter'], vertical: index, horizontal: 0, total: index };
});

describe('legibilidade adaptativa de séries FIERGS', () => {
  it('abrevia trimestre sem perder o ano', () => {
    expect(compactQuarterLabel('4T2025')).toBe('4T/25');
  });

  it('mantém todos os ticks em séries curtas', () => {
    expect([...visibleQuarterTickIndexes(series(12))]).toHaveLength(12);
  });

  it('mantém ticks e valores em todos os pontos de séries longas', () => {
    const data = series(20);
    const ticks = visibleQuarterTickIndexes(data);
    const labels = visiblePointLabelIndexes(data);
    expect(ticks.size).toBe(data.length);
    expect(labels.size).toBe(data.length);
  });
});
