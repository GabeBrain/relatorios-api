import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, LayoutGrid, Table2, BarChart3 } from 'lucide-react';
import type { QuantiRecord } from './types';
import { FIELD_LABELS } from './types';
import {
  crosstabUniversal,
  detectFieldSchema,
  type FieldMeta,
  type UniversalCrosstab,
  type UniversalMetric,
} from './aggregate';
import { ChartCard, Heatmap } from './Charts';
import { useQuantiStore } from './store';

type ViewKind = 'table' | 'grouped' | 'stacked' | 'stacked100' | 'heatmap' | 'pie' | 'donut' | 'treemap';
type Mode = 'both' | 'table' | 'chart';

const PALETTE = [
  '#5B7537', '#71984a', '#8fb85f', '#b5cf7d', '#d7e3a8',
  '#F8D000', '#f4d83f', '#ffe173', '#c7a300', '#6e6e6e',
];

const METRIC_LABEL: Record<UniversalMetric, string> = {
  count: 'Quantidade',
  count_pct: 'Quantidade + %',
  pct_total: '% do total',
  pct_row: '% por linha',
  pct_col: '% por coluna',
  avg: 'Média',
  sum: 'Soma',
  median: 'Mediana',
};

const BRL = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function fmt(v: number, metric: UniversalMetric): string {
  if (!v && v !== 0) return '';
  if (metric.startsWith('pct')) return `${v.toFixed(1)}%`;
  return BRL(v);
}

function fmtValuePct(value: number, base: number, metric: UniversalMetric): string {
  const valueText = fmt(value, metric);
  if (!valueText) return '';
  if (metric === 'count_pct') return base ? `${valueText} (${((value / base) * 100).toFixed(1)}%)` : valueText;
  if (!base || metric.startsWith('pct')) return valueText;
  return valueText;
}

function truncateLabel(value: string, max = 28): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Which visualizations are compatible with the current selection. */
function compatibleViews(rowField: string, colField: string | null, metric: UniversalMetric, ct: UniversalCrosstab): ViewKind[] {
  const has2D = !!colField;
  const nRows = ct.rows.length;
  const nCols = ct.cols.length;
  const views: ViewKind[] = ['table'];
  if (has2D) {
    views.push('grouped', 'stacked', 'stacked100', 'heatmap');
    if (nRows <= 12 && nCols <= 12) views.push('treemap');
  } else {
    if (nRows <= 12) views.push('pie', 'donut');
    views.push('grouped', 'treemap');
  }
  // Percent by row/col requires 2D; already implicit.
  return views;
}

export function CrossAnalysis({ rows, questions }: { rows: QuantiRecord[]; questions?: Record<string, string> }) {
  const labels = useMemo(() => ({ ...(FIELD_LABELS as Record<string, string>), ...(questions ?? {}) }), [questions]);
  const schema = useMemo(() => detectFieldSchema(rows, labels), [rows, labels]);
  const catFields = schema.filter((f) => f.kind === 'categorical');
  const numFields = schema.filter((f) => f.kind === 'numeric');

  const [rowField, setRowField] = useState<string>('');
  const [colField, setColField] = useState<string | null>(null);
  const [metric, setMetric] = useState<UniversalMetric>('count');
  const [valueField, setValueField] = useState<string | null>(() => numFields[0]?.key ?? null);
  const [view, setView] = useState<ViewKind>('table');
  const [mode, setMode] = useState<Mode>('both');
  const [allowLargeMatrix, setAllowLargeMatrix] = useState(false);

  const needsValueField = metric === 'avg' || metric === 'sum' || metric === 'median';

  const ct = useMemo(
    () => (rowField
      ? crosstabUniversal(rows, rowField, colField, metric, needsValueField ? valueField : null)
      : null),
    [rows, rowField, colField, metric, valueField, needsValueField],
  );

  const rowLabel = rowField ? (schema.find((f) => f.key === rowField)?.label ?? rowField) : '';
  const colLabel = colField ? (schema.find((f) => f.key === colField)?.label ?? colField) : null;

  const availableViews: ViewKind[] = ct ? compatibleViews(rowField, colField, metric, ct) : ['table'];
  const effectiveView = availableViews.includes(view) ? view : availableViews[0];
  const showTable = !!ct && (mode !== 'chart' || effectiveView === 'table');
  const showChart = !!ct && effectiveView !== 'table' && (mode === 'both' || mode === 'chart');
  const cellCount = ct ? ct.rows.length * Math.max(1, ct.cols.length) : 0;
  const isLargeMatrix = cellCount > 1500;

  useEffect(() => {
    setAllowLargeMatrix(false);
  }, [rowField, colField, metric, valueField]);

  function buildSheet() {
    if (!ct) return [];
    const header = [rowLabel, ...(colField ? ct.cols : ['Valor']), 'Total'];
    const body = ct.rows.map((r, i) => [
      r,
      ...(colField ? ct.matrix[i] : [ct.matrix[i][0]]),
      ct.rowTotals[i],
    ]);
    const totals = ['Total', ...(colField ? ct.colTotals : [ct.colTotals[0]]), ct.total];
    return [header, ...body, totals];
  }
  function exportCSV() {
    const s = buildSheet().map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([s], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `cruzamento_${rowField}_x_${colField ?? 'total'}.csv`; a.click();
  }
  function exportXLSX() {
    const ws = XLSX.utils.aoa_to_sheet(buildSheet());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cruzamento');
    XLSX.writeFile(wb, `cruzamento_${rowField}_x_${colField ?? 'total'}.xlsx`);
  }

  return (
    <ChartCard
      title="Análise Cruzada Universal"
      subtitle="Cruze qualquer variável analítica da base. Novas colunas aparecem automaticamente."
      className="qd-cross-analysis"
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="qd-cross-mode-group flex items-center rounded-md border border-slate-200 bg-white">
            <ModeBtn active={mode === 'both'} onClick={() => setMode('both')} icon={<LayoutGrid className="h-3 w-3" />}>Tabela + Gráfico</ModeBtn>
            <ModeBtn active={mode === 'table'} onClick={() => setMode('table')} icon={<Table2 className="h-3 w-3" />}>Só tabela</ModeBtn>
            <ModeBtn active={mode === 'chart'} onClick={() => setMode('chart')} icon={<BarChart3 className="h-3 w-3" />}>Só gráfico</ModeBtn>
          </div>
          <button onClick={exportCSV} className="qd-cross-export-btn flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] hover:bg-slate-50">
            <Download className="h-3 w-3" /> CSV
          </button>
          <button onClick={exportXLSX} className="qd-cross-export-btn flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] hover:bg-slate-50">
            <FileSpreadsheet className="h-3 w-3" /> XLSX
          </button>
        </div>
      }
    >
      {/* Controls */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SelectBox label="Agrupar por">
          <select
            value={rowField}
            onChange={(e) => {
              const next = e.target.value;
              setRowField(next);
              if (next && colField === next) setColField(null);
            }}
            className="w-full"
          >
            <option value="">Selecione uma pergunta</option>
            {schema.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </SelectBox>
        <SelectBox label="Comparar com">
          <select value={colField ?? ''} onChange={(e) => setColField(e.target.value || null)} className="w-full">
            <option value="">— (nenhum · 1D)</option>
            {schema.filter((f) => !rowField || f.key !== rowField).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </SelectBox>
        <SelectBox label="Métrica">
          <select value={metric} onChange={(e) => setMetric(e.target.value as UniversalMetric)} className="w-full">
            <option value="count">Quantidade</option>
            <option value="count_pct">Quantidade + %</option>
            <option value="pct_total">% do total</option>
            <option value="pct_row" disabled={!colField}>% por linha</option>
            <option value="pct_col" disabled={!colField}>% por coluna</option>
            <option value="avg" disabled={!numFields.length}>Média</option>
            <option value="sum" disabled={!numFields.length}>Soma</option>
            <option value="median" disabled={!numFields.length}>Mediana</option>
          </select>
        </SelectBox>
        {needsValueField && (
          <SelectBox label="Métrica sobre…">
            <select value={valueField ?? ''} onChange={(e) => setValueField(e.target.value || null)} className="w-full">
              {numFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </SelectBox>
        )}
        <SelectBox label="Visualização">
          <select value={effectiveView} onChange={(e) => setView(e.target.value as ViewKind)} className="w-full">
            {viewOptions(availableViews)}
          </select>
        </SelectBox>
      </div>

      {/* Table */}
      {!ct && (
        <div className="rounded-md border border-[var(--qd-border)] bg-[var(--qd-surface-2)] p-3 text-xs text-[var(--qd-text-muted)]">
          Selecione uma pergunta em <strong>Agrupar por</strong> para iniciar a análise cruzada.
        </div>
      )}
      {ct && showTable && isLargeMatrix && !allowLargeMatrix && (
        <LargeMatrixNotice rows={ct.rows.length} cols={ct.cols.length} cells={cellCount} onConfirm={() => setAllowLargeMatrix(true)} />
      )}
      {ct && showTable && (!isLargeMatrix || allowLargeMatrix) && (
        <PivotTable ct={ct} rowLabel={rowLabel} colLabel={colLabel} rowField={rowField} colField={colField} />
      )}

      {/* Chart */}
      {showChart && (
        <div className={showTable ? 'mt-4' : ''}>
          <UniversalChart
            view={effectiveView}
            ct={ct}
            metric={metric}
            rowField={rowField}
            colField={colField}
          />
        </div>
      )}
    </ChartCard>
  );
}

/* ── UI atoms ── */
function SelectBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold text-[var(--qd-text-muted)]">
      <div className="mb-0.5">{label}</div>
      <div className="qd-cross-select-wrap [&_select]:h-8 [&_select]:rounded-md [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-2 [&_select]:text-xs">
        {children}
      </div>
    </label>
  );
}

function ModeBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`qd-cross-mode-btn flex items-center gap-1 px-2 py-1 text-[11px] ${active ? 'is-active bg-[var(--qd-light)] text-[var(--qd-primary)] font-semibold' : 'text-[var(--qd-text-muted)] hover:bg-slate-50'}`}
    >
      {icon}{children}
    </button>
  );
}

function LargeMatrixNotice({ rows, cols, cells, onConfirm }: { rows: number; cols: number; cells: number; onConfirm: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--qd-border)] bg-[var(--qd-surface-2)] p-3 text-xs text-[var(--qd-text-muted)]">
      <span>
        Esta combinação gera uma tabela grande ({rows.toLocaleString('pt-BR')} linhas × {cols.toLocaleString('pt-BR')} colunas, {cells.toLocaleString('pt-BR')} células).
        Use filtros, escolha uma variável com menos categorias ou exporte em CSV/XLSX.
      </span>
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-md border border-[var(--qd-border)] bg-[var(--qd-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--qd-text)] hover:bg-[var(--qd-light)]"
      >
        Renderizar mesmo assim
      </button>
    </div>
  );
}

function viewOptions(list: ViewKind[]) {
  const labels: Record<ViewKind, string> = {
    table: 'Tabela dinâmica',
    grouped: 'Barras agrupadas',
    stacked: 'Barras empilhadas',
    stacked100: 'Barras 100%',
    heatmap: 'Heatmap',
    pie: 'Pizza',
    donut: 'Rosca',
    treemap: 'Treemap',
  };
  return list.map((v) => <option key={v} value={v}>{labels[v]}</option>);
}

function SeriesLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="qd-cross-series-legend">
      {items.map((item) => (
        <span key={item.label} className="qd-cross-series-legend-item" title={item.label}>
          <span className="qd-cross-series-legend-swatch" style={{ background: item.color }} />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

/* ── Table ── */
function PivotTable({ ct, rowLabel, colLabel, rowField, colField }: {
  ct: UniversalCrosstab; rowLabel: string; colLabel: string | null; rowField: string; colField: string | null;
}) {
  const toggle = useQuantiStore((s) => s.toggleValue);
  const showColTotals = ct.metric === 'count' || ct.metric === 'count_pct' || ct.metric === 'sum';

  return (
    <div className="qd-cross-table qd-scroll max-h-[520px] overflow-auto rounded-md border border-slate-100">
      <table className="min-w-full text-[11px]">
        <thead className="qd-cross-table-head sticky top-0 bg-slate-50">
          <tr>
            <th className="sticky left-0 z-10 bg-slate-50 p-2 text-left font-semibold">{rowLabel}</th>
            {colField ? ct.cols.map((c) => (
              <th key={c} className="cursor-pointer p-2 text-right font-semibold hover:text-[var(--qd-primary)]" title={`Filtrar ${colLabel}: ${c}`} onClick={() => toggle(colField as any, c)}>{c}</th>
            )) : (
              <th className="p-2 text-right font-semibold">{METRIC_LABEL[ct.metric]}</th>
            )}
            <th className="p-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {ct.rows.map((r, i) => (
            <tr key={r} className="qd-cross-table-row odd:bg-white even:bg-slate-50/40">
              <th className="sticky left-0 z-10 cursor-pointer bg-inherit p-2 text-left font-medium hover:text-[var(--qd-primary)]" title={`Filtrar ${rowLabel}: ${r}`} onClick={() => toggle(rowField as any, r)}>{r}</th>
              {ct.matrix[i].map((v, j) => (
                <td key={j} className="p-2 text-right tabular-nums">{fmt(v, ct.metric)}</td>
              ))}
              <td className="p-2 text-right font-semibold tabular-nums">{showColTotals ? fmt(ct.rowTotals[i], ct.metric === 'sum' ? 'sum' : 'count') : ''}</td>
            </tr>
          ))}
          <tr className="qd-cross-table-total border-t border-slate-200 bg-slate-100 font-semibold">
            <td className="p-2 text-left">Total</td>
            {ct.matrix[0]?.map((_, j) => (
              <td key={j} className="p-2 text-right tabular-nums">{showColTotals ? fmt(ct.colTotals[j], ct.metric === 'sum' ? 'sum' : 'count') : ''}</td>
            ))}
            <td className="p-2 text-right tabular-nums">{showColTotals ? fmt(ct.total, 'count') : ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ── Charts ── */
function UniversalChart({ view, ct, metric, rowField, colField }: {
  view: ViewKind; ct: UniversalCrosstab; metric: UniversalMetric; rowField: string; colField: string | null;
}) {
  const toggle = useQuantiStore((s) => s.toggleValue);
  const maxRowLabel = Math.max(0, ...ct.rows.map((r) => String(r).length));
  const yAxisWidth = Math.min(320, Math.max(180, maxRowLabel * 6.8));

  if (view === 'heatmap') {
    return <Heatmap ct={ct as any} metricLabel={rowField} format={(n) => fmt(n, metric)} />;
  }

  if (view === 'pie' || view === 'donut') {
    // 1D: sum across cols
    const data = ct.rows.map((r, i) => ({
      name: r,
      value: ct.metric === 'count' || ct.metric === 'count_pct' || ct.metric === 'sum'
        ? ct.rowTotals[i] || ct.matrix[i][0] || 0
        : ct.matrix[i][0] || 0,
    }));
    const total = data.reduce((acc, item) => acc + item.value, 0) || 1;
    const renderPieLabel = (props: any) => {
      const RADIAN = Math.PI / 180;
      const { cx, cy, midAngle, innerRadius, outerRadius, percent, value, name } = props;
      const isSmall = percent < 0.07 || String(name).length > 18;
      const sin = Math.sin(-RADIAN * midAngle);
      const cos = Math.cos(-RADIAN * midAngle);
      const label = `${truncateLabel(String(name), isSmall ? 24 : 16)} ${fmtValuePct(Number(value), total, metric)}`;

      if (!isSmall) {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
        const x = cx + radius * cos;
        const y = cy + radius * sin;
        return (
          <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fontWeight: 700, pointerEvents: 'none' }}>
            {label}
          </text>
        );
      }

      const sx = cx + outerRadius * cos;
      const sy = cy + outerRadius * sin;
      const mx = cx + (outerRadius + 16) * cos;
      const my = cy + (outerRadius + 16) * sin;
      const ex = mx + (cos >= 0 ? 34 : -34);
      const ey = my;
      return (
        <g>
          <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="var(--qd-text-muted)" fill="none" strokeWidth={1} />
          <text x={ex + (cos >= 0 ? 4 : -4)} y={ey} fill="var(--qd-text)" textAnchor={cos >= 0 ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: 10, fontWeight: 600 }}>
            {label}
          </text>
        </g>
      );
    };
    return (
      <ResponsiveContainer width="100%" height={500}>
        <PieChart margin={{ top: 18, right: 220, bottom: 18, left: 24 }}>
          <Pie
            data={data} dataKey="value" nameKey="name"
            cx="42%"
            innerRadius={view === 'donut' ? '52%' : 0} outerRadius="72%"
            paddingAngle={1}
            labelLine={false}
            label={renderPieLabel}
            onClick={(d: any) => toggle(rowField as any, d.name)}
          >
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} style={{ cursor: 'pointer' }} />)}
          </Pie>
          <RTooltip formatter={(v: any) => fmtValuePct(Number(v), total, metric)} />
          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11, lineHeight: '18px', maxWidth: 210 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (view === 'treemap') {
    const leaves: any[] = [];
    if (colField) {
      ct.rows.forEach((r, i) => ct.cols.forEach((c, j) => {
        if (ct.matrix[i][j]) leaves.push({ name: `${r} · ${c}`, value: ct.matrix[i][j] });
      }));
    } else {
      ct.rows.forEach((r, i) => leaves.push({ name: r, value: ct.rowTotals[i] || ct.matrix[i][0] || 0 }));
    }
    return (
      <ResponsiveContainer width="100%" height={500}>
        <Treemap data={leaves} dataKey="value" stroke="#fff" fill={PALETTE[0]} content={undefined as any}>
          <RTooltip formatter={(v: any) => fmt(Number(v), metric)} />
        </Treemap>
      </ResponsiveContainer>
    );
  }

  // Bar variants
  const data = ct.rows.map((r, i) => {
    const obj: any = { name: r, __base: ct.rowTotals[i] || ct.matrix[i].reduce((acc, value) => acc + value, 0) || ct.total || 1 };
    if (colField) ct.cols.forEach((c, j) => (obj[c] = ct.matrix[i][j]));
    else obj[METRIC_LABEL[metric]] = ct.matrix[i][0];
    return obj;
  });
  const keys = colField ? ct.cols : [METRIC_LABEL[metric]];
  const stackId = view === 'stacked' || view === 'stacked100' ? 's' : undefined;
  const stackOffset = view === 'stacked100' ? 'expand' : 'none';
  const isGrouped = view === 'grouped' && keys.length > 1;
  const rowHeight = isGrouped ? Math.max(54, keys.length * 18 + 28) : 42;
  const height = Math.max(460, ct.rows.length * rowHeight + 130);
  const showBarLabels = !stackId && (keys.length === 1 || (keys.length <= 3 && ct.rows.length <= 10));

  if (isGrouped) {
    const flatData = ct.rows.flatMap((r, i) => {
      const rowBase = ct.matrix[i].reduce((acc, value) => acc + value, 0) || ct.rowTotals[i] || 1;
      const items = keys
        .map((k, j) => ({
          name: r,
          series: k,
          value: ct.matrix[i][j] ?? 0,
          base: rowBase,
          fill: PALETTE[j % PALETTE.length],
          axisLabel: '',
          secondaryLabel: k,
          isSpacer: false,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((item, itemIndex, arr) => ({
          ...item,
          axisLabel: itemIndex === Math.floor((arr.length - 1) / 2) ? r : '',
        }));
      return [
        ...items,
        {
          name: `${r}__gap`,
          series: '',
          value: 0,
          base: rowBase,
          fill: 'transparent',
          axisLabel: '',
          secondaryLabel: '',
          isSpacer: true,
        },
      ];
    });
    const groupedHeight = Math.max(520, flatData.length * 34 + 160);

    return (
      <div className="qd-cross-chart-stack">
        <SeriesLegend items={keys.map((k, i) => ({ label: k, color: PALETTE[i % PALETTE.length] }))} />
        <ResponsiveContainer width="100%" height={groupedHeight}>
          <BarChart data={flatData} layout="vertical" margin={{ top: 12, right: 220, left: 12, bottom: 24 }} barCategoryGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="axisLabel" type="category" tick={{ fontSize: 11, fontWeight: 700 }} width={Math.min(260, Math.max(120, yAxisWidth - 60))} interval={0} />
            <RTooltip
              formatter={(v: any, _name, props: any) => fmtValuePct(Number(v), Number(props.payload?.base ?? 0), metric)}
              labelFormatter={(_, payload: any[]) => {
                const item = payload?.[0]?.payload;
                return item && !item.isSpacer ? `${item.name} · ${item.series}` : '';
              }}
            />
            <Bar
              dataKey="value"
              cursor="pointer"
              maxBarSize={18}
              onClick={(d: any) => {
                toggle(rowField as any, d.name);
                if (colField) toggle(colField as any, d.series);
              }}
            >
              {flatData.map((item, index) => <Cell key={`${item.name}:${item.series}:${index}`} fill={item.fill} />)}
              <LabelList
                dataKey="value"
                content={(props: any) => {
                  const item = flatData[props.index];
                  if (!item || item.isSpacer || !props.value) return null;
                  const x = Number(props.x ?? 0) + Number(props.width ?? 0) + 8;
                  const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
                  return (
                    <text x={x} y={y} fill="var(--qd-text)" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700 }}>
                      {fmtValuePct(Number(props.value), item.base, metric)} · {truncateLabel(String(item.secondaryLabel), 24)}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 42, right: showBarLabels ? 170 : 72, left: 12, bottom: 24 }} barCategoryGap={isGrouped ? 14 : 10} stackOffset={stackOffset as any}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={view === 'stacked100' ? (v) => `${Math.round(v * 100)}%` : undefined} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={yAxisWidth} interval={0} />
        <RTooltip formatter={(v: any) => fmt(Number(v), metric)} />
        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 10, paddingBottom: 8 }} />
        {keys.map((k, i) => (
          <Bar
            key={k} dataKey={k} stackId={stackId} fill={PALETTE[i % PALETTE.length]}
            onClick={(d: any) => {
              toggle(rowField as any, d.name);
              if (colField) toggle(colField as any, k);
            }}
            cursor="pointer"
            maxBarSize={isGrouped ? 16 : 24}
          >
            {showBarLabels && (
              <LabelList
                dataKey={k}
                content={(props: any) => {
                  const item = data[props.index];
                  if (!item || !props.value) return null;
                  const x = Number(props.x ?? 0) + Number(props.width ?? 0) + 8;
                  const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
                  return (
                    <text x={x} y={y} fill="var(--qd-text)" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700 }}>
                      {fmtValuePct(Number(props.value), Number(item.__base ?? 0), metric)}
                    </text>
                  );
                }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
