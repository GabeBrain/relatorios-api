import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
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

// Brain palette — tons de verde e amarelo
const PALETTE = [
  '#5B7537', // brain verde primário
  '#71984a', // verde médio
  '#8fb85f', // verde claro
  '#b5cf7d', // verde suave
  '#d7e3a8', // verde muito claro
  '#F8D000', // amarelo destaque
  '#f4d83f', // amarelo médio
  '#ffe173', // amarelo claro
  '#c7a300', // mostarda
  '#6e6e6e', // neutro
];
const HEATMAP_RGB = '91, 117, 55'; // #5B7537
const ACTIVE_STROKE = '#3d5024';

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
  const total = rows.length || 1;
  const renderLabel = (props: any) => {
    const RAD = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, value, name } = props;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    const pct = ((value / total) * 100).toFixed(1);
    if (Number(pct) < 4) return null; // avoid clutter on tiny slices
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>
        <tspan x={x} dy="-0.4em">{name}</tspan>
        <tspan x={x} dy="1.1em">{pct}%</tspan>
      </text>
    );
  };
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
          labelLine={false}
          label={renderLabel}
          onClick={(d: any) => toggle(field, d.key)}
        >
          {data.map((d, i) => {
            const active = filters[field]?.includes(d.key);
            return (
              <Cell
                key={d.key}
                fill={PALETTE[i % PALETTE.length]}
                stroke={active ? ACTIVE_STROKE : 'var(--qd-surface, #fff)'}
                strokeWidth={active ? 2 : 1}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </Pie>
        <Tooltip
          formatter={(v: number, _n, p: any) => [
            `${v.toLocaleString('pt-BR')} (${((v / total) * 100).toFixed(1)}%)`,
            p.payload.key,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BarField({ rows, field, height, topN }: FieldChartProps) {
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

  const total = rows.length || 1;
  // Larger bars: ~36px per row, min 220
  const h = height ?? Math.max(220, data.length * 36 + 24);
  const maxLabel = Math.max(0, ...data.map((d) => d.key.length));
  const yWidth = Math.min(180, Math.max(80, maxLabel * 6.2));

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 6, right: 56, left: 6, bottom: 6 }} barCategoryGap={6}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis dataKey="key" type="category" tick={{ fontSize: 11 }} width={yWidth} interval={0} />
        <Tooltip
          cursor={{ fill: 'rgba(91,117,55,0.08)' }}
          formatter={(v: number) => [`${v.toLocaleString('pt-BR')} (${((v / total) * 100).toFixed(1)}%)`, 'Entrevistas']}
        />
        <Bar dataKey="count" onClick={(d: any) => toggle(field, d.key)} cursor="pointer" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => {
            const active = filters[field]?.includes(d.key);
            return (
              <Cell
                key={d.key}
                fill={PALETTE[i % PALETTE.length]}
                stroke={active ? ACTIVE_STROKE : 'transparent'}
                strokeWidth={active ? 2 : 0}
              />
            );
          })}
          <LabelList
            dataKey="count"
            position="right"
            style={{ fontSize: 11, fill: '#3d5024', fontWeight: 600 }}
            formatter={(v: number) =>
              `${v.toLocaleString('pt-BR')} (${((v / total) * 100).toFixed(1)}%)`
            }
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface HistProps { rows: QuantiRecord[]; field: 'idade' | 'renda_valor_estimado'; bins?: number; height?: number }
export function HistogramChart({ rows, field, bins = 20, height = 260 }: HistProps) {
  const data = useMemo(() => histogram(rows, field, bins), [rows, field, bins]);
  const isMoney = field === 'renda_valor_estimado';
  // Show only ~10 tick labels to avoid overcrowded legend
  const step = Math.max(1, Math.ceil(data.length / 10));
  const fmtTick = (v: any) => {
    const n = Number(String(v).split(/[–-]/)[0]);
    if (!Number.isFinite(n)) return String(v);
    if (isMoney) return n >= 1000 ? `R$ ${(n / 1000).toFixed(0)}k` : `R$ ${n}`;
    return String(Math.round(n));
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="bin"
          tick={{ fontSize: 11 }}
          interval={step - 1}
          tickFormatter={fmtTick}
          height={40}
        />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString('pt-BR')}`, 'Entrevistas']}
          labelFormatter={(l) => (isMoney ? `R$ ${l}` : `${l}`)}
        />
        <Bar dataKey="count" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
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
            <th className="sticky left-0 z-10 p-1 text-left font-medium text-[var(--qd-text-muted)]" style={{ background: 'var(--qd-surface)' }}>
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
              <th className="sticky left-0 z-10 max-w-[160px] truncate whitespace-nowrap p-1 pr-2 text-left font-medium" style={{ background: 'var(--qd-surface)' }} title={r}>
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
                      background: `rgba(${HEATMAP_RGB}, ${0.08 + alpha * 0.72})`,
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
