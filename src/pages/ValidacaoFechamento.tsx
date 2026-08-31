import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { VFHeader } from '@/features/validacao-fechamento/VFHeader';
import { VFSidebar } from '@/features/validacao-fechamento/VFSidebar';
import { ResumoTable } from '@/features/validacao-fechamento/ResumoTable';
import { ResumoPorCidade } from '@/features/validacao-fechamento/ResumoPorCidade';
import { DetalhamentoGrid } from '@/features/validacao-fechamento/DetalhamentoGrid';
import { DivergencesGrid } from '@/features/validacao-fechamento/DivergencesGrid';
import { validateBuildings } from '@/features/validacao-fechamento/validation-rules';
import { ActiveFiltersBar } from '@/features/validacao-fechamento/ActiveFiltersBar';
import { useVFData } from '@/features/validacao-fechamento/use-vf-data';
import {
  EMPTY_VF_FILTERS, applyVFFilters, computeResumo, extractVFOptions, flattenBuildings,
  type Granularity, type VFFilters,
} from '@/features/validacao-fechamento/aggregate';
import { intFmt } from '@/lib/format';
import '@/features/validacao-fechamento/fechamento.css';

const STORAGE_KEY = 'validacao-fechamento:state';
type Tab = 'resumo' | 'resumo-cidade' | 'detalhamento' | 'divergencias';

export default function ValidacaoFechamento() {
  const hasToken = useAuthStore((s) => s.hasValidToken());
  const [uf, setUf] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [activeCity, setActiveCity] = useState('');
  const [granularity, setGranularity] = useState<Granularity>('year');
  const [filters, setFilters] = useState<VFFilters>(EMPTY_VF_FILTERS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('resumo');

  // Persistência de sessão
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.uf) setUf(s.uf);
        if (Array.isArray(s.selectedCities)) setSelectedCities(s.selectedCities);
        if (s.granularity) setGranularity(s.granularity);
        if (s.filters) setFilters({ ...EMPTY_VF_FILTERS, ...s.filters });
        if (s.tab) setTab(s.tab);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ uf, selectedCities, granularity, filters, tab }));
    } catch { /* ignore */ }
  }, [uf, selectedCities, granularity, filters, tab]);

  const { status, buildings, loadedCities, failures, error, progress, load, reset } = useVFData();

  const allRows = useMemo(() => flattenBuildings(buildings ?? []), [buildings]);
  const divergences = useMemo(() => status === 'ready' ? validateBuildings(buildings ?? []) : [], [buildings, status]);
  const options = useMemo(() => extractVFOptions(allRows), [allRows]);

  // Cidade ativa do header ('' = todas) aplicada sobre os filtros da sidebar
  const effectiveFilters = useMemo<VFFilters>(
    () => ({ ...filters, cities: activeCity ? [activeCity] : [] }),
    [filters, activeCity],
  );

  const filtered = useMemo(() => applyVFFilters(allRows, effectiveFilters), [allRows, effectiveFilters]);

  // Para AA/PA usamos filtros de dimensão apenas (sem temporais)
  const filteredDimOnly = useMemo(() => applyVFFilters(allRows, {
    ...effectiveFilters, years: [], quarters: [], periods: [],
  }), [allRows, effectiveFilters]);

  const resumo = useMemo(
    () => computeResumo(filtered, filteredDimOnly, granularity),
    [filtered, filteredDimOnly, granularity],
  );

  // Cidades exibidas na guia "Resumo por cidade"
  const cityBlocks = useMemo(
    () => (activeCity ? [activeCity] : loadedCities),
    [activeCity, loadedCities],
  );

  function handleLoad() {
    setActiveCity('');
    if (uf && selectedCities.length) load({ uf, cities: selectedCities });
    else reset();
  }

  return (
    <div className="validacao-fechamento min-h-screen">
      <VFSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        filters={filters}
        onChange={setFilters}
        options={options}
        onReset={() => setFilters(EMPTY_VF_FILTERS)}
      />

      <VFHeader
        uf={uf}
        selectedCities={selectedCities}
        onUfChange={setUf}
        onSelectedCitiesChange={setSelectedCities}
        onLoad={handleLoad}
        loading={status === 'loading'}
        loadedCities={loadedCities}
        activeCity={activeCity}
        onActiveCityChange={setActiveCity}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <ActiveFiltersBar
        uf={uf}
        loadedCities={loadedCities}
        activeCity={activeCity}
        granularity={granularity}
        filters={filters}
        options={options}
        onReset={() => setFilters(EMPTY_VF_FILTERS)}
      />

      <main className="mx-auto max-w-[1600px] space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[9pt] font-medium"
            style={{
              color: 'var(--vf-primary-strong)',
              background: 'var(--vf-primary-soft)',
              border: '1px solid var(--vf-primary)',
            }}
          >
            <Activity className="h-3 w-3" />
            {status === 'ready'
              ? `${intFmt(filtered.length)} registros · ${intFmt((buildings ?? []).length)} empreendimentos · ${loadedCities.length} cidades`
              : status === 'loading' ? 'Carregando dados…' : 'Escolha até 10 cidades e clique em Carregar'}
          </div>

          <div className="vf-tabs ml-auto">
            <button type="button" className="vf-tab" data-active={tab === 'resumo'} onClick={() => setTab('resumo')}>Resumo</button>
            <button type="button" className="vf-tab" data-active={tab === 'resumo-cidade'} onClick={() => setTab('resumo-cidade')}>Resumo por cidade</button>
            <button type="button" className="vf-tab" data-active={tab === 'detalhamento'} onClick={() => setTab('detalhamento')}>Detalhamento</button>
            <button type="button" className="vf-tab" data-active={tab === 'divergencias'} onClick={() => setTab('divergencias')}>Divergências Encontradas ({divergences.length})</button>
          </div>
        </div>

        {!hasToken && (
          <div className="flex items-start gap-2 rounded p-2 text-[10pt]" style={{ background: 'var(--vf-accent-soft)', border: '1px solid var(--vf-accent)' }}>
            <AlertCircle className="mt-0.5 h-3 w-3" />
            <div>Faça login no bloco de autenticação para consultar a API GeoBrain.</div>
          </div>
        )}
        {status === 'loading' && (
          <div className="flex items-center gap-2 rounded p-2 text-[10pt] text-[var(--vf-muted)]" style={{ border: '1px solid var(--vf-border)', background: 'var(--vf-card)' }}>
            <Loader2 className="h-3 w-3 animate-spin" />
            Carregando… {progress?.citiesDone ?? 0}/{progress?.citiesTotal ?? 0} cidades · {progress?.buildingsFound ?? 0} empreendimentos
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-start gap-2 rounded border border-red-400 bg-red-50 p-2 text-[10pt] text-red-700">
            <AlertCircle className="mt-0.5 h-3 w-3" />
            <div>{error || 'Erro ao consultar a API.'}</div>
          </div>
        )}
        {status === 'ready' && failures.length > 0 && (
          <div className="flex items-start gap-2 rounded p-2 text-[10pt]" style={{ background: 'var(--vf-accent-soft)', border: '1px solid var(--vf-accent)' }}>
            <AlertTriangle className="mt-0.5 h-3 w-3" />
            <div>Falha ao carregar: {failures.map((f) => `${f.city} (${f.message})`).join(' · ')}</div>
          </div>
        )}

        <div className="transition-opacity duration-200">
          {tab === 'resumo' && <ResumoTable resumo={resumo} granularity={granularity} />}
          {tab === 'resumo-cidade' && (
            <ResumoPorCidade rows={allRows} filters={filters} granularity={granularity} cities={cityBlocks} />
          )}
          {tab === 'detalhamento' && <DetalhamentoGrid rows={filtered} />}
          {tab === 'divergencias' && <DivergencesGrid rows={divergences} />}
        </div>
      </main>
    </div>
  );
}
