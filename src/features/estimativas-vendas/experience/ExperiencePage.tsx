import { useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { InventoryGallery } from './InventoryGallery';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { useAuthStore } from '@/store/auth-store';
import { buildingId } from '../source';
import { sourcePeriods, type InventoryRow } from '../scientific/study';
import { DataVerification } from '../operational/DataVerification';
import { ALL_METHODS, buildingSpec, chartRows, methodLabel, present, type AnalysisSpec, type Area, type CaseAnalysis, type Universe } from './domain';
import { loadUniverse } from './universe';
import { AnalysisRuntime } from './runtime';
import { UniverseSelector } from './Controls';
import { AnalysisFilters } from './AnalysisFilters';
import { CurveMap } from './CurveMap';
import { ForecastChart } from './ForecastChart';
import { ForecastExplorer } from './ForecastExplorer';
import { PortfolioExplorer } from './PortfolioExplorer';
import { ExportReview } from './ExportReview';
import '../expanded/workbench.css';
import './experience.css';
import './editorial-controls.css';
import './simplified.css';

export default function ExperiencePage() {
  const token = useAuthStore(s => s.getToken());
  const [universe, setUniverse] = useState<Universe | null>(null), [runtime, setRuntime] = useState<AnalysisRuntime | null>(null);
  const [loading, setLoading] = useState(false), [started, setStarted] = useState<number | null>(null), [progress, setProgress] = useState(''), [error, setError] = useState(''), [showSource, setShowSource] = useState(true);
  const [spec, setSpec] = useState<AnalysisSpec>({ cutoff: '', duration: 12, methods: ALL_METHODS });
  const [inventory, setInventory] = useState<InventoryRow[]>([]), [inventoryDate, setInventoryDate] = useState(''), [results, setResults] = useState<Record<string, CaseAnalysis>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inventoryDialog, setInventoryDialog] = useState<'others' | 'sold' | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false), [detailOrder, setDetailOrder] = useState<string[]>([]);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [search, setSearch] = useState(''), [type, setType] = useState('all'), [city, setCity] = useState('all'), [page, setPage] = useState(0);
  const [availability, setAvailability] = useState('finotti'), [capabilities, setCapabilities] = useState<Record<string, AnalysisSpec['methods']>>({}), [capDate, setCapDate] = useState('');
  const [selection, setSelection] = useState<Set<string>>(new Set()), [focused, setFocused] = useState<string | null>(null), [portfolio, setPortfolio] = useState<string[] | null>(null), [exportRequest, setExportRequest] = useState<{ ids: string[]; spec: AnalysisSpec } | null>(null), [dataOpen, setDataOpen] = useState(false), [selectBusy, setSelectBusy] = useState(false);
  const specRef = useRef(spec); specRef.current = spec;
  const explorerTrigger = useRef<HTMLElement | null>(null);
  const request = useRef<AbortController | null>(null), generation = useRef(0), runtimeRef = useRef<AnalysisRuntime | null>(null), lastScope = useRef<{ areas: Area[]; ids: string[] } | null>(null), rowButtons = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => () => { request.current?.abort(); runtimeRef.current?.dispose(); }, []);
  useEffect(() => {
    request.current?.abort(); generation.current++; runtimeRef.current?.dispose(); runtimeRef.current = null;
    setRuntime(null); setUniverse(null); setInventory([]); setResults({}); setSelection(new Set()); setFocused(null); setPortfolio(null); setExportRequest(null); setDataOpen(false); setInventoryDialog(null); setSettingsOpen(false); setComparisonMode(false); setLoading(false); setShowSource(true); setError(''); setCapabilities({}); setAvailability('finotti'); setCapDate('');
  }, [token]);
  function cancelLoad() { request.current?.abort(); generation.current++; setLoading(false); setProgress('Consulta cancelada; nenhum resultado parcial foi promovido.'); }
  async function load(areas: Area[], ids: string[]) {
    const seq = ++generation.current, ctrl = new AbortController(); request.current?.abort(); request.current = ctrl; lastScope.current = { areas, ids };
    setLoading(true); setStarted(Date.now()); setError('');
    try {
      const next = await loadUniverse(areas, ids, ctrl.signal, setProgress);
      if (seq !== generation.current || ctrl.signal.aborted) return;
      runtimeRef.current?.dispose(); const service = new AnalysisRuntime(next); runtimeRef.current = service;
      setRuntime(service); setUniverse(next); setSpec({ cutoff: 'latest', duration: 12, methods: ALL_METHODS }); setInventory([]); setResults({}); setInventoryDate(''); setSelection(new Set()); setFocused(null); setPortfolio(null); setExportRequest(null); setSearch(''); setType('all'); setCity('all'); setPage(0); setShowSource(false); setInventoryDialog(null); setSettingsOpen(false); setComparisonMode(false); setProgress('');
    } catch (e) { if (!ctrl.signal.aborted && seq === generation.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (seq === generation.current) { setLoading(false); setStarted(null); } }
  }
  useEffect(() => {
    if (!runtime || !spec.cutoff) return;
    let live = true; const timer = window.setTimeout(() => {
      runtime.cancelQueued();
      void runtime.inventory(spec.cutoff).then(rows => { if (live) { setInventory(rows); setInventoryDate(spec.cutoff); } }, e => { if (live && e.name !== 'AbortError') setError(e.message); });
    }, 300);
    return () => { live = false; clearTimeout(timer); };
  }, [runtime, spec.cutoff]);
  const filtered = useMemo(() => inventory.filter(r => (r.stock !== 0) && (availability === 'all' || availability === 'finotti' && capabilities[r.id]?.includes('finotti-reference') || availability === 'any' && (capabilities[r.id]?.length ?? 0) > 0 || availability === 'none' && capabilities[r.id]?.length === 0) && (type === 'all' || r.type === type) && (city === 'all' || universe?.locations[r.id]?.city === city) && `${r.name} ${r.id}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))), [inventory, availability, capabilities, type, city, universe, search]);
  useEffect(() => setPage(0), [search, availability, type, city, spec]);
  const visible = filtered.slice(page * 15, page * 15 + 15), visibleKey = visible.map(r => r.id).join('|');
  useEffect(() => {
    if (view !== 'list' || !runtime || inventoryDate !== spec.cutoff || !visibleKey) return;
    let live = true;
    for (const id of visibleKey.split('|')) void runtime.analyze(id, spec, 1).then(a => { if (live) setResults(v => { const next = { ...v, [id]: a }; const keys = Object.keys(next); if (keys.length > 256) delete next[keys.find(key => key !== id)!]; return next; }); }, e => { if (live && e.name !== 'AbortError') setError(e.message); });
    return () => { live = false; };
  }, [runtime, spec, visibleKey, inventoryDate, view]);
  useEffect(() => {
    if (!runtime || inventoryDate !== spec.cutoff) return;
    let live = true; setCapabilities({}); setCapDate(''); setAvailability('finotti');
    void (async () => {
      const all: Record<string, AnalysisSpec['methods']> = {};
      try { for (let i = 0; i < inventory.length; i += 16) {
        if (!live) return;
        Object.assign(all, await runtime.capabilities(inventory.slice(i, i + 16).map(r => r.id), spec.cutoff));
        if (live) setCapabilities({ ...all });
      } if (live) setCapDate(spec.cutoff); } catch (e) { if (live && (e as Error).name !== 'AbortError') setError(String(e)); }
    })();
    return () => { live = false; };
  }, [runtime, inventory, inventoryDate, spec.cutoff]);
  function current(a?: CaseAnalysis) { return a?.hash === universe?.hash && a?.spec.cutoff === (universe && a ? buildingSpec(universe, a.id, spec).cutoff : '') && a?.spec.duration === spec.duration; }
  function toggle(id: string) { setSelection(v => { const next = new Set(v); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function exportIds(ids: string[], nextSpec = spec) { setFocused(null); setPortfolio(null); setExportRequest({ ids: [...ids], spec: nextSpec }); }
  async function selectFinotti() {
    if (!runtime || !universe) return;
    if (capDate === spec.cutoff) { const ids = inventory.filter(r => capabilities[r.id]?.includes('finotti-reference')).map(r => r.id); setSelection(new Set(ids)); setComparisonMode(true); setAvailability('finotti'); setSearch(''); setType('all'); setCity('all'); setProgress(`${ids.length} empreendimentos com referência calculável selecionados; elegibilidade operacional permanece separada.`); return; }
    const seq = generation.current, requested = spec; setError(''); setSelectBusy(true); setProgress('Conferindo estimativas aprovadas no recorte');
    try { const ids: string[] = []; for (const row of inventory) { if (seq !== generation.current || requested !== specRef.current) return; const a = await runtime.analyze(row.id, requested, 2); if (a.stock.cases[0].methods['finotti-reference'].forecast) ids.push(row.id); } if (seq === generation.current && requested === specRef.current) { setSelection(new Set(ids)); setComparisonMode(true); setAvailability('finotti'); setSearch(''); setType('all'); setCity('all'); setProgress(`${ids.length} empreendimentos selecionados com referência calculável; elegibilidade operacional permanece separada.`); } } catch (e) { if (seq === generation.current) setError(String(e)); } finally { setSelectBusy(false); }
  }
  function openDetail(id: string, order = filtered.map(r => r.id)) { setDetailOrder(order); explorerTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setFocused(id); }
  function closeDetail() { const id = focused; setFocused(null); requestAnimationFrame(() => { if (explorerTrigger.current?.isConnected) explorerTrigger.current.focus(); else if (id) rowButtons.current.get(id)?.focus(); }); }
  const source = useMemo(() => universe?.buildings.map(building => ({ building, ...universe.locations[buildingId(building)] })) ?? [], [universe]);
  const periods = useMemo(() => universe ? sourcePeriods(universe.buildings) : [], [universe]);
  const finottiIds = inventory.filter(r => capabilities[r.id]?.includes('finotti-reference')).map(r => r.id);
  const others = inventory.filter(r => r.stock !== 0 && !capabilities[r.id]?.includes('finotti-reference'));
  function openGallery(kind: 'others' | 'sold') { setSettingsOpen(false); setInventoryDialog(kind); }
  return <><main className="evx-page">
    <header className="evx-header"><h1>Estimativas de vendas</h1></header>
    {showSource && <UniverseSelector onLoad={(areas, ids) => void load(areas, ids)} />}
    {loading && <><BrainLoadingState variant="overlay" title="Carregando empreendimentos" description={progress} startedAt={started} /><Button className="evx-cancel" onClick={cancelLoad}>Cancelar consulta</Button></>}
    {error && <div role="alert" className="evx-notice"><p>{error}</p><p>Uma consulta incompleta não substitui os dados anteriores.</p>{lastScope.current && <Button variant="outline" onClick={() => void load(lastScope.current!.areas, lastScope.current!.ids)}>Tentar novamente a consulta</Button>}</div>}
    {universe && <><section className="evx-universe-summary evx-open-summary" aria-label="Universo carregado"><div><p className="evx-eyebrow">{universe.areas.map(a => `${a.city}/${a.uf}`).join(' · ')}</p><h2>{universe.buildings.length} empreendimentos</h2><small>Consulta completa · {new Date(universe.fetchedAt).toLocaleString('pt-BR')} · dados até {periods.at(-1) ?? 'sem histórico'} · {universe.requests.reduce((s, r) => s + r.pages, 0)} páginas</small></div><div className="evx-actions"><Button variant="outline" onClick={() => setShowSource(v => !v)}>Alterar universo</Button><Button variant="ghost" onClick={() => { if (lastScope.current) void load(lastScope.current.areas, lastScope.current.ids); }}>Atualizar dados</Button><Button variant="ghost" onClick={() => setDataOpen(true)}>Dados e metodologia</Button></div></section>
      {universe.missingIds.length > 0 && <p>IDs não localizados nas cidades autorizadas: {universe.missingIds.join(', ')}.</p>}
      {!periods.length ? <p role="status">Nenhum histórico disponível neste universo. Altere o recorte para continuar.</p> : <>
        <AnalysisFilters open={settingsOpen} onOpenChange={setSettingsOpen} duration={spec.duration} onDuration={duration => setSpec({ ...spec, duration })} availability={availability} onAvailability={setAvailability} type={type} onType={setType} city={city} onCity={setCity} cities={[...new Set(universe.areas.map(a => a.city))]} view={view} onView={setView} ready={capDate === spec.cutoff} others={others.length} sold={inventory.filter(r => r.stock === 0).length} onOthers={() => openGallery('others')} onSold={() => openGallery('sold')} />
        <label className="evx-field evs-search">Pesquisar empreendimento<Input placeholder="Nome ou ID" value={search} onChange={e => setSearch(e.target.value)} /></label>
        {capDate !== spec.cutoff && inventoryDate === spec.cutoff && <BrainLoadingState variant="field" title={`Conferindo métodos disponíveis: ${Object.keys(capabilities).length}/${inventory.length}`} description="A lista já pode ser explorada; o filtro de disponibilidade será liberado após conferir o universo inteiro." />}
        <header className="evs-curves-heading"><div><p className="evx-eyebrow">02 · Curvas</p><h2>{filtered.length} empreendimentos no recorte</h2>
        <button className="evs-context" onClick={() => setSettingsOpen(true)} aria-label="Revisar configurações da análise">{availability === 'finotti' ? 'Estimativas aprovadas' : availability === 'all' ? 'Todos os métodos' : availability === 'any' ? 'Algum método' : 'Sem método'} · {spec.duration} meses · {type === 'all' ? 'Todos os tipos' : type} · {city === 'all' ? 'Todas as cidades' : city}</button></div>
        <div className="evs-curve-actions" aria-label="Ações das curvas">{!comparisonMode ? <Button variant="ghost" className="evs-action" onClick={() => setComparisonMode(true)}><span>Comparar curvas</span></Button> : <Button variant="ghost" className={`evs-action ${selection.size >= 2 ? 'evs-text-ready' : ''}`} disabled={selection.size < 2} onClick={() => setPortfolio([...selection])}><span>Comparar {selection.size} curvas</span></Button>}<Button variant="ghost" className="evs-action" disabled={capDate !== spec.cutoff || !(selection.size || finottiIds.length)} onClick={() => exportIds(selection.size ? [...selection] : finottiIds)}><span>{selection.size ? `Baixar selecionadas (${selection.size})` : 'Baixar estimativas aprovadas'}</span></Button><Button variant="ghost" className="evs-action evs-mark-all" disabled={capDate !== spec.cutoff || selectBusy} onClick={() => void selectFinotti()}><span>Marcar estimativas aprovadas</span></Button><Button variant="ghost" className="evs-action evs-settings-button" aria-label="Abrir configurações" title="Configurações da análise" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={18} /></Button></div></header>
        {comparisonMode && <div className="evs-selection-note"><div className="evs-compare-prompt"><strong>{selection.size < 2 ? 'Escolha dois ou mais empreendimentos no mapa.' : `${selection.size} empreendimentos prontos para comparar`}</strong><span>{selection.size} selecionados · {[...selection].filter(id => !filtered.some(r => r.id === id)).length} fora do filtro atual</span></div><Button variant="ghost" className="evs-action" onClick={() => setComparisonMode(false)}>Concluir seleção</Button>{selection.size > 0 && <Button variant="ghost" className="evs-action" onClick={() => setSelection(new Set())}>Limpar seleção</Button>}</div>}
        {progress && !loading && <p role="status" className="evx-muted">{progress}</p>}
        {inventoryDate !== spec.cutoff && <BrainLoadingState variant="field" title="Classificando empreendimentos na data escolhida" />}
        {view === 'map' && runtime && capDate === spec.cutoff && <CurveMap runtime={runtime} universe={universe} rows={filtered} allIds={inventory.map(r => r.id)} spec={spec} selection={selection} comparisonMode={comparisonMode} onToggle={toggle} onExplore={openDetail} />}
        {view === 'list' && <><section className="evx-list" aria-label="Empreendimentos e curvas" aria-busy={inventoryDate !== spec.cutoff}>
          {visible.map(r => { const a = results[r.id], ready = current(a), p = ready ? present(a) : null, b = universe.buildings.find(b => buildingId(b) === r.id)!; return <article key={r.id} className={`evx-forecast-row ${selection.has(r.id) ? 'evx-selected' : ''}`}><button className="evx-open-row" ref={el => { if (el) rowButtons.current.set(r.id, el); else rowButtons.current.delete(r.id); }} onClick={() => comparisonMode ? toggle(r.id) : openDetail(r.id)} aria-label={`${comparisonMode ? 'Selecionar' : 'Abrir curva de'} ${r.name}`} aria-pressed={comparisonMode ? selection.has(r.id) : undefined}><div className="evx-row-title"><h3>{r.name}</h3><p>{universe.locations[r.id]?.city} · {r.type} · {r.pattern ?? 'Padrão ausente'}</p><small>{selection.has(r.id) ? 'Selecionado / ' : ''}{p?.method ? methodLabel(p.method) : p?.status ?? 'Preparando curva'} · ID {r.id} / dados até {r.cutoff}</small></div><div className="evx-mini-wrap">{ready ? <ForecastChart compact percent units={r.units} rows={chartRows(b, a, 'sold')} cutoff={a.spec.cutoff} methods={p?.method ? [p.method] : []} label={`Curva de vendas de ${r.name}`} /> : <BrainLoadingState variant="field" title="Calculando curva" />}</div><div className="evx-row-numbers"><span>Unidades vendidas<strong>{r.sold ?? '—'}</strong></span><span>Vendas previstas<strong>{p?.method ? (() => { const points = a.stock.cases[0].methods[p.method!].forecast?.points; const stock = points?.at(-1)?.stock; return stock !== null && stock !== undefined && r.stock !== null ? (r.stock - stock).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'; })() : '—'}</strong></span><small>{spec.duration} meses</small></div></button><Button variant="outline" onClick={() => openDetail(r.id)} aria-label={`Explorar curva de ${r.name}`}>Explorar curva</Button></article>; })}
          {!filtered.length && capDate === spec.cutoff && <p role="status">Nenhum empreendimento corresponde aos filtros. Revise as condições ou inclua os esgotados.</p>}
        </section>
        <div className="evx-actions"><Button variant="outline" disabled={page === 0} onClick={() => setPage(v => v - 1)}>Página anterior</Button><span>{page + 1}/{Math.max(1, Math.ceil(filtered.length / 15))}</span><Button variant="outline" disabled={(page + 1) * 15 >= filtered.length} onClick={() => setPage(v => v + 1)}>Próxima página</Button></div></>}
      </>}
    </>}
    {universe && runtime && focused && <ForecastExplorer universe={universe} runtime={runtime} id={focused} navigation={detailOrder} initialSpec={buildingSpec(universe, focused, spec)} onClose={closeDetail} onNavigate={setFocused} onExport={exportIds} />}
    {runtime && portfolio && <PortfolioExplorer universe={universe!} ids={portfolio} runtime={runtime} spec={spec} onClose={() => setPortfolio(null)} onExport={() => exportIds(portfolio)} />}
    {universe && runtime && exportRequest && <ExportReview universe={universe} runtime={runtime} ids={exportRequest.ids} spec={exportRequest.spec} onClose={() => setExportRequest(null)} />}
    {inventoryDialog && universe && <InventoryGallery key={inventoryDialog} kind={inventoryDialog} rows={inventoryDialog === 'sold' ? inventory.filter(r => r.stock === 0) : others} universe={universe} onClose={() => setInventoryDialog(null)} />}
    {dataOpen && universe && <Dialog open onOpenChange={setDataOpen}><DialogContent className="evx-export"><DialogTitle>Dados e metodologia</DialogTitle><DialogDescription>Consulta completa e rastreável; origem histórica e periodicidade oficial ainda não confirmadas na API.</DialogDescription><p>{universe.buildings.length} empreendimentos · {universe.requests.reduce((s, r) => s + r.pages, 0)} páginas · {universe.fetchedAt}</p><p>Fonte: API Geobrain autenticada. A flag atual do cadastro não comprova origem dos períodos anteriores. Snapshot: {universe.hash}.</p><p>A referência Finotti foi treinada até setembro de 2026; períodos anteriores ficam bloqueados para esse teste. Estoque constante e ritmo recente são referências exploratórias.</p><DataVerification source={source} fetchedAt={universe.fetchedAt} /></DialogContent></Dialog>}
  </main></>;
}
