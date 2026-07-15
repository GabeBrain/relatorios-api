import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDownUp, ChevronDown, ChevronRight, Download, FileSpreadsheet, Filter, Info, Loader2 } from 'lucide-react';
import { DATASETS } from './datasets';
import { useQuantiDataset } from './useQuantiDataset';
import { useQuantiStore } from './store';
import { applyFilters, crosstab } from './aggregate';
import type { CategoricalField, QuantiRecord } from './types';
import { FiltersSidebar } from './FiltersSidebar';
import { ActiveFiltersBar } from './ActiveFiltersBar';
import { KpiRow } from './KpiRow';
import { BarField, ChartCard, DonutField, Heatmap, HistogramChart, type SortOrder } from './Charts';
import { GeoMap } from './geo/GeoMap';
import { RegionDistribution } from './Rankings';
import { CrossAnalysis } from './CrossAnalysis';
import './dashboard.css';

type IntentMetric = 'pct' | 'count' | 'count_pct';
type HeatmapMetric = IntentMetric;

function GenerationInfoButton() {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--qd-border)] text-[var(--qd-text-muted)] transition hover:bg-[var(--qd-light)] hover:text-[var(--qd-text)] focus:outline-none focus:ring-2 focus:ring-[var(--qd-primary)]"
        aria-label="Informações sobre gerações"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute left-0 top-7 z-20 hidden w-80 rounded-md border border-[var(--qd-border)] bg-[var(--qd-surface)] p-3 text-left text-[11px] font-normal leading-relaxed text-[var(--qd-text)] shadow-lg group-hover:block group-focus-within:block">
        <span className="block"><strong>Geração Silenciosa:</strong> Nascidos entre 1928 e 1945</span>
        <span className="block"><strong>Baby Boomers:</strong> Nascidos entre 1946 e 1964</span>
        <span className="block"><strong>Geração X:</strong> Nascidos entre 1965 e 1980</span>
        <span className="block"><strong>Geração Y (Millennials):</strong> Nascidos entre 1981 e 1996</span>
        <span className="block"><strong>Geração Z:</strong> Nascidos entre 1997 e 2012</span>
      </span>
    </span>
  );
}

function SortToggle({ order, onChange }: { order: SortOrder; onChange: (order: SortOrder) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(order === 'desc' ? 'asc' : 'desc')}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--qd-border)] text-[var(--qd-text-muted)] transition hover:bg-[var(--qd-light)] hover:text-[var(--qd-text)] focus:outline-none focus:ring-2 focus:ring-[var(--qd-primary)]"
      title={order === 'desc' ? 'Maior para menor' : 'Menor para maior'}
      aria-label={order === 'desc' ? 'Ordenar do menor para o maior' : 'Ordenar do maior para o menor'}
    >
      <ArrowDownUp className="h-3.5 w-3.5" />
    </button>
  );
}

function SortableBarCard({
  rows,
  field,
  title,
  subtitle,
  className,
  height,
  topN,
}: {
  rows: QuantiRecord[];
  field: CategoricalField;
  title: ReactNode;
  subtitle?: string;
  className?: string;
  height?: number;
  topN?: number;
}) {
  const [order, setOrder] = useState<SortOrder>('desc');
  return (
    <ChartCard title={title} subtitle={subtitle} className={className} action={<SortToggle order={order} onChange={setOrder} />}>
      <BarField rows={rows} field={field} height={height} topN={topN} sortOrder={order} />
    </ChartCard>
  );
}

function SortableDonutCard({
  rows,
  field,
  title,
  subtitle,
  className,
  height,
}: {
  rows: QuantiRecord[];
  field: CategoricalField;
  title: ReactNode;
  subtitle?: string;
  className?: string;
  height?: number;
}) {
  const [order, setOrder] = useState<SortOrder>('desc');
  return (
    <ChartCard title={title} subtitle={subtitle} className={className} action={<SortToggle order={order} onChange={setOrder} />}>
      <DonutField rows={rows} field={field} height={height} sortOrder={order} />
    </ChartCard>
  );
}

function applyHeatmapMetric(base: ReturnType<typeof crosstab>, metric: HeatmapMetric, topN?: number) {
  const order = base.rowTotals
    .map((total, index) => ({ total, index }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN ?? base.rows.length)
    .map((item) => item.index);

  const pickedRows = order.map((index) => base.rows[index]);
  const pickedCounts = order.map((index) => base.matrix[index]);
  const pickedTotals = order.map((index) => base.rowTotals[index]);

  if (metric === 'pct') {
    const matrix = pickedCounts.map((row, index) => {
      const total = pickedTotals[index] || 1;
      return row.map((value) => (value / total) * 100);
    });
    return {
      rows: pickedRows,
      cols: base.cols,
      matrix,
      rowTotals: pickedTotals,
      colTotals: base.colTotals,
      total: base.total,
    };
  }

  return {
    rows: pickedRows,
    cols: base.cols,
    matrix: pickedCounts,
    rowTotals: pickedTotals,
    colTotals: base.colTotals,
    total: base.total,
  };
}

function buildIntentCrosstab(rows: QuantiRecord[], rowField: CategoricalField, metric: IntentMetric, topN?: number) {
  return applyHeatmapMetric(crosstab(rows, rowField, 'intencao_compra_padronizada', 'count'), metric, topN);
}

function MetricSelect({ metric, onChange }: { metric: HeatmapMetric; onChange: (metric: HeatmapMetric) => void }) {
  return (
    <label className="flex items-center gap-1 text-[11px] font-semibold text-[var(--qd-text-muted)]">
      Métrica
      <select
        value={metric}
        onChange={(event) => onChange(event.target.value as HeatmapMetric)}
        className="qd-select h-7 rounded-md px-2 text-[11px]"
      >
        <option value="pct">%</option>
        <option value="count">Quantidade</option>
        <option value="count_pct">Quantidade + %</option>
      </select>
    </label>
  );
}

function formatHeatmapValue(metric: HeatmapMetric, ct: ReturnType<typeof crosstab>, value: number, rowIndex: number) {
  if (metric === 'pct') return `${value.toFixed(1)}%`;
  if (metric === 'count') return value.toLocaleString('pt-BR');
  const total = ct.rowTotals[rowIndex] || 1;
  return `${value.toLocaleString('pt-BR')} · ${((value / total) * 100).toFixed(1)}%`;
}

function IntentHeatmapCard({
  rows,
  title,
  rowField,
  metricLabel,
  className,
  topN,
}: {
  rows: QuantiRecord[];
  title: string;
  rowField: CategoricalField;
  metricLabel: string;
  className?: string;
  topN?: number;
}) {
  const [metric, setMetric] = useState<IntentMetric>('pct');
  const ct = useMemo(() => buildIntentCrosstab(rows, rowField, metric, topN), [rows, rowField, metric, topN]);

  return (
    <ChartCard
      title={title}
      className={className}
      action={<MetricSelect metric={metric} onChange={setMetric} />}
    >
      <Heatmap ct={ct} metricLabel={metricLabel} format={(value, rowIndex) => formatHeatmapValue(metric, ct, value, rowIndex)} />
    </ChartCard>
  );
}

function CrosstabHeatmapCard({
  rows,
  title,
  rowField,
  colField,
  metricLabel,
}: {
  rows: QuantiRecord[];
  title: string;
  rowField: CategoricalField;
  colField: CategoricalField;
  metricLabel: string;
}) {
  const [metric, setMetric] = useState<HeatmapMetric>('pct');
  const ct = useMemo(() => applyHeatmapMetric(crosstab(rows, rowField, colField, 'count'), metric), [rows, rowField, colField, metric]);

  return (
    <ChartCard title={title} action={<MetricSelect metric={metric} onChange={setMetric} />}>
      <Heatmap ct={ct} metricLabel={metricLabel} format={(value, rowIndex) => formatHeatmapValue(metric, ct, value, rowIndex)} />
    </ChartCard>
  );
}

function datasetFileName(label: string, extension: 'csv' | 'xlsx') {
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${slug || 'base-quanti'}.${extension}`;
}

function exportDatasetCsv(rows: QuantiRecord[], label: string) {
  if (!rows.length) return;
  const headers = Array.from(rows.reduce((keys, row) => {
    Object.keys(row as any).forEach((key) => keys.add(key));
    return keys;
  }, new Set<string>()));
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((key) => escape((row as any)[key])).join(',')),
  ].join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = datasetFileName(label, 'csv');
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportDatasetXlsx(rows: QuantiRecord[], label: string) {
  if (!rows.length) return;
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows as any[]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Base');
  XLSX.writeFile(wb, datasetFileName(label, 'xlsx'));
}

export function QuantiDashboard() {
  const datasetId = useQuantiStore((s) => s.datasetId);
  const setDatasetId = useQuantiStore((s) => s.setDatasetId);
  const filters = useQuantiStore((s) => s.filters);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [crossAnalysisOpen, setCrossAnalysisOpen] = useState(false);

  const ds = DATASETS.find((d) => d.id === datasetId) ?? DATASETS[0];
  const { data, loading, error } = useQuantiDataset(ds);

  const filtered = useMemo(() => (data ? applyFilters(data.records, filters) : []), [data, filters]);
  const canExportDataset = !!data?.records.length;

  return (
    <div className="qd-root flex h-full min-h-0 flex-1">
      <FiltersSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} rows={data?.records ?? []} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="qd-topbar flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded border border-[var(--qd-border)] px-2 py-1.5 text-xs font-semibold text-[var(--qd-text-muted)] hover:bg-[var(--qd-light)]"
              title="Filtros"
            >
              <Filter className="h-4 w-4" /> Filtros
            </button>
            <div>
              <div className="text-sm font-semibold text-[var(--qd-primary)]">Banco Quanti · Dashboard</div>
              <div className="text-[11px] text-[var(--qd-text-muted)]">Análise exploratória — {ds.label}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => data && exportDatasetCsv(data.records, ds.label)}
              disabled={!canExportDataset}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--qd-border)] px-2 text-xs font-semibold text-[var(--qd-text-muted)] transition hover:bg-[var(--qd-light)] hover:text-[var(--qd-text)] disabled:cursor-not-allowed disabled:opacity-50"
              title="Exportar base selecionada em CSV"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={() => data && exportDatasetXlsx(data.records, ds.label)}
              disabled={!canExportDataset}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--qd-border)] px-2 text-xs font-semibold text-[var(--qd-text-muted)] transition hover:bg-[var(--qd-light)] hover:text-[var(--qd-text)] disabled:cursor-not-allowed disabled:opacity-50"
              title="Exportar base selecionada em Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> XLSX
            </button>
            <label className="text-[11px] font-medium text-[var(--qd-text-muted)]">Base</label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="qd-select h-8 rounded-md px-2 text-xs"
            >
              {DATASETS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[var(--qd-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando {ds.label}…
          </div>
        )}
        {error && (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="qd-card max-w-md p-4 text-sm text-red-700">
              Erro ao carregar a base: {error.message}
            </div>
          </div>
        )}

        {data && !loading && !error && (
          <div className="qd-scroll flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-4">
            <ActiveFiltersBar />
            <KpiRow rows={filtered} />

            {/* Perfil Demográfico */}
            <section className="space-y-2">
              <h2 className="qd-section-title">Perfil Demográfico</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <SortableDonutCard rows={filtered} title="Gênero" subtitle="Clique para filtrar" field="genero" height={320} />
                <SortableBarCard rows={filtered} title="Faixa etária" field="faixa_etaria" />
                <SortableBarCard
                  rows={filtered}
                  title={<span className="inline-flex items-center gap-1.5">Geração <GenerationInfoButton /></span>}
                  field="geracao"
                  className="lg:col-span-2"
                />
              </div>
            </section>

            {/* Perfil de Renda */}
            <section className="space-y-2">
              <h2 className="qd-section-title">Perfil de Renda</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <SortableBarCard rows={filtered} title="Macro faixa de renda" field="renda_macro_faixa" />
                <SortableBarCard rows={filtered} title="Faixa padronizada" field="renda_faixa_padronizada" />
                <SortableBarCard rows={filtered} title="Classe social agregada" field="renda_classe_agregada" />
                <SortableBarCard rows={filtered} title="Classe social detalhada" field="renda_classe_detalhada" />
                <ChartCard title="Histograma — renda estimada (R$)" subtitle="Distribuição por faixas" className="lg:col-span-2">
                  <HistogramChart rows={filtered} field="renda_valor_estimado" bins={30} height={520} />
                </ChartCard>
              </div>
            </section>

            {/* Distribuição Geográfica */}
            <section className="space-y-2">
              <h2 className="qd-section-title">Distribuição Geográfica</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <ChartCard title="Brasil por estado" subtitle="Clique num estado para fazer drill-down · clique nos municípios para filtrar">
                  <GeoMap rows={filtered} />
                  <RegionDistribution rows={filtered} />
                </ChartCard>
                <div className="grid grid-cols-1 gap-3">
                  <SortableBarCard rows={filtered} title="Top Cidades — Empreendimentos" subtitle="Cidade de origem do projeto/estudo (cidade_original)" field="cidade_original" topN={10} />
                  <SortableBarCard rows={filtered} title="Top Cidades — Coleta" subtitle="Cidade onde a entrevista foi coletada (cidade)" field="cidade" topN={10} />
                </div>
              </div>
            </section>

            {/* Intenção de Compra */}
            <section className="space-y-2">
              <h2 className="qd-section-title">Intenção de Compra</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <SortableBarCard rows={filtered} title="Intenção padronizada" field="intencao_compra_padronizada" />
                <SortableBarCard rows={filtered} title="Tempo para compra" field="tempo_intencao_padronizado" />
                <IntentHeatmapCard rows={filtered} title="Gênero × Intenção de compra" rowField="genero" metricLabel="Gênero" />
                <IntentHeatmapCard rows={filtered} title="Faixa etária × Intenção de compra" rowField="faixa_etaria" metricLabel="Faixa etária" />
                <IntentHeatmapCard rows={filtered} title="Classe social agregada × Intenção de compra" rowField="renda_classe_agregada" metricLabel="Classe social" className="lg:col-span-2" />
                <IntentHeatmapCard rows={filtered} title="Geração × Intenção de compra" rowField="geracao" metricLabel="Geração" />
                <IntentHeatmapCard rows={filtered} title="Cidade × Intenção de compra (top 20 cidades)" rowField="cidade" metricLabel="Cidade" topN={20} />
              </div>
            </section>

            {/* Cruzamentos prontos */}
            <section className="space-y-2">
              <h2 className="qd-section-title">Cruzamentos</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <CrosstabHeatmapCard rows={filtered} title="Faixa etária × Classe de renda" rowField="faixa_etaria" colField="renda_classe_agregada" metricLabel="Faixa etária" />
                <CrosstabHeatmapCard rows={filtered} title="Gênero × Classe de renda" rowField="genero" colField="renda_classe_agregada" metricLabel="Gênero" />
                <CrosstabHeatmapCard rows={filtered} title="Estado × Classe de renda" rowField="estado" colField="renda_classe_agregada" metricLabel="Estado" />
                <CrosstabHeatmapCard rows={filtered} title="Região × Classe de renda" rowField="regiao" colField="renda_classe_agregada" metricLabel="Região" />
              </div>
            </section>

            {/* Análise Cruzada */}
            <section className="space-y-2">
              <button
                type="button"
                onClick={() => setCrossAnalysisOpen((v) => !v)}
                className="qd-collapse-trigger w-full rounded-md border border-[var(--qd-border)] bg-[var(--qd-surface)] px-3 py-2 text-left"
                aria-expanded={crossAnalysisOpen}
              >
                <span className="flex items-center gap-2">
                  {crossAnalysisOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="qd-section-title">Análise Cruzada (pivot dinâmico)</span>
                </span>
                <span className="text-[11px] text-[var(--qd-text-muted)]">
                  {crossAnalysisOpen ? 'Clique para recolher' : 'Clique para abrir a análise cruzada universal'}
                </span>
              </button>
              {crossAnalysisOpen && <CrossAnalysis rows={filtered} questions={data.questions} />}
            </section>

            <div className="pt-2 text-[11px] text-[var(--qd-text-muted)]">
              {filtered.length.toLocaleString('pt-BR')} de {data.records.length.toLocaleString('pt-BR')} registros · dataset gerado em {new Date(data.generated_at).toLocaleString('pt-BR')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
