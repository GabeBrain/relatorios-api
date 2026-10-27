import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { useGeoApiScope, GeoApiScopeSelector, type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { useAuthStore } from '@/store/auth-store';
import { WorkbenchLoading } from '../expanded/WorkbenchLoading';
import { buildingId, readHorizontalHistory, type SourceType } from '../source';
import { downloadCsv, downloadJson } from '../export';
import { prepareReview, reviewExport, situationCounts, type ReviewItem, type LocatedBuilding, type ReviewStatus } from './workbench';
import { OperationalDetail } from './OperationalDetail';
import { DataVerification } from './DataVerification';
import '../expanded/workbench.css';
import './operational.css';

type ScopeMode = 'cities'|'uf'|'region'|'ids';
const labels:Record<ReviewStatus,string>={COLETA:'Coleta',PENDENTE:'Pendência',SEM_MODELO:'Sem modelo validado',CANDIDATO:'Candidato à estimativa'};
function Choice({label,value,onChange,items}:{label:string;value:string;onChange:(s:string)=>void;items:{value:string;label:string}[]}) {
  return <label className="grid gap-2 text-sm">{label}<Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{items.map(x=><SelectItem value={x.value} key={x.value}>{x.label}</SelectItem>)}</SelectContent></Select></label>;
}
export default function OperationalPage() {
  const [geo,setGeo]=useState<GeoScope>({uf:'',city:''});
  const scope=useGeoApiScope({value:geo,onChange:setGeo});
  const token=useAuthStore(s=>s.getToken());
  const [scopeMode,setScopeMode]=useState<ScopeMode>('cities');
  const [cities,setCities]=useState<GeoScope[]>([]),[region,setRegion]=useState(''),[state,setState]=useState(''),[idsText,setIdsText]=useState('');
  const [source,setSource]=useState<LocatedBuilding[]>([]),[rows,setRows]=useState<ReviewItem[]>([]);
  const [cutoff,setCutoff]=useState(''),[context,setContext]=useState(''),[fetchedAt,setFetchedAt]=useState('');
  const [busy,setBusy]=useState(false),[started,setStarted]=useState<number|null>(null),[progress,setProgress]=useState(''),[error,setError]=useState('');
  const [search,setSearch]=useState(''),[status,setStatus]=useState('all'),[type,setType]=useState('all'),[page,setPage]=useState(0);
  const [draft,setDraft]=useState<Set<string>>(new Set()),[focused,setFocused]=useState<string|null>(null);
  const [missingIds,setMissingIds]=useState<string[]>([]),[ready,setReady]=useState(false);
  const request=useRef<AbortController|null>(null),sequence=useRef(0);
  useEffect(()=>()=>{request.current?.abort();},[]);
  useEffect(()=>{
    request.current?.abort();sequence.current++;setBusy(false);setSource([]);setRows([]);setDraft(new Set());setReady(false);setContext('');setFocused(null);setCities([]);
  },[token]);
  const ids=useMemo(()=>[...new Set(idsText.split(/[\s,;]+/).filter(Boolean))],[idsText]);
  const universe=useMemo(()=>{
    const catalog=scope.citiesByUf??{};
    if(scopeMode==='cities') return cities.filter(x=>catalog[x.uf]?.includes(x.city));
    const ufs=scopeMode==='uf'?[state]:scopeMode==='region'?(scope.ufsByRegion?.[region]??[]):Object.keys(catalog);
    return ufs.flatMap(uf=>(catalog[uf]??[]).map(city=>({uf,city})));
  },[scopeMode,cities,state,region,scope.citiesByUf,scope.ufsByRegion]);
  const allowed=scope.hasToken&&!scope.error&&!scope.isLoading&&universe.length>0&&(scopeMode!=='ids'||ids.length>0&&ids.every(x=>/^\d+$/.test(x)));
  const periods=useMemo(()=>[...new Set(source.flatMap(x=>x.building.typologies_history.map(r=>r.period.slice(0,7))))].filter(p=>/^\d{4}-(0[1-9]|1[0-2])$/.test(p)).sort().reverse(),[source]);
  const visible=useMemo(()=>rows.filter(r=>(status==='all'||r.status===status)&&(type==='all'||r.building.sourceType===type)&&`${r.name} ${r.id} ${r.city}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))),[rows,status,type,search]);
  const situations=useMemo(()=>situationCounts(rows),[rows]);
  const draftRows=useMemo(()=>reviewExport(rows,draft,cutoff),[rows,draft,cutoff]);
  useEffect(()=>setPage(0),[search,status,type]);
  function cancel() {request.current?.abort();sequence.current++;setBusy(false);setProgress('');}
  async function load() {
    if(!allowed)return;
    const seq=++sequence.current,ctrl=new AbortController();request.current?.abort();request.current=ctrl;
    setBusy(true);setStarted(Date.now());setError('');
    const queryUniverse=universe.slice(),queryIds=scopeMode==='ids'?ids.slice():[];
    const description=scopeMode==='region'?`Região ${region}`:scopeMode==='uf'?state:scopeMode==='ids'?`${queryIds.length} IDs em cidades autorizadas`:queryUniverse.map(x=>`${x.city}/${x.uf}`).join(' · ');
    try {
      const found:LocatedBuilding[]=[],seen=new Set<string>();
      let done=0;
      // Each city/type consumes the shared transport's bounded 8-page pool. Never multiply pools.
      for(const area of queryUniverse) for(const sourceType of ['Horizontal','Vertical'] as SourceType[]) {
        const response=await readHorizontalHistory(area.uf,area.city,ctrl.signal,(p,n)=>setProgress(`${area.city} · ${sourceType} · página ${p}/${n} · ${done}/${queryUniverse.length*2} consultas`),sourceType);
        for(const b of response.buildings) {
          const id=buildingId(b);if(queryIds.length&&!queryIds.includes(id))continue;
          if(seen.has(id))throw new Error(`ID ${id} repetido entre consultas. Revise a identidade da fonte.`);
          seen.add(id);found.push({building:b,...area});
        }
        done++;
      }
      const dates=found.flatMap(x=>x.building.typologies_history.map(r=>r.period.slice(0,7))).filter(p=>/^\d{4}-(0[1-9]|1[0-2])$/.test(p)).sort();
      const cut=dates.at(-1)??'';
      const prepared=cut?await prepareReview(found,cut,ctrl.signal,n=>setProgress(`Conferindo posições e comparando métodos · ${n}/${found.length}`)):[];
      if(ctrl.signal.aborted||seq!==sequence.current)return;
      setSource(found);setRows(prepared);setCutoff(cut);setContext(description);setFetchedAt(new Date().toISOString());setMissingIds(queryIds.filter(id=>!seen.has(id)));setReady(true);setDraft(new Set());setSearch('');setStatus('all');setType('all');setPage(0);setFocused(null);
    } catch(e) {if(!ctrl.signal.aborted&&seq===sequence.current)setError(e instanceof Error?e.message:'Não foi possível preparar o recorte.');}
    finally {if(seq===sequence.current){setBusy(false);setStarted(null);}}
  }
  async function recut(next:string) {
    const seq=++sequence.current,ctrl=new AbortController();request.current?.abort();request.current=ctrl;setBusy(true);setStarted(Date.now());setError('');
    try {
      const prepared=await prepareReview(source,next,ctrl.signal,n=>setProgress(`Recalculando localmente · ${n}/${source.length}`));
      if(ctrl.signal.aborted||seq!==sequence.current)return;
      setRows(prepared);setCutoff(next);setDraft(new Set());setFocused(null);setPage(0);
    }catch(e){if(!ctrl.signal.aborted)setError(String(e));}
    finally{if(seq===sequence.current){setBusy(false);setStarted(null);}}
  }
  const toggle=(id:string)=>setDraft(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});
  const focusedRow=rows.find(r=>r.id===focused)??null;
  return <main className="ev-workbench ev-operational">
    <header><p className="ev-overline">Rebrain · preparação e revisão de estimativas</p><h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">Estimativas de vendas</h1><p className="mt-4 max-w-3xl text-muted-foreground">Transformar o histórico de um empreendimento em uma projeção de vendas compreensível, verificável e pronta para revisão.</p><p className="ev-note mt-3">Em implementação · referência Finotti preservada; lote operacional sujeito à conferência dos dados e do contrato de retorno.</p></header>
    <section className="ev-panel" aria-label="Universo da análise"><div className="ev-section-heading"><div><p className="ev-overline">01 · Universo</p><h2>Onde vamos preparar as estimativas?</h2></div><p className="ev-note">Horizontais e verticais são carregados juntos e calculados pelos respectivos métodos.</p></div>
      <div className="ev-toolbar" role="group" aria-label="Entrada territorial">{([{id:'cities',name:'Cidades'},{id:'uf',name:'Estado'},{id:'region',name:'Região'},{id:'ids',name:'Empreendimentos por ID'}] as const).map(m=><Button key={m.id} disabled={busy} variant={scopeMode===m.id?'secondary':'ghost'} aria-pressed={scopeMode===m.id} onClick={()=>setScopeMode(m.id)}>{m.name}</Button>)}</div>
      {scopeMode==='cities'&&<><GeoApiScopeSelector value={geo} onChange={setGeo} disabled={busy}/><Button className="mt-3" variant="outline" disabled={!scope.strictReady||busy||cities.some(c=>c.uf===geo.uf&&c.city===geo.city)} onClick={()=>setCities(v=>[...v,{...geo}])}>Adicionar cidade</Button><div className="ev-toolbar mt-3">{cities.map(c=><Button key={`${c.uf}/${c.city}`} variant="secondary" disabled={busy} onClick={()=>setCities(v=>v.filter(x=>x.uf!==c.uf||x.city!==c.city))} aria-label={`Remover ${c.city}`}>{c.city}/{c.uf} ×</Button>)}</div></>}
      {scopeMode==='uf'&&<Choice label="Estado autorizado" value={state} onChange={setState} items={scope.availableUfs.map(uf=>({value:uf,label:uf}))}/>}
      {scopeMode==='region'&&<Choice label="Região" value={region} onChange={setRegion} items={scope.availableRegions.map(r=>({value:r,label:r}))}/>}
      {scopeMode==='ids'&&<label className="grid gap-2 text-sm">IDs dos empreendimentos<Input value={idsText} onChange={e=>setIdsText(e.target.value)} placeholder="Separe os IDs por vírgula ou espaço"/><span className="ev-note">Os IDs serão localizados consultando os dois tipos nas cidades autorizadas. Esta entrada pode exigir várias consultas.</span></label>}
      {scope.isLoading&&<BrainLoadingState variant="field" title="Carregando cidades autorizadas"/>}
      {!scope.hasToken&&<p role="status" className="ev-note">Entre com sua conta Geobrain pelo cabeçalho da Rebrain para consultar.</p>}
      {scope.error&&<div role="alert"><p>Não foi possível carregar as cidades autorizadas.</p><Button variant="outline" onClick={scope.reload}>Tentar novamente</Button></div>}
      <div className="ev-toolbar mt-5"><Button disabled={!allowed||busy} onClick={()=>void load()}>Preparar análise</Button><p className="ev-note">{universe.length} cidades autorizadas · {universe.length*2} consultas iniciais, com paginação conforme o volume</p></div>
      {error&&<p role="alert" className="mt-4">{error}{ready?' A análise anterior continua identificada abaixo.':''}</p>}
    </section>
    {ready&&<>
      <div className="ev-toolbar justify-end"><DataVerification source={source} fetchedAt={fetchedAt}/></div>
      <section aria-label="Resumo do lote"><div className="ev-section-heading"><div><p className="ev-overline">02 · Conferência</p><h2>{rows.length} empreendimentos no recorte</h2><p className="ev-note">{context} · consulta {new Date(fetchedAt).toLocaleString('pt-BR')}</p></div>{cutoff&&<Choice label="Histórico até" value={cutoff} onChange={v=>void recut(v)} items={periods.map(p=>({value:p,label:p}))}/>}</div>
        <div className="ev-summary-cards">{(['CANDIDATO','COLETA','PENDENTE','SEM_MODELO'] as ReviewStatus[]).map(s=><button key={s} className="ev-panel" aria-pressed={status===s} onClick={()=>setStatus(v=>v===s?'all':s)}><strong>{rows.filter(r=>r.status===s).length}</strong><span>{labels[s]}</span></button>)}</div>
        <p className="ev-note mt-3">{rows.filter(r=>r.methods.get('finotti-reference')?.forecast).length} posições com referência calculável. Isso não comprova elegibilidade operacional ou equivalência de preparação. A API ainda não confirma cadência e origem por competência; o próximo período operacional permanece pendente.</p>
        {!!missingIds.length&&<p role="status" className="ev-note">IDs não encontrados nas cidades consultadas: {missingIds.join(', ')}.</p>}
        {!rows.length&&<p role="status" className="ev-panel mt-4">Nenhum empreendimento encontrado neste recorte. Revise a seleção ou os IDs.</p>}
      </section>
      {!!rows.length&&<section className="ev-panel" aria-label="Empreendimentos e composição"><div className="ev-section-heading"><div><h2>Explore os resultados</h2><p className="ev-note">Filtrar e comparar não altera a proposta do lote. Use Incluir ou Retirar para mudar sua composição.</p></div><Dialog><DialogTrigger asChild><Button>Revisar proposta ({draft.size})</Button></DialogTrigger><DialogContent className="ev-modal"><DialogTitle>Revisão da proposta</DialogTitle><DialogDescription>{draft.size} empreendimentos incluídos por ação explícita · dados até {cutoff}. Pendências continuam impedindo a saída operacional.</DialogDescription><p className="ev-note my-4">Líquidas e estoque são as variáveis de previsão. Cadência, origem histórica, distribuição por tipologia, preço, divisão coleta/estimativa e formato de importação precisam de definição. Nenhuma divisão da metade é aplicada.</p><div className="ev-table"><table><thead><tr><th>Empreendimento</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{draftRows.map(r=><tr key={r.id}><td>{r.name} · {r.id}</td><td>{labels[r.status]} · não importável</td><td><Button variant="ghost" onClick={()=>toggle(r.id)}>Retirar</Button></td></tr>)}</tbody></table></div>{!draft.size&&<p className="ev-note my-4">Inclua os empreendimentos que deseja revisar. A seleção não autoriza importação.</p>}<div className="ev-toolbar mt-5"><Button variant="outline" disabled={!draft.size} onClick={()=>downloadCsv('conferencia-proposta-nao-importar.csv',draftRows)}>Baixar conferência</Button><Button variant="outline" disabled={!draft.size} onClick={()=>downloadJson('historico-e-manifesto-nao-importar.json',{status:'CANDIDATO_NAO_IMPORTAR',cutoff,context,fetchedAt,rows:draftRows,sources:source.filter(x=>draft.has(buildingId(x.building)))} )}>Baixar histórico e manifesto</Button><Button disabled>Exportar competências operacionais</Button></div><p className="ev-note mt-3">A saída IVV de 26 colunas ficará disponível após os campos e condições necessários estarem definidos. Os downloads acima são documentos de conferência.</p></DialogContent></Dialog></div>
        <div className="ev-review-filters"><label className="grid gap-2 text-sm">Buscar empreendimento<Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome, ID ou cidade"/></label><Choice label="Situação" value={status} onChange={setStatus} items={[{value:'all',label:'Todas'},...Object.entries(labels).map(([value,label])=>({value,label}))]}/><Choice label="Tipo" value={type} onChange={setType} items={[{value:'all',label:'Todos'},{value:'Horizontal',label:'Horizontal'},{value:'Vertical',label:'Vertical'}]}/></div>
        <p className="ev-note my-3">{visible.length} resultados · {draft.size} incluídos na proposta completa</p>
        <div className="ev-review-list">{visible.slice(page*20,(page+1)*20).map(r=><article key={r.id}><div><p className="ev-overline">{r.city}/{r.uf} · {r.building.sourceType} · {r.id}</p><button data-building-id={r.id} className="ev-review-name" onClick={()=>setFocused(r.id)}>{r.name}</button><p className="ev-note">{labels[r.status]} · {r.methods.get('finotti-reference')?.forecast?'Referência calculável':'Sem referência calculável'}</p><p className="ev-note">{r.reasons[0]}</p></div><div className="ev-toolbar"><Button variant="ghost" onClick={()=>setFocused(r.id)}>Explorar</Button><Button variant={draft.has(r.id)?'secondary':'outline'} aria-pressed={draft.has(r.id)} onClick={()=>toggle(r.id)}>{draft.has(r.id)?'Retirar':'Incluir na proposta'}</Button></div></article>)}</div>
        {!visible.length&&<p role="status" className="ev-note py-6">Nenhum empreendimento corresponde aos filtros. A proposta do lote foi preservada.</p>}
        <div className="ev-toolbar mt-4"><Button variant="outline" disabled={page===0} onClick={()=>setPage(v=>v-1)}>Anterior</Button><span className="ev-note">Página {page+1} de {Math.max(1,Math.ceil(visible.length/20))}</span><Button variant="outline" disabled={(page+1)*20>=visible.length} onClick={()=>setPage(v=>v+1)}>Próxima</Button></div>
      </section>}
      {!!situations.length&&<section className="ev-panel"><div className="ev-section-heading"><div><p className="ev-overline">03 · Cobertura e pesquisa</p><h2>Situações mais frequentes neste recorte</h2></div><Button variant="outline" onClick={()=>downloadCsv('inventario-situacoes.csv',situations.map(([situation,count])=>({situation,count,cutoff,context}))) }>Baixar inventário</Button></div><p className="ev-note">Frequência orienta a investigação de novos modelos. Não é probabilidade de venda nem validação estatística. Tipo, padrão, idade, estágio e tipologias são descritos abaixo; cadência e origem por período continuam desconhecidas.</p><div className="ev-situation-list">{situations.slice(0,10).map(([name,count])=><p key={name}><span>{name}</span><strong>{count}</strong></p>)}</div><p className="ev-note">{situations.length>10?'Dez grupos mais frequentes apresentados; o arquivo contém todos.':'Todos os grupos apresentados.'}</p></section>}
    </>}
    {focusedRow&&<OperationalDetail key={`${focusedRow.id}-${cutoff}`} row={focusedRow} cutoff={cutoff} onClose={()=>{const id=focused;setFocused(null);requestAnimationFrame(()=>{document.querySelector<HTMLButtonElement>(`button[data-building-id="${id}"]`)?.focus();});}}/>}
    {busy&&<WorkbenchLoading title="Preparando estimativas" description={progress} startedAt={started} onCancel={cancel}/>}
  </main>;
}
