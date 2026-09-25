import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Loader2, BarChart2 } from 'lucide-react';
import { intFmt, numCompact, months as monthsFmt, currencyCompactNoPrefix, pctRaw } from '@/lib/format';
import { useDashboardData } from '@/features/dashboard-geobrain/use-dashboard-data';
import {
  applyFilters, computeKpis, computeSeries, extractOptions, extractRangeOptions,
  computeOfertaPorDormitorio, computeOfertaPorPadrao,
  rankBairrosPorIvv, rankBairrosPorTempoEstoque, rankBairrosPorEstoque, rankBairrosPorPrecoM2, rankBairrosPorPrecoMedio,
  precoM2PorPadrao, precoMedioPorPadrao, computeOpportunityMap, computeIpcByStandard, computePriceAreaBubbles, GEOGRAPHIC_GROUP_LABEL,
} from '@/features/dashboard-geobrain/aggregate';
import { Header, type BuildingType } from '@/features/dashboard-geobrain/Header';
import type { GeoLoadRequest } from '@/features/shared/geo-api-scope-engine/GeoApiScopeSelector';
import { Sidebar } from '@/features/dashboard-geobrain/Sidebar';
import { KpiRow } from '@/features/dashboard-geobrain/KpiRow';
import {
  EvolucaoChart, IvvChart, VgvChart, OfertaComboChart, IpcChart, UnidadesVsEstoqueChart, PriceAreaBubbleChart,
} from '@/features/dashboard-geobrain/Charts';
import { RankingCard } from '@/features/dashboard-geobrain/Rankings';
import { OpportunityMap } from '@/features/dashboard-geobrain/OpportunityMap';
import { ActiveFiltersBar } from '@/features/dashboard-geobrain/ActiveFiltersBar';
import type { Filters, Granularity } from '@/features/dashboard-geobrain/types';
import type { GeographicGroupBy } from '@/features/dashboard-geobrain/aggregate';
import { useAuthStore } from '@/store/auth-store';
import '@/features/dashboard-geobrain/dashboard.css';

const EMPTY_FILTERS: Filters = {
  from: null, to: null, years: [], periods: [], status: [], states: [], cities: [], neighborhoods: [],
  types: [], typologies: [], standards: [], bedrooms: [], garages: [], buildings: [],
  privateAreas: [], pricePerM2: [],
};

export default function DashboardGeobrain() {
  const hasToken = useAuthStore((s) => s.hasValidToken());
  const [scope, setScope] = useState<{ uf: string; city: string }>({ uf: '', city: '' });
  const [region, setRegion] = useState('');
  const [geographicGroupBy, setGeographicGroupBy] = useState<GeographicGroupBy>('neighborhood');
  const [buildingType, setBuildingType] = useState<BuildingType>('Vertical');
  const [granularity, setGranularity] = useState<Granularity>('quarter');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialPeriodsApplied, setInitialPeriodsApplied] = useState(false);
  const [bubbleStandard, setBubbleStandard] = useState<string | null>(null);
  const [bubbleNeighborhood, setBubbleNeighborhood] = useState<string | null>(null);

  const { status, buildings, error, progress, load } = useDashboardData();

  const allBuildings = buildings ?? [];
  const options = useMemo(
    () => extractOptions(allBuildings.filter((b) => b.building_type === buildingType)),
    [allBuildings, buildingType],
  );
  // §5 — faixas dinâmicas por cidade carregada + tipo de empreendimento selecionado.
  const rangeOptions = useMemo(
    () => extractRangeOptions(allBuildings.filter((b) => b.building_type === buildingType)),
    [allBuildings, buildingType],
  );

  // §4 — Na primeira carga, aplicar por padrão os últimos 12 meses; depois, preservar a escolha do usuário.
  useEffect(() => {
    if (status !== 'ready') return;
    if (initialPeriodsApplied) return;
    if (options.months.length === 0) return;
    const last12 = options.months.slice(0, 12).map((m) => m.value);
    setFilters((prev) => prev.periods.length ? prev : { ...prev, periods: last12 });
    setInitialPeriodsApplied(true);
  }, [status, options.months, initialPeriodsApplied]);

  const filtersWithType = useMemo<Filters>(() => ({ ...filters, types: [buildingType] }), [filters, buildingType]);
  const filtered = useMemo(() => applyFilters(allBuildings, filtersWithType), [allBuildings, filtersWithType]);

  const kpis = useMemo(() => computeKpis(filtered, filtersWithType), [filtered, filtersWithType]);
  const series = useMemo(() => computeSeries(filtered, filtersWithType, granularity), [filtered, filtersWithType, granularity]);

  const ofertaDorm = useMemo(() => computeOfertaPorDormitorio(filtered, filtersWithType), [filtered, filtersWithType]);
  const ofertaPadrao = useMemo(() => computeOfertaPorPadrao(filtered, filtersWithType), [filtered, filtersWithType]);

  const rankIvv = useMemo(() => rankBairrosPorIvv(filtered, filtersWithType, geographicGroupBy), [filtered, filtersWithType, geographicGroupBy]);
  const rankTempo = useMemo(() => rankBairrosPorTempoEstoque(filtered, filtersWithType, geographicGroupBy), [filtered, filtersWithType, geographicGroupBy]);
  const rankEstoque = useMemo(() => rankBairrosPorEstoque(filtered, filtersWithType, geographicGroupBy), [filtered, filtersWithType, geographicGroupBy]);
  const rankM2 = useMemo(() => rankBairrosPorPrecoM2(filtered, filtersWithType, geographicGroupBy), [filtered, filtersWithType, geographicGroupBy]);
  const rankMedio = useMemo(() => rankBairrosPorPrecoMedio(filtered, filtersWithType, geographicGroupBy), [filtered, filtersWithType, geographicGroupBy]);
  const priceAreaBubbles = useMemo(() => computePriceAreaBubbles(filtered, filtersWithType, bubbleStandard, bubbleNeighborhood), [filtered, filtersWithType, bubbleStandard, bubbleNeighborhood]);
  const bubbleNeighborhoods = useMemo(
    () => Array.from(new Set(computePriceAreaBubbles(filtered, filtersWithType, bubbleStandard, null).map((point) => point.neighborhood)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [filtered, filtersWithType, bubbleStandard],
  );
  const precoM2Std = useMemo(() => precoM2PorPadrao(filtered, filtersWithType), [filtered, filtersWithType]);
  const precoMedioStd = useMemo(() => precoMedioPorPadrao(filtered, filtersWithType), [filtered, filtersWithType]);
  const oppMap = useMemo(() => computeOpportunityMap(filtered, filtersWithType, geographicGroupBy), [filtered, filtersWithType, geographicGroupBy]);
  const oppMapStd = useMemo(() => computeOpportunityMap(filtered, filtersWithType, { rowBy: geographicGroupBy, colBy: 'standard' }), [filtered, filtersWithType, geographicGroupBy]);
  const geographicGroupLabel = GEOGRAPHIC_GROUP_LABEL[geographicGroupBy];
  const geographicGroupTitle = geographicGroupBy === 'state' ? geographicGroupLabel : geographicGroupLabel.toLowerCase();
  const ipc = useMemo(() => computeIpcByStandard(allBuildings, filtered, filtersWithType, granularity), [allBuildings, filtered, filtersWithType, granularity]);

  const infoPrecoMedio = (
    <div className="space-y-1">
      <div className="font-semibold">Preço médio</div>
      <div>Somente tipologias <strong>Padrão</strong> com estoque final maior que zero.</div>
      <code className="text-[10px]">Σ(price × qty) ÷ Σ(qty)</code>
    </div>
  );
  const infoPrecoM2 = (
    <div className="space-y-1">
      <div className="font-semibold">Preço médio m²</div>
      <div>Somente tipologias <strong>Padrão</strong> com estoque final e área privativa maiores que zero.</div>
      <code className="text-[10px]">Σ(price × qty) ÷ Σ(qty × private_area)</code>
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
  const infoEstoqueAtual = (
    <div className="space-y-1">
      <div className="font-semibold">Estoque atual</div>
      <div>Unidades em estoque no <strong>período mais recente</strong> do escopo filtrado.</div>
      <code className="text-[10px]">Σ(typology_stock) do último período</code>
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
        rangeOptions={rangeOptions}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <Header
        scope={scope}
        onScopeChange={setScope}
        region={region}
        onRegionChange={setRegion}
        onLoad={(request: GeoLoadRequest) => load(request)}
        onClear={() => { setRegion(''); setScope({ uf: '', city: '' }); }}
        buildingType={buildingType}
        onBuildingTypeChange={(nextType) => {
          setBuildingType(nextType);
          setFilters((prev) => ({ ...prev, standards: [] }));
          setBubbleStandard(null);
          setBubbleNeighborhood(null);
        }}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <ActiveFiltersBar
        scope={scope}
        buildingType={buildingType}
        filters={filters}
        options={options}
        rangeOptions={rangeOptions}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <main className="mx-auto max-w-[1600px] space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded border border-[hsl(var(--dg-primary))] bg-[hsl(var(--dg-primary-soft))] px-2 py-1 text-[10px] font-medium text-[hsl(var(--dg-primary-strong))]">
            <Activity className="h-3 w-3" />
            {status === 'ready'
              ? `${intFmt(filtered.length)} de ${intFmt(allBuildings.length)} empreendimentos`
              : status === 'loading' ? 'Carregando dados…' : 'Escolha uma região, UF ou município e clique em Carregar'}
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
            Carregando… {progress?.buildingsFound ?? 0} registros · {progress?.lanesDone ?? 0}/{progress?.lanesTotal ?? 3} tipologias · {progress?.pagesDone ?? 0} páginas
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
          <RankingCard title={`IVV por ${geographicGroupTitle}`} rows={rankIvv} formatValue={(v) => pctRaw(v * 100, 1)} info={infoIvv} geographicGroupBy={geographicGroupBy} onGeographicGroupByChange={setGeographicGroupBy} />
          <RankingCard title={`Tempo de estoque por ${geographicGroupTitle}`} rows={rankTempo} formatValue={(v) => monthsFmt(v)} info={infoTempoEstoque} geographicGroupBy={geographicGroupBy} onGeographicGroupByChange={setGeographicGroupBy} />
          <RankingCard title={`Estoque atual por ${geographicGroupTitle}`} rows={rankEstoque} formatValue={(v) => intFmt(v)} info={infoEstoqueAtual} geographicGroupBy={geographicGroupBy} onGeographicGroupByChange={setGeographicGroupBy} />
          <RankingCard title={`Preço m² por ${geographicGroupTitle}`} rows={rankM2} formatValue={(v) => currencyCompactNoPrefix(v)} info={infoPrecoM2} geographicGroupBy={geographicGroupBy} onGeographicGroupByChange={setGeographicGroupBy} />
          <div className="md:col-span-2">
            <RankingCard title={`Preço médio por ${geographicGroupTitle}`} rows={rankMedio} formatValue={(v) => currencyCompactNoPrefix(v)} info={infoPrecoMedio} geographicGroupBy={geographicGroupBy} onGeographicGroupByChange={setGeographicGroupBy} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RankingCard title="Preço m² por padrão" rows={precoM2Std} formatValue={(v) => currencyCompactNoPrefix(v)} searchable={false} topDefault={false} info={infoPrecoM2} />
          <RankingCard title="Preço médio por padrão" rows={precoMedioStd} formatValue={(v) => currencyCompactNoPrefix(v)} searchable={false} topDefault={false} info={infoPrecoMedio} />
        </div>

        <IpcChart series={ipc.series} standards={ipc.standards} granularity={granularity} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OpportunityMap matrix={oppMap} title={`Mapa de oportunidades — ${geographicGroupLabel}`} geographicGroupBy={geographicGroupBy} onGeographicGroupByChange={setGeographicGroupBy} />
          <OpportunityMap matrix={oppMapStd} title={`Mapa de oportunidades — Padrão por ${geographicGroupLabel}`} geographicGroupBy={geographicGroupBy} onGeographicGroupByChange={setGeographicGroupBy} />
        </div>

        <PriceAreaBubbleChart data={priceAreaBubbles} standards={options.standards} standard={bubbleStandard} neighborhoods={bubbleNeighborhoods} neighborhood={bubbleNeighborhood} onStandardChange={(value) => { setBubbleStandard(value); setBubbleNeighborhood(null); }} onNeighborhoodChange={setBubbleNeighborhood} />

        <footer className="flex items-center gap-2 pt-4 text-[9px] text-[hsl(var(--dg-muted))]">
          <BarChart2 className="h-3 w-3" />
          Fonte: API Geobrain <code>/building-with-history</code> — agregações client-side reproduzem os cálculos DAX do relatório original.
        </footer>
      </main>
    </div>
  );
}
