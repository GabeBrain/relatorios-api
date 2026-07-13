import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Legend, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowDownAZ, ArrowDownUp, ArrowUpAZ, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { currencyCompactNoPrefix, numCompactBR, pctRaw } from '@/lib/format';
import { VariationStrip } from './VariationStrip';
import type { SeriesPoint, ComboBucket, IpcSeriesPoint } from './aggregate';
import type { Granularity } from './types';

const P = 'hsl(var(--dg-primary))';
const A = 'hsl(var(--dg-accent))';
const M = 'hsl(var(--dg-muted))';
const WINDOW = 12;

// ============ Tooltip padrão (§2) — cor #212529 no texto ============
const HL = '#212529';

interface TooltipEntry { name?: string | number; value?: number | string | null; color?: string; dataKey?: string | number }
interface DGTooltipProps { active?: boolean; label?: string | number; payload?: TooltipEntry[]; format?: (v: number) => string }

function DGTooltip({ active, label, payload, format }: DGTooltipProps) {
  if (!active || !payload?.length) return null;
  const fmt = format ?? ((v: number) => v.toFixed(1).replace('.', ','));
  return (
    <div
      style={{
        background: 'hsl(var(--dg-card))',
        border: '1px solid hsl(var(--dg-border))',
        borderRadius: 4,
        padding: '6px 8px',
        fontSize: 10,
        boxShadow: '0 2px 6px hsl(0 0% 0% / 0.08)',
      }}
    >
      <div style={{ fontWeight: 700, color: HL, marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => {
        const v = typeof p.value === 'number' ? p.value : Number(p.value);
        const shown = Number.isFinite(v) ? fmt(v) : '—';
        return (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color ?? P, display: 'inline-block' }} />
            <span style={{ color: 'hsl(var(--dg-muted))' }}>{p.name}:</span>
            <span style={{ color: HL, fontWeight: 700, marginLeft: 'auto' }}>{shown}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============ Card wrapper ============

interface CardProps {
  title: string;
  subtitle?: string;
  extras?: ReactNode;
  info?: ReactNode;
  children: ReactNode;
  variationSlot?: ReactNode;
}
function ChartCard({ title, subtitle, extras, info, variationSlot, children }: CardProps) {
  return (
    <section className="dg-card w-full">
      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1">
            <h2 className="dg-title">{title}</h2>
            {info}
          </div>
          {subtitle && <p className="dg-subtle">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {variationSlot}
          {extras}
        </div>
      </header>
      {children}
    </section>
  );
}

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

// ============ Temporais ============

export function EvolucaoChart({ data }: { data: SeriesPoint[]; granularity: Granularity }) {
  return (
    <ChartCard title="Evolução do mercado" subtitle="Unidades Lançadas × Unidades Vendidas">
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
          <Tooltip content={<DGTooltip format={(v) => numCompactBR(v, 1)} />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="ofertaLancada" name="Unidades Lançadas" stroke={A} fill="url(#dg-gL)" strokeWidth={2} />
          <Area type="monotone" dataKey="vendaLiquida" name="Unidades Vendidas" stroke={P} fill="url(#dg-gV)" strokeWidth={2}>
            <LabelList dataKey="vendaLiquida" position="top" formatter={(v: number) => (v > 0 ? numCompactBR(v, 1) : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Area>
        </AreaChart>
      </ScrollableChart>
    </ChartCard>
  );
}

export function IvvChart({ data, granularity }: { data: SeriesPoint[]; granularity: Granularity }) {
  const variation = data.map((d) => ({ period: d.period, value: d.ivv }));
  return (
    <ChartCard
      title="IVV (índice de velocidade de vendas)"
      subtitle="Vendas / (Estoque + Vendas) — cartões: média do período"
      variationSlot={<VariationStrip values={variation} granularity={granularity} mode="avg" />}
    >
      <ScrollableChart height={220} count={data.length}>
        <LineChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--dg-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={0} />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip content={<DGTooltip format={(v) => pctRaw(v * 100, 1)} />} />
          <Line type="monotone" dataKey="ivv" name="IVV" stroke={P} strokeWidth={2.5} dot={{ r: 3, fill: P }}>
            <LabelList dataKey="ivv" position="top" formatter={(v: number) => (v > 0 ? pctRaw(v * 100, 1) : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Line>
        </LineChart>
      </ScrollableChart>
    </ChartCard>
  );
}

export function VgvChart({ data }: { data: SeriesPoint[]; granularity: Granularity }) {
  return (
    <ChartCard title="VGV Lançado × VGV Estoque" subtitle="Lançamentos vs Estoque por período (R$)">
      <ScrollableChart height={260} count={data.length}>
        <BarChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--dg-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={0} />
          <YAxis hide />
          <Tooltip content={<DGTooltip format={(v) => currencyCompactNoPrefix(v)} />} />
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

// ============ Combos (barras horizontais) ============

type SortMode = { by: 'value' | 'label'; dir: 'asc' | 'desc' };

function sortCombo(data: ComboBucket[], mode: SortMode): ComboBucket[] {
  const out = data.slice();
  out.sort((a, b) => {
    if (mode.by === 'value') return mode.dir === 'desc' ? b.estoque - a.estoque : a.estoque - b.estoque;
    return mode.dir === 'desc' ? b.key.localeCompare(a.key, 'pt-BR') : a.key.localeCompare(b.key, 'pt-BR');
  });
  return out;
}

export function OfertaComboChart({ title, data }: { title: string; data: ComboBucket[] }) {
  const [mode, setMode] = useState<SortMode>({ by: 'value', dir: 'desc' });
  const toggle = (by: SortMode['by']) => {
    setMode((m) => (m.by === by ? { by, dir: m.dir === 'desc' ? 'asc' : 'desc' } : { by, dir: by === 'value' ? 'desc' : 'asc' }));
  };
  const sorted = sortCombo(data, mode);
  return (
    <ChartCard
      title={title}
      subtitle="Estoque (barras) e Tempo de Estoque em meses (linha)"
      extras={
        <div className="flex items-center gap-1">
          <button type="button" className="dg-chip" data-active={mode.by === 'value'} onClick={() => toggle('value')} style={{ padding: '2px 6px', fontSize: '9px' }} title="Ordenar por valor">
            <ArrowDownUp className="h-3 w-3" />
          </button>
          <button type="button" className="dg-chip" data-active={mode.by === 'label'} onClick={() => toggle('label')} style={{ padding: '2px 6px', fontSize: '9px' }} title="Ordenar por rótulo">
            {mode.dir === 'asc' ? <ArrowDownAZ className="h-3 w-3" /> : <ArrowUpAZ className="h-3 w-3" />}
          </button>
        </div>
      }
    >
      <ScrollableChart height={260} count={sorted.length}>
        <ComposedChart data={sorted} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--dg-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="key" tick={{ fontSize: 10 }} interval={0} />
          <YAxis yAxisId="left" hide />
          <YAxis yAxisId="right" orientation="right" hide />
          <Tooltip content={<DGTooltip format={(v) => numCompactBR(v, 1)} />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar yAxisId="left" dataKey="estoque" name="Estoque" fill={P} radius={[2, 2, 0, 0]}>
            <LabelList dataKey="estoque" position="top" formatter={(v: number) => (v > 0 ? numCompactBR(v, 1) : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="tempoEstoque" name="Tempo de Estoque (meses)" stroke={A} strokeWidth={2.5} dot={{ r: 3, fill: A }}>
            <LabelList dataKey="tempoEstoque" position="top" formatter={(v: number) => (v > 0 ? `${v.toFixed(1).replace('.', ',')}` : '')} className="fill-[hsl(var(--dg-text))] text-[9px]" />
          </Line>
        </ComposedChart>
      </ScrollableChart>
    </ChartCard>
  );
}

// ============ IPC ============

export function IpcChart({ series, standards, granularity }: { series: IpcSeriesPoint[]; standards: string[]; granularity: Granularity }) {
  const colors = [P, A, M, 'hsl(88 30% 30%)', 'hsl(51 60% 40%)', 'hsl(88 45% 60%)', 'hsl(0 0% 60%)'];
  const variation = series.map((row) => {
    const vals = standards.map((s) => Number(row[s] ?? 0)).filter((v) => Number.isFinite(v));
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { period: String(row.period), value: avg };
  });

  // Domain que sempre inclui 1 (linha de corte).
  const flatValues = series.flatMap((row) => standards.map((s) => Number(row[s] ?? 0))).filter((v) => Number.isFinite(v) && v > 0);
  const maxV = flatValues.length ? Math.max(...flatValues, 1.2) : 2;
  const minV = flatValues.length ? Math.min(...flatValues, 0.5) : 0;

  return (
    <ChartCard
      title="Índice de Performance Comercial (IPC)"
      subtitle="Participação nas vendas ÷ Participação no estoque"
      variationSlot={<VariationStrip values={variation} granularity={granularity} mode="avg" format={(v) => v.toFixed(1).replace('.', ',')} />}
      info={
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Ajuda IPC" className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[hsl(var(--dg-primary-strong))] hover:bg-[hsl(var(--dg-primary-soft))]">
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-80 text-[11px]">
            <div className="font-semibold mb-1">Índice de Performance Comercial (IPC)</div>
            <p className="mb-2 text-muted-foreground">
              Compara a participação do empreendimento nas vendas com sua participação no estoque disponível.
            </p>
            <ul className="space-y-0.5">
              <li><strong>&gt; 1</strong> — vende acima da média do mercado.</li>
              <li><strong>= 1</strong> — vende proporcionalmente ao estoque.</li>
              <li><strong>&lt; 1</strong> — vende abaixo da média.</li>
            </ul>
          </PopoverContent>
        </Popover>
      }
    >
      <ScrollableChart height={280} count={series.length}>
        <AreaChart data={series} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--dg-border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={0} />
          <YAxis hide domain={[minV, maxV]} />
          <Tooltip content={<DGTooltip format={(v) => v.toFixed(1).replace('.', ',')} />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine y={1} stroke={M} strokeDasharray="4 4" ifOverflow="extendDomain" label={{ value: '1,0', fontSize: 9, position: 'right', fill: M }} />
          {standards.map((s, i) => (
            <Area key={s} type="monotone" dataKey={s} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.35} strokeWidth={1.5} connectNulls={false} />
          ))}
        </AreaChart>
      </ScrollableChart>
    </ChartCard>
  );
}
