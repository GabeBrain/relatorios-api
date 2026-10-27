import { describe, expect, it } from 'vitest';
import { buildCityCube } from '../domain/cube';
const options = { city: 'Cidade', uf: 'RS', endQuarter: '2T2026' as const, entity: 'fiergs-rs' as const, engineVersion: 'v4' as const };
const base = { building_id: 'P', building_type: 'Vertical', release_date: '2016-03-01', standard: 'Médio', total_units: 90, period: '2026-08-01',
  typologies_history: [
    { typology_id: 'T', period: '2016-03-01', qty: 127, number_bedroom: 2 },
    { typology_id: 'T', period: '2026-06-01', qty: 70, number_bedroom: 2, typology_stock: 10, sold_in_period: -2 },
    { typology_id: 'T', period: '2026-08-01', qty: 90, number_bedroom: 2, typology_stock: 20, sold_in_period: 5 },
  ] };
describe('FIERGS period capacity projection', () => {
  it('uses closing capacity for market/cohorts while retaining original launch and future registry separately', () => {
    const p = buildCityCube([base], options).projects[0];
    expect(p).toMatchObject({ launchedUnits: 70, finalUnits: 10, soldUnits: -2 });
    expect(p.typologies[0].launchedUnits).toBe(70);
    expect(p.historyAudit).toMatchObject({ releaseObservedUnits: 127, capacityAtClosing: 70, registryTotalUnits: 90, registryComparable: false });
  });
  it('does not double quantity or stock from equivalent repeated rows', () => {
    const p = buildCityCube([{ ...base, typologies_history: [...base.typologies_history, base.typologies_history[1]] }], options).projects[0];
    expect(p.launchedUnits).toBe(70); expect(p.finalUnits).toBe(10);
    expect(p.historyAudit?.duplicates[0].removed).toBe(1);
  });
  it('does not reconstruct missing sales with capacity minus stock', () => {
    const data = { ...base, typologies_history: [{ typology_id: 'T', period: '2026-06-01', qty: 70, typology_stock: 10 }] };
    expect(buildCityCube([data], options).projects[0].soldUnits).toBeNull();
  });
  it('leaves Secovi offer quantity semantics intact', () => {
    const p = buildCityCube([base], { ...options, entity: 'secovi-sp' }).projects[0];
    expect(p.launchedUnits).toBe(90);
    expect(p.historyAudit?.releaseObservedUnits).toBe(127);
  });
});
