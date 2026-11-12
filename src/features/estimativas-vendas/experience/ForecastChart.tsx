import { useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { methodLabel, type ChartRow } from './domain';
import type { StudyMethod } from '../scientific/study';
const COLORS: Record<StudyMethod, string> = { 'finotti-reference': 'var(--gb-verde-500)', 'stock-trend': 'var(--gb-placeholder)', constant: 'hsl(var(--muted-foreground))' };
export function ForecastChart({ rows, cutoff, methods, compact = false, percent = false, units, label = 'Histórico e previsão' }: { rows: ChartRow[]; cutoff: string; methods: StudyMethod[]; compact?: boolean; percent?: boolean; units?: number | null; label?: string }) {
  const data = useMemo(() => rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, percent && k !== 'month' && typeof v === 'number' ? units ? 100 * v / units : null : v]))), [rows, percent, units]);
  return <div className={compact ? 'evx-chart evx-chart-mini' : 'evx-chart'} role="img" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: compact ? 8 : 30, right: 28, bottom: 8, left: compact ? 0 : 8 }}>
      {!compact && <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />}
      <XAxis dataKey="month" hide={compact} minTickGap={55} tick={{ fontSize: 11 }} />
      <YAxis hide={compact} width={52} tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v)}${percent ? '%' : ''}`} domain={percent ? [0, 100] : [0, 'auto']} />
      {!compact && <Tooltip formatter={(v: number, name: string) => [v === null ? 'Sem dado' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${percent ? '%' : ' un.'}`, name]} />}
      {!compact && <Legend wrapperStyle={{ fontSize: 11 }} />}
      <ReferenceLine x={cutoff} stroke="hsl(var(--foreground))" strokeDasharray="2 3" label={compact ? undefined : { value: 'Previsão começa aqui', position: 'insideTopLeft', fontSize: 11 }} />
      <Line dataKey="history" name="Histórico informado" stroke="hsl(var(--foreground))" strokeWidth={compact ? 1.5 : 2} dot={{ r: compact ? 1.5 : 3, strokeWidth: 1 }} isAnimationActive={false} connectNulls={false} />
      {!compact && <Line dataKey="history" name="Ligação visual entre registros" legendType="none" tooltipType="none" stroke="hsl(var(--foreground))" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="2 5" dot={false} isAnimationActive={false} connectNulls />}
      {methods.map(m => <Line key={m} dataKey={m} name={methodLabel(m)} stroke={COLORS[m]} strokeWidth={m === 'finotti-reference' ? 3 : 2} strokeDasharray={m === 'finotti-reference' ? undefined : '6 4'} dot={false} isAnimationActive={false} connectNulls={false} />)}
      <Line dataKey="reported" name="Informado depois" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="1 4" dot={compact ? false : { r: 3 }} isAnimationActive={false} connectNulls={false} />
    </LineChart></ResponsiveContainer>
  </div>;
}
