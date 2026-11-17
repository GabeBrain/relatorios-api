import type { MarketRow } from './market';

/** Monthly release flow when supplied; otherwise the historical quantity only
 * in the project's actual launch month (same cohort method as SP). Callers must
 * reconcile every month with the municipal releases, never just the window sum.
 * No current-register quantities or stock differences are used. */
export function maceioHistoricalLaunch(row: MarketRow, release: string | null, month: string): number | null {
  const explicit = row.releases_in_period !== undefined;
  if (!explicit && !release) return null;
  const raw = explicit ? row.releases_in_period : release === month ? row.qty : 0;
  if (typeof raw !== 'number' && (typeof raw !== 'string' || !/^\d+$/.test(raw))) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER / 100 ? value : null;
}
