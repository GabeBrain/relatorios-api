/** Contracts owned by Panorama: never import Dashboard's KPI normalizer. */
export const HISTORY_IDENTITY_VERSION = 'history-identity-v1';
export const PERIOD_CAPACITY_VERSION = 'period-capacity-v1';
export const HISTORY_CONTRACT_KEY = `${HISTORY_IDENTITY_VERSION}/${PERIOD_CAPACITY_VERSION}`;
export type HistoryRow = Record<string, unknown>;
export interface HistoryIssue {
  code: 'missing_identity' | 'invalid_period' | 'conflicting_identity' | 'invalid_row' | 'missing_snapshot' | 'missing_quantity' | 'missing_measurement' | 'incomplete_snapshot';
  identity: string;
  indices: number[];
}
export interface HistoryAudit {
  source: Record<string, unknown> | null;
  identityVersion: typeof HISTORY_IDENTITY_VERSION;
  capacityVersion: typeof PERIOD_CAPACITY_VERSION;
  identityMode: 'identified' | 'legacy';
  received: number;
  retained: number;
  duplicates: { identity: string; indices: number[]; removed: number }[];
  issues: HistoryIssue[];
  closingMonth: string | null;
  requestedMonth: string;
  releaseMonth: string;
  releaseObservedUnits: number | null;
  capacityAtClosing: number | null;
  registryTotalUnits: number | null;
  registryMonth: string | null;
  registryComparable: boolean;
}

export function historyNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Property order is not identity. Unknown values are retained, never rounded away. */
export function historyFingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(historyFingerprint).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${historyFingerprint(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}

function month(value: unknown): string | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])(?:$|-)/.exec(String(value ?? ''));
  return match ? `${match[1]}-${match[2]}` : null;
}

export function normalizeBuildingHistory(building: HistoryRow, closing: string, projectKey: string) {
  const raw = Array.isArray(building.typologies_history) ? building.typologies_history : [];
  // Pre-v2 hand-built domain inputs remain representable. API adapters always declare strict mode.
  const identified = building.__panoramaSource !== undefined || raw.some((r) => r && typeof r === 'object' && 'typology_id' in r);
  const releaseMonth = month(building.release_date ?? building.release_period) ?? '';
  const audit: HistoryAudit = {
    source: building.__panoramaSource && typeof building.__panoramaSource === 'object' ? building.__panoramaSource as Record<string, unknown> : null,
    identityVersion: HISTORY_IDENTITY_VERSION, capacityVersion: PERIOD_CAPACITY_VERSION,
    identityMode: identified ? 'identified' : 'legacy', received: 0, retained: 0, duplicates: [], issues: [],
    closingMonth: null, requestedMonth: closing, releaseMonth, releaseObservedUnits: null,
    capacityAtClosing: null, registryTotalUnits: historyNumber(building.total_units ?? building.qty),
    registryMonth: month(building.period), registryComparable: false,
  };
  const groups = new Map<string, { fingerprint: string; row: HistoryRow; indices: number[] }[]>();
  const legacy: HistoryRow[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      audit.issues.push({ code: 'invalid_row', identity: projectKey, indices: [index] }); return;
    }
    const row = item as HistoryRow;
    const observed = month(row.period);
    if (!observed) { audit.issues.push({ code: 'invalid_period', identity: projectKey, indices: [index] }); return; }
    if (observed > closing) return; // future conflicts/quantities cannot contaminate a historical close
    audit.received++;
    if (!identified) { legacy.push(row); return; }
    if (row.typology_id === null || row.typology_id === undefined || String(row.typology_id).trim() === '') {
      audit.issues.push({ code: 'missing_identity', identity: `${projectKey}|${observed}`, indices: [index] }); return;
    }
    const identity = `${projectKey}|${String(row.typology_id)}|${observed}`;
    const variants = groups.get(identity) ?? [];
    const fingerprint = historyFingerprint(row);
    const equivalent = variants.find((v) => v.fingerprint === fingerprint);
    if (equivalent) equivalent.indices.push(index);
    else variants.push({ fingerprint, row, indices: [index] });
    groups.set(identity, variants);
  });
  const rows = [...legacy];
  for (const [identity, variants] of groups) {
    for (const variant of variants) if (variant.indices.length > 1)
      audit.duplicates.push({ identity, indices: variant.indices, removed: variant.indices.length - 1 });
    if (variants.length > 1) {
      audit.issues.push({ code: 'conflicting_identity', identity, indices: variants.flatMap((v) => v.indices) });
      continue; // no arbitrary winner or summation; the integrity guard blocks export
    }
    rows.push(variants[0].row);
  }
  // Keep source order among distinct IDs in the same month: existing price/VGV consumers
  // have their own representative-row policy. Deduplication must not change that policy.
  rows.sort((a, b) => String(a.period).localeCompare(String(b.period)));
  audit.retained = rows.length;
  const releaseRows = rows.filter((r) => month(r.period) === releaseMonth);
  audit.closingMonth = rows.map((r) => month(r.period)!).sort().at(-1) ?? null;
  const closingRows = rows.filter((r) => month(r.period) === audit.closingMonth);
  const completeQty = (selected: HistoryRow[]) => selected.length && selected.every((r) => historyNumber(r.qty ?? r.released_units ?? r.units) !== null)
    ? selected.reduce((s, r) => s + historyNumber(r.qty ?? r.released_units ?? r.units)!, 0) : null;
  audit.releaseObservedUnits = completeQty(releaseRows);
  audit.capacityAtClosing = completeQty(closingRows);
  if (identified) {
    if (!closingRows.length) audit.issues.push({ code: 'missing_snapshot', identity: projectKey, indices: [] });
    else if (audit.capacityAtClosing === null || closingRows.some((r) => historyNumber(r.qty) === null || historyNumber(r.qty)! < 0))
      audit.issues.push({ code: 'missing_quantity', identity: projectKey, indices: [] });
    for (const r of closingRows) if (historyNumber(r.typology_stock ?? r.stock) === null
      || historyNumber(r.sold_in_period ?? r.liquid_sales ?? r.sales) === null)
      audit.issues.push({ code: 'missing_measurement', identity: `${projectKey}|${String(r.typology_id)}`, indices: [] });
    // A previously observed ID disappearing is not proof of extinction. No carry-forward is allowed.
    const roster = new Set(rows.map((r) => String(r.typology_id)));
    const closingIds = new Set(closingRows.map((r) => String(r.typology_id)));
    for (const id of roster) if (!closingIds.has(id))
      audit.issues.push({ code: 'incomplete_snapshot', identity: `${projectKey}|${id}`, indices: [] });
  }
  audit.registryComparable = audit.registryMonth !== null && audit.registryMonth === audit.closingMonth && audit.registryTotalUnits !== null;
  return { rows, releaseRows, closingRows, audit };
}
