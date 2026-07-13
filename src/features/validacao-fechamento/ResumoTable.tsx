import { useLayoutEffect, useMemo, useRef } from 'react';
import { intFmt } from '@/lib/format';
import type { Granularity, MetricKey, ResumoResult } from './aggregate';
import { METRICS, varPct } from './aggregate';

interface Props {
  resumo: ResumoResult;
  granularity: Granularity;
}

const GRAN_LABEL: Record<Granularity, { unit: string; varSame: string }> = {
  year:    { unit: 'Anual',      varSame: '% Var. Anual' },
  quarter: { unit: 'Trimestral', varSame: '% Var. Trimestral' },
  month:   { unit: 'Mensal',     varSame: '% Var. Mensal' },
};

function formatValue(v: number | null, fmt: 'int' | 'currency'): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (fmt === 'currency') {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  return intFmt(v);
}
function formatPct(v: number | null): { label: string; cls: string } {
  if (v == null || !Number.isFinite(v)) return { label: '—', cls: 'vf-zero' };
  const pct = v * 100;
  const label = `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const cls = pct > 0.05 ? 'vf-pos' : pct < -0.05 ? 'vf-neg' : 'vf-zero';
  return { label, cls };
}

export function ResumoTable({ resumo, granularity }: Props) {
  const { buckets, yearAgo, prevBucket } = resumo;
  const labels = GRAN_LABEL[granularity];
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalRange = useMemo(() => {
    if (buckets.length === 0) return { first: null as null | typeof buckets[number], last: null as null | typeof buckets[number] };
    return { first: buckets[0], last: buckets[buckets.length - 1] };
  }, [buckets]);

  // Inicia a rolagem da tabela resumo no máximo à direita, exibindo "% Var. Total" por padrão.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: 'auto' });
  }, [buckets, granularity]);

  if (buckets.length === 0) {
    return <div className="vf-card p-6 text-center text-sm text-[var(--vf-muted)]">Nenhum dado no filtro selecionado.</div>;
  }

  return (
    <div ref={scrollRef} className="vf-card overflow-auto">
      <table className="vf-resumo">
        <thead>
          <tr>
            <th className="vf-label">Indicador</th>
            {buckets.map((b) => (
              <th key={b.key}>{b.key}</th>
            ))}
            <th className="vf-total">% Var. Total</th>
          </tr>
        </thead>
        <tbody>
          {METRICS.map((m) => (
            <MetricBlock
              key={m.key}
              metric={m.key}
              label={m.label}
              format={m.format}
              buckets={buckets}
              yearAgo={yearAgo}
              prevBucket={prevBucket}
              variationLabel={labels.varSame}
              totalRange={totalRange}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface BlockProps {
  metric: MetricKey;
  label: string;
  format: 'int' | 'currency';
  buckets: ResumoResult['buckets'];
  yearAgo: ResumoResult['yearAgo'];
  prevBucket: ResumoResult['prevBucket'];
  variationLabel: string;
  totalRange: { first: ResumoResult['buckets'][number] | null; last: ResumoResult['buckets'][number] | null };
}

function MetricBlock({ metric, label, format, buckets, yearAgo, prevBucket, variationLabel, totalRange }: BlockProps) {
  const totalVar = varPct(
    totalRange.last?.metrics[metric] ?? null,
    totalRange.first?.metrics[metric] ?? null,
  );
  const totalCell = formatPct(totalVar);

  return (
    <>
      <tr className="vf-total">
        <td className="vf-label">{label}</td>
        {buckets.map((b) => (
          <td key={b.key}>{formatValue(b.metrics[metric], format)}</td>
        ))}
        <td className={totalCell.cls}>{totalCell.label}</td>
      </tr>
      <tr className="vf-var">
        <td className="vf-label">{variationLabel}</td>
        {buckets.map((b) => {
          const prev = prevBucket.get(b.key)?.[metric] ?? null;
          const v = varPct(b.metrics[metric], prev);
          const c = formatPct(v);
          return <td key={b.key} className={c.cls}>{c.label}</td>;
        })}
        <td />
      </tr>
      <tr className="vf-var">
        <td className="vf-label">% Var. Ano</td>
        {buckets.map((b) => {
          const aa = yearAgo.get(b.key)?.[metric] ?? null;
          const v = varPct(b.metrics[metric], aa);
          const c = formatPct(v);
          return <td key={b.key} className={c.cls}>{c.label}</td>;
        })}
        <td />
      </tr>
    </>
  );
}
