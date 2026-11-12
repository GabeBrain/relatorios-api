export type EmpresasMonth = {
  competencia: string;
  establishmentsPartition: string;
  companiesPartition: string;
};

/** The source query truncates partition dates to their month. Keep the existing day 12 contract. */
export function empresasMonths(target: string, limit = 6): EmpresasMonth[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(target) || !Number.isInteger(limit) || limit < 1 || limit > 12) {
    throw new Error('INVALID_TARGET_COMPETENCIA');
  }
  const [year, month] = target.split('-').map(Number);
  return Array.from({ length: limit }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const prefix = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return {
      competencia: `${prefix}-01`,
      establishmentsPartition: `${prefix}-12`,
      companiesPartition: `${prefix}-12`,
    };
  });
}

/** Only a valid empty result may trigger a move to the previous month. */
export function proxyMonthUnavailable(payload: Record<string, unknown>): boolean {
  if (!Array.isArray(payload.rows)) throw new Error('INVALID_PROXY_ROWS');
  if (payload.available === false && payload.rows.length === 0) return true;
  if (payload.available !== true || payload.rows.length === 0) throw new Error('INVALID_PROXY_AVAILABILITY');
  const source = payload.source as Record<string, unknown> | null;
  const establishmentsRows = Number(source?.establishmentsRows);
  const companiesMatched = Number(source?.companiesMatched);
  if (!Number.isSafeInteger(establishmentsRows) || establishmentsRows <= 0 || companiesMatched !== establishmentsRows) {
    throw new Error('INCOMPLETE_PROXY_SOURCE');
  }
  return false;
}
