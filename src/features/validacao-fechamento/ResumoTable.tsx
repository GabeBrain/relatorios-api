import { useLayoutEffect, useMemo, useRef } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

type MetricFormat = 'int' | 'currency' | 'percent';

function formatValue(v: number | null, fmt: MetricFormat): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (fmt === 'currency') {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  if (fmt === 'percent') {
    return `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
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

/** Medidor 0–100% renderizado dentro da célula. */
function Gauge({ value }: { value: number | null }) {
  if (value == null || !Number.isFinite(value)) return <span className="vf-zero">—</span>;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <span className="vf-gauge" title={`${(pct * 100).toFixed(1)}%`}>
      <span className="vf-gauge-track">
        <span className="vf-gauge-fill" style={{ width: `${pct * 100}%` }} />
      </span>
      <span className="vf-gauge-value">{formatValue(value, 'percent')}</span>
    </span>
  );
}

function MetricInfo({ label, info }: { label: string; info: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="vf-info" aria-label={`Regra de cálculo — ${label}`}>
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-[10pt] leading-snug">
        <div className="mb-1 font-semibold">{label}</div>
        <p className="text-muted-foreground">{info}</p>
      </PopoverContent>
    </Popover>
  );
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
  useLayoutEffect(() => {
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
              info={m.info}
              noVariation={m.noVariation}
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
  format: MetricFormat;
  info: string;
  noVariation?: boolean;
  buckets: ResumoResult['buckets'];
  yearAgo: ResumoResult['yearAgo'];
  prevBucket: ResumoResult['prevBucket'];
  variationLabel: string;
  totalRange: { first: ResumoResult['buckets'][number] | null; last: ResumoResult['buckets'][number] | null };
}

function MetricBlock({ metric, label, format, info, noVariation, buckets, yearAgo, prevBucket, variationLabel, totalRange }: BlockProps) {
  const totalVar = varPct(
    totalRange.last?.metrics[metric] ?? null,
    totalRange.first?.metrics[metric] ?? null,
  );
  const totalCell = formatPct(totalVar);

  return (
    <>
      <tr className="vf-total">
        <td className="vf-label">
          <span className="inline-flex items-center gap-1">
            {label}
            <MetricInfo label={label} info={info} />
          </span>
        </td>
        {buckets.map((b) => (
          <td key={b.key} className={format === 'percent' ? 'vf-gauge-cell' : undefined}>
            {format === 'percent'
              ? <Gauge value={b.metrics[metric]} />
              : formatValue(b.metrics[metric], format)}
          </td>
        ))}
        {noVariation ? <td className="vf-zero">—</td> : <td className={totalCell.cls}>{totalCell.label}</td>}
      </tr>
      {!noVariation && (
        <>
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
      )}
    </>
  );
}
