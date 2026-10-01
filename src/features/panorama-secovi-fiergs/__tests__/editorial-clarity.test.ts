import { describe, expect, it } from 'vitest';
import { roundedPercentages } from '../domain/percentage-rounding';
import { visibleBarLabelIndexes } from '../lib/chart-labels';
import type { LaunchSeries } from '../types';
import { typologyDisplayLabel } from '../domain/taxonomy';

describe('FIERGS · clareza editorial', () => {
  it('fecha participações em 100,0% após a formatação', () => {
    const shares = roundedPercentages([1, 1, 1]);
    expect(shares).toEqual([33.4, 33.3, 33.3]);
    expect(shares.reduce<number>((sum, value) => sum + (value ?? 0), 0)).toBeCloseTo(100, 10);
  });

  it('preserva distrato negativo na identidade percentual', () => {
    const shares = roundedPercentages([63, 889, 140, -1]);
    expect(shares.reduce<number>((sum, value) => sum + (value ?? 0), 0)).toBeCloseTo(100, 10);
    expect(shares.at(-1)).toBeLessThan(0);
  });

  it('não fabrica percentuais quando o total é zero', () => {
    expect(roundedPercentages([0, 0])).toEqual([null, null]);
  });

  it('expande grafias de tipologia para a nomenclatura editorial de dormitórios', () => {
    expect(typologyDisplayLabel('1')).toBe('1 Dormitório');
    expect(typologyDisplayLabel('2 dormitórios')).toBe('2 Dormitórios');
    expect(typologyDisplayLabel('4 quartos')).toBe('4 ou + Dormitórios');
  });

  it('reduz a densidade de rótulos preservando o fechamento e trimestres equivalentes', () => {
    const series = Array.from({ length: 18 }, (_, index) => ({ quarter: `${index % 4 + 1}T${2022 + Math.floor(index / 4)}`, vertical: index, horizontal: 0, total: index })) as LaunchSeries[];
    const labels = visibleBarLabelIndexes(series, '2', 9);
    expect(labels.size).toBeLessThanOrEqual(9);
    expect(labels.has(series.length - 1)).toBe(true);
    series.forEach((row, index) => { if (row.quarter[0] === '2') expect(labels.has(index)).toBe(true); });
  });
});
