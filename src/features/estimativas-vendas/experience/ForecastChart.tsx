import { useMemo, useRef } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { monthIndex, shiftMonth } from '../expanded/contract';
import { methodLabel, type ChartRow } from './domain';
import type { StudyMethod } from '../scientific/study';
const COLORS: Record<StudyMethod, string> = { 'finotti-reference': 'var(--gb-verde-500)', 'stock-trend': 'var(--gb-placeholder)', constant: 'hsl(var(--muted-foreground))' };
export function ForecastChart({ rows, cutoff, methods, compact = false, percent = false, units, onStart, latest, label = 'Histórico e previsão' }: { rows: ChartRow[]; cutoff: string; methods: StudyMethod[]; compact?: boolean; percent?: boolean; units?: number | null; onStart?: (s: string) => void; latest?: string; label?: string }) {
  const drag = useRef(false);
  const data = useMemo(() => rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, percent && k !== 'month' && typeof v === 'number' ? units ? 100 * v / units : null : v]))), [rows, percent, units]);
  const domain = rows.map(r => r.month), first = domain[0];
  function move(clientX: number, rect: DOMRect) {
    if (!onStart || !first || !latest) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left - 60) / Math.max(1, rect.width - 90)));
    const count = monthIndex(domain.at(-1)!) - monthIndex(first);
    const date = shiftMonth(first, Math.round(ratio * count)); if (date <= latest) onStart(date);
  }
  return <div className={compact ? 'evx-chart evx-chart-mini' : 'evx-chart'} role="img" aria-label={label} onPointerDown={e => {
    // Only the visible origin marker starts a drag. The sliders provide keyboard access.
    if (!onStart || !first) return;
    const rect = e.currentTarget.getBoundingClientRect(), count = Math.max(1, monthIndex(domain.at(-1)!) - monthIndex(first));
    const marker = 60 + (monthIndex(cutoff) - monthIndex(first)) / count * (rect.width - 90);
    if (Math.abs(e.clientX - rect.left - marker) < 22) { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); }
  }} onPointerMove={e => { if (drag.current) move(e.clientX, e.currentTarget.getBoundingClientRect()); }} onPointerUp={e => { if (drag.current) { move(e.clientX, e.currentTarget.getBoundingClientRect()); drag.current = false; } }} onPointerCancel={() => { drag.current = false; }}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: compact ? 8 : 30, right: 28, bottom: 8, left: compact ? 0 : 8 }}>
      {!compact && <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />}
      <XAxis dataKey="month" hide={compact} minTickGap={55} tick={{ fontSize: 11 }} />
      <YAxis hide={compact} width={52} tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v)}${percent ? '%' : ''}`} domain={[0, 'auto']} />
      {!compact && <Tooltip formatter={(v: number, name: string) => [v === null ? 'Sem dado' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${percent ? '%' : ' un.'}`, name]} />}
      {!compact && <Legend wrapperStyle={{ fontSize: 11 }} />}
      <ReferenceLine x={cutoff} stroke="hsl(var(--foreground))" strokeDasharray="2 3" label={compact ? undefined : { value: 'Previsão começa aqui', position: 'insideTopLeft', fontSize: 11 }} />
      <Line dataKey="history" name="Histórico informado" stroke="hsl(var(--foreground))" strokeWidth={compact ? 1.5 : 2} dot={false} isAnimationActive={false} connectNulls={false} />
      {methods.map(m => <Line key={m} dataKey={m} name={methodLabel(m)} stroke={COLORS[m]} strokeWidth={m === 'finotti-reference' ? 3 : 2} strokeDasharray={m === 'finotti-reference' ? undefined : '6 4'} dot={false} isAnimationActive={false} connectNulls={false} />)}
      <Line dataKey="reported" name="Informado depois" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="1 4" dot={compact ? false : { r: 3 }} isAnimationActive={false} connectNulls={false} />
    </LineChart></ResponsiveContainer>
  </div>;
}
