import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { useAuthStore } from '@/store/auth-store';
import { buildingId } from '../source';
import { sourcePeriods, type InventoryRow } from '../scientific/study';
import { DataVerification } from '../operational/DataVerification';
import { ALL_METHODS, buildingSpec, chartRows, methodLabel, present, type AnalysisSpec, type Area, type CaseAnalysis, type Universe } from './domain';
import { loadUniverse } from './universe';
import { AnalysisRuntime } from './runtime';
import { Choice, UniverseSelector } from './Controls';
import { ForecastChart } from './ForecastChart';
import { ForecastExplorer } from './ForecastExplorer';
import { PortfolioExplorer } from './PortfolioExplorer';
import { ExportReview } from './ExportReview';
import '../expanded/workbench.css';
import './experience.css';

export default function ExperiencePage() {
  const token = useAuthStore(s => s.getToken());
  const [universe, setUniverse] = useState<Universe | null>(null), [runtime, setRuntime] = useState<AnalysisRuntime | null>(null);
  const [loading, setLoading] = useState(false), [started, setStarted] = useState<number | null>(null), [progress, setProgress] = useState(''), [error, setError] = useState(''), [showSource, setShowSource] = useState(true);
  const [spec, setSpec] = useState<AnalysisSpec>({ cutoff: '', duration: 12, methods: ALL_METHODS });
  const [inventory, setInventory] = useState<InventoryRow[]>([]), [inventoryDate, setInventoryDate] = useState(''), [results, setResults] = useState<Record<string, CaseAnalysis>>({});
  const [search, setSearch] = useState(''), [type, setType] = useState('all'), [city, setCity] = useState('all'), [showSold, setShowSold] = useState(false), [page, setPage] = useState(0);
  const [availability, setAvailability] = useState('finotti'), [capabilities, setCapabilities] = useState<Record<string, AnalysisSpec['methods']>>({}), [capDate, setCapDate] = useState('');
  const [selection, setSelection] = useState<Set<string>>(new Set()), [focused, setFocused] = useState<string | null>(null), [portfolio, setPortfolio] = useState<string[] | null>(null), [exportRequest, setExportRequest] = useState<{ ids: string[]; spec: AnalysisSpec } | null>(null), [dataOpen, setDataOpen] = useState(false), [selectBusy, setSelectBusy] = useState(false);
  const specRef = useRef(spec); specRef.current = spec;
  const request = useRef<AbortController | null>(null), generation = useRef(0), runtimeRef = useRef<AnalysisRuntime | null>(null), lastScope = useRef<{ areas: Area[]; ids: string[] } | null>(null), rowButtons = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => () => { request.current?.abort(); runtimeRef.current?.dispose(); }, []);
  useEffect(() => {
    request.current?.abort(); generation.current++; runtimeRef.current?.dispose(); runtimeRef.current = null;
    setRuntime(null); setUniverse(null); setInventory([]); setResults({}); setSelection(new Set()); setFocused(null); setPortfolio(null); setExportRequest(null); setDataOpen(false); setLoading(false); setShowSource(true); setError(''); setCapabilities({}); setAvailability('finotti'); setCapDate('');
  }, [token]);
  function cancelLoad() { request.current?.abort(); generation.current++; setLoading(false); setProgress('Consulta cancelada; nenhum resultado parcial foi promovido.'); }
  async function load(areas: Area[], ids: string[]) {
    const seq = ++generation.current, ctrl = new AbortController(); request.current?.abort(); request.current = ctrl; lastScope.current = { areas, ids };
    setLoading(true); setStarted(Date.now()); setError('');
    try {
      const next = await loadUniverse(areas, ids, ctrl.signal, setProgress);
      if (seq !== generation.current || ctrl.signal.aborted) return;
      runtimeRef.current?.dispose(); const service = new AnalysisRuntime(next); runtimeRef.current = service;
      setRuntime(service); setUniverse(next); setSpec({ cutoff: 'latest', duration: 12, methods: ALL_METHODS }); setInventory([]); setResults({}); setInventoryDate(''); setSelection(new Set()); setFocused(null); setPortfolio(null); setExportRequest(null); setSearch(''); setType('all'); setCity('all'); setShowSold(false); setPage(0); setShowSource(false); setProgress('');
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
  const filtered = useMemo(() => inventory.filter(r => (showSold || r.stock !== 0) && (availability === 'all' || availability === 'finotti' && capabilities[r.id]?.includes('finotti-reference') || availability === 'any' && (capabilities[r.id]?.length ?? 0) > 0 || availability === 'none' && capabilities[r.id]?.length === 0) && (type === 'all' || r.type === type) && (city === 'all' || universe?.locations[r.id]?.city === city) && `${r.name} ${r.id}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))), [inventory, showSold, availability, capabilities, type, city, universe, search]);
  useEffect(() => setPage(0), [search, availability, type, city, showSold, spec]);
  const visible = filtered.slice(page * 15, page * 15 + 15), visibleKey = visible.map(r => r.id).join('|');
  useEffect(() => {
    if (!runtime || inventoryDate !== spec.cutoff || !visibleKey) return;
    let live = true;
    for (const id of visibleKey.split('|')) void runtime.analyze(id, spec, 1).then(a => { if (live) setResults(v => { const next = { ...v, [id]: a }; const keys = Object.keys(next); if (keys.length > 256) delete next[keys.find(key => key !== id)!]; return next; }); }, e => { if (live && e.name !== 'AbortError') setError(e.message); });
    return () => { live = false; };
  }, [runtime, spec, visibleKey, inventoryDate]);
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
    if (capDate === spec.cutoff) { const ids = inventory.filter(r => capabilities[r.id]?.includes('finotti-reference')).map(r => r.id); setSelection(new Set(ids)); setAvailability('finotti'); setSearch(''); setType('all'); setCity('all'); setProgress(`${ids.length} empreendimentos com referência calculável selecionados; elegibilidade operacional permanece separada.`); return; }
    const seq = generation.current, requested = spec; setError(''); setSelectBusy(true); setProgress('Conferindo referência Finotti no recorte');
    try { const ids: string[] = []; for (const row of inventory) { if (seq !== generation.current || requested !== specRef.current) return; const a = await runtime.analyze(row.id, requested, 2); if (a.stock.cases[0].methods['finotti-reference'].forecast) ids.push(row.id); } if (seq === generation.current && requested === specRef.current) { setSelection(new Set(ids)); setAvailability('finotti'); setSearch(''); setType('all'); setCity('all'); setProgress(`${ids.length} empreendimentos selecionados com referência calculável; elegibilidade operacional permanece separada.`); } } catch (e) { if (seq === generation.current) setError(String(e)); } finally { setSelectBusy(false); }
  }
  function closeDetail() { const id = focused; setFocused(null); requestAnimationFrame(() => { if (id) rowButtons.current.get(id)?.focus(); }); }
  const source = useMemo(() => universe?.buildings.map(building => ({ building, ...universe.locations[buildingId(building)] })) ?? [], [universe]);
  const periods = useMemo(() => universe ? sourcePeriods(universe.buildings) : [], [universe]);
  const others = inventory.filter(r => !capabilities[r.id]?.includes('finotti-reference'));
  return <><main className="evx-page">
    <header className="evx-header"><h1>Estimativas de vendas</h1></header>
    {showSource && <UniverseSelector onLoad={(areas, ids) => void load(areas, ids)} />}
    {loading && <><BrainLoadingState variant="overlay" title="Carregando empreendimentos" description={progress} startedAt={started} /><Button className="evx-cancel" onClick={cancelLoad}>Cancelar consulta</Button></>}
    {error && <div role="alert" className="evx-notice"><p>{error}</p><p>Uma consulta incompleta não substitui os dados anteriores.</p>{lastScope.current && <Button variant="outline" onClick={() => void load(lastScope.current!.areas, lastScope.current!.ids)}>Tentar novamente a consulta</Button>}</div>}
    {universe && <><section className="evx-panel evx-universe-summary" aria-label="Universo carregado"><div><p className="evx-eyebrow">{universe.areas.map(a => `${a.city}/${a.uf}`).join(' · ')}</p><h2>{universe.buildings.length} empreendimentos</h2><small>Consulta completa · {new Date(universe.fetchedAt).toLocaleString('pt-BR')} · dados até {periods.at(-1) ?? 'sem histórico'} · {universe.requests.reduce((s, r) => s + r.pages, 0)} páginas</small></div><div className="evx-actions"><Button variant="outline" onClick={() => setShowSource(v => !v)}>Alterar universo</Button><Button variant="ghost" onClick={() => { if (lastScope.current) void load(lastScope.current.areas, lastScope.current.ids); }}>Atualizar dados</Button><Button variant="ghost" onClick={() => setDataOpen(true)}>Dados e metodologia</Button></div></section>
      {universe.missingIds.length > 0 && <p>IDs não localizados nas cidades autorizadas: {universe.missingIds.join(', ')}.</p>}
      {!periods.length ? <p role="status">Nenhum histórico disponível neste universo. Altere o recorte para continuar.</p> : <>
        {capDate === spec.cutoff && <div className="evx-actions"><Button variant={availability === 'finotti' ? 'secondary' : 'outline'} onClick={() => setAvailability('finotti')}>Finotti ({inventory.length - others.length})</Button><Button variant="ghost" onClick={() => { setAvailability('all'); setShowSold(true); }}>Mostrar todos</Button><small>Último dado de cada empreendimento · clique no card para selecionar.</small></div>}
        {capDate === spec.cutoff && <details className="evx-panel"><summary>Outros empreendimentos ({others.length})</summary><ul>{others.map(r => <li key={r.id}>{r.name} · {r.stock === 0 ? 'Esgotado' : r.tags.includes('old-stock') ? 'Fora do intervalo de idade Finotti' : 'Sem referência Finotti calculável'} · dados até {r.cutoff || 'ausentes'}</li>)}</ul></details>}
        <section className="evx-toolbar" aria-label="Controles da análise"><label className="evx-field">Pesquisar empreendimento<Input placeholder="Nome ou ID" value={search} onChange={e => setSearch(e.target.value)} /></label><Choice label="Prever por" value={String(spec.duration)} onChange={v => setSpec({ ...spec, duration: Number(v) })} items={[1, 3, 6, 12, 24, 36].map(n => ({ value: String(n), label: `${n} meses` }))} /><Button variant="outline" disabled={!selection.size} onClick={() => exportIds([...selection])}>Baixar previsões</Button></section>
        <details className="evx-panel"><summary>Filtros e condições de análise</summary><div className="evx-view-controls"><Choice label="Disponibilidade de previsão" value={availability} onChange={setAvailability} disabled={capDate !== spec.cutoff} items={[{ value: "all", label: "Todos" }, { value: "finotti", label: "Com referência Finotti" }, { value: "any", label: "Com algum método" }, { value: "none", label: "Sem método calculável" }]} /><Choice label="Tipo" value={type} onChange={setType} items={['all', 'Horizontal', 'Vertical'].map(value => ({ value, label: value === 'all' ? 'Todos os tipos' : value }))} /><Choice label="Cidade" value={city} onChange={setCity} items={['all', ...new Set(universe.areas.map(a => a.city))].map(value => ({ value, label: value === 'all' ? 'Todas as cidades' : value }))} /><Button variant={showSold ? 'secondary' : 'outline'} aria-pressed={showSold} onClick={() => setShowSold(v => !v)}>Incluir esgotados</Button></div><p>Condições podem se sobrepor. Filtros não alteram a seleção de exportação. Métodos e medidas são explorados ao abrir uma curva.</p></details>
        {capDate !== spec.cutoff && inventoryDate === spec.cutoff && <BrainLoadingState variant="field" title={`Conferindo métodos disponíveis: ${Object.keys(capabilities).length}/${inventory.length}`} description="A lista já pode ser explorada; o filtro de disponibilidade será liberado após conferir o universo inteiro." />}<details className="evx-sold"><summary>{inventory.filter(r => r.stock === 0).length} esgotados em {spec.cutoff === 'latest' ? 'seu último período' : inventoryDate || spec.cutoff}, fora da projeção por padrão</summary><ul>{inventory.filter(r => r.stock === 0).map(r => <li key={r.id}>{r.name} · {r.id}</li>)}</ul><p>Esgotados hoje podem voltar à análise quando a data escolhida tinha estoque.</p></details>
        <div className="evx-title-row"><div><p className="evx-eyebrow">02 · Curvas</p><h2>{filtered.length} empreendimentos no recorte</h2></div><div className="evx-actions"><Button variant="ghost" disabled={capDate !== spec.cutoff || selectBusy} onClick={() => void selectFinotti()}>Marcar todos os Finotti</Button></div></div>
        {progress && !loading && <p role="status" className="evx-muted">{progress}</p>}
        {inventoryDate !== spec.cutoff && <BrainLoadingState variant="field" title="Classificando empreendimentos na data escolhida" />}
        <section className="evx-list" aria-label="Empreendimentos e curvas" aria-busy={inventoryDate !== spec.cutoff}>
          {visible.map(r => { const a = results[r.id], ready = current(a), p = ready ? present(a) : null, b = universe.buildings.find(b => buildingId(b) === r.id)!; return <article key={r.id} className={`evx-forecast-row ${selection.has(r.id) ? 'evx-selected' : ''}`}><button className="evx-open-row" ref={el => { if (el) rowButtons.current.set(r.id, el); else rowButtons.current.delete(r.id); }} onClick={() => toggle(r.id)} aria-label={`Selecionar ${r.name}`} aria-pressed={selection.has(r.id)}><div className="evx-row-title"><h3>{r.name}</h3><p>{universe.locations[r.id]?.city} · {r.type} · {r.pattern ?? 'Padrão ausente'}</p><small>{selection.has(r.id) ? 'Selecionado / ' : ''}{p?.method ? methodLabel(p.method) : p?.status ?? 'Preparando curva'} · ID {r.id} / dados até {r.cutoff}</small></div><div className="evx-mini-wrap">{ready ? <ForecastChart compact percent units={r.units} rows={chartRows(b, a, 'sold')} cutoff={a.spec.cutoff} methods={p?.method ? [p.method] : []} label={`Curva de vendas de ${r.name}`} /> : <BrainLoadingState variant="field" title="Calculando curva" />}</div><div className="evx-row-numbers"><span>Unidades vendidas<strong>{r.sold ?? '—'}</strong></span><span>Vendas previstas<strong>{p?.method ? (() => { const points = a.stock.cases[0].methods[p.method!].forecast?.points; const stock = points?.at(-1)?.stock; return stock !== null && stock !== undefined && r.stock !== null ? (r.stock - stock).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'; })() : '—'}</strong></span><small>{spec.duration} meses</small></div></button><Button variant="outline" onClick={() => setFocused(r.id)} aria-label={`Explorar curva de ${r.name}`}>Explorar curva</Button></article>; })}
          {!filtered.length && capDate === spec.cutoff && <p role="status">Nenhum empreendimento corresponde aos filtros. Revise as condições ou inclua os esgotados.</p>}
        </section>
        <div className="evx-actions"><Button variant="outline" disabled={page === 0} onClick={() => setPage(v => v - 1)}>Página anterior</Button><span>{page + 1}/{Math.max(1, Math.ceil(filtered.length / 15))}</span><Button variant="outline" disabled={(page + 1) * 15 >= filtered.length} onClick={() => setPage(v => v + 1)}>Próxima página</Button></div>
      </>}
      {selection.size > 0 && <section className="evx-selection" aria-label="Seleção para exportação"><strong>{selection.size} selecionados · {[...selection].filter(id => !filtered.some(r => r.id === id)).length} fora do filtro atual</strong><div className="evx-actions"><Button variant="outline" onClick={() => setPortfolio([...selection])}>Comparar seleção</Button><Button onClick={() => exportIds([...selection])}>Baixar previsões</Button><Button variant="ghost" onClick={() => setSelection(new Set())}>Limpar seleção</Button></div></section>}
    </>}
    {universe && runtime && focused && <ForecastExplorer key={focused} universe={universe} runtime={runtime} id={focused} navigation={filtered.map(r => r.id)} initialSpec={buildingSpec(universe, focused, spec)} onClose={closeDetail} onNavigate={setFocused} onExport={exportIds} />}
    {runtime && portfolio && <PortfolioExplorer universe={universe!} ids={portfolio} runtime={runtime} spec={spec} onClose={() => setPortfolio(null)} onExport={() => exportIds(portfolio)} />}
    {universe && runtime && exportRequest && <ExportReview universe={universe} runtime={runtime} ids={exportRequest.ids} spec={exportRequest.spec} onClose={() => setExportRequest(null)} />}
    {dataOpen && universe && <Dialog open onOpenChange={setDataOpen}><DialogContent className="evx-export"><DialogTitle>Dados e metodologia</DialogTitle><DialogDescription>Consulta completa e rastreável; origem histórica e periodicidade oficial ainda não confirmadas na API.</DialogDescription><p>{universe.buildings.length} empreendimentos · {universe.requests.reduce((s, r) => s + r.pages, 0)} páginas · {universe.fetchedAt}</p><p>Fonte: API Geobrain autenticada. A flag atual do cadastro não comprova origem dos períodos anteriores. Snapshot: {universe.hash}.</p><p>A referência Finotti foi treinada até setembro de 2026; períodos anteriores ficam bloqueados para esse teste. Estoque constante e ritmo recente são referências exploratórias.</p><DataVerification source={source} fetchedAt={universe.fetchedAt} /></DialogContent></Dialog>}
  </main></>;
}
