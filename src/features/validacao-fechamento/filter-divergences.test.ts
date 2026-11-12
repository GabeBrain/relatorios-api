import { describe, expect, it } from 'vitest';
import { filterDivergences } from './filter-divergences';
import { applyVFFilters, EMPTY_VF_FILTERS, type ClosureRow } from './aggregate';
import type { Divergence } from './validation-rules';

describe('filtro de divergências', () => {
  const row = { city: 'Sinop', building_id: '1', typology_id: 't1', period: '2026-07-01', periodKey: '2026-07', bucketYear: '2026', bucketQuarter: '03T/26', building_type: 'Horizontal', standard: 'Casas' } as ClosureRow;
  const divergence = { ...row, isBuildingRule: false } as unknown as Divergence;

  it('aplica simultaneamente os filtros da sidebar e da cidade ativa', () => {
    const filters = { ...EMPTY_VF_FILTERS, cities: ['Sinop'], buildings: ['1'], standards: ['Casas'], buildingTypes: ['Horizontal'], years: ['2026'], quarters: ['03T/26'], periods: ['2026-07'] };
    expect(filterDivergences([divergence], applyVFFilters([row], filters))).toEqual([divergence]);
    for (const field of Object.keys(filters) as (keyof typeof filters)[]) {
      expect(filterDivergences([divergence], applyVFFilters([row], { ...filters, [field]: ['outro'] }))).toEqual([]);
    }
  });

  it('respeita período e tipologia e permite regras de empreendimento sem depender da tipologia', () => {
    expect(filterDivergences([divergence], [{ ...row, typology_id: 't2' }])).toEqual([]);
    const enterprise = { ...divergence, isBuildingRule: true };
    expect(filterDivergences([enterprise], [{ ...row, typology_id: 't2' }])).toEqual([enterprise]);
    expect(filterDivergences([enterprise], [{ ...row, period: '2026-08-01' }])).toEqual([]);
  });
});
