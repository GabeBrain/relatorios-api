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
import {
  compareCategoricalAlphabetic,
  countBy,
  displayCategoricalValue,
  histogram,
  orderedValues,
  crosstab,
  type Crosstab,
} from './aggregate';
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

function wrapAxisLabel(value: string, maxChars: number, maxLines = 3): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*…$/, '')}…`;
  }
  return lines.length ? lines : [value];
}

interface CardProps { title: React.ReactNode; subtitle?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }
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

export type SortOrder = 'desc' | 'asc' | 'alpha';

interface FieldChartProps { rows: QuantiRecord[]; field: CategoricalField; height?: number; topN?: number; sortOrder?: SortOrder }

export function DonutField({ rows, field, height = 240, sortOrder = 'desc' }: FieldChartProps) {
  const toggle = useQuantiStore((s) => s.toggleValue);
  const filters = useQuantiStore((s) => s.filters);
  const data = useMemo(() => {
    const c = countBy(rows, field);
    const naturalOrder = new Map(orderedValues(field, c.map((x) => x.key)).map((key, index) => [key, index]));
    return [...c]
      .sort((a, b) => {
        if (sortOrder === 'alpha') return compareCategoricalAlphabetic(field, a.key, b.key);
        const diff = sortOrder === 'desc' ? b.count - a.count : a.count - b.count;
        return diff || ((naturalOrder.get(a.key) ?? 0) - (naturalOrder.get(b.key) ?? 0));
      })
      .map((item) => ({ ...item, displayKey: displayCategoricalValue(field, item.key) }));
  }, [rows, field, sortOrder]);
  const total = data.reduce((sum, item) => sum + item.count, 0) || 1;
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
          nameKey="displayKey"
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
            p.payload.displayKey,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BarField({ rows, field, height, topN, sortOrder = 'desc' }: FieldChartProps) {
  const toggle = useQuantiStore((s) => s.toggleValue);
  const filters = useQuantiStore((s) => s.filters);
  const { data, total } = useMemo(() => {
    const c = countBy(rows, field);
    const total = c.reduce((sum, item) => sum + item.count, 0) || 1;
    const naturalOrder = new Map(orderedValues(field, c.map((x) => x.key)).map((key, index) => [key, index]));
    const base = topN ? c.slice(0, topN) : c;
    const data = [...base]
      .sort((a, b) => {
        if (sortOrder === 'alpha') return compareCategoricalAlphabetic(field, a.key, b.key);
        const diff = sortOrder === 'desc' ? b.count - a.count : a.count - b.count;
        return diff || ((naturalOrder.get(a.key) ?? 0) - (naturalOrder.get(b.key) ?? 0));
      })
      .map((item) => ({ ...item, displayKey: displayCategoricalValue(field, item.key) }));
    return { data, total };
  }, [rows, field, topN, sortOrder]);

  const maxLabel = Math.max(0, ...data.map((d) => d.displayKey.length));
  const yWidth = Math.min(300, Math.max(96, maxLabel * 5.2));
  const maxCharsPerLine = Math.max(10, Math.floor(yWidth / 6.2));
  const wrappedLabelLines = data.map((d) => wrapAxisLabel(d.displayKey, maxCharsPerLine));
  const maxLines = Math.max(1, ...wrappedLabelLines.map((lines) => lines.length));
  const rowHeight = Math.max(36, maxLines * 13 + 12);
  const h = height ?? Math.max(220, data.length * rowHeight + 24);
  const renderYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const lines = wrapAxisLabel(String(payload.value ?? ''), maxCharsPerLine);
    const startDy = -((lines.length - 1) * 6);
    return (
      <text x={x} y={y} textAnchor="end" fill="var(--qd-text)" style={{ fontSize: 11 }}>
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? startDy : 12}>
            {line}
          </tspan>
        ))}
      </text>
    );
  };
  const renderValueLabel = (props: any) => {
    const value = Number(props.value ?? 0);
    if (!value) return null;
    const label = `${value.toLocaleString('pt-BR')} (${((value / total) * 100).toFixed(1)}%)`;
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const width = Number(props.width ?? 0);
    const height = Number(props.height ?? 0);
    const estimatedTextWidth = label.length * 6.8;
    const outsideX = x + width + 8;
    const shouldPlaceInside = value / total >= 0.85 && width > estimatedTextWidth + 16;
    const textX = shouldPlaceInside ? x + width - 8 : outsideX;
    const textY = y + height / 2;

    return (
      <text
        x={textX}
        y={textY}
        textAnchor={shouldPlaceInside ? 'end' : 'start'}
        dominantBaseline="central"
        fill={shouldPlaceInside ? '#fff' : 'var(--qd-text)'}
        style={{ fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}
      >
        {label}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 6, right: 96, left: 6, bottom: 6 }} barCategoryGap={6}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis dataKey="displayKey" type="category" tick={renderYAxisTick} width={yWidth} interval={0} />
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
            content={renderValueLabel}
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
interface HeatmapProps { ct: Crosstab; metricLabel?: string; height?: number; format?: (n: number, rowIndex: number, colIndex: number) => string }
export function Heatmap({ ct, metricLabel, format }: HeatmapProps) {
  const max = Math.max(1, ...ct.matrix.flat());
  const fmt = format ?? ((n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
  return (
    <div className="qd-heatmap overflow-hidden">
      <table className="w-full table-fixed border-collapse text-[10px] sm:text-[11px]">
        <colgroup>
          <col style={{ width: '30%' }} />
          {ct.cols.map((c) => (
            <col key={c} style={{ width: `${70 / Math.max(1, ct.cols.length)}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="qd-heatmap-sticky p-1 text-left font-medium text-[var(--qd-text-muted)]">
              {metricLabel ?? ''}
            </th>
            {ct.cols.map((c) => (
              <th key={c} className="qd-heatmap-col truncate p-1 text-center font-medium text-[var(--qd-text-muted)]" title={c}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ct.rows.map((r, i) => (
            <tr key={r}>
              <th className="qd-heatmap-sticky truncate p-1 pr-2 text-left font-medium" title={r}>
                {r}
              </th>
              {ct.cols.map((c, j) => {
                const v = ct.matrix[i][j];
                const alpha = v / max;
                return (
                  <td
                    key={c}
                    className="qd-hm-cell truncate p-1 text-center"
                    style={{
                      background: `rgba(${HEATMAP_RGB}, ${0.08 + alpha * 0.72})`,
                      color: alpha > 0.55 ? 'var(--qd-heatmap-strong-text, #fff)' : 'var(--qd-heatmap-soft-text, #0f172a)',
                    }}
                    title={`${r} × ${c}: ${fmt(v, i, j)}`}
                  >
                    {fmt(v, i, j)}
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
