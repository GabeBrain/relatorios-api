import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Loader2, BarChart2 } from 'lucide-react';
import { intFmt, numCompact, months as monthsFmt, currencyCompactNoPrefix, pctRaw } from '@/lib/format';
import { useDashboardData } from '@/features/dashboard-geobrain/use-dashboard-data';
import {
  applyFilters, computeKpis, computeSeries, extractOptions,
  computeOfertaPorDormitorio, computeOfertaPorPadrao,
  rankBairrosPorIvv, rankBairrosPorTempoEstoque, rankBairrosPorPrecoM2, rankBairrosPorPrecoMedio,
  precoM2PorPadrao, precoMedioPorPadrao, computeOpportunityMap, computeIpcByStandard,
} from '@/features/dashboard-geobrain/aggregate';
import { Header, type BuildingType } from '@/features/dashboard-geobrain/Header';
import { Sidebar } from '@/features/dashboard-geobrain/Sidebar';
import { KpiRow } from '@/features/dashboard-geobrain/KpiRow';
import {
  EvolucaoChart, IvvChart, VgvChart, OfertaComboChart, IpcChart, UnidadesVsEstoqueChart,
} from '@/features/dashboard-geobrain/Charts';
import { RankingCard } from '@/features/dashboard-geobrain/Rankings';
import { OpportunityMap } from '@/features/dashboard-geobrain/OpportunityMap';
import { ActiveFiltersBar } from '@/features/dashboard-geobrain/ActiveFiltersBar';
import type { Filters, Granularity } from '@/features/dashboard-geobrain/types';
import { useAuthStore } from '@/store/auth-store';
import '@/features/dashboard-geobrain/dashboard.css';

const EMPTY_FILTERS: Filters = {
  from: null, to: null, years: [], periods: [], status: [], cities: [], neighborhoods: [],
  types: [], typologies: [], standards: [], bedrooms: [], garages: [], buildings: [],
};

export default function DashboardGeobrain() {
  const hasToken = useAuthStore((s) => s.hasValidToken());
  const [scope, setScope] = useState<{ uf: string; city: string }>({ uf: '', city: '' });
  const [buildingType, setBuildingType] = useState<BuildingType>('Vertical');
  const [granularity, setGranularity] = useState<Granularity>('quarter');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [defaultsAppliedFor, setDefaultsAppliedFor] = useState<string | null>(null);

  const { status, buildings, error, progress, load, reset } = useDashboardData();

  useEffect(() => {
    if (scope.uf && scope.city) {
      load({ uf: scope.uf, city: scope.city });
    } else {
      reset();
    }
  }, [scope.uf, scope.city, load, reset]);

  const allBuildings = buildings ?? [];
  const options = useMemo(() => extractOptions(allBuildings), [allBuildings]);

  // §4 — Ao carregar dados, aplicar por padrão os últimos 12 meses (períodos).
  useEffect(() => {
    if (status !== 'ready') return;
    const scopeKey = `${scope.uf}|${scope.city}`;
    if (defaultsAppliedFor === scopeKey) return;
    if (options.months.length === 0) return;
    const last12 = options.months.slice(0, 12).map((m) => m.value);
    setFilters((prev) => ({ ...prev, periods: last12 }));
    setDefaultsAppliedFor(scopeKey);
  }, [status, options.months, scope.uf, scope.city, defaultsAppliedFor]);

  const filtersWithType = useMemo<Filters>(() => ({ ...filters, types: [buildingType] }), [filters, buildingType]);
  const filtered = useMemo(() => applyFilters(allBuildings, filtersWithType), [allBuildings, filtersWithType]);

  const kpis = useMemo(() => computeKpis(filtered, filtersWithType), [filtered, filtersWithType]);
  const series = useMemo(() => computeSeries(filtered, filtersWithType, granularity), [filtered, filtersWithType, granularity]);

  const ofertaDorm = useMemo(() => computeOfertaPorDormitorio(filtered, filtersWithType), [filtered, filtersWithType]);
  const ofertaPadrao = useMemo(() => computeOfertaPorPadrao(filtered, filtersWithType), [filtered, filtersWithType]);

  const rankIvv = useMemo(() => rankBairrosPorIvv(filtered, filtersWithType), [filtered, filtersWithType]);
  const rankTempo = useMemo(() => rankBairrosPorTempoEstoque(filtered, filtersWithType), [filtered, filtersWithType]);
  const rankM2 = useMemo(() => rankBairrosPorPrecoM2(filtered, filtersWithType), [filtered, filtersWithType]);
  const rankMedio = useMemo(() => rankBairrosPorPrecoMedio(filtered, filtersWithType), [filtered, filtersWithType]);
  const precoM2Std = useMemo(() => precoM2PorPadrao(filtered, filtersWithType), [filtered, filtersWithType]);
  const precoMedioStd = useMemo(() => precoMedioPorPadrao(filtered, filtersWithType), [filtered, filtersWithType]);
  const oppMap = useMemo(() => computeOpportunityMap(filtered, filtersWithType, 'neighborhood'), [filtered, filtersWithType]);
  const oppMapStd = useMemo(() => computeOpportunityMap(filtered, filtersWithType, { rowBy: 'neighborhood', colBy: 'standard' }), [filtered, filtersWithType]);
  const ipc = useMemo(() => computeIpcByStandard(allBuildings, filtered, filtersWithType, granularity), [allBuildings, filtered, filtersWithType, granularity]);

  const infoPrecoMedio = (
    <div className="space-y-1">
      <div className="font-semibold">Preço médio</div>
      <div>Média ponderada do <strong>preço da tipologia</strong> pela oferta (qty).</div>
      <code className="text-[10px]">Σ(price × qty) ÷ Σ(qty)</code>
    </div>
  );
  const infoPrecoM2 = (
    <div className="space-y-1">
      <div className="font-semibold">Preço médio m²</div>
      <div>Média ponderada do <strong>price_private_area</strong> pela oferta.</div>
      <code className="text-[10px]">Σ(price_private_area × qty) ÷ Σ(qty)</code>
    </div>
  );
  const infoIvv = (
    <div className="space-y-1">
      <div className="font-semibold">IVV (Índice de Velocidade de Vendas)</div>
      <div>Percentual da oferta comercializada no período mais recente.</div>
      <code className="text-[10px]">Vendas ÷ (Estoque + Vendas)</code>
    </div>
  );
  const infoTempoEstoque = (
    <div className="space-y-1">
      <div className="font-semibold">Tempo de estoque</div>
      <div>Meses estimados para esgotar o estoque no ritmo atual de vendas.</div>
      <code className="text-[10px]">1 ÷ IVV</code>
    </div>
  );

  return (
    <div className="dash-geobrain min-h-screen">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        options={options}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <Header
        scope={scope}
        onScopeChange={setScope}
        buildingType={buildingType}
        onBuildingTypeChange={setBuildingType}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <ActiveFiltersBar
        scope={scope}
        buildingType={buildingType}
        filters={filters}
        options={options}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <main className="mx-auto max-w-[1600px] space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded border border-[hsl(var(--dg-primary))] bg-[hsl(var(--dg-primary-soft))] px-2 py-1 text-[10px] font-medium text-[hsl(var(--dg-primary-strong))]">
            <Activity className="h-3 w-3" />
            {status === 'ready'
              ? `${intFmt(filtered.length)} de ${intFmt(allBuildings.length)} empreendimentos`
              : status === 'loading' ? 'Carregando dados…' : 'Escolha uma cidade e clique em Carregar'}
          </div>
        </div>

        {!hasToken && (
          <div className="flex items-start gap-2 rounded border border-[hsl(var(--dg-accent))] bg-[hsl(var(--dg-accent-soft))] p-2 text-[10px]">
            <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <div>Faça login no bloco de autenticação para consultar a API Geobrain.</div>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-2 rounded border border-[hsl(var(--dg-border))] bg-[hsl(var(--dg-card))] p-2 text-[10px] text-[hsl(var(--dg-muted))]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Carregando… {progress?.buildingsFound ?? 0} empreendimentos · {progress?.lanesDone ?? 0}/{progress?.lanesTotal ?? 8} lanes · {progress?.pagesDone ?? 0} páginas
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 rounded border border-red-400 bg-red-50 p-2 text-[10px] text-red-700">
            <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <div>{error || 'Erro ao consultar a API.'}</div>
          </div>
        )}

        <KpiRow k={kpis} />

        <EvolucaoChart data={series} granularity={granularity} />
        <IvvChart data={series} granularity={granularity} />
        <UnidadesVsEstoqueChart data={series} granularity={granularity} />
        <VgvChart data={series} granularity={granularity} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OfertaComboChart title="Estoque por dormitórios" data={ofertaDorm} />
          <OfertaComboChart title="Estoque por padrão" data={ofertaPadrao} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RankingCard title="IVV por bairro" rows={rankIvv} formatValue={(v) => pctRaw(v * 100, 1)} info={infoIvv} />
          <RankingCard title="Tempo de estoque por bairro" rows={rankTempo} formatValue={(v) => monthsFmt(v)} info={infoTempoEstoque} />
          <RankingCard title="Preço m² por bairro" rows={rankM2} formatValue={(v) => currencyCompactNoPrefix(v)} info={infoPrecoM2} />
          <RankingCard title="Preço médio por bairro" rows={rankMedio} formatValue={(v) => currencyCompactNoPrefix(v)} info={infoPrecoMedio} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RankingCard title="Preço m² por padrão" rows={precoM2Std} formatValue={(v) => currencyCompactNoPrefix(v)} searchable={false} topDefault={false} info={infoPrecoM2} />
          <RankingCard title="Preço médio por padrão" rows={precoMedioStd} formatValue={(v) => currencyCompactNoPrefix(v)} searchable={false} topDefault={false} info={infoPrecoMedio} />
        </div>

        <IpcChart series={ipc.series} standards={ipc.standards} granularity={granularity} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OpportunityMap matrix={oppMap} title="Mapa de oportunidades — Bairro" />
          <OpportunityMap matrix={oppMapStd} title="Mapa de oportunidades — Padrão" />
        </div>

        <footer className="flex items-center gap-2 pt-4 text-[9px] text-[hsl(var(--dg-muted))]">
          <BarChart2 className="h-3 w-3" />
          Fonte: API Geobrain <code>/building-with-history</code> — agregações client-side reproduzem os cálculos DAX do relatório original.
        </footer>
      </main>
    </div>
  );
}
