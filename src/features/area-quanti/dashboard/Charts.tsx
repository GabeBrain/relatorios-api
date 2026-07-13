import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { CategoricalField, QuantiRecord } from './types';
import { countBy, histogram, orderedValues, crosstab, type Crosstab } from './aggregate';
import { useQuantiStore } from './store';

const PALETTE = ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#64748b', '#94a3b8', '#0ea5e9', '#38bdf8'];

interface CardProps { title: string; subtitle?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }
export function ChartCard({ title, subtitle, children, className, action }: CardProps) {
  return (
    <div className={`qd-card p-4 ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="qd-section-title">{title}</div>
          {subtitle && <div className="qd-section-sub">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

interface FieldChartProps { rows: QuantiRecord[]; field: CategoricalField; height?: number; topN?: number }

export function DonutField({ rows, field, height = 240 }: FieldChartProps) {
  const toggle = useQuantiStore((s) => s.toggleValue);
  const filters = useQuantiStore((s) => s.filters);
  const data = useMemo(() => countBy(rows, field), [rows, field]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="key"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          onClick={(d: any) => toggle(field, d.key)}
        >
          {data.map((d, i) => {
            const active = filters[field]?.includes(d.key);
            return (
              <Cell
                key={d.key}
                fill={PALETTE[i % PALETTE.length]}
                stroke={active ? '#0f172a' : '#fff'}
                strokeWidth={active ? 2 : 1}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </Pie>
        <Tooltip
          formatter={(v: number, _n, p: any) => [
            `${v.toLocaleString('pt-BR')} (${((v / rows.length) * 100).toFixed(1)}%)`,
            p.payload.key,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BarField({ rows, field, height = 260, topN }: FieldChartProps) {
  const toggle = useQuantiStore((s) => s.toggleValue);
  const filters = useQuantiStore((s) => s.filters);
  const data = useMemo(() => {
    const c = countBy(rows, field);
    const keys = orderedValues(field, c.map((x) => x.key));
    const map = new Map(c.map((x) => [x.key, x.count]));
    let out = keys.map((k) => ({ key: k, count: map.get(k) ?? 0 }));
    if (topN) out = out.slice(0, topN);
    return out;
  }, [rows, field, topN]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="key" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString('pt-BR')} (${((v / rows.length) * 100).toFixed(1)}%)`, 'Entrevistas']}
        />
        <Bar dataKey="count" onClick={(d: any) => toggle(field, d.key)} cursor="pointer">
          {data.map((d, i) => {
            const active = filters[field]?.includes(d.key);
            return <Cell key={d.key} fill={active ? '#0f172a' : PALETTE[i % PALETTE.length]} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface HistProps { rows: QuantiRecord[]; field: 'idade' | 'renda_valor_estimado'; bins?: number; height?: number }
export function HistogramChart({ rows, field, bins = 20, height = 260 }: HistProps) {
  const data = useMemo(() => histogram(rows, field, bins), [rows, field, bins]);
  const isMoney = field === 'renda_valor_estimado';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="bin" tick={{ fontSize: 9 }} interval={0} angle={-40} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString('pt-BR')}`, 'Entrevistas']}
          labelFormatter={(l) => (isMoney ? `R$ ${l}` : `${l}`)}
        />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Heatmap ─────────────────────────────────────────────────── */
interface HeatmapProps { ct: Crosstab; metricLabel?: string; height?: number; format?: (n: number) => string }
export function Heatmap({ ct, metricLabel, format }: HeatmapProps) {
  const max = Math.max(1, ...ct.matrix.flat());
  const fmt = format ?? ((n: number) => (n ? n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : ''));
  return (
    <div className="qd-scroll overflow-auto">
      <table className="min-w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white p-1 text-left font-medium text-[var(--qd-text-muted)]">
              {metricLabel ?? ''}
            </th>
            {ct.cols.map((c) => (
              <th key={c} className="max-w-[140px] truncate p-1 text-left font-medium text-[var(--qd-text-muted)]" title={c}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ct.rows.map((r, i) => (
            <tr key={r}>
              <th className="sticky left-0 z-10 max-w-[160px] truncate whitespace-nowrap bg-white p-1 pr-2 text-left font-medium" title={r}>
                {r}
              </th>
              {ct.cols.map((c, j) => {
                const v = ct.matrix[i][j];
                const alpha = v / max;
                return (
                  <td
                    key={c}
                    className="qd-hm-cell whitespace-nowrap p-1 text-center"
                    style={{
                      background: `rgba(37, 99, 235, ${0.08 + alpha * 0.72})`,
                      color: alpha > 0.55 ? '#fff' : '#0f172a',
                      minWidth: 60,
                    }}
                    title={`${r} × ${c}: ${fmt(v)}`}
                  >
                    {fmt(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Stacked bar (row = category, cols = stacked segments) ── */
export function StackedCrosstab({ ct, mode = 'stacked' }: { ct: Crosstab; mode?: 'stacked' | 'grouped' }) {
  const data = ct.rows.map((r, i) => {
    const obj: any = { key: r };
    ct.cols.forEach((c, j) => (obj[c] = ct.matrix[i][j]));
    return obj;
  });
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, ct.rows.length * 22)}>
      <BarChart data={data} layout="vertical" margin={{ top: 6, right: 12, left: 90, bottom: 6 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis dataKey="key" type="category" tick={{ fontSize: 10 }} width={110} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {ct.cols.map((c, i) => (
          <Bar key={c} dataKey={c} stackId={mode === 'stacked' ? 's' : undefined} fill={PALETTE[i % PALETTE.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
