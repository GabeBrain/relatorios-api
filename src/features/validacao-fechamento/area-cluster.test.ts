import { describe, expect, it } from 'vitest';
import { areaBands, areaKey, typologyAreaGroups } from './area-cluster';
import { computeRangeBuckets } from '../dashboard-geobrain/aggregate';
import type { ValidationBuilding } from './api';

describe('faixas para o cluster de loteamento', () => {
  it.each([[], [50], [50, 50, 50], [12.5, 25, 40, 49, 50, 80, 100, 120, 150, 300, 800], [0, -1, NaN, Infinity, 123.45, 125.5]].map((values) => ({ values })))('replica os cortes do Dashboard para $values', ({ values }) => {
    expect(areaBands(values)).toEqual(computeRangeBuckets(values, String).map(({ lo, hi }) => ({ lo, hi })));
  });

  it('usa a última área positiva e calcula faixas separadas por cidade e tipo', () => {
    const make = (id: string, city: string, type: string, area: number): ValidationBuilding => ({ building_id: id, city, building_type: type, typologies: [{ typology_id: id, history: [{ period: '2026-01-01', private_area: area }, { period: '2026-02-01', private_area: 0 }] }] } as ValidationBuilding);
    const groups = typologyAreaGroups([make('1', 'Sinop', 'Horizontal', 200), make('2', 'Outra', 'Horizontal', 1000), make('3', 'Sinop', 'Vertical', 50)]);
    expect(groups.get(areaKey('1', '1'))).toBe('Área: [200, ∞) m²');
    expect(groups.get(areaKey('2', '2'))).toBe('Área: [1000, ∞) m²');
    expect(groups.get(areaKey('3', '3'))).toBe('Área: [50, ∞) m²');
  });
});
