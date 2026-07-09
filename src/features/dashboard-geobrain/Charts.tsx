import { useEffect, useRef, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Legend, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { currencyCompactNoPrefix, numCompact, numCompactBR, pctRaw } from '@/lib/format';
import { VariationStrip } from './VariationStrip';
import type { SeriesPoint, ComboBucket, IpcSeriesPoint } from './aggregate';

const P = 'hsl(var(--dg-primary))';
const A = 'hsl(var(--dg-accent))';
const M = 'hsl(var(--dg-muted))';
const WINDOW = 12;

interface CardProps { title: string; subtitle?: string; extras?: ReactNode; children: ReactNode; variation?: { period: string; value: number }[]; }

function ChartCard({ title, subtitle, extras, variation, children }: CardProps) {
  return (
    <section className="dg-card w-full">
      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="dg-title">{title}</h2>
          {subtitle && <p className="dg-subtle">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {variation && <VariationStrip values={variation} />}
          {extras}
        </div>
      </header>
      {children}
    </section>
  );
}

/**
 * Wrapper com scroll horizontal. Se `count > WINDOW`, força largura
 * interna proporcional para mostrar apenas 12 rótulos por vez, e alinha
 * o scroll à direita (períodos mais recentes visíveis).
 */
function ScrollableChart({ height, count, children }: { height: number; count: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
  }, [count]);
  const overflow = count > WINDOW;
  const innerStyle = overflow ? { width: `${(count / WINDOW) * 100}%`, height } : { width: '100%', height };
  return (
    <div ref={ref} style={{ overflowX: overflow ? 'auto' : 'hidden', width: '100%' }}>
      <div style={innerStyle}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function EvolucaoChart({ data }: { data: SeriesPoint[] }) {
  const variation = data.map((d) => ({ period: d.period, value: d.vendaLiquida }));
  return (
    <ChartCard title="Evolução do mercado" subtitle="Unidades Lançadas × Unidades Vendidas" variation={variation}>
      <ScrollableChart height={260} count={data.length}>
        <AreaChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="dg-gL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={A} stopOpacity={0.45} />
              <stop offset="100%" stopColor={A} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dg-gV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={P} stopOpacity={0.45} />
              <stop offset="100%" stopColor={P} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--dg-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={0} />
          <YAxis hide />
          <Tooltip formatter={(v: number) => numCompactBR(v)} contentStyle={{ fontSize: 10 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="ofertaLancada" name="Unidades Lançadas" stroke={A} fill="url(#dg-gL)" strokeWidth={2} />
          <Area type="monotone" dataKey="vendaLiquida" name="Unidades Vendidas" stroke={P} fill="url(#dg-gV)" strokeWidth={2}>
            <LabelList dataKey="vendaLiquida" position="top" formatter={(v: number) => (v > 0 ? numCompact(v, 0) : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Area>
        </AreaChart>
      </ScrollableChart>
    </ChartCard>
  );
}

export function IvvChart({ data }: { data: SeriesPoint[] }) {
  const variation = data.map((d) => ({ period: d.period, value: d.ivv }));
  return (
    <ChartCard title="IVV (índice de velocidade de vendas)" subtitle="Vendas / (Estoque final + Vendas)" variation={variation}>
      <ScrollableChart height={220} count={data.length}>
        <LineChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--dg-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={0} />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip formatter={(v: number) => pctRaw(v * 100, 2)} contentStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="ivv" name="IVV" stroke={P} strokeWidth={2.5} dot={{ r: 3, fill: P }}>
            <LabelList dataKey="ivv" position="top" formatter={(v: number) => (v > 0 ? pctRaw(v * 100, 2) : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Line>
        </LineChart>
      </ScrollableChart>
    </ChartCard>
  );
}

export function VgvChart({ data }: { data: SeriesPoint[] }) {
  const variation = data.map((d) => ({ period: d.period, value: d.vgvLancamento }));
  return (
    <ChartCard title="VGV lançado × VGV oferta final (valores em R$)" subtitle="Lançamentos vs Estoque final por período" variation={variation}>
      <ScrollableChart height={260} count={data.length}>
        <BarChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--dg-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={0} />
          <YAxis hide />
          <Tooltip formatter={(v: number) => currencyCompactNoPrefix(v)} contentStyle={{ fontSize: 10 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="vgvLancamento" name="VGV Lançamento" fill={P} radius={[2, 2, 0, 0]}>
            <LabelList dataKey="vgvLancamento" position="top" formatter={(v: number) => (v > 0 ? currencyCompactNoPrefix(v) : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Bar>
          <Bar dataKey="vgvEstoque" name="VGV Estoque" fill={A} radius={[2, 2, 0, 0]}>
            <LabelList dataKey="vgvEstoque" position="top" formatter={(v: number) => (v > 0 ? currencyCompactNoPrefix(v) : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Bar>
        </BarChart>
      </ScrollableChart>
    </ChartCard>
  );
}

/** Combo: barras = estoque final; linha = tempo de estoque (meses). */
export function OfertaComboChart({ title, data }: { title: string; data: ComboBucket[] }) {
  return (
    <ChartCard title={title} subtitle="Estoque final (barras) e Tempo de estoque em meses (linha)">
      <ScrollableChart height={260} count={data.length}>
        <ComposedChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--dg-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="key" tick={{ fontSize: 10 }} interval={0} />
          <YAxis yAxisId="left" hide />
          <YAxis yAxisId="right" orientation="right" hide />
          <Tooltip contentStyle={{ fontSize: 10 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar yAxisId="left" dataKey="estoque" name="Estoque final" fill={P} radius={[2, 2, 0, 0]}>
            <LabelList dataKey="estoque" position="top" formatter={(v: number) => (v > 0 ? numCompact(v, 0) : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="tempoEstoque" name="Tempo de estoque (meses)" stroke={A} strokeWidth={2.5} dot={{ r: 3, fill: A }}>
            <LabelList dataKey="tempoEstoque" position="top" formatter={(v: number) => (v > 0 ? `${v.toFixed(0)}m` : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Line>
        </ComposedChart>
      </ScrollableChart>
    </ChartCard>
  );
}

/** IPC — áreas empilhadas por padrão. */
export function IpcChart({ series, standards }: { series: IpcSeriesPoint[]; standards: string[] }) {
  const colors = [P, A, M, 'hsl(88 30% 30%)', 'hsl(51 60% 40%)', 'hsl(88 45% 60%)', 'hsl(0 0% 60%)'];
  // Variação usando média dos padrões no período
  const variation = series.map((row) => {
    const vals = standards.map((s) => Number(row[s] ?? 0)).filter((v) => Number.isFinite(v));
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { period: String(row.period), value: avg };
  });
  return (
    <ChartCard title="Índice de performance comercial" subtitle="IPC por padrão (Vendas% ÷ Estoque%). >1 = acima da média" variation={variation}>
      <ScrollableChart height={280} count={series.length}>
        <AreaChart data={series} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--dg-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={0} />
          <YAxis hide />
          <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => v.toFixed(2)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine y={1} stroke={M} strokeDasharray="4 4" label={{ value: '1,0', fontSize: 9, position: 'right', fill: M }} />
          {standards.map((s, i) => (
            <Area key={s} type="monotone" dataKey={s} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.35} strokeWidth={1.5} />
          ))}
        </AreaChart>
      </ScrollableChart>
    </ChartCard>
  );
}
