import type { Granularity } from './types';

interface Value { period: string; value: number }

interface Props {
  values: Value[];
  granularity: Granularity;
  /** 'delta' = variação percentual last vs base; 'avg' = média da janela. */
  mode?: 'delta' | 'avg';
  /** Formatter para o valor final (usado em modo 'avg'). */
  format?: (v: number) => string;
}

function anchors(g: Granularity): { label: string; periodsBack: number }[] {
  const map: Record<Granularity, { a1: number; a3: number }> = {
    year: { a1: 1, a3: 3 },
    quarter: { a1: 4, a3: 12 },
    month: { a1: 12, a3: 36 },
  };
  const { a1, a3 } = map[g];
  return [
    { label: 'Desde início', periodsBack: Number.POSITIVE_INFINITY },
    { label: '3a', periodsBack: a3 },
    { label: '1a', periodsBack: a1 },
  ];
}

function pctSigned1(v: number): string {
  const s = (v * 100).toFixed(1).replace('.', ',');
  return v > 0 ? `+${s}%` : `${s}%`;
}
function pct1(v: number): string {
  return `${(v * 100).toFixed(1).replace('.', ',')}%`;
}

export function VariationStrip({ values, granularity, mode = 'delta', format }: Props) {
  if (!values.length) return null;
  const lastIdx = values.length - 1;
  const last = values[lastIdx].value;

  return (
    <div className="dg-var-strip">
      {anchors(granularity).map(({ label, periodsBack }) => {
        const idx = periodsBack === Number.POSITIVE_INFINITY ? 0 : Math.max(0, lastIdx - periodsBack);

        if (mode === 'avg') {
          const window = values.slice(idx, lastIdx + 1).map((v) => v.value).filter((v) => Number.isFinite(v));
          const avg = window.length ? window.reduce((a, b) => a + b, 0) / window.length : 0;
          return (
            <div key={label} className="dg-var-item" data-neg="false">
              <div className="dg-var-label">{label}</div>
              <div className="dg-var-value">{format ? format(avg) : pct1(avg)}</div>
            </div>
          );
        }

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
            <div className="dg-var-value">{delta == null ? '—' : pctSigned1(delta)}</div>
          </div>
        );
      })}
    </div>
  );
}
