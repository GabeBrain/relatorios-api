import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Filter, Loader2 } from 'lucide-react';
import { DATASETS } from './datasets';
import { useQuantiDataset } from './useQuantiDataset';
import { useQuantiStore } from './store';
import { applyFilters, crosstab } from './aggregate';
import type { CategoricalField, QuantiRecord } from './types';
import { FiltersSidebar } from './FiltersSidebar';
import { ActiveFiltersBar } from './ActiveFiltersBar';
import { KpiRow } from './KpiRow';
import { BarField, ChartCard, DonutField, Heatmap, HistogramChart } from './Charts';
import { GeoMap } from './geo/GeoMap';
import { RegionDistribution } from './Rankings';
import { CrossAnalysis } from './CrossAnalysis';
import './dashboard.css';

type IntentMetric = 'pct' | 'count' | 'count_pct';

function buildIntentCrosstab(rows: QuantiRecord[], rowField: CategoricalField, metric: IntentMetric, topN?: number) {
  const base = crosstab(rows, rowField, 'intencao_compra_padronizada', 'count');
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

  const format = (value: number, rowIndex: number) => {
    if (metric === 'pct') return value ? `${value.toFixed(1)}%` : '';
    if (metric === 'count') return value ? value.toLocaleString('pt-BR') : '';
    const total = ct.rowTotals[rowIndex] || 1;
    return value ? `${value.toLocaleString('pt-BR')} · ${((value / total) * 100).toFixed(1)}%` : '';
  };

  return (
    <ChartCard
      title={title}
      className={className}
      action={
        <label className="flex items-center gap-1 text-[11px] font-semibold text-[var(--qd-text-muted)]">
          Métrica
          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value as IntentMetric)}
            className="qd-select h-7 rounded-md px-2 text-[11px]"
          >
            <option value="pct">%</option>
            <option value="count">Quantidade</option>
            <option value="count_pct">Quantidade + %</option>
          </select>
        </label>
      }
    >
      <Heatmap ct={ct} metricLabel={metricLabel} format={format} />
    </ChartCard>
  );
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
                <ChartCard title="Gênero" subtitle="Clique para filtrar">
                  <DonutField rows={filtered} field="genero" height={320} />
                </ChartCard>
                <ChartCard title="Faixa etária">
                  <BarField rows={filtered} field="faixa_etaria" />
                </ChartCard>
                <ChartCard title="Geração" className="lg:col-span-2">
                  <BarField rows={filtered} field="geracao" />
                </ChartCard>
              </div>
            </section>

            {/* Perfil de Renda */}
            <section className="space-y-2">
              <h2 className="qd-section-title">Perfil de Renda</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <ChartCard title="Macro faixa de renda">
                  <BarField rows={filtered} field="renda_macro_faixa" />
                </ChartCard>
                <ChartCard title="Faixa padronizada">
                  <BarField rows={filtered} field="renda_faixa_padronizada" />
                </ChartCard>
                <ChartCard title="Classe social agregada">
                  <BarField rows={filtered} field="renda_classe_agregada" />
                </ChartCard>
                <ChartCard title="Classe social detalhada">
                  <BarField rows={filtered} field="renda_classe_detalhada" />
                </ChartCard>
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
                  <ChartCard title="Top Cidades — Empreendimentos" subtitle="Cidade de origem do projeto/estudo (cidade_original)">
                    <BarField rows={filtered} field="cidade_original" topN={10} />
                  </ChartCard>
                  <ChartCard title="Top Cidades — Coleta" subtitle="Cidade onde a entrevista foi coletada (cidade)">
                    <BarField rows={filtered} field="cidade" topN={10} />
                  </ChartCard>
                </div>
              </div>
            </section>

            {/* Intenção de Compra */}
            <section className="space-y-2">
              <h2 className="qd-section-title">Intenção de Compra</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <ChartCard title="Intenção padronizada">
                  <BarField rows={filtered} field="intencao_compra_padronizada" />
                </ChartCard>
                <ChartCard title="Tempo para compra">
                  <BarField rows={filtered} field="tempo_intencao_padronizado" />
                </ChartCard>
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
                <ChartCard title="Faixa etária × Classe de renda">
                  <Heatmap ct={crosstab(filtered, 'faixa_etaria', 'renda_classe_agregada', 'count')} metricLabel="Faixa etária" />
                </ChartCard>
                <ChartCard title="Gênero × Classe de renda">
                  <Heatmap ct={crosstab(filtered, 'genero', 'renda_classe_agregada', 'count')} metricLabel="Gênero" />
                </ChartCard>
                <ChartCard title="Estado × Classe de renda">
                  <Heatmap ct={crosstab(filtered, 'estado', 'renda_classe_agregada', 'count')} metricLabel="Estado" />
                </ChartCard>
                <ChartCard title="Região × Classe de renda">
                  <Heatmap ct={crosstab(filtered, 'regiao', 'renda_classe_agregada', 'count')} metricLabel="Região" />
                </ChartCard>
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
