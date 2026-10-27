import { describe, expect, it } from 'vitest';
import { normalizeBuildingHistory } from '../domain/building-history';

const row = (extra = {}) => ({ typology_id: 'T1', period: '2026-06-01', qty: 3, number_bedroom: 2, typology_stock: 0, sold_in_period: -1, ...extra });
const building = (rows: Record<string, unknown>[]) => ({ release_date: '2026-06-01', period: '2026-06-01', total_units: 3, typologies_history: rows });
const run = (rows: Record<string, unknown>[]) => normalizeBuildingHistory(building(rows), '2026-06', 'RS/Cidade#P1');

describe('history-identity-v1 / period-capacity-v1', () => {
  it('reproduces the anonymized three-pair source case without doubling nine units', () => {
    const rows = ['T1', 'T2', 'T3'].flatMap((typology_id) => [row({ typology_id }), row({ typology_id })]);
    const result = run(rows);
    expect(result.rows).toHaveLength(3); expect(result.audit.capacityAtClosing).toBe(9);
    expect(result.audit.duplicates.reduce((sum, d) => sum + d.removed, 0)).toBe(3);
  });
  it('deduplicates semantic equivalents independently of property order and is idempotent', () => {
    const original = row();
    const reversed = Object.fromEntries(Object.entries(original).reverse());
    const result = run([original, reversed]);
    expect(result.rows).toEqual([original]);
    expect(result.audit.duplicates[0]).toMatchObject({ indices: [0, 1], removed: 1 });
    expect(run(result.rows).rows).toEqual(result.rows);
    expect(run(result.rows).audit.duplicates).toEqual([]);
  });
  it('keeps separate IDs with the same bedrooms/area', () => {
    expect(run([row(), row({ typology_id: 'T2' })]).audit.capacityAtClosing).toBe(6);
  });
  it('never chooses a winner for conflicting same-ID/month values or statuses', () => {
    const result = run([row(), row({ building_status: 'Ativo' })]);
    expect(result.audit.issues.some((i) => i.code === 'conflicting_identity')).toBe(true);
    expect(result.rows).toEqual([]);
  });
  it('preserves zero and negative net sales; null quantity remains unavailable', () => {
    const zero = run([row({ qty: 0 })]);
    expect(zero.audit.capacityAtClosing).toBe(0);
    expect(zero.rows[0].sold_in_period).toBe(-1);
    expect(run([row({ qty: null })]).audit.capacityAtClosing).toBeNull();
    expect(run([row({ qty: null })]).audit.issues[0].code).toBe('missing_quantity');
  });
  it('separates original 127 from closing 70 without future fill', () => {
    const result = normalizeBuildingHistory({ release_date: '2016-03-01', period: '2026-08-01', total_units: 90,
      typologies_history: [row({ period: '2016-03-01', qty: 127 }), row({ qty: 70 }), row({ period: '2026-08-01', qty: 90 })] }, '2026-06', 'P');
    expect(result.audit).toMatchObject({ releaseObservedUnits: 127, capacityAtClosing: 70, registryComparable: false });
  });
  it('does not revive a quantity that became zero or carry an absent ID forward', () => {
    expect(run([row({ period: '2026-05-01', qty: 8 }), row({ qty: 0 })]).audit.capacityAtClosing).toBe(0);
    const result = run([row({ period: '2026-05-01' }), row({ typology_id: 'T2' })]);
    expect(result.audit.issues.some((i) => i.code === 'incomplete_snapshot')).toBe(true);
  });
  it('reports absent identities in the declared API contract and invalid periods', () => {
    const result = normalizeBuildingHistory({ ...building([{ period: '2026-06-01', qty: 2 }, row({ period: 'bad' })]),
      __panoramaSource: 'internal-v2' }, '2026-06', 'P');
    expect(result.audit.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['missing_identity', 'invalid_period', 'missing_snapshot']));
  });
  it('retains exact decimal differences as conflicts and ignores future-only conflicts', () => {
    expect(run([row({ price: 1 }), row({ price: 1.00001 })]).audit.issues[0].code).toBe('conflicting_identity');
    expect(run([row(), row({ period: '2026-07-01', qty: 8 }), row({ period: '2026-07-01', qty: 9 })]).audit.issues).toEqual([]);
  });
});
