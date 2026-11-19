import { CAGED_SECTORS, CAGED_UFS, cagedPeriods, parseCagedReport, type CagedReport } from './caged';

export interface VerifiedCagedSnapshot {
  schema: string; version: string; snapshotVersion: string; coverageStart: string; publishedThrough: string;
  loadedAt: string; verifiedAt: string; source: string; ufs: string[]; sectors: string[];
  months: { month: string; values: number[] }[];
}

/** Official aggregated source snapshot. Never fills missing months or projects a balance. */
export function reportFromVerifiedSnapshot(snapshot: VerifiedCagedSnapshot, end: string): CagedReport | null {
  if (snapshot.schema !== 'maceio-caged-verified-snapshot-v1' || snapshot.version !== 'mte-caged-v1'
    || JSON.stringify(snapshot.ufs) !== JSON.stringify([...CAGED_UFS].sort())
    || JSON.stringify(snapshot.sectors) !== JSON.stringify([...CAGED_SECTORS].sort())) throw new Error('Snapshot CAGED inválido.');
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(end) || end > snapshot.publishedThrough || end < snapshot.coverageStart) return null;
  const frames = new Map<string, number[]>();
  for (const frame of snapshot.months) {
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(frame.month) || frame.month < snapshot.coverageStart || frame.month > snapshot.publishedThrough
      || frames.has(frame.month) || frame.values.length !== CAGED_UFS.length * CAGED_SECTORS.length || frame.values.some(value => !Number.isSafeInteger(value))) throw new Error('Grade CAGED inválida.');
    const value = (uf: string, sector: string) => frame.values[snapshot.ufs.indexOf(uf) * snapshot.sectors.length + snapshot.sectors.indexOf(sector)];
    for (const uf of CAGED_UFS) if (CAGED_SECTORS.filter(sector => sector !== 'total').reduce((sum, sector) => sum + value(uf, sector), 0) !== value(uf, 'total')) throw new Error('Setores CAGED divergentes.');
    for (const sector of CAGED_SECTORS) if (CAGED_UFS.filter(uf => uf !== 'BR').reduce((sum, uf) => sum + value(uf, sector), 0) !== value('BR', sector)) throw new Error('UFs CAGED divergentes.');
    frames.set(frame.month, frame.values);
  }
  const completePeriods: string[] = [], rows: CagedReport['rows'] = [];
  for (const period of cagedPeriods(end)) {
    const months = period.length === 7 ? [period] : Array.from({ length: period === end.slice(0, 4) ? Number(end.slice(5)) : 12 }, (_, index) => `${period}-${String(index + 1).padStart(2, '0')}`);
    if (months.some(month => !frames.has(month))) continue;
    completePeriods.push(period);
    snapshot.ufs.forEach((uf, u) => snapshot.sectors.forEach((sector, s) => {
      rows.push({ period, uf, sector: sector as CagedReport['rows'][number]['sector'], balance: months.reduce((sum, month) => sum + frames.get(month)![u * snapshot.sectors.length + s], 0) });
    }));
  }
  // Both current partial year and comparison month must be present for the six slides.
  if (![end, end.slice(0, 4), `${Number(end.slice(0, 4)) - 1}${end.slice(4)}`].every(period => completePeriods.includes(period))) return null;
  return parseCagedReport({ version: snapshot.version, end, snapshotVersion: snapshot.snapshotVersion, coverageStart: snapshot.coverageStart,
    publishedThrough: snapshot.publishedThrough, loadedAt: snapshot.loadedAt, source: snapshot.source, completePeriods, rows }, end);
}

export async function loadVerifiedCagedReport(end: string) {
  const snapshot = (await import('./assets/caged-verified-snapshot.json')).default;
  const report = reportFromVerifiedSnapshot(snapshot, end);
  return report ? { report, verifiedAt: snapshot.verifiedAt } : null;
}
