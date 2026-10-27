import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Download, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { useAuthStore } from '@/store/auth-store';
import { useGeoApiScope } from '@/features/shared/geo-api-scope-engine';
import { buildingId, readHorizontalHistory, type Building, type SourceType } from '../source';
import { WorkbenchLoading } from '../expanded/WorkbenchLoading';
import { DataVerification } from '../operational/DataVerification';
import { downloadCsv } from '../export';
import { METHODS, STUDIES, compactBuilding, defaultProtocol, groupedMetrics, sourcePeriods, studyMetrics, type InventoryRow, type StudyCase, type StudyDataset, type StudyId, type StudyProtocol, type StudyResult, type Target } from './study';
import type { Provenance } from '../expanded/contract';
import { processStudy, snapshotHash } from './client';
import { downloadStudyEvidence } from './evidence';
import { StudyCharts } from './StudyCharts';
import { formatNumber } from './format';
import { StudyDetail } from './StudyDetail';
import { StudyPortfolio } from './StudyPortfolio';
import '../expanded/workbench.css';
import './scientific.css';

const OperationalPage = lazy(() => import('../operational/OperationalPage'));
const originLabels: Record<Provenance, string> = { unknown: 'Histórico reportado · origem não comprovada', observed: 'Coleta confirmada', estimated: 'Resultados também estimados', synthetic: 'Demonstração · dados fictícios' };

function Choice({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: { value: string; label: string }[] }) {
  return <label className="grid gap-2 text-sm">{label}<Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{items.map(i => <SelectItem value={i.value} key={i.value}>{i.label}</SelectItem>)}</SelectContent></Select></label>;
}

export default function ScientificPage() {
  const [mode, setMode] = useState<'science' | 'operation'>('science');
  const [visitedOperation, setVisitedOperation] = useState(false);
  return <>
    <div hidden={mode !== 'science'}><Studies onOperation={() => { setVisitedOperation(true); setMode('operation'); }}/></div>
    {visitedOperation && <div hidden={mode !== 'operation'}><div className="ev-science-return"><Button variant="outline" onClick={() => setMode('science')}><ArrowLeft size={16}/> Voltar aos estudos</Button></div><Suspense fallback={<BrainLoadingState title="Abrindo preparação de lote"/>}><OperationalPage/></Suspense></div>}
  </>;
}

export function Studies({ onOperation }: { onOperation: () => void }) {
  const token = useAuthStore(s => s.getToken());
  const [geo, setGeo] = useState({ uf: 'PR', city: 'Curitiba' });
  const scope = useGeoApiScope({ value: geo, onChange: setGeo });
  const [dataset, setDataset] = useState<StudyDataset | null>(null), [rows, setRows] = useState<InventoryRow[]>([]);
  const [selected, setSelected] = useState<StudyId | null>(null), [protocol, setProtocol] = useState<StudyProtocol | null>(null);
  const [result, setResult] = useState<StudyResult | null>(null), [busy, setBusy] = useState(false), [started, setStarted] = useState<number | null>(null);
  const [progress, setProgress] = useState(''), [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState<'load' | 'run'>('load');
  const [search, setSearch] = useState(''), [page, setPage] = useState(0), [type, setType] = useState('all');
  const [settings, setSettings] = useState(false), [quality, setQuality] = useState(false), [focused, setFocused] = useState<StudyCase | null>(null);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [originFilter, setOriginFilter] = useState<Provenance>('unknown'), [horizon, setHorizon] = useState(3);
  const controller = useRef<AbortController | null>(null), sequence = useRef(0);
  const cache = useRef(new Map<string, StudyResult>());
  const periods = useMemo(() => dataset ? sourcePeriods(dataset.buildings) : [], [dataset]);
  const latest = periods.at(-1) ?? '';
  const allowed = scope.hasToken && !scope.isLoading && !scope.error && !!scope.citiesByUf?.PR?.includes('Curitiba');
  const study = STUDIES.find(s => s.id === selected);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    controller.current?.abort(); sequence.current++; cache.current.clear();
    setDataset(null); setRows([]); setSelected(null); setProtocol(null); setResult(null); setFocused(null); setPortfolioOpen(false); setBusy(false); setError('');
  }, [token]);
  useEffect(() => { setPage(0); }, [search, type, selected, result]);
  function cancel() { controller.current?.abort(); sequence.current++; setBusy(false); setStarted(null); setProgress(''); }
  function operation() {
    cancel(); onOperation();
  }
  async function load() {
    if (!allowed) return;
    const seq = ++sequence.current, ctrl = new AbortController(); controller.current?.abort(); controller.current = ctrl;
    setRetryAction('load'); setBusy(true); setStarted(Date.now()); setError(''); setProgress('Consultando o histórico autorizado de Curitiba');
    try {
      const buildings: Building[] = [], requests: { type: SourceType; pages: number }[] = [];
      // Sequential type queries share a maximum of eight concurrent history requests.
      for (const type of ['Horizontal', 'Vertical'] as SourceType[]) {
        const response = await readHorizontalHistory('PR', 'Curitiba', ctrl.signal, (done, total) => setProgress(`${type} · ${done}/${total} páginas recebidas`), type);
        buildings.push(...response.buildings.map(compactBuilding)); requests.push({ type, pages: response.pages });
      }
      if (new Set(buildings.map(buildingId)).size !== buildings.length) throw new Error('Empreendimentos repetidos entre os tipos. A consulta não foi promovida a estudo.');
      setProgress('Identificando a fonte e organizando as condições de estudo');
      const snapshot = { schema: 'curitiba-study-source-v1', city: 'Curitiba', uf: 'PR', fetchedAt: new Date().toISOString(), requests, buildings };
      const next: StudyDataset = { ...snapshot, hash: await snapshotHash(snapshot) };
      const inventory = await processStudy('inventory', next, ctrl.signal);
      if (ctrl.signal.aborted || seq !== sequence.current) return;
      cache.current.clear(); setDataset(next); setRows(inventory); setSelected(null); setProtocol(null); setResult(null); setFocused(null); setSearch(''); setType('all');
    } catch (e) { if (!ctrl.signal.aborted && seq === sequence.current) setError(e instanceof Error ? e.message : 'A consulta não pôde ser concluída.'); }
    finally { if (seq === sequence.current) { setBusy(false); setStarted(null); } }
  }
  function choose(id: StudyId) {
    if (!dataset) return;
    setSelected(id); setProtocol(defaultProtocol(dataset, id)); setResult(null); setSearch(''); setType('all'); setOriginFilter('unknown'); setHorizon(3);
  }
  function updateProtocol(change: Partial<StudyProtocol>) {
    setProtocol(p => p ? { ...p, ...change } : p); setResult(null); setFocused(null); setPortfolioOpen(false); setError('');
  }
  async function execute() {
    if (!dataset || !protocol) return;
    setRetryAction('run'); setError('');
    const key = JSON.stringify(protocol), previous = cache.current.get(key);
    if (previous) { setResult(previous); setPage(0); return; }
    const seq = ++sequence.current, ctrl = new AbortController(); controller.current?.abort(); controller.current = ctrl;
    setBusy(true); setStarted(Date.now()); setError(''); setProgress('Executando previsões com os dados anteriores a cada data');
    try {
      const next = await processStudy('run', dataset, ctrl.signal, (done, total) => setProgress(`Empreendimentos e datas processados · ${done}/${total}`), protocol);
      if (ctrl.signal.aborted || seq !== sequence.current) return;
      if (cache.current.size >= 4) cache.current.delete(cache.current.keys().next().value!);
      cache.current.set(key, next); setResult(next); setPage(0);
    } catch (e) { if (!ctrl.signal.aborted && seq === sequence.current) setError(e instanceof Error ? e.message : 'O estudo não pôde ser concluído.'); }
    finally { if (seq === sequence.current) { setBusy(false); setStarted(null); } }
  }
  const currentRows = useMemo(() => rows.filter(r => (!selected || r.tags.includes(selected)) && (type === 'all' || r.type === type) && `${r.name} ${r.id}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))), [rows, selected, type, search]);
  const cases = useMemo(() => result?.cases.filter(c => (type === 'all' || c.inventory.type === type) && `${c.inventory.name} ${c.id}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) ?? [], [result, type, search]);
  const grouped = useMemo(() => result ? groupedMetrics(result) : [], [result]);
  const paired = useMemo(() => result ? groupedMetrics(result, true) : [], [result]);
  const comparable = result?.trials.filter(t => t.provenance === originFilter && t.horizon === horizon && t.matched) ?? [];
  const overall = studyMetrics(comparable);
  const selectedNow = rows.filter(r => r.tags.includes(selected ?? 'all'));
  const count = result ? cases.length : currentRows.length;
  const from = page * 20;
  const focusCase = (c: StudyCase) => { setFocused(c); };

  return <main className="ev-workbench ev-science">
    <header className="ev-science-header"><div><p className="ev-overline">Rebrain · estudos de previsão</p><h1>Estimativas de vendas</h1><p className="ev-science-intro">Transformar o histórico de um empreendimento em uma projeção de vendas compreensível, verificável e pronta para revisão.</p><p className="ev-note">Bancada científica em implementação · começando por Curitiba.</p></div><Button variant="outline" onClick={operation}>Preparar lote <ArrowRight size={16}/></Button></header>
    {error && <section role="alert" className="ev-panel ev-science-error"><h2>Não foi possível concluir</h2><p>{error}</p><p className="ev-note">{dataset ? 'O recorte anterior continua identificado abaixo. Nenhuma resposta parcial o substituiu.' : 'Nenhum recorte parcial foi apresentado como completo.'}</p><Button variant="outline" onClick={retryAction === 'run' ? execute : load}>Tentar novamente</Button></section>}
    <section className="ev-panel ev-science-source" aria-label="Fonte do estudo"><div><p className="ev-overline">01 · Mercado de partida</p><h2>Curitiba, Paraná</h2><p className="ev-note">Horizontais e verticais · somente cidades autorizadas para sua sessão Geobrain.</p>{dataset && <p className="ev-note">{dataset.buildings.length.toLocaleString('pt-BR')} empreendimentos · histórico de {periods[0]} a {latest} · consulta {new Date(dataset.fetchedAt).toLocaleString('pt-BR')}</p>}</div><div className="ev-toolbar"><Button onClick={load} disabled={!allowed || busy}>{dataset ? 'Atualizar Curitiba' : 'Carregar Curitiba'}</Button>{dataset && <Button variant="outline" onClick={() => setQuality(true)}>Dados e qualidade</Button>}</div>
      {scope.isLoading && <BrainLoadingState variant="field" title="Conferindo cidades autorizadas"/>}
      {!scope.hasToken && <p role="status">Faça login no Geobrain pelo cabeçalho para consultar Curitiba.</p>}
      {scope.error && <div role="alert"><p>Não foi possível conferir as cidades autorizadas: {scope.error.message}</p><Button variant="outline" onClick={scope.reload}>Conferir acesso novamente</Button></div>}
      {scope.hasToken && !scope.isLoading && !scope.error && !allowed && <p role="status">Curitiba/PR não está disponível no catálogo desta sessão. Use uma conta com acesso a esse mercado.</p>}
    </section>
    {dataset && !selected && <section aria-label="Catálogo de estudos"><div className="ev-science-section"><p className="ev-overline">02 · Escolha uma pergunta</p><h2>Condições diferentes, estudos diferentes.</h2><p className="ev-note">Inventário em {latest}. As condições podem se sobrepor: não some os cartões. Cada teste reavalia a condição na data passada.</p></div><div className="ev-science-catalog">{STUDIES.map((s, i) => {
      const n = rows.filter(r => r.tags.includes(s.id)).length;
      return <button className="ev-panel ev-science-study" key={s.id} onClick={() => choose(s.id)}><span className="ev-overline">Estudo {String(i + 1).padStart(2, '0')}</span><span className="ev-science-study-title">{s.title}<ArrowRight size={20}/></span><span>{s.question}</span><span className="ev-note">{s.condition}</span><span className="ev-science-study-footer"><strong>{n.toLocaleString('pt-BR')}</strong><span className="ev-note">empreendimentos · {n ? s.id.startsWith('finotti') ? 'referência para explorar; teste temporal condicionado' : 'exploração disponível' : 'sem casos nesta data'}</span></span></button>;
    })}</div></section>}
    {dataset && !dataset.buildings.length && <p className="ev-panel" role="status">Nenhum empreendimento retornou nas consultas de Curitiba. Confira o acesso e tente atualizar a consulta.</p>}
    {dataset && selected && protocol && study && <>
      <section className="ev-panel ev-science-design" aria-label="Desenho do estudo"><Button variant="ghost" onClick={() => { setSelected(null); setResult(null); }}><ArrowLeft size={16}/> Todos os estudos</Button><p className="ev-overline">02 · {study.title}</p><h2>{study.question}</h2><p>{study.condition}</p><p className="ev-note">{selectedNow.length} empreendimentos nesta condição em {latest}; o número pode mudar nas datas passadas. Não houve novo ajuste dos modelos.</p>
        <div className="ev-science-protocol"><FlaskConical aria-hidden="true"/><div><strong>Usar dados até {protocol.cutoffs.join(' · ')}</strong><p>Comparar os resultados de {protocol.horizons.join(', ')} meses depois · {protocol.target === 'stock' ? 'estoque final em unidades' : 'vendas líquidas em cada intervalo'}.</p><p className="ev-note">As datas mensais do calendário não comprovam a duração dos fluxos. O estoque pode ser comparado nas datas existentes; vendas exigem duração documentada.</p></div></div>
        <div className="ev-note"><p><strong>Métodos previstos:</strong> {protocol.methods.map(m => METHODS.find(x => x.id === m)?.label).join(' · ')}.</p><p>{protocol.cutoffs.every(c => c < '2026-09') ? 'Finotti não poderá ser avaliado nestas datas: o treino da referência contém informação posterior.' : 'Finotti será calculado somente nas datas a partir de setembro/2026 e dentro de suas condições.'} O estoque constante exige um estoque inicial válido; o ritmo recente exige três meses comparáveis. A amostra comum será conferida por data e horizonte na execução.</p></div>
        <div className="ev-toolbar"><Button onClick={execute} disabled={busy || !periods.length}>Executar retrospectiva</Button><Button variant="outline" onClick={() => setSettings(true)}>Período e métodos</Button>{result && <Button variant="outline" onClick={() => downloadStudyEvidence(dataset, rows, result)}><Download size={16}/> Baixar evidências do estudo</Button>}</div>
        <p className="ev-note">Retrospectiva: fazer uma previsão usando apenas dados anteriores e compará-la com o que foi reportado depois. Referência Finotti treinada até setembro/2026; datas anteriores permanecem bloqueadas.</p>
      </section>
      {result && <section className="ev-science-results" aria-label="Resultados da retrospectiva"><div className="ev-science-section"><p className="ev-overline">03 · Resultado exploratório</p><h2>O que os testes mostram?</h2><p className="ev-note">{result.cases.length} combinações de empreendimento e data · {new Set(result.cases.map(c => c.id)).size} empreendimentos distintos · {result.exclusions.length} combinações fora da condição escolhida.</p></div>
        <div className="ev-science-controls"><Choice label="Origem do resultado posterior" value={originFilter} onChange={v => setOriginFilter(v as Provenance)} items={(Object.keys(originLabels) as Provenance[]).map(value => ({ value, label: originLabels[value] }))}/><Choice label="Horizonte da leitura" value={String(horizon)} onChange={v => setHorizon(Number(v))} items={protocol.horizons.map(h => ({ value: String(h), label: `${h} meses` }))}/></div>
        <div><Button variant="outline" onClick={() => setPortfolioOpen(true)}>Carteira e sobreposição</Button></div>
        <p className="ev-science-disclaimer">{originLabels[originFilter]}. O snapshot pode incluir revisões posteriores. As métricas não constituem validação independente do Finotti nem previsão homologada para importação.</p>
        <div className="ev-science-facts"><p>Empreendimentos na amostra comum<strong>{overall.buildings}</strong></p><p>Previsões comparáveis<strong>{comparable.length}</strong></p><p>Faixas calibradas<strong>Indisponíveis</strong></p></div>
        <StudyCharts result={result} provenance={originFilter} horizon={horizon}/>
        <section className="ev-panel"><h3>Métodos, erro e cobertura</h3><p className="ev-note">Média do erro e viés dão o mesmo peso a cada empreendimento. P90 é o erro absoluto abaixo do qual ficaram 90% das previsões avaliadas. “Comum” compara os métodos disponíveis nas mesmas chaves e origem.</p><div className="ev-table"><table><caption>Métricas · {protocol.target === 'stock' ? 'estoque final' : 'vendas líquidas no intervalo'} em unidades · {horizon} meses</caption><thead><tr><th>Método</th><th>Avaliadas/tentadas</th><th>Empreendimentos</th><th>Erro médio</th><th>Viés</th><th>P90</th><th>Erro médio · comum</th></tr></thead><tbody>{grouped.filter(m => m.provenance === originFilter && m.horizon === horizon).map(m => <tr key={m.method}><td>{METHODS.find(x => x.id === m.method)?.label}</td><td>{m.evaluated}/{m.totalAttempted}</td><td>{m.buildings}</td><td>{formatNumber(m.maeUnits)}</td><td>{formatNumber(m.biasUnits)}</td><td>{formatNumber(m.p90Units)}</td><td>{formatNumber(paired.find(x => x.method === m.method && x.horizon === horizon && x.provenance === originFilter)?.maeUnits)}</td></tr>)}</tbody></table></div></section>
      </section>}
      <section className="ev-panel" aria-label="Empreendimentos do estudo"><div className="ev-science-section"><p className="ev-overline">{result ? '04 · Investigar os casos' : '03 · Conhecer a amostra'}</p><h2>{result ? 'Abra um caso para entender a previsão.' : 'Quem está nesta condição hoje?'}</h2><p className="ev-note">{result ? 'A lista inclui casos sem previsão ou sem resultado posterior. Os motivos aparecem no detalhe.' : `Inventário em ${latest}. Executar o estudo reavalia as condições em cada data passada.`}</p></div><div className="ev-science-controls"><label className="grid gap-2 text-sm">Buscar empreendimento<Input placeholder="Nome ou ID" value={search} onChange={e => setSearch(e.target.value)}/></label><Choice label="Tipo" value={type} onChange={setType} items={[{ value: 'all', label: 'Todos os tipos' }, { value: 'Horizontal', label: 'Horizontal' }, { value: 'Vertical', label: 'Vertical' }]}/></div>
        <p className="ev-note">{count} resultados · página {page + 1} de {Math.max(1, Math.ceil(count / 20))}. Filtros mudam só a lista; o estudo e as métricas continuam completos.</p>
        <div className="ev-science-list">{result ? cases.slice(from, from + 20).map(c => {
          const errors = result.trials.filter(t => t.id === c.id && t.cutoff === c.cutoff && t.horizon === horizon);
          return <article key={`${c.id}|${c.cutoff}`}><div><p className="ev-overline">{c.inventory.type} · dados até {c.cutoff}</p><h3>{c.inventory.name}</h3><p className="ev-note">ID {c.id} · {c.inventory.pattern ?? 'Padrão desconhecido'} · estoque {formatNumber(c.inventory.stock)} · {formatNumber(c.inventory.age)} meses desde lançamento</p><p className="ev-note">{errors.map(t => `${METHODS.find(m => m.id === t.method)?.label}: ${t.error === null ? t.predicted === null ? t.reason : 'sem resultado posterior comparável' : `erro ${formatNumber(t.error)} un.`}`).join(' · ')}</p></div><Button variant="outline" data-study-case={`${c.id}|${c.cutoff}`} onClick={() => focusCase(c)}>Explorar caso</Button></article>;
        }) : currentRows.slice(from, from + 20).map(r => <article key={r.id}><div><p className="ev-overline">{r.type} · ID {r.id}</p><h3>{r.name}</h3><p className="ev-note">{r.pattern ?? 'Sem padrão'} · estoque {formatNumber(r.stock)} · {formatNumber(r.age)} meses desde lançamento · {r.reportedDates} datas reportadas</p><p className="ev-note">{r.reasons.find(s => !s.startsWith('Origem') && !s.startsWith('O snapshot')) ?? r.cadence}</p></div></article>)}</div>
        {!count && <p role="status">Nenhum empreendimento corresponde a esta seleção. Ajuste os filtros ou escolha outra condição/data.</p>}
        <div className="ev-toolbar"><Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button><Button variant="outline" disabled={(page + 1) * 20 >= count} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>
      </section>
    </>}
    {dataset && protocol && settings && <Dialog open onOpenChange={setSettings}><DialogContent className="ev-modal ev-science-settings"><DialogTitle>Desenho da retrospectiva</DialogTitle><DialogDescription>Os controles alteram o estudo local; não editam os dados nem os parâmetros matemáticos. Uma mudança pede nova execução.</DialogDescription><Choice label="Usar dados até" value={protocol.cutoffs.length === 1 ? protocol.cutoffs[0] : 'multiple'} onChange={value => updateProtocol({ cutoffs: value === 'multiple' ? defaultProtocol(dataset, selected!).cutoffs : [value] })} items={[{ value: 'multiple', label: 'Várias datas · sugestão por cobertura' }, ...periods.slice().reverse().map(value => ({ value, label: value }))]}/><Choice label="Horizontes de comparação" value={protocol.horizons.join(',')} onChange={value => { const horizons = value.split(',').map(Number); updateProtocol({ horizons }); setHorizon(horizons[0]); }} items={[{ value: '3,6,12', label: '3, 6 e 12 meses' }, { value: '1', label: '1 mês' }, { value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }]}/><Choice label="O que comparar" value={protocol.target} onChange={target => updateProtocol({ target: target as Target })} items={[{ value: 'stock', label: 'Estoque final em unidades' }, { value: 'net', label: 'Vendas líquidas · requer duração comprovada' }]}/><p className="ev-note">Sem duração documentada dos fluxos, o estudo de vendas mostrará o impedimento; não inventará vendas mensais.</p><div><h3>Métodos em comparação</h3>{METHODS.map(m => <label key={m.id} className="ev-science-method-choice"><input type="checkbox" checked={protocol.methods.includes(m.id)} onChange={e => updateProtocol({ methods: e.target.checked ? [...protocol.methods, m.id] : protocol.methods.filter(id => id !== m.id) })}/><span><strong>{m.label}</strong><span className="ev-note block">{m.explanation}</span></span></label>)}</div><Button onClick={() => setSettings(false)} disabled={!protocol.methods.length}>Aplicar ao estudo</Button></DialogContent></Dialog>}
    {dataset && quality && <Dialog open onOpenChange={setQuality}><DialogContent className="ev-modal"><DialogTitle>Dados, qualidade e rastreabilidade</DialogTitle><DialogDescription>Fonte Geobrain · Curitiba/PR · consulta {new Date(dataset.fetchedAt).toLocaleString('pt-BR')}. Origem por período e duração oficial dos fluxos não comprovadas.</DialogDescription><p className="ev-note break-all">SHA-256: {dataset.hash}</p><p>{dataset.buildings.length} empreendimentos · {dataset.buildings.reduce((s, b) => s + b.typologies_history.length, 0).toLocaleString('pt-BR')} linhas históricas · {periods[0]} a {latest}.</p><p className="ev-note">Tipo e lançamento vêm do cadastro atual; o padrão é lido no histórico. Não foi presumido que os atributos atuais eram conhecidos no passado. Ausências não viram zero. Estoques zerados não entram como acertos nas métricas principais.</p><div className="ev-toolbar"><Button variant="outline" onClick={() => downloadCsv('inventario-curitiba-revisao.csv', rows.map(({ origin: _origin, ...r }) => r))}>Baixar inventário</Button><DataVerification source={dataset.buildings.map(building => ({ building, city: 'Curitiba', uf: 'PR' }))} fetchedAt={dataset.fetchedAt}/></div><h3>Condições atuais e limites</h3><div className="ev-table"><table><thead><tr><th>Condição</th><th>Empreendimentos</th></tr></thead><tbody>{STUDIES.map(s => <tr key={s.id}><td>{s.title}</td><td>{rows.filter(r => r.tags.includes(s.id)).length}</td></tr>)}</tbody></table></div>{result && <><h3>Exclusões por condição nas datas testadas</h3><p className="ev-note">{result.exclusions.length} combinações de empreendimento e data. Lista completa no pacote de evidências.</p><ul className="ev-note list-disc pl-5">{result.exclusions.slice(0, 10).map(r => <li key={`${r.id}|${r.cutoff}`}>{r.name} · {r.cutoff}: {r.reason}</li>)}</ul></>}</DialogContent></Dialog>}
    {focused && dataset && result && <StudyDetail key={`${focused.id}|${focused.cutoff}`} item={focused} dataset={dataset} result={result} onClose={() => { const key = `${focused.id}|${focused.cutoff}`; setFocused(null); setTimeout(() => { const trigger = [...document.querySelectorAll<HTMLButtonElement>('[data-study-case]')].find(el => el.dataset.studyCase === key); trigger?.focus(); }, 0); }}/>}
    {portfolioOpen && result && <StudyPortfolio result={result} onClose={() => setPortfolioOpen(false)}/>}
    {busy && <WorkbenchLoading title={dataset ? 'Preparando o estudo' : 'Carregando Curitiba'} description={progress} startedAt={started} onCancel={cancel}/>}
  </main>;
}
