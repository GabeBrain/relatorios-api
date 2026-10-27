import { describe, expect, it } from 'vitest';
import { BuildingSourceContractError, insertBuilding, readBuildingPage } from '../domain/building-source';
const scope = { city: 'Gramado', uf: 'RS' };
const payload = (data: unknown[] = []) => ({ data, meta: { last_page: 1, current_page: 1 } });
describe('Panorama source contract', () => {
  it('rejects malformed or mismatched pages instead of treating them as empty', () => {
    for (const p of [{ meta: { last_page: 1 } }, { data: [], meta: { last_page: 1.2 } }, { data: [], meta: { last_page: 1, current_page: 2 } }])
      expect(() => readBuildingPage(p, scope, 1, 'internal-v2')).toThrow(BuildingSourceContractError);
  });
  it('rejects geographic leakage and attaches non-secret source lineage', () => {
    expect(() => readBuildingPage(payload([{ city: 'Canela', state: 'RS' }]), scope, 1, 'internal-v2')).toThrow();
    expect(readBuildingPage(payload([{ building_id: 1, city: 'Gramado', state: 'RS' }]), scope, 1, 'internal-v2').buildings[0].__panoramaSource)
      .toMatchObject({ page: 1, city: 'Gramado', contract: 'building-history-v2' });
  });
  it('records equivalent repeated buildings and rejects conflicting ones', () => {
    const map = new Map<string, Record<string, unknown>>();
    const b = readBuildingPage(payload([{ building_id: 1, total_units: 9 }]), scope, 1, 'internal-v2').buildings[0];
    insertBuilding(map, b); insertBuilding(map, { ...b });
    expect(map.size).toBe(1);
    expect((b.__panoramaSource as Record<string, unknown>).repeatedPages).toHaveLength(1);
    expect(() => insertBuilding(map, { ...b, total_units: 18 })).toThrow();
  });
});
