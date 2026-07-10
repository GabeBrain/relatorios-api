import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';
import { useDashboardData } from '@/features/dashboard-geobrain/use-dashboard-data';
import { useAuthStore } from '@/store/auth-store';
import type { GeoScope } from '@/features/shared/geo-api-scope-engine';
import { VFHeader } from '@/features/validacao-fechamento/VFHeader';
import { VFSidebar } from '@/features/validacao-fechamento/VFSidebar';
import { ResumoTable } from '@/features/validacao-fechamento/ResumoTable';
import { DetalhamentoGrid } from '@/features/validacao-fechamento/DetalhamentoGrid';
import { ActiveFiltersBar } from '@/features/validacao-fechamento/ActiveFiltersBar';
import {
  EMPTY_VF_FILTERS, applyVFFilters, computeResumo, extractVFOptions, flattenBuildings,
  type Granularity, type VFFilters,
} from '@/features/validacao-fechamento/aggregate';
import { intFmt } from '@/lib/format';
import '@/features/validacao-fechamento/fechamento.css';

const STORAGE_KEY = 'validacao-fechamento:state';
type Tab = 'resumo' | 'detalhamento';

export default function ValidacaoFechamento() {
  const hasToken = useAuthStore((s) => s.hasValidToken());
  const [scope, setScope] = useState<GeoScope>({ uf: '', city: '' });
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
        if (s.scope) setScope(s.scope);
        if (s.granularity) setGranularity(s.granularity);
        if (s.filters) setFilters(s.filters);
        if (s.tab) setTab(s.tab);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ scope, granularity, filters, tab }));
    } catch { /* ignore */ }
  }, [scope, granularity, filters, tab]);

  const { status, buildings, error, progress, load, reset } = useDashboardData();

  useEffect(() => {
    if (scope.uf && scope.city) load({ uf: scope.uf, city: scope.city });
    else reset();
  }, [scope.uf, scope.city, load, reset]);

  const allRows = useMemo(() => flattenBuildings(buildings ?? []), [buildings]);
  const options = useMemo(() => extractVFOptions(allRows), [allRows]);
  const filtered = useMemo(() => applyVFFilters(allRows, filters), [allRows, filters]);

  // Para AA/PA usamos filtros de dimensão apenas (sem temporais)
  const filteredDimOnly = useMemo(() => applyVFFilters(allRows, {
    ...filters, years: [], quarters: [], periods: [],
  }), [allRows, filters]);

  const resumo = useMemo(
    () => computeResumo(filtered, filteredDimOnly, granularity),
    [filtered, filteredDimOnly, granularity],
  );

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
        scope={scope}
        onScopeChange={setScope}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onOpenSidebar={() => setSidebarOpen(true)}
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
              ? `${intFmt(filtered.length)} registros · ${intFmt((buildings ?? []).length)} empreendimentos`
              : status === 'loading' ? 'Carregando dados…' : 'Escolha uma cidade para começar'}
          </div>

          <div className="vf-tabs ml-auto">
            <button type="button" className="vf-tab" data-active={tab === 'resumo'} onClick={() => setTab('resumo')}>Resumo</button>
            <button type="button" className="vf-tab" data-active={tab === 'detalhamento'} onClick={() => setTab('detalhamento')}>Detalhamento</button>
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
            Carregando… {progress?.buildingsFound ?? 0} empreendimentos · {progress?.lanesDone ?? 0}/{progress?.lanesTotal ?? 8} lanes · {progress?.pagesDone ?? 0} páginas
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-start gap-2 rounded border border-red-400 bg-red-50 p-2 text-[10pt] text-red-700">
            <AlertCircle className="mt-0.5 h-3 w-3" />
            <div>{error || 'Erro ao consultar a API.'}</div>
          </div>
        )}

        <div className="transition-opacity duration-200">
          {tab === 'resumo'
            ? <ResumoTable resumo={resumo} granularity={granularity} />
            : <DetalhamentoGrid rows={filtered} />}
        </div>
      </main>
    </div>
  );
}
