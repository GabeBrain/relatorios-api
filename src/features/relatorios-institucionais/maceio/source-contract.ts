import { marketMonth, normalizeMarketText, type MarketRow } from './market';

export const MACEIO_HISTORY_URL = 'https://app.geobrain.com.br/public-api/v2/building-with-history-internal';
export class MaceioSourceError extends Error {
  constructor(public code: 'HTTP' | 'NETWORK' | 'PAGINATION' | 'SCOPE' | 'PERIOD', public httpStatus: number | null = null) {
    super(code); this.name = 'MaceioSourceError';
  }
}

/** v1 temporal resources have no city/state fields: scope comes from the pinned query.
 * Explicit identities are still checked; conflicting identities never get overwritten. */
export function scopeMaceioRow(row: MarketRow, city: string, segment: string, temporal: boolean): MarketRow {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new MaceioSourceError('SCOPE');
  if (row.city != null && normalizeMarketText(row.city) !== normalizeMarketText(city)
      || row.state != null && normalizeMarketText(row.state) !== 'al'
      || row.uf != null && normalizeMarketText(row.uf) !== 'al'
      || normalizeMarketText(row.building_type) !== normalizeMarketText(segment)
      || !temporal && (row.city == null || (row.state ?? row.uf) == null)) throw new MaceioSourceError('SCOPE');
  const result = { ...row, city, state: 'AL' };
  if (temporal) {
    // An explicitly monthly period can be normalized without inventing a missing month.
    const period = typeof row.period === 'string' && /^\d{4}-\d{2}$/.test(row.period) ? `${row.period}-01` : row.period;
    if (!marketMonth(period)) throw new MaceioSourceError('PERIOD');
    return { ...result, period };
  }
  return result;
}

/** Links may omit filters. Never follow them: validate the cursor and rebuild every
 * request from the original scope. Explicitly contradictory filters are rejected. */
export function checkMaceioNext(link: unknown, url: string, query: Record<string, unknown>, page: number, last: number, optional = false) {
  if (link === undefined && optional) return;
  if (link === null) {
    if (page !== last) throw new MaceioSourceError('PAGINATION');
    return;
  }
  if (typeof link !== 'string' || !link || page >= last) throw new MaceioSourceError('PAGINATION');
  const next = new URL(link, url), original = new URL(url);
  if (next.origin !== original.origin || next.pathname !== original.pathname || next.username || next.password
      || next.searchParams.get('page') !== String(page + 1)) throw new MaceioSourceError('PAGINATION');
  for (const [key, value] of Object.entries(query)) {
    if (key === 'page' || key === 'per_page') continue;
    const provided = next.searchParams.getAll(key);
    if (provided.length && JSON.stringify(provided) !== JSON.stringify((Array.isArray(value) ? value : [value]).map(String))) throw new MaceioSourceError('SCOPE');
  }
}

export const sourceFailure = (error: unknown) => error instanceof MaceioSourceError
  ? { code: error.code, httpStatus: error.httpStatus } : { code: 'CONTRACT', httpStatus: null };
