import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { GeoApiScopeSelector, useGeoApiScope, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { buildingId, readHorizontalHistory, type Building, type ReadResult, type SourceType } from './source';
import { downloadCsv, downloadJson } from './export';
import { normalizeOrigin, periodValid, type Origin, type OriginResult } from './expanded/contract';
import { forecast, forecastBatch, MODELS, portfolio, type Forecast, type ForecastResult, type ModelId, type FitArtifact } from './expanded/models';
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
    const history = f.origin.history.slice(-12).map(r => ({ x: ageAxis ? f.origin.age === null ? '?' : f.origin.age - (f.origin.history.length - 1 - f.origin.history.indexOf(r)) : r.period, history: r.units === f.origin.units && r.stock !== null && r.stock >= 0 && r.stock <= r.units ? scale(r.units - r.stock) : null }));
    const future = f.points.map(p => ({ x: ageAxis ? p.age ?? `+${p.offset}` : p.period, predicted: scale(p.predicted), history: p.offset === 0 ? scale(f.origin.sold) : null, actual: actual && b ? (() => { const next = normalizeOrigin(b, p.period).origin; return next && next.units === f.origin.units ? scale(next.sold) : null; })() : null }));
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
export default function EstimativasPage() {
    const [geo, setGeo] = useState<GeoScope>({ uf: '', city: '' });
    const scope = useGeoApiScope({ value: geo, onChange: setGeo });
    const [type, setType] = useState<SourceType>('Horizontal'), [data, setData] = useState<ReadResult | null>(null), [cutoff, setCutoff] = useState('');
    const [selected, setSelected] = useState<string[]>([]), [search, setSearch] = useState(''), [eligibleOnly, setEligibleOnly] = useState(false);
    const [model, setModel] = useState<ModelId>('finotti'), [monthly, setMonthly] = useState(false), [horizon, setHorizon] = useState(24);
    const [busy, setBusy] = useState(false), [started, setStarted] = useState<number | null>(null), [progress, setProgress] = useState(''), [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const [results, setResults] = useState<ForecastResult[]>([]), [running, setRunning] = useState(false), [page, setPage] = useState(0), [mode, setMode] = useState('grid');
    const [percent, setPercent] = useState(true), [ageAxis, setAgeAxis] = useState(false), [showActual, setShowActual] = useState(false), [highlights, setHighlights] = useState<string[]>([]);
    const [artifacts, setArtifacts] = useState<FitArtifact[]>([]);
    const [trials, setTrials] = useState<Trial[]>([]), [evaluating, setEvaluating] = useState(false), [trialKey, setTrialKey] = useState('');
    const request = useRef<AbortController | null>(null), calculation = useRef<AbortController | null>(null), evaluation = useRef<AbortController | null>(null);
    const measurement = monthly ? 'monthly-confirmed' : 'unknown';
    useEffect(() => { request.current?.abort(); setBusy(false); setData(null); setArtifacts([]); setCutoff(''); setSelected([]); setResults([]); setTrials([]); setPage(0); }, [geo.uf, geo.city, type]);
    useEffect(() => () => { request.current?.abort(); calculation.current?.abort(); evaluation.current?.abort(); }, []);
    const load = async () => { if (!scope.strictReady)
        return; const ctrl = new AbortController(); request.current?.abort(); request.current = ctrl; setBusy(true); setStarted(Date.now()); setError(''); try {
        const next = await readHorizontalHistory(geo.uf, geo.city, ctrl.signal, (p, n) => setProgress(`Página ${p} de ${n}`), type);
        if (!ctrl.signal.aborted) {
            setData(next);
            setCutoff(next.buildings.flatMap(b => b.typologies_history.map(r => r.period.slice(0, 7))).sort().at(-1) ?? '');
            setSelected([]);
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
    const eligible = useMemo(() => new Set(normalized.filter(r => r.origin && forecast(r.origin, model, horizon, artifacts.find(a => a.model === model && a.segment === r.origin?.segment)).forecast).map(r => r.id)), [normalized, model, horizon, artifacts]);
    const choices = normalized.filter(r => `${r.name} ${r.id}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) && (!eligibleOnly || eligible.has(r.id)));
    useEffect(() => { const ctrl = new AbortController(); calculation.current?.abort(); calculation.current = ctrl; setResults([]); setRunning(selected.length > 0); setProgress('Preparando a seleção'); setPage(0); const origins = selected.flatMap(id => byId.get(id)?.origin ? [byId.get(id)!.origin!] : []); void forecastBatch(origins, model, horizon, ctrl.signal, n => setProgress(`${n} de ${selected.length} empreendimentos`), artifacts).then(next => { if (!ctrl.signal.aborted) {
        const map = new Map(next.map(r => [r.id, r]));
        setResults(selected.map(id => map.get(id) ?? { id, name: byId.get(id)?.name ?? id, forecast: null, reason: byId.get(id)?.reason ?? 'Cadastro indisponível' }));
        setRunning(false);
    } }).catch(e => { if (!ctrl.signal.aborted) {
        setError(String(e));
        setRunning(false);
    } }); return () => ctrl.abort(); }, [selected, byId, model, horizon, artifacts, revision]);
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
    const exports = results.flatMap<Record<string, unknown>>(r => r.forecast ? r.forecast.points.map(p => ({ id: r.id, name: r.name, model: r.forecast!.model, version: r.forecast!.version, cutoff, provenance: r.forecast!.origin.provenance, units: r.forecast!.origin.units, ...p, bandStatus: 'not-calibrated' })) : [{ id: r.id, name: r.name, model, reason: r.reason }]);
    const changeSelection = (ids: string[]) => { setSelected([...new Set(ids)]); setHighlights([]); };
    const chooseType = (v: string) => setType(v as SourceType);
    return <main className="ev-workbench"><header className="border-b pb-7"><p className="ev-overline">Rebrain · laboratório de mercado</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Estimativas de vendas</h1><p className="mt-4 max-w-3xl text-muted-foreground">Compare empreendimentos, explore cenários e acompanhe a carteira. Modelos experimentais; origem observada ou estimada de cada período ainda não comprovada.</p></header>
    <section className="ev-panel space-y-5" aria-label="Recorte de dados"><GeoApiScopeSelector value={geo} onChange={setGeo} disabled={busy}/><div className="ev-controls"><Choice label="Tipo na API" value={type} onChange={chooseType} items={[{ value: 'Horizontal', label: 'Horizontal' }, { value: 'Vertical', label: 'Vertical' }]}/><label className="grid gap-2 text-sm font-medium">Dados até<Input type="month" value={cutoff} onChange={e => setCutoff(e.target.value)}/></label><Choice label="Modelo" value={model} onChange={v => setModel(v as ModelId)} items={MODELS.map(m => ({ value: m.id, label: m.label }))}/><Choice label="Horizonte" value={String(horizon)} onChange={v => setHorizon(Number(v))} items={[6, 12, 24, 36].map(n => ({ value: String(n), label: `${n} meses` }))}/></div><div className="ev-toolbar"><Button disabled={!scope.strictReady || busy} onClick={() => void load()}>Consultar empreendimentos</Button>{busy && <Button variant="outline" onClick={() => { request.current?.abort(); setBusy(false); }}>Cancelar consulta</Button>}<p className="ev-note">{data ? `${data.buildings.length} empreendimentos · ${data.pages} páginas · consulta ${new Date(data.fetchedAt).toLocaleString('pt-BR')}` : 'Selecione uma cidade autorizada para consultar.'}</p></div>{busy && <BrainLoadingState variant="operation" title="Consultando Geobrain" description={progress} startedAt={started}/>}<p className="ev-note">“Dados até” é a origem da previsão. Trocar o mês simula uma decisão anterior. Comercial e mistos aguardam identificação comprovada no contrato da API.</p><details><summary className="text-sm cursor-pointer">Periodicidade e metodologia</summary><label className="flex gap-3 mt-4 text-sm"><input type="checkbox" checked={monthly} onChange={e => setMonthly(e.target.checked)}/>Confirmo que cada venda reportada corresponde a um mês completo neste recorte.</label><p className="ev-note mt-3">Sem essa confirmação, médias e fluxos mensais ficam indisponíveis. Estoque constante é referência sem venda futura; não representa um modelo ajustado. Modelos recalibrados e pares exigem artefato independente; não são ajustados nos dados selecionados. Faixas ainda não estimadas nesta base.</p></details>{error && <p role="alert">{error}</p>}</section>
    {data && <><section className="ev-panel"><div className="ev-toolbar justify-between"><div><p className="ev-overline">Sua seleção</p><h2 className="mt-2 text-xl font-semibold">{selected.length} empreendimentos · {valid.length} com previsão</h2></div><Dialog><DialogTrigger asChild><Button variant="outline">Escolher empreendimentos</Button></DialogTrigger><DialogContent className="ev-modal"><DialogTitle>Escolher empreendimentos</DialogTitle><DialogDescription>A seleção vale para a carteira inteira. A grade mostra até 12 gráficos por página.</DialogDescription><label className="text-sm">Buscar nome ou ID<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar nome ou ID"/></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={eligibleOnly} onChange={e => setEligibleOnly(e.target.checked)}/>Somente com previsão neste modelo ({eligible.size})</label><div className="ev-toolbar"><Button variant="outline" onClick={() => changeSelection([...selected, ...choices.map(r => r.id)])}>Selecionar {choices.length} resultados</Button><Button variant="ghost" onClick={() => changeSelection([])}>Limpar seleção</Button><span className="ev-note">{choices.length} de {normalized.length} cadastros · {selected.length} selecionados</span></div><div className="max-h-[50dvh] overflow-y-auto">{choices.map(r => <label key={r.id} className="flex gap-3 border-b py-3 text-sm"><input type="checkbox" checked={selected.includes(r.id)} onChange={e => changeSelection(e.target.checked ? [...selected, r.id] : selected.filter(id => id !== r.id))}/><span>{r.name} · {r.id}<span className="ev-note block">{eligible.has(r.id) ? 'Previsão disponível' : r.origin ? forecast(r.origin, model, horizon).reason : r.reason}</span></span></label>)}</div></DialogContent></Dialog><Button variant="outline" disabled={!selected.length || running} onClick={() => setRevision(v => v + 1)}>Recalcular seleção</Button><Button variant="ghost" disabled={!selected.length} onClick={() => changeSelection([])}>Limpar</Button></div></section>
    <section className="space-y-6" aria-label="Bancada de comparação"><div className="ev-controls"><Choice label="Visualização" value={mode} onChange={setMode} items={[{ value: 'grid', label: 'Comparar empreendimentos' }, { value: 'overlay', label: 'Sobrepor até 5 curvas' }, { value: 'portfolio', label: 'Carteira agregada' }, { value: 'table', label: 'Tabela completa' }]}/><Choice label="Medida" value={percent ? 'percent' : 'units'} onChange={v => setPercent(v === 'percent')} items={[{ value: 'percent', label: 'Percentual · escala 0–100%' }, { value: 'units', label: 'Unidades · escala própria por gráfico' }]}/><Choice label="Eixo de comparação" value={ageAxis ? 'age' : 'calendar'} onChange={v => setAgeAxis(v === 'age')} items={[{ value: 'calendar', label: 'Calendário' }, { value: 'age', label: 'Idade confirmada' }]}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showActual} onChange={e => setShowActual(e.target.checked)}/>Mostrar posterior reportado</label></div><p className="ev-note">{MODELS.find(m => m.id === model)?.label} · origem {cutoff} · {results.length - valid.length} sem suporte para este modelo. Faixas de 50%/80% ainda não calibradas. Posterior reportado pode conter estimativas.</p>{running && <><BrainLoadingState variant="operation" title="Calculando seleção" description={progress}/><Button variant="outline" onClick={() => { calculation.current?.abort(); setRunning(false); }}>Cancelar cálculo</Button></>}{!selected.length && <div className="ev-panel ev-empty"><h2 className="text-2xl font-semibold">Monte sua comparação</h2><p className="ev-note">Escolha vários empreendimentos para ver as curvas lado a lado.</p></div>}
    {mode === 'grid' && <><div className="ev-grid">{results.slice(page * 12, page * 12 + 12).map(r => <article key={r.id} className="ev-panel" data-testid="forecast-card"><p className="ev-overline">{r.forecast?.origin.segment ?? 'Cadastro'} · {r.id}</p><h3 className="ev-card-title mt-2 text-xl font-semibold">{r.name}</h3><p className="ev-note mt-2">{r.forecast ? `${fmt(r.forecast.origin.sold)} / ${fmt(r.forecast.origin.units)} vendidas · ${r.forecast.origin.age === null ? 'idade não confirmada' : `mês ${r.forecast.origin.age}`}` : r.reason}</p>{r.forecast ? <ForecastChart percent={percent} cut={ageAxis ? r.forecast.origin.age ?? undefined : cutoff} rows={plot(r.forecast, rawById.get(r.id), percent, ageAxis, showActual)}/> : <div className="ev-empty"><p className="ev-note">O cadastro continua na seleção. Abra um cenário com premissas informadas.</p></div>}<Detail result={r} normalized={byId.get(r.id)} building={rawById.get(r.id)} cutoff={cutoff} percent={percent} actual={showActual}/></article>)}</div>{results.length > 12 && <div className="ev-toolbar justify-center"><Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>Página {page + 1} de {pageCount} · {results.length} selecionados</span><Button variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>}</>}
    {mode === 'portfolio' && <div className="ev-panel"><h2 className="text-2xl font-semibold">Carteira · {valid.length} de {selected.length} membros avaliáveis</h2><p className="ev-note my-3">Soma individual em unidades; membros sem previsão excluídos explicitamente. Nenhuma faixa agregada é inferida pela soma de limites individuais. Eixo calendário.</p><ForecastChart large percent={percent} rows={collection.map(p => ({ x: p.period, predicted: p.predicted === null ? null : percent ? 100 * p.predicted / p.units : p.predicted }))}/><ul className="ev-note">{results.filter(r => !r.forecast).map(r => <li key={r.id}>{r.name}: {r.reason}</li>)}</ul></div>}
    {mode === 'overlay' && <div className="ev-panel"><h2 className="text-xl font-semibold">Destaque até cinco empreendimentos</h2><div className="ev-toolbar my-4">{valid.map(r => <label key={r.id} className="flex gap-2 text-sm"><input type="checkbox" checked={highlights.includes(r.id)} disabled={highlights.length >= 5 && !highlights.includes(r.id)} onChange={e => setHighlights(e.target.checked ? [...highlights, r.id] : highlights.filter(id => id !== r.id))}/>{r.name}</label>)}</div><Overlay results={valid.filter(r => highlights.includes(r.id) && (!ageAxis || r.forecast?.origin.age !== null))} percent={percent} ageAxis={ageAxis}/></div>}
    {mode === 'table' && <div className="ev-panel"><ResultTable results={results}/></div>}
    <div className="ev-toolbar"><Button variant="outline" disabled={!results.length || running} onClick={() => downloadJson('estimativas-dossie.json', { scope: geo, type, cutoff, model, measurement, horizon, fetchedAt: data.fetchedAt, selected, artifacts, results, portfolio: collection, trials: staleTrials ? [] : trials, bandStatus: 'not-calibrated', provenance: 'unknown' })}>Exportar dossiê JSON</Button><Button variant="outline" disabled={!results.length || running} onClick={() => downloadCsv('estimativas-todos-membros.csv', exports)}>Exportar todos os membros CSV</Button></div>
    </section><section className="ev-panel space-y-4"><h2 className="text-2xl font-semibold">Retrospectiva no corte escolhido</h2><p className="ev-note">Compara a previsão congelada com o estoque reportado nas competências posteriores. Oferta revisada ou ausência no alvo não vira zero. A origem mensal é desconhecida: resultado exploratório, sem alegação de venda comprovada.</p><div className="ev-toolbar"><Button variant="outline" disabled={!selected.length || evaluating || running} onClick={() => void evaluate()}>Executar retrospectiva</Button>{evaluating && <Button variant="outline" onClick={() => evaluation.current?.abort()}>Cancelar retrospectiva</Button>}</div>{evaluating && <BrainLoadingState variant="operation" title="Comparando cortes históricos"/>}{trials.length > 0 && (staleTrials ? <p role="status">Seleção ou parâmetros mudaram. Execute novamente para atualizar a retrospectiva.</p> : <><p>{summary.evaluated}/{summary.attempted} alvos comparáveis · {summary.buildings} empreendimentos · erro médio {fmt(summary.maeUnits)} unidades · mediana {fmt(summary.medianPp)} pontos percentuais.</p><div className="ev-table"><table><thead><tr>{['Empreendimento', 'Alvo', 'Previsto', 'Reportado', 'Erro (pp)', 'Condição'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{trials.map(t => <tr key={`${t.id}-${t.horizon}`}><td>{t.id}</td><td>{t.target}</td><td>{fmt(t.predicted)}</td><td>{fmt(t.actual)}</td><td>{fmt(t.absolutePp)}</td><td>{t.reason}</td></tr>)}</tbody></table></div><Button variant="outline" onClick={() => downloadCsv('retrospectiva.csv', trials)}>Exportar retrospectiva</Button></>)}</section></>}
    <details className="ev-panel"><summary className="cursor-pointer">Carregar parâmetros de um experimento independente</summary><p className="ev-note my-3">JSON gerado pelo dossiê local, com escopo, versão, IDs de treino e data limite. Dados sintéticos não podem calibrar a API real.</p><Input aria-label="Artefatos de modelos" type="file" accept=".json" onChange={e => { const file = e.target.files?.[0]; if (!file)
        return; void file.text().then(text => { const parsed: unknown = JSON.parse(text); if (!Array.isArray(parsed) || parsed.some((a: FitArtifact) => !a || !['absorption', 'cohort'].includes(a.model) || !Array.isArray(a.trainingIds) || a.trainingIds.some(id => typeof id !== 'string') || !a.version || !periodValid(a.trainedThrough) || a.scope !== `${geo.uf}/${geo.city}/${type}` || a.provenance === 'synthetic' || (a.model === 'absorption' && !(Number.isFinite(a.k) && a.k! > 0)) || (a.model === 'cohort' && !(Number.isFinite(a.monthlyFraction) && Math.abs(a.monthlyFraction!) <= 1))))
        throw new Error('Artefato incompatível com o escopo ou parâmetros inválidos.'); setArtifacts(parsed); }).catch(err => setError(String(err))); }}/><p className="ev-note">{artifacts.length} artefatos carregados. Nenhum ajuste automático na seleção.</p></details><Scenario cutoff={cutoff}/><SupportPanels key={`${geo.city}-${type}`} data={data} city={geo.city} type={type}/>
  </main>;
}
function ResultTable({ results }: {
    results: ForecastResult[];
}) { return <div className="ev-table"><table><thead><tr>{['ID / nome', 'Competência', 'Modelo', 'Acumulado (un.)', 'Estoque', 'Condição'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{results.flatMap(r => r.forecast ? r.forecast.points.map(p => <tr key={`${r.id}-${p.period}`}><td>{r.id} · {r.name}</td><td>{p.period}</td><td>{r.forecast!.model}</td><td>{fmt(p.predicted)}</td><td>{fmt(p.stock)}</td><td>{p.boundary ? 'Limite físico aplicado' : p.predicted === null ? 'Fora do suporte' : 'Previsão experimental'}</td></tr>) : [<tr key={r.id}><td>{r.id} · {r.name}</td><td colSpan={5}>{r.reason}</td></tr>])}</tbody></table></div>; }
function Detail({ result, normalized, building, cutoff, percent, actual }: {
    result: ForecastResult;
    normalized?: OriginResult;
    building?: Building;
    cutoff: string;
    percent: boolean;
    actual: boolean;
}) { return <Dialog><DialogTrigger asChild><Button variant="outline">Ver detalhe · {result.name}</Button></DialogTrigger><DialogContent className="ev-modal"><DialogTitle>{result.name}</DialogTitle><DialogDescription>ID {result.id} · dados até {cutoff} · análise exploratória</DialogDescription>{result.forecast ? <><ForecastChart large percent={percent} cut={cutoff} rows={plot(result.forecast, building, percent, false, actual)}/><details><summary className="cursor-pointer">Como ler e parâmetros</summary><p className="ev-note my-3">Linha de previsão parte do estoque reportado. A linha posterior só compara a série publicada pela fonte. Faixa ainda não estimada; não há probabilidade associada ao cenário.</p><p className="ev-note">{JSON.stringify(result.forecast.parameters)}</p><ul className="ev-note">{result.forecast.warnings.map(w => <li key={w}>{w}</li>)}</ul></details><ResultTable results={[result]}/></> : <p>{normalized?.reason ?? result.reason}</p>}<Scenario cutoff={cutoff}/></DialogContent></Dialog>; }
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
