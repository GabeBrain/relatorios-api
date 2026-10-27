import { WorkbenchLoading } from './expanded/WorkbenchLoading';
import { prepareComparison } from './expanded/pipeline';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { GeoApiScopeSelector, useGeoApiScope, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { buildingId, readHorizontalHistory, type Building, type ReadResult, type SourceType } from './source';
import { downloadCsv, downloadJson } from './export';
import { monthIndex, normalizeOrigin, periodValid, type Origin, type OriginResult } from './expanded/contract';
import { forecast, MODELS, portfolio, type Forecast, type ForecastResult, type ModelId, type FitArtifact } from './expanded/models';
import { metrics, retrospective, type Trial } from './expanded/evaluation';
import { ForecastChart, type PlotRow } from './expanded/ForecastChart';
import { SupportPanels } from './expanded/SupportPanels';
import './expanded/workbench.css';
function Choice({ label, value, onChange, items }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    items: {
        value: string;
        label: string;
    }[];
}) { return <label className="grid gap-2 text-sm font-medium">{label}<Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{items.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent></Select></label>; }
const fmt = (v: number | null | undefined) => v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
function plot(f: Forecast, b: Building | undefined, percent: boolean, ageAxis: boolean, actual: boolean): PlotRow[] {
    const scale = (v: number | null) => v === null ? null : percent ? 100 * v / f.origin.units : v;
    const history = f.origin.history.slice(-12).map(r => ({ x: ageAxis ? f.origin.age === null ? '?' : f.origin.age - (monthIndex(f.origin.cutoff) - monthIndex(r.period)) : r.period, history: r.units === f.origin.units && r.stock !== null && r.stock >= 0 && r.stock <= r.units ? scale(r.units - r.stock) : null }));
    const future = f.points.map(p => ({ x: ageAxis ? p.age ?? `+${p.offset}` : p.period, predicted: scale(p.predicted), sourceWide: p.sourceWide?.map(v => scale(v)!), sourceCentral: p.sourceCentral?.map(v => scale(v)!), history: p.offset === 0 ? scale(f.origin.sold) : null, actual: actual && b ? (() => { const next = normalizeOrigin(b, p.period).origin; return next && next.units === f.origin.units ? scale(next.sold) : null; })() : null }));
    return [...history.filter(r => r.x !== future[0]?.x), ...future];
}
function Scenario({ cutoff }: {
    cutoff: string;
}) {
    const [v, setV] = useState({ units: 300, sold: 150, age: 6, k: .63 });
    const origin: Origin = { id: 'manual', name: 'Cenário informado', cutoff: cutoff || '2026-09', segment: 'unknown', age: v.age, units: v.units, sold: v.sold, stock: v.units - v.sold, history: [], measurement: 'unknown', provenance: 'unknown', warnings: ['Parâmetros informados; sem calibração ou probabilidade associada.'] };
    const result = forecast(origin, 'absorption', 24, { version: 'manual-k-v1', model: 'absorption', segment: 'unknown', trainedThrough: origin.cutoff, trainingIds: [], k: v.k, scope: 'manual', provenance: 'unknown' });
    return <details className="ev-panel"><summary className="cursor-pointer font-medium">Criar cenário com parâmetros informados</summary><p className="ev-note my-4">Pode representar horizontal, vertical ou comercial. Estes valores são hipóteses suas; não substituem dados da API.</p><div className="ev-controls">{(['units', 'sold', 'age', 'k'] as const).map(key => <label key={key}>{{ units: 'Unidades', sold: 'Vendidas', age: 'Meses no mercado', k: 'Forma k' }[key]}<Input type="number" step={key === 'k' ? .01 : 1} value={v[key]} onChange={e => setV({ ...v, [key]: Number(e.target.value) })}/></label>)}</div>{result.forecast ? <ForecastChart rows={result.forecast.points.map(p => ({ x: p.period, predicted: p.predicted }))}/> : <p role="alert">{result.reason}</p>}</details>;
}
export { default } from './operational/OperationalPage';
export function EstimativasExploration() {
    const [geo, setGeo] = useState<GeoScope>({ uf: '', city: '' });
    const scope = useGeoApiScope({ value: geo, onChange: setGeo });
    const [type, setType] = useState<SourceType>('Horizontal'), [data, setData] = useState<ReadResult | null>(null), [cutoff, setCutoff] = useState('');
    const [selected, setSelected] = useState<string[]>([]), [search, setSearch] = useState(''), [eligibleOnly, setEligibleOnly] = useState(false);
    const [model, setModel] = useState<ModelId>('auto'), [monthly] = useState(false), [horizon, setHorizon] = useState(24);
    const [busy, setBusy] = useState(false), [started, setStarted] = useState<number | null>(null), [progress, setProgress] = useState(''), [error, setError] = useState('');
    const revision = 0;
    const [editScope, setEditScope] = useState(false);
    const [cache, setCache] = useState<Map<string, Map<ModelId, ForecastResult>>>(new Map());
    const [running, setRunning] = useState(false), [page, setPage] = useState(0), [mode, setMode] = useState('grid');
    const [percent, setPercent] = useState(true), [ageAxis, setAgeAxis] = useState(false), [showActual, setShowActual] = useState(false), [highlights, setHighlights] = useState<string[]>([]);
    const [artifacts, setArtifacts] = useState<FitArtifact[]>([]);
    const [trials, setTrials] = useState<Trial[]>([]), [evaluating, setEvaluating] = useState(false), [trialKey, setTrialKey] = useState('');
    const request = useRef<AbortController | null>(null), calculation = useRef<AbortController | null>(null), evaluation = useRef<AbortController | null>(null);
    const chartGrid = useRef<HTMLDivElement | null>(null), presented = useRef('');
    const measurement = monthly ? 'monthly-confirmed' : 'unknown';
    useEffect(() => { request.current?.abort(); setBusy(false); setData(null); setArtifacts([]); setCutoff(''); setSelected([]); setCache(new Map()); setTrials([]); setPage(0); }, [geo.uf, geo.city, type]);
    useEffect(() => () => { request.current?.abort(); calculation.current?.abort(); evaluation.current?.abort(); }, []);
    const load = async () => { if (!scope.strictReady)
        return; const ctrl = new AbortController(); request.current?.abort(); request.current = ctrl; setBusy(true); setStarted(Date.now()); setError(''); try {
        const next = await readHorizontalHistory(geo.uf, geo.city, ctrl.signal, (p, n) => setProgress(`Página ${p} de ${n}`), type);
        if (!ctrl.signal.aborted) {
            setData(next); setEditScope(false);
            setCutoff(next.buildings.flatMap(b => b.typologies_history.map(r => r.period.slice(0, 7))).sort().at(-1) ?? '');
            setSelected(next.buildings.map(buildingId));
            setTrials([]);
        }
    }
    catch (e) {
        if (!ctrl.signal.aborted)
            setError(e instanceof Error ? e.message : 'Não foi possível consultar.');
    }
    finally {
        if (request.current === ctrl) {
            setBusy(false);
            setStarted(null);
        }
    } };
    const normalized = useMemo(() => (data?.buildings ?? []).map(b => normalizeOrigin(b, cutoff, measurement)), [data, cutoff, measurement]);
    const byId = useMemo(() => new Map(normalized.map(r => [r.id, r])), [normalized]);
    const rawById = useMemo(() => new Map((data?.buildings ?? []).map(b => [buildingId(b), b])), [data]);
    const eligible = useMemo(() => new Set(normalized.filter(r => cache.get(r.id)?.get(model)?.forecast).map(r => r.id)), [normalized, model, cache]);
    const choices = normalized.filter(r => `${r.name} ${r.id}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) && (!eligibleOnly || eligible.has(r.id)));
    useEffect(() => {
        const ctrl = new AbortController(); calculation.current?.abort(); calculation.current = ctrl;
        setCache(new Map()); setRunning(!!data); setPage(0);
        if (!data) return () => ctrl.abort();
        void (async () => {
            const next = await prepareComparison(normalized, horizon, ctrl.signal, n => setProgress(`${n} / ${normalized.length}`), artifacts);
            if (!ctrl.signal.aborted) {setCache(next); setRunning(false);}
        })().catch(e => {if (!ctrl.signal.aborted) {setError(String(e)); setRunning(false);}});
        return () => ctrl.abort();
    }, [data, normalized, horizon, artifacts, revision]);
    const results = useMemo(() => selected.flatMap(id => cache.get(id)?.get(model) ? [cache.get(id)!.get(model)!] : []), [cache, selected, model]);
    useEffect(() => {
        if (!data || running || !cache.size || presented.current === data.fetchedAt) return;
        presented.current = data.fetchedAt;
        const frame = requestAnimationFrame(() => chartGrid.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}));
        return () => cancelAnimationFrame(frame);
    }, [data, cache, running]);
    useEffect(() => setPage(0), [selected, model]);
    const collection = useMemo(() => portfolio(results), [results]);
    const valid = results.filter(r => r.forecast), pageCount = Math.max(1, Math.ceil(results.length / 12));
    const currentKey = JSON.stringify({ cutoff, model, monthly, horizon, selected, artifacts, fetchedAt: data?.fetchedAt });
    const evaluate = async () => { const ctrl = new AbortController(); evaluation.current?.abort(); evaluation.current = ctrl; setEvaluating(true); setTrials([]); const rows: Trial[] = []; try {
        for (const id of selected) {
            if (ctrl.signal.aborted)
                break;
            const b = rawById.get(id);
            if (b)
                rows.push(...retrospective([b], [cutoff], [model], [1, 3, 6, 12, 24].filter(h => h <= horizon), measurement, 'unknown', artifacts));
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (!ctrl.signal.aborted) {
            setTrials(rows);
            setTrialKey(currentKey);
        }
    }
    finally {
        if (evaluation.current === ctrl)
            setEvaluating(false);
    } };
    const summary = metrics(trials), staleTrials = trialKey !== currentKey;
    const exports = results.flatMap<Record<string, unknown>>(r => r.forecast ? r.forecast.points.map(p => ({ id: r.id, name: r.name, model: r.forecast!.model, version: r.forecast!.version, cutoff, provenance: r.forecast!.origin.provenance, units: r.forecast!.origin.units, ...p, bandStatus: r.forecast!.points.some(p => p.sourceWide) ? 'source-reference-not-locally-calibrated' : 'not-calibrated' })) : [{ id: r.id, name: r.name, model, reason: r.reason }]);
    const changeSelection = (ids: string[]) => { setSelected([...new Set(ids)]); setHighlights([]); };
    const cancelWork = () => {request.current?.abort(); calculation.current?.abort();setBusy(false);setRunning(false);setError('Operação cancelada. Consulte novamente para preparar os gráficos.');};
    const chooseType = (v: string) => setType(v as SourceType);
    return <main className={`ev-workbench ${data ? 'ev-has-data' : ''}`}><header className="border-b pb-7"><p className="ev-overline">Rebrain · laboratório de mercado</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Estimativas de vendas</h1><p className="mt-4 max-w-3xl text-muted-foreground">Transformar o histórico de um empreendimento em uma projeção de vendas compreensível, verificável e pronta para revisão.</p><p className="ev-note mt-3">Em implementação · resultados exploratórios, com dados reportados pelo Geobrain.</p></header>
    <section className={`ev-panel ${data && !editScope ? 'ev-scope-compact' : 'space-y-5'}`} aria-label="Recorte de dados">{data && <div className="ev-toolbar justify-between"><div><span className="ev-overline">{geo.city} · {geo.uf} · {type}</span><p className="ev-note">Consulta completa · {data.pages} páginas</p></div><Button variant="outline" onClick={() => setEditScope(v => !v)}>{editScope ? 'Fechar filtros' : 'Alterar consulta'}</Button></div>}<div hidden={!!data && !editScope}><GeoApiScopeSelector value={geo} onChange={setGeo} disabled={busy}/><div className="ev-controls"><Choice label="Tipo na API" value={type} onChange={chooseType} items={[{ value: 'Horizontal', label: 'Horizontal' }, { value: 'Vertical', label: 'Vertical' }]}/></div><div className="ev-toolbar"><Button disabled={!scope.strictReady || busy} onClick={() => void load()}>Consultar empreendimentos</Button>{busy && <Button variant="outline" onClick={() => { request.current?.abort(); setBusy(false); }}>Cancelar consulta</Button>}<p className="ev-note">{data ? `${data.buildings.length} empreendimentos · ${data.pages} páginas · consulta ${new Date(data.fetchedAt).toLocaleString('pt-BR')}` : 'Selecione uma cidade autorizada para consultar.'}</p></div></div>{busy && <WorkbenchLoading title="Consultando Geobrain" description={progress} startedAt={started} onCancel={cancelWork}/>}<Dialog><DialogTrigger asChild><Button variant="ghost">Como as curvas são calculadas</Button></DialogTrigger><DialogContent className="ev-modal"><DialogTitle>Do histórico à previsão</DialogTitle><DialogDescription>Três leituras para comparar, sem escolher um modelo antes de consultar.</DialogDescription><div className="ev-method-grid"><article><h3>1. O ponto de partida</h3><p>O estoque informado define quanto foi vendido até a data escolhida. A idade conta desde o lançamento.</p></article><article><h3>2. A curva adequada</h3><p>Horizontais usam a equação e a cauda do Finotti. Verticais usam empreendimentos comparáveis da referência. Fora do suporte, mostramos o ritmo recente de estoque quando disponível, com o método identificado.</p></article><article><h3>3. A sombra</h3><p>As faixas vêm do material do Finotti; representam dispersão da referência, sem garantia de precisão nesta cidade. O ritmo recente não tem faixa calibrada.</p></article><article><h3>Dados até</h3><p>É a data em que a previsão começa. Escolher um mês anterior permite comparar uma decisão histórica com o estoque publicado depois. Valores da API podem conter estimativas.</p></article></div></DialogContent></Dialog>{error && <p role="alert">{error}</p>}</section>
    {data && <><section className="ev-selection"><div className="ev-toolbar justify-between"><div><p className="ev-overline">Sua seleção</p><h2 className="mt-2 text-xl font-semibold">{selected.length} empreendimentos · {valid.length} com previsão</h2></div><Dialog><DialogTrigger asChild><Button variant="outline">Escolher empreendimentos</Button></DialogTrigger><DialogContent className="ev-modal"><DialogTitle>Escolher empreendimentos</DialogTitle><DialogDescription>A seleção vale para a carteira inteira. A grade mostra até 12 gráficos por página.</DialogDescription><label className="text-sm">Buscar nome ou ID<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar nome ou ID"/></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={eligibleOnly} onChange={e => setEligibleOnly(e.target.checked)}/>Somente com previsão neste modelo ({eligible.size})</label><div className="ev-toolbar"><Button variant="outline" onClick={() => changeSelection([...selected, ...choices.map(r => r.id)])}>Selecionar {choices.length} resultados</Button><Button variant="ghost" onClick={() => changeSelection([])}>Limpar seleção</Button><span className="ev-note">{choices.length} de {normalized.length} cadastros · {selected.length} selecionados</span></div><div className="max-h-[50dvh] overflow-y-auto">{choices.map(r => <label key={r.id} className="flex gap-3 border-b py-3 text-sm"><input type="checkbox" checked={selected.includes(r.id)} onChange={e => changeSelection(e.target.checked ? [...selected, r.id] : selected.filter(id => id !== r.id))}/><span>{r.name} · {r.id}<span className="ev-note block">{eligible.has(r.id) ? 'Previsão disponível' : cache.get(r.id)?.get(model)?.reason ?? r.reason}</span></span></label>)}</div></DialogContent></Dialog></div></section>
    <section className="space-y-6" aria-label="Bancada de comparação"><div className="ev-model-tabs" role="group" aria-label="Comparar modelos">{(['auto','finotti-reference','stock-trend','constant'] as ModelId[]).map(id => <Button key={id} variant={model === id ? 'default' : 'outline'} aria-pressed={model === id} onClick={() => setModel(id)}>{MODELS.find(m => m.id === id)?.label}</Button>)}<Dialog><DialogTrigger asChild><Button variant="ghost">Outros modelos</Button></DialogTrigger><DialogContent className="ev-modal"><DialogTitle>Modelos do laboratório</DialogTitle><DialogDescription>Já calculados nesta consulta. Métodos sem dados ou parâmetros suficientes mantêm o histórico e explicam a condição.</DialogDescription><div className="ev-method-grid">{MODELS.filter(m => !['auto','finotti-reference','stock-trend','constant'].includes(m.id)).map(m => <article key={m.id}><h3>{m.label}</h3><p>{normalized.filter(r => cache.get(r.id)?.get(m.id)?.forecast).length} empreendimentos com suporte neste corte.</p><Button className="mt-3" variant="outline" onClick={() => setModel(m.id)}>Usar {m.label}</Button></article>)}</div></DialogContent></Dialog></div><div className="ev-controls ev-analysis-options"><label className="grid gap-2 text-sm font-medium">Dados até<Input type="month" value={cutoff} onChange={e => setCutoff(e.target.value)}/><span className="ev-note">A previsão começa neste mês.</span></label><Choice label="Horizonte" value={String(horizon)} onChange={v => setHorizon(Number(v))} items={[6,12,24,36].map(n => ({value:String(n),label:`${n} meses`}))}/></div><div className="ev-controls ev-view-options"><div className="ev-model-tabs" role="group" aria-label="Visualização">{[{id:'grid',name:'Empreendimentos'},{id:'overlay',name:'Sobrepor'},{id:'portfolio',name:'Carteira'},{id:'table',name:'Tabela'}].map(view => <Button key={view.id} variant={mode === view.id ? 'default' : 'outline'} aria-pressed={mode === view.id} onClick={() => setMode(view.id)}>{view.name}</Button>)}</div><div className="ev-model-tabs" role="group" aria-label="Medida"><Button variant={percent ? 'default' : 'outline'} aria-pressed={percent} onClick={() => setPercent(true)}>Percentual</Button><Button variant={!percent ? 'default' : 'outline'} aria-pressed={!percent} onClick={() => setPercent(false)}>Unidades</Button></div><Choice label="Eixo de comparação" value={ageAxis ? 'age' : 'calendar'} onChange={v => setAgeAxis(v === 'age')} items={[{ value: 'calendar', label: 'Calendário' }, { value: 'age', label: 'Idade confirmada' }]}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showActual} onChange={e => setShowActual(e.target.checked)}/>Mostrar posterior reportado</label></div><p className="ev-note">{MODELS.find(m => m.id === model)?.label} · origem {cutoff} · {results.length - valid.length} sem suporte para este modelo. Sombras da referência aparecem quando disponíveis; sem calibração nesta cidade. Posterior reportado pode conter estimativas.</p>{running && <WorkbenchLoading title="Preparando as curvas" description={progress} onCancel={cancelWork}/>}{!selected.length && <div className="ev-panel ev-empty"><h2 className="text-2xl font-semibold">Monte sua comparação</h2><p className="ev-note">Escolha vários empreendimentos para ver as curvas lado a lado.</p></div>}
    {mode === 'grid' && <><div className="ev-grid" ref={chartGrid}>{results.slice(page * 12, page * 12 + 12).map(r => <article key={r.id} className="ev-panel" data-testid="forecast-card"><p className="ev-overline">{r.forecast?.origin.segment ?? 'Cadastro'} · {r.id}</p><h3 className="ev-card-title mt-2 text-xl font-semibold">{r.name}</h3><p className="ev-note mt-2">{r.forecast ? `${fmt(r.forecast.origin.sold)} / ${fmt(r.forecast.origin.units)} vendidas · ${r.forecast.origin.age === null ? 'idade não confirmada' : `mês ${r.forecast.origin.age}`}` : r.reason}</p><ForecastChart percent={percent} cut={ageAxis ? r.forecast?.origin.age ?? undefined : cutoff} rows={r.forecast ? plot(r.forecast, rawById.get(r.id), percent, ageAxis, showActual) : historyPlot(rawById.get(r.id), cutoff, percent)}/><p className="ev-note">{r.forecast ? MODELS.find(m => m.id === r.forecast?.model)?.label : 'Histórico reportado · previsão indisponível neste corte'}</p><Detail comparisons={cache.get(r.id)} result={r} normalized={byId.get(r.id)} building={rawById.get(r.id)} cutoff={cutoff} percent={percent} actual={showActual}/></article>)}</div>{results.length > 12 && <div className="ev-toolbar justify-center"><Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>Página {page + 1} de {pageCount} · {results.length} selecionados</span><Button variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>}</>}
    {mode === 'portfolio' && <div className="ev-panel"><h2 className="text-2xl font-semibold">Carteira · {valid.length} de {selected.length} membros avaliáveis</h2><p className="ev-note my-3">Soma individual em unidades; membros sem previsão excluídos explicitamente. Nenhuma faixa agregada é inferida pela soma de limites individuais. Eixo calendário.</p><ForecastChart large percent={percent} rows={collection.map(p => ({ x: p.period, predicted: p.predicted === null ? null : percent ? 100 * p.predicted / p.units : p.predicted }))}/><ul className="ev-note">{results.filter(r => !r.forecast).map(r => <li key={r.id}>{r.name}: {r.reason}</li>)}</ul></div>}
    {mode === 'overlay' && <div className="ev-panel"><h2 className="text-xl font-semibold">Destaque até cinco empreendimentos</h2><div className="ev-toolbar my-4">{valid.map(r => <label key={r.id} className="flex gap-2 text-sm"><input type="checkbox" checked={highlights.includes(r.id)} disabled={highlights.length >= 5 && !highlights.includes(r.id)} onChange={e => setHighlights(e.target.checked ? [...highlights, r.id] : highlights.filter(id => id !== r.id))}/>{r.name}</label>)}</div><Overlay results={valid.filter(r => highlights.includes(r.id) && (!ageAxis || r.forecast?.origin.age !== null))} percent={percent} ageAxis={ageAxis}/></div>}
    {mode === 'table' && <div className="ev-panel"><ResultTable results={results}/></div>}
    <div className="ev-toolbar"><Button variant="outline" disabled={!results.length || running} onClick={() => downloadJson('estimativas-dossie.json', { scope: geo, type, cutoff, model, measurement, horizon, fetchedAt: data.fetchedAt, selected, artifacts, results, portfolio: collection, trials: staleTrials ? [] : trials, bandStatus: 'not-calibrated', provenance: 'unknown' })}>Exportar dossiê JSON</Button><Button variant="outline" disabled={!results.length || running} onClick={() => downloadCsv('estimativas-todos-membros.csv', exports)}>Exportar todos os membros CSV</Button></div>
    </section><section className="ev-panel space-y-4"><h2 className="text-2xl font-semibold">Retrospectiva no corte escolhido</h2><p className="ev-note">Compara a previsão congelada com o estoque reportado nas competências posteriores. Oferta revisada ou ausência no alvo não vira zero. A origem mensal é desconhecida: resultado exploratório, sem alegação de venda comprovada.</p><div className="ev-toolbar"><Button variant="outline" disabled={!selected.length || evaluating || running} onClick={() => void evaluate()}>Executar retrospectiva</Button>{evaluating && <Button variant="outline" onClick={() => evaluation.current?.abort()}>Cancelar retrospectiva</Button>}</div>{evaluating && <BrainLoadingState variant="operation" title="Comparando cortes históricos"/>}{trials.length > 0 && (staleTrials ? <p role="status">Seleção ou parâmetros mudaram. Execute novamente para atualizar a retrospectiva.</p> : <><p>{summary.evaluated}/{summary.attempted} alvos comparáveis · {summary.buildings} empreendimentos · erro médio {fmt(summary.maeUnits)} unidades · mediana {fmt(summary.medianPp)} pontos percentuais.</p><div className="ev-table"><table><thead><tr>{['Empreendimento', 'Alvo', 'Previsto', 'Reportado', 'Erro (pp)', 'Condição'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{trials.map(t => <tr key={`${t.id}-${t.horizon}`}><td>{t.id}</td><td>{t.target}</td><td>{fmt(t.predicted)}</td><td>{fmt(t.actual)}</td><td>{fmt(t.absolutePp)}</td><td>{t.reason}</td></tr>)}</tbody></table></div><Button variant="outline" onClick={() => downloadCsv('retrospectiva.csv', trials)}>Exportar retrospectiva</Button></>)}</section></>}
    <Dialog><DialogTrigger asChild><Button variant="ghost">Experimentos independentes</Button></DialogTrigger><DialogContent className="ev-modal"><DialogTitle>Carregar parâmetros de um experimento independente</DialogTitle><DialogDescription>Área técnica para modelos calibrados separadamente.</DialogDescription><p className="ev-note my-3">JSON gerado pelo dossiê local, com escopo, versão, IDs de treino e data limite. Dados sintéticos não podem calibrar a API real.</p><Input aria-label="Artefatos de modelos" type="file" accept=".json" onChange={e => { const file = e.target.files?.[0]; if (!file)
        return; void file.text().then(text => { const parsed: unknown = JSON.parse(text); if (!Array.isArray(parsed) || parsed.some((a: FitArtifact) => !a || !['absorption', 'cohort'].includes(a.model) || !Array.isArray(a.trainingIds) || a.trainingIds.some(id => typeof id !== 'string') || !a.version || !periodValid(a.trainedThrough) || a.scope !== `${geo.uf}/${geo.city}/${type}` || a.provenance === 'synthetic' || (a.model === 'absorption' && !(Number.isFinite(a.k) && a.k! > 0)) || (a.model === 'cohort' && !(Number.isFinite(a.monthlyFraction) && Math.abs(a.monthlyFraction!) <= 1))))
        throw new Error('Artefato incompatível com o escopo ou parâmetros inválidos.'); setArtifacts(parsed); }).catch(err => setError(String(err))); }}/><p className="ev-note">{artifacts.length} artefatos carregados. Nenhum ajuste automático na seleção.</p></DialogContent></Dialog><Scenario cutoff={cutoff}/><SupportPanels key={`${geo.city}-${type}`} data={data} city={geo.city} type={type}/>
  </main>;
}
function ResultTable({ results }: {
    results: ForecastResult[];
}) { return <div className="ev-table"><table><thead><tr>{['ID / nome', 'Competência', 'Modelo', 'Acumulado (un.)', 'Estoque', 'Condição'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{results.flatMap(r => r.forecast ? r.forecast.points.map(p => <tr key={`${r.id}-${p.period}`}><td>{r.id} · {r.name}</td><td>{p.period}</td><td>{r.forecast!.model}</td><td>{fmt(p.predicted)}</td><td>{fmt(p.stock)}</td><td>{p.boundary ? 'Limite físico aplicado' : p.predicted === null ? 'Fora do suporte' : 'Previsão experimental'}</td></tr>) : [<tr key={r.id}><td>{r.id} · {r.name}</td><td colSpan={5}>{r.reason}</td></tr>])}</tbody></table></div>; }
function Detail({ result, normalized, building, cutoff, percent, actual, comparisons }: {
    comparisons?: Map<ModelId, ForecastResult>;
    result: ForecastResult;
    normalized?: OriginResult;
    building?: Building;
    cutoff: string;
    percent: boolean;
    actual: boolean;
}) { return <Dialog><DialogTrigger asChild><Button variant="outline" aria-label={`Ver detalhe · ${result.name}`}>Ver detalhe</Button></DialogTrigger><DialogContent className="ev-modal"><DialogTitle>{result.name}</DialogTitle><DialogDescription>ID {result.id} · dados até {cutoff} · análise exploratória</DialogDescription>{result.forecast ? <><ForecastChart large percent={percent} cut={cutoff} rows={plot(result.forecast, building, percent, false, actual)}/><section className="ev-method-grid"><article><h3>Como ler</h3><p>A linha parte do estoque reportado no corte. As sombras mostram dispersão do material de referência; não são precisão comprovada neste mercado.</p></article><article><h3>Condições deste cenário</h3><ul className="ev-note">{result.forecast.warnings.map(w => <li key={w}>{w}</li>)}</ul></article></section><h3 className="text-xl font-semibold">Comparar métodos neste empreendimento</h3><ModelComparison comparisons={comparisons} percent={percent}/><ResultTable results={[result]}/></> : <><ForecastChart large percent={percent} rows={historyPlot(building,cutoff,percent)}/><p>{normalized?.reason ?? result.reason}</p></>}<Scenario cutoff={cutoff}/></DialogContent></Dialog>; }
function Overlay({ results, percent, ageAxis }: {
    results: ForecastResult[];
    percent: boolean;
    ageAxis: boolean;
}) {
    const rows = new Map<string | number, PlotRow>();
    for (const r of results)
        for (const p of r.forecast!.points) {
            const x = ageAxis ? p.age ?? `+${p.offset}` : p.period;
            const row = rows.get(x) ?? { x };
            row[r.id] = p.predicted === null ? null : percent ? 100 * p.predicted / r.forecast!.origin.units : p.predicted;
            rows.set(x, row);
        }
    return <><p className="ev-note">{ageAxis ? 'Idade confirmada; casos sem idade usam deslocamento +mês.' : 'Calendário.'} Casos sem idade confirmada ficam fora da sobreposição por idade. Comparação em {percent ? 'percentual' : 'unidades, eixo comum'}.</p><ForecastChart large percent={percent} rows={[...rows.values()].sort((a, b) => typeof a.x === 'number' && typeof b.x === 'number' ? a.x - b.x : String(a.x).localeCompare(String(b.x)))} series={results.map(r => ({ key: r.id, name: r.name }))}/></>;
}

function historyPlot(building: Building | undefined, cutoff: string, percent: boolean): PlotRow[] {
    const grouped = new Map<string, {units:number; stock:number; valid:boolean}>();
    for (const row of building?.typologies_history ?? []) {
        const period = row.period.slice(0,7); if (period > cutoff) continue;
        const item = grouped.get(period) ?? {units:0,stock:0,valid:true};
        if (row.qty === null || row.typology_stock === null || row.qty <= 0 || row.typology_stock < 0 || row.typology_stock > row.qty) item.valid=false;
        else {item.units += Number(row.qty); item.stock += Number(row.typology_stock);}
        grouped.set(period,item);
    }
    return [...grouped].sort(([a],[b]) => a.localeCompare(b)).map(([x,r]) => ({x,history:r.valid && r.units ? (r.units-r.stock)*(percent ? 100/r.units : 1) : null}));
}
function ModelComparison({comparisons, percent}: {comparisons?: Map<ModelId,ForecastResult>; percent:boolean}) {
    const rows = new Map<string,PlotRow>(); const series: {key:string;name:string}[]=[];
    for (const id of ['finotti-reference','stock-trend','constant'] as ModelId[]) {
        const f = comparisons?.get(id)?.forecast; if (!f) continue;
        series.push({key:id,name:MODELS.find(m => m.id === id)!.label});
        for (const p of f.points) {const r=rows.get(p.period) ?? {x:p.period};r[id]=p.predicted === null ? null : p.predicted*(percent ? 100/f.origin.units : 1);rows.set(p.period,r);}
    }
    return <ForecastChart large percent={percent} rows={[...rows.values()]} series={series}/>;
}
