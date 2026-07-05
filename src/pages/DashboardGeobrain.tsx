import { useEffect, useMemo, useState } from 'react';
import { Activity, Building2, DollarSign, Layers, Package, Timer, TrendingUp, BarChart2, Loader2, AlertCircle } from 'lucide-react';
import MUNICIPIOS_BR from '@/assets/municipios-br.json';
import { brlCompact, intFmt, months, numCompact, pctRaw } from '@/lib/format';
import { useDashboardData } from '@/features/dashboard-geobrain/use-dashboard-data';
import { applyFilters, computeKpis, computeSeries, extractOptions } from '@/features/dashboard-geobrain/aggregate';
import { FiltersPanel } from '@/features/dashboard-geobrain/FiltersPanel';
import { EvolucaoChart, IvvChart, VgvChart } from '@/features/dashboard-geobrain/Charts';
import type { Filters, Granularity } from '@/features/dashboard-geobrain/types';
import { useAuthStore } from '@/store/auth-store';

const UF_LIST = Object.keys(MUNICIPIOS_BR as Record<string, string[]>).sort();

const EMPTY_FILTERS: Filters = {
  from: null, to: null, years: [], status: [], cities: [], neighborhoods: [],
  types: [], typologies: [], standards: [], bedrooms: [], garages: [], buildings: [],
};

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-primary/70">{icon}</span>
      </div>
      <div className="mt-2 font-heading text-xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function DashboardGeobrain() {
  const hasToken = useAuthStore((s) => s.hasValidToken());
  const [uf, setUf] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [gEvo, setGEvo] = useState<Granularity>('quarter');
  const [gIvv, setGIvv] = useState<Granularity>('quarter');
  const [gVgv, setGVgv] = useState<Granularity>('quarter');

  const { status, buildings, error, progress, load } = useDashboardData();

  // fetch when uf changes (city é filtro local, não dispara refetch)
  useEffect(() => {
    if (uf) load(uf);
    else setFilters(EMPTY_FILTERS);
  }, [uf, load]);

  const options = useMemo(() => extractOptions(buildings ?? []), [buildings]);
  const filtered = useMemo(() => applyFilters(buildings ?? [], filters), [buildings, filters]);
  const kpis = useMemo(() => computeKpis(filtered, filters), [filtered, filters]);
  const seriesEvo = useMemo(() => computeSeries(filtered, filters, gEvo), [filtered, filters, gEvo]);
  const seriesIvv = useMemo(() => computeSeries(filtered, filters, gIvv), [filtered, filters, gIvv]);
  const seriesVgv = useMemo(() => computeSeries(filtered, filters, gVgv), [filtered, filters, gVgv]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard Geobrain</h1>
          <p className="text-sm text-muted-foreground">
            KPIs e séries temporais a partir de <code className="rounded bg-muted px-1">/building-with-history</code>.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
          <Activity className="h-3 w-3" />
          {status === 'ready'
            ? `${intFmt(buildings?.length ?? 0)} empreendimentos carregados`
            : status === 'loading'
              ? 'Carregando dados…'
              : 'Selecione UF para começar'}
        </div>
      </header>

      {!hasToken && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>Faça login no bloco de autenticação do menu lateral para consultar a API Geobrain.</div>
        </div>
      )}

      <FiltersPanel
        uf={uf}
        onUfChange={setUf}
        ufOptions={UF_LIST}
        filters={filters}
        onFiltersChange={setFilters}
        options={options}
        onReset={() => setFilters(EMPTY_FILTERS)}
        disabled={status === 'loading'}
      />

      {status === 'loading' && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>
            Carregando… {progress?.buildingsFound ?? 0} empreendimentos ·{' '}
            {progress?.lanesDone ?? 0}/{progress?.lanesTotal ?? 8} lanes ·{' '}
            {progress?.pagesDone ?? 0} páginas
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error || 'Erro ao consultar a API.'}</div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Kpi icon={<Building2 className="h-4 w-4" />} label="Empreendimentos" value={intFmt(kpis.empreendimentos)} />
        <Kpi icon={<Building2 className="h-4 w-4" />} label="Empreend. ativos" value={intFmt(kpis.empreendimentosAtivos)} />
        <Kpi icon={<Layers className="h-4 w-4" />} label="Oferta lançada" value={numCompact(kpis.ofertaLancada, 0)} hint="unidades" />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="VGV lançado" value={brlCompact(kpis.vgvLancado)} />
        <Kpi icon={<Package className="h-4 w-4" />} label="Oferta final" value={numCompact(kpis.ofertaFinal, 0)} hint="estoque disponível" />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="VGV estoque" value={brlCompact(kpis.vgvEstoque)} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="IVV" value={pctRaw(kpis.ivv * 100)} />
        <Kpi icon={<Timer className="h-4 w-4" />} label="Tempo de estoque" value={months(kpis.tempoEstoque)} />
      </div>

      {/* Charts */}
      <div className="space-y-6">
        <EvolucaoChart data={seriesEvo} granularity={gEvo} onGranularityChange={setGEvo} />
        <IvvChart data={seriesIvv} granularity={gIvv} onGranularityChange={setGIvv} />
        <VgvChart data={seriesVgv} granularity={gVgv} onGranularityChange={setGVgv} />
      </div>

      <footer className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <BarChart2 className="h-3 w-3" />
        Fonte: API Geobrain <code>/building-with-history</code> — agregações client-side reproduzem os cálculos DAX do relatório original.
      </footer>
    </div>
  );
}
