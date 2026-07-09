import { pctSigned } from '@/lib/format';

/**
 * Mini-cartões de variação por gráfico temporal.
 * Compara o último período com âncoras 1a/3a/5a/10a e "desde início".
 * Recebe valores numéricos por período (mesma ordem cronológica).
 */
interface Props {
  values: { period: string; value: number }[];
  /** Se true, formatação em % (para IVV, IPC). Caso contrário, delta relativo. */
  asPct?: boolean;
}

const ANCHORS: { label: string; periodsBack: number }[] = [
  { label: 'Desde início', periodsBack: Number.POSITIVE_INFINITY },
  { label: '10a', periodsBack: 40 }, // ~10 anos em trimestres
  { label: '5a', periodsBack: 20 },
  { label: '3a', periodsBack: 12 },
  { label: '1a', periodsBack: 4 },
];

export function VariationStrip({ values }: Props) {
  if (!values.length) return null;
  const lastIdx = values.length - 1;
  const last = values[lastIdx].value;

  return (
    <div className="dg-var-strip">
      {ANCHORS.map(({ label, periodsBack }) => {
        const idx = periodsBack === Number.POSITIVE_INFINITY ? 0 : Math.max(0, lastIdx - periodsBack);
        if (idx === lastIdx && periodsBack !== Number.POSITIVE_INFINITY) {
          return (
            <div key={label} className="dg-var-item" data-neg="false">
              <div className="dg-var-label">{label}</div>
              <div className="dg-var-value">—</div>
            </div>
          );
        }
        const base = values[idx].value;
        const delta = base > 0 ? (last - base) / base : null;
        const neg = delta != null && delta < 0;
        return (
          <div key={label} className="dg-var-item" data-neg={neg}>
            <div className="dg-var-label">{label}</div>
            <div className="dg-var-value">{delta == null ? '—' : pctSigned(delta)}</div>
          </div>
        );
      })}
    </div>
  );
}
