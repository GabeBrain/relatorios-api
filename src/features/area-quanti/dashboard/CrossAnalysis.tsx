import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { CategoricalField, QuantiRecord } from './types';
import { FIELD_LABELS } from './types';
import { crosstab } from './aggregate';
import { ChartCard, Heatmap, StackedCrosstab } from './Charts';

type Metric = 'count' | 'pct' | 'avg_renda';
type View = 'table' | 'grouped' | 'stacked' | 'heatmap';

const FIELDS: CategoricalField[] = [
  'research_name',
  'estado',
  'cidade',
  'regiao',
  'genero',
  'faixa_etaria',
  'geracao',
  'renda_macro_faixa',
  'renda_faixa_padronizada',
  'renda_classe_agregada',
  'renda_classe_detalhada',
  'intencao_compra_padronizada',
  'tempo_intencao_padronizado',
];

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function CrossAnalysis({ rows }: { rows: QuantiRecord[] }) {
  const [rowField, setRowField] = useState<CategoricalField>('faixa_etaria');
  const [colField, setColField] = useState<CategoricalField>('renda_classe_agregada');
  const [metric, setMetric] = useState<Metric>('count');
  const [view, setView] = useState<View>('table');

  const ct = useMemo(() => crosstab(rows, rowField, colField, metric), [rows, rowField, colField, metric]);

  const fmt = (n: number) =>
    metric === 'avg_renda'
      ? n
        ? BRL(n)
        : ''
      : metric === 'pct'
        ? `${n.toFixed(1)}%`
        : n
          ? n.toLocaleString('pt-BR')
          : '';

  function buildSheet() {
    const header = [FIELD_LABELS[rowField], ...ct.cols, 'Total'];
    const body = ct.rows.map((r, i) => [r, ...ct.matrix[i].map((v) => (metric === 'pct' ? +v.toFixed(2) : Math.round(v * 100) / 100)), ct.rowTotals[i]]);
    const totals = ['Total', ...ct.colTotals, ct.total];
    return [header, ...body, totals];
  }

  function exportCSV() {
    const s = buildSheet().map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([s], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cruzamento_${rowField}_x_${colField}.csv`;
    a.click();
  }

  function exportXLSX() {
    const ws = XLSX.utils.aoa_to_sheet(buildSheet());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cruzamento');
    XLSX.writeFile(wb, `cruzamento_${rowField}_x_${colField}.xlsx`);
  }

  const Select = ({ value, onChange, exclude }: { value: CategoricalField; onChange: (f: CategoricalField) => void; exclude?: CategoricalField }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CategoricalField)}
      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
    >
      {FIELDS.filter((f) => f !== exclude).map((f) => (
        <option key={f} value={f}>{FIELD_LABELS[f]}</option>
      ))}
    </select>
  );

  return (
    <ChartCard
      title="Análise Cruzada"
      subtitle="Combine duas variáveis quaisquer e escolha a métrica e a visualização."
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={exportCSV} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] hover:bg-slate-50">
            <Download className="h-3 w-3" /> CSV
          </button>
          <button onClick={exportXLSX} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] hover:bg-slate-50">
            <FileSpreadsheet className="h-3 w-3" /> XLSX
          </button>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--qd-text-muted)]">
        <span>Linhas:</span>
        <Select value={rowField} onChange={setRowField} exclude={colField} />
        <span>Colunas:</span>
        <Select value={colField} onChange={setColField} exclude={rowField} />
        <span>Métrica:</span>
        <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs">
          <option value="count">Quantidade</option>
          <option value="pct">% do total</option>
          <option value="avg_renda">Média de renda estimada</option>
        </select>
        <span>Visualização:</span>
        <select value={view} onChange={(e) => setView(e.target.value as View)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs">
          <option value="table">Tabela dinâmica</option>
          <option value="heatmap">Heatmap</option>
          <option value="stacked">Barras empilhadas</option>
          <option value="grouped">Barras agrupadas</option>
        </select>
      </div>

      {view === 'table' && (
        <div className="qd-scroll max-h-[520px] overflow-auto rounded-md border border-slate-100">
          <table className="min-w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 p-2 text-left font-semibold">{FIELD_LABELS[rowField]}</th>
                {ct.cols.map((c) => (
                  <th key={c} className="p-2 text-right font-semibold" title={c}>{c}</th>
                ))}
                <th className="p-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {ct.rows.map((r, i) => (
                <tr key={r} className="odd:bg-white even:bg-slate-50/40">
                  <th className="sticky left-0 z-10 bg-inherit p-2 text-left font-medium" title={r}>{r}</th>
                  {ct.matrix[i].map((v, j) => (
                    <td key={j} className="p-2 text-right tabular-nums">{fmt(v)}</td>
                  ))}
                  <td className="p-2 text-right font-semibold tabular-nums">{metric === 'avg_renda' ? '' : ct.rowTotals[i].toLocaleString('pt-BR')}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 bg-slate-100 font-semibold">
                <td className="p-2 text-left">Total</td>
                {ct.colTotals.map((v, j) => (
                  <td key={j} className="p-2 text-right tabular-nums">{metric === 'avg_renda' ? '' : v.toLocaleString('pt-BR')}</td>
                ))}
                <td className="p-2 text-right tabular-nums">{metric === 'avg_renda' ? '' : ct.total.toLocaleString('pt-BR')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {view === 'heatmap' && <Heatmap ct={ct} metricLabel={FIELD_LABELS[rowField]} format={fmt} />}
      {view === 'stacked' && <StackedCrosstab ct={ct} mode="stacked" />}
      {view === 'grouped' && <StackedCrosstab ct={ct} mode="grouped" />}
    </ChartCard>
  );
}
