import { useMemo, useState } from 'react';
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

  const [rowField, setRowField] = useState<string>(() => catFields[0]?.key ?? '');
  const [colField, setColField] = useState<string | null>(() => catFields[1]?.key ?? null);
  const [metric, setMetric] = useState<UniversalMetric>('count');
  const [valueField, setValueField] = useState<string | null>(() => numFields[0]?.key ?? null);
  const [view, setView] = useState<ViewKind>('table');
  const [mode, setMode] = useState<Mode>('both');

  const needsValueField = metric === 'avg' || metric === 'sum' || metric === 'median';

  const ct = useMemo(
    () => (rowField
      ? crosstabUniversal(rows, rowField, colField, metric, needsValueField ? valueField : null)
      : null),
    [rows, rowField, colField, metric, valueField, needsValueField],
  );

  const rowLabel = schema.find((f) => f.key === rowField)?.label ?? rowField;
  const colLabel = colField ? (schema.find((f) => f.key === colField)?.label ?? colField) : null;

  const availableViews: ViewKind[] = ct ? compatibleViews(rowField, colField, metric, ct) : ['table'];
  const effectiveView = availableViews.includes(view) ? view : availableViews[0];

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

  if (!rowField || !ct) {
    return <ChartCard title="Análise Cruzada Universal"><div className="p-4 text-xs text-[var(--qd-text-muted)]">Sem campos categóricos detectados na base.</div></ChartCard>;
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
          <select value={rowField} onChange={(e) => setRowField(e.target.value)} className="w-full">
            {catFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </SelectBox>
        <SelectBox label="Comparar com">
          <select value={colField ?? ''} onChange={(e) => setColField(e.target.value || null)} className="w-full">
            <option value="">— (nenhum · 1D)</option>
            {catFields.filter((f) => f.key !== rowField).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </SelectBox>
        <SelectBox label="Métrica">
          <select value={metric} onChange={(e) => setMetric(e.target.value as UniversalMetric)} className="w-full">
            <option value="count">Quantidade</option>
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
      {(mode === 'both' || mode === 'table') && (
        <PivotTable ct={ct} rowLabel={rowLabel} colLabel={colLabel} rowField={rowField} colField={colField} />
      )}

      {/* Chart */}
      {(mode === 'both' || mode === 'chart') && (
        <div className={mode === 'both' ? 'mt-4' : ''}>
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

/* ── Table ── */
function PivotTable({ ct, rowLabel, colLabel, rowField, colField }: {
  ct: UniversalCrosstab; rowLabel: string; colLabel: string | null; rowField: string; colField: string | null;
}) {
  const toggle = useQuantiStore((s) => s.toggleValue);
  const showColTotals = ct.metric === 'count' || ct.metric === 'sum';

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
  const height = Math.max(320, ct.rows.length * 26 + 60);

  if (view === 'heatmap') {
    return <Heatmap ct={ct as any} metricLabel={rowField} format={(n) => fmt(n, metric)} />;
  }

  if (view === 'pie' || view === 'donut') {
    // 1D: sum across cols
    const data = ct.rows.map((r, i) => ({ name: r, value: ct.rowTotals[i] || ct.matrix[i][0] || 0 }));
    return (
      <ResponsiveContainer width="100%" height={380}>
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="name"
            innerRadius={view === 'donut' ? '55%' : 0} outerRadius="85%"
            paddingAngle={1}
            onClick={(d: any) => toggle(rowField as any, d.name)}
          >
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} style={{ cursor: 'pointer' }} />)}
          </Pie>
          <RTooltip formatter={(v: any) => fmt(Number(v), metric)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
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
      <ResponsiveContainer width="100%" height={420}>
        <Treemap data={leaves} dataKey="value" stroke="#fff" fill={PALETTE[0]} content={undefined as any}>
          <RTooltip formatter={(v: any) => fmt(Number(v), metric)} />
        </Treemap>
      </ResponsiveContainer>
    );
  }

  // Bar variants
  const data = ct.rows.map((r, i) => {
    const obj: any = { name: r };
    if (colField) ct.cols.forEach((c, j) => (obj[c] = ct.matrix[i][j]));
    else obj[METRIC_LABEL[metric]] = ct.matrix[i][0];
    return obj;
  });
  const keys = colField ? ct.cols : [METRIC_LABEL[metric]];
  const stackId = view === 'stacked' || view === 'stacked100' ? 's' : undefined;
  const stackOffset = view === 'stacked100' ? 'expand' : 'none';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 6, right: 24, left: 8, bottom: 6 }} stackOffset={stackOffset as any}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={view === 'stacked100' ? (v) => `${Math.round(v * 100)}%` : undefined} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={160} interval={0} />
        <RTooltip formatter={(v: any) => fmt(Number(v), metric)} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {keys.map((k, i) => (
          <Bar
            key={k} dataKey={k} stackId={stackId} fill={PALETTE[i % PALETTE.length]}
            onClick={(d: any) => {
              toggle(rowField as any, d.name);
              if (colField) toggle(colField as any, k);
            }}
            cursor="pointer"
          >
            {!stackId && (
              <LabelList
                dataKey={k}
                position="insideLeft"
                offset={8}
                fill="#1f2a12"
                fontSize={11}
                fontWeight={600}
                formatter={(v: any) => (v ? fmt(Number(v), metric) : '')}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
