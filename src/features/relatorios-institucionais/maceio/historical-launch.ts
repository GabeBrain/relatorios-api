import { marketMonth, type MarketRow } from './market';

/** Authorized cohort calculation. Callers must reconcile each month with the
 * municipal flow. Never uses current catalog quantities or stock differences. */
export function maceioHistoricalLaunch(row: MarketRow, release: string | null, month: string) {
  const explicit = row.releases_in_period !== undefined && row.releases_in_period !== null
    && row.releases_in_period !== '';
  const origin = explicit ? 'explicit' : 'historical-launch-cohort';
  if (!marketMonth(`${month}-01`) || !explicit && !release) return { value: null, origin };
  const raw = explicit ? row.releases_in_period : release === month ? row.qty : 0;
  if (!['number', 'string'].includes(typeof raw) || !/^\d+(?:\.0+)?$/.test(String(raw))) return { value: null, origin };
  const value = Number(raw);
  return { value: Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER / 100 ? value : null, origin };
}

export const historicalLaunchNotice = 'Lançamentos sem fluxo explícito são derivados da oferta inicial (qty) da fotografia histórica no mês de lançamento do empreendimento; nos demais meses, zero. Cada competência é reconciliada ao total municipal. Etapas e revisões sem correspondência mantêm o indicador em conferência. Regra autorizada por Lucas em 19/11/2026; não equivale à homologação.';
