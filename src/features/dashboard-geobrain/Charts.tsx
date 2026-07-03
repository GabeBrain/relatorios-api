import { useState, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { brlCompact, numCompact, pctRaw } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SeriesPoint, Granularity } from './types';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  children: ReactNode;
}

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'month', label: 'Mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Ano' },
];

function ChartCard({ title, subtitle, granularity, onGranularityChange, children }: ChartCardProps) {
  return (
    <section className="w-full rounded-xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-input">
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => onGranularityChange(g.value)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium transition-colors',
                granularity === g.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent',
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Wraps a single chart in a card with granularity toggle and the ResponsiveContainer height. */
export function EvolucaoChart({ data, granularity, onGranularityChange }: {
  data: SeriesPoint[]; granularity: Granularity; onGranularityChange: (g: Granularity) => void;
}) {
  return (
    <ChartCard title="Evolução do Mercado" subtitle="Oferta Lançada e Venda Líquida por período" granularity={granularity} onGranularityChange={onGranularityChange}>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="gOferta" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(45 90% 50%)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(45 90% 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => numCompact(v, 0)} />
          <Tooltip formatter={(v: number) => numCompact(v)} contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="ofertaLancada" name="Oferta Lançada" stroke="hsl(var(--primary))" fill="url(#gOferta)" strokeWidth={2}>
            <LabelList dataKey="ofertaLancada" position="top" formatter={(v: number) => (v > 0 ? numCompact(v, 0) : '')} className="fill-foreground text-[10px]" />
          </Area>
          <Area type="monotone" dataKey="vendaLiquida" name="Venda Líquida" stroke="hsl(45 90% 45%)" fill="url(#gVendas)" strokeWidth={2}>
            <LabelList dataKey="vendaLiquida" position="bottom" formatter={(v: number) => (v > 0 ? numCompact(v, 0) : '')} className="fill-muted-foreground text-[10px]" />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function IvvChart({ data, granularity, onGranularityChange }: {
  data: SeriesPoint[]; granularity: Granularity; onGranularityChange: (g: Granularity) => void;
}) {
  return (
    <ChartCard title="IVV — Índice de Velocidade de Vendas" subtitle="Venda Líquida / (Estoque Final + Venda Líquida) por período" granularity={granularity} onGranularityChange={onGranularityChange}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 'auto']} />
          <Tooltip formatter={(v: number) => pctRaw(v * 100, 1)} contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="ivv" name="IVV" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }}>
            <LabelList dataKey="ivv" position="top" formatter={(v: number) => (v > 0 ? pctRaw(v * 100, 1) : '')} className="fill-foreground text-[10px]" />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function VgvChart({ data, granularity, onGranularityChange }: {
  data: SeriesPoint[]; granularity: Granularity; onGranularityChange: (g: Granularity) => void;
}) {
  return (
    <ChartCard title="VGV do Período" subtitle="VGV Lançamento e VGV Estoque por período" granularity={granularity} onGranularityChange={onGranularityChange}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => brlCompact(v)} />
          <Tooltip formatter={(v: number) => brlCompact(v)} contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="vgvLancamento" name="VGV Lançamento" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="vgvLancamento" position="top" formatter={(v: number) => (v > 0 ? brlCompact(v) : '')} className="fill-foreground text-[10px]" />
          </Bar>
          <Bar dataKey="vgvEstoque" name="VGV Estoque" fill="hsl(45 85% 55%)" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="vgvEstoque" position="top" formatter={(v: number) => (v > 0 ? brlCompact(v) : '')} className="fill-foreground text-[10px]" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Small local helper to keep chart granularity state in one place. */
export function useGranularity(initial: Granularity = 'quarter') {
  return useState<Granularity>(initial);
}
