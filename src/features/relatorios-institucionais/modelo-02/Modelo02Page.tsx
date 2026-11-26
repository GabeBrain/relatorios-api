import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Alert,AlertTitle,AlertDescription} from '@/components/ui/alert';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';
import {useGeoApiScope} from '@/features/shared/geo-api-scope-engine';
import {useAuthStore} from '@/store/auth-store';
import {ReportLoading} from '../shared/ReportLoading';
import {ReportSlideNavigation,ReportSlideHeading,ReportSlideDialog} from '../shared/ReportSlideControls';
import {REGIONS,initialSelection,citiesFor,missingUfs,period,periodIssue,scopeIssue,selectionKey,regionOf,type Selection} from './model';
import {collect} from './api';
import {runWorker} from './worker-client';
import {physicalPages} from './calculate';
import {ReportSlide} from './ReportSlide';
import type {Report,Progress} from './types';
const Exports=lazy(()=>import('./Exports')),Insights=lazy(()=>import('./Insights'));
const EMPTY_SCOPE={uf:'',city:''},ignoreScope=()=>{};
const stages=[{id:'scope',title:'Validar região e competência'},{id:'sources',title:'Consultar fontes municipais'},{id:'calculations',title:'Calcular indicadores e localizar capitais'},{id:'slides',title:'Organizar os slides'}];
export default function Modelo02Page(){
 const [s,setS]=useState<Selection>(initialSelection),[report,setReport]=useState<Report|null>(null),[progress,setProgress]=useState<Progress|null>(null),[running,setRunning]=useState(false),[startedAt,setStartedAt]=useState<number|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[page,setPage]=useState(0),[expanded,setExpanded]=useState(false),[tab,setTab]=useState('slides');
 const token=useAuthStore(state=>state.getToken()),geo=useGeoApiScope({value:EMPTY_SCOPE,onChange:ignoreScope}),active=useRef<AbortController|null>(null),key=selectionKey(s);
 const cities=useMemo(()=>citiesFor(s,geo.citiesByUf),[s,geo.citiesByUf]),missing=missingUfs(s,geo.citiesByUf),issue=periodIssue(s)??scopeIssue(s,geo.citiesByUf),ready=geo.hasToken&&!geo.isLoading&&!geo.error&&!issue;
 useEffect(()=>{active.current?.abort();active.current=null;setReport(null);setProgress(null);setRunning(false);setError('');setNotice('');setPage(0);setExpanded(false);setTab('slides');},[key,token]);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 const pages=useMemo(()=>physicalPages(report?.slides??[]),[report]),visible=pages[page],region=regionOf(s);
 const change=(patch:Partial<Selection>)=>setS(old=>({...old,...patch}));
 const generate=async()=>{
  if(!ready||active.current)return;const controller=new AbortController(),selection=structuredClone(s),started=new Date().toISOString();active.current=controller;setRunning(true);setStartedAt(Date.now());setReport(null);setError('');setNotice('');setPage(0);setProgress({stage:'scope',completed:0,total:1,message:'Conferindo catálogo autorizado e trimestre encerrado',waiting:false});
  const update=(p:Progress)=>{if(active.current===controller&&!controller.signal.aborted)setProgress(p);};
  try{
   const sources=await collect(selection,geo.citiesByUf,{token:token??'',signal:controller.signal,onProgress:update});update({stage:'calculations',completed:0,total:8,message:'Conferindo os indicadores e a cobertura das capitais',waiting:false});
   const next=await runWorker<Report>({mode:'calculate',selection,cities:citiesFor(selection,geo.citiesByUf),missingUfs:missingUfs(selection,geo.citiesByUf),sources,startedAt:started},controller.signal,update);
   const count=physicalPages(next.slides).length;update({stage:'slides',completed:count,total:count,message:'Prévia e continuações organizadas',waiting:false});
   if(active.current===controller&&!controller.signal.aborted)setReport(next);
  }catch(e){if(active.current!==controller)return;if(controller.signal.aborted)setNotice('Consulta cancelada. Você pode gerar novamente.');else setError(e instanceof Error?e.message:'Não foi possível gerar o relatório.');}
  finally{if(active.current===controller){active.current=null;setRunning(false);}}
 };
 const navigation=<ReportSlideNavigation slides={pages.map((p,i)=>({number:i+1,title:p.slide.title}))} value={page+1} onChange={number=>setPage(number-1)}/>;
 const surface=visible?<div className="overflow-hidden rounded-lg border bg-white shadow-sm"><ReportSlide page={visible} selection={s}/></div>:null;
 const years=Array.from({length:new Date().getFullYear()-2020},(_,i)=>2021+i).reverse();
 return <div className="relative mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
  <header className="space-y-2 border-b pb-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relatórios institucionais regionais</p><h1 className="text-2xl font-semibold">Modelo 02</h1><p className="text-sm text-muted-foreground">Em implantação · trimestral · acesso apenas por rota.</p></header>
  <section className="space-y-5 rounded-xl border bg-card p-4 sm:p-6" aria-label="Configuração do Modelo 02"><h2 className="font-semibold">Configure o relatório</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   <div className="space-y-1.5"><label htmlFor="modelo02-region" className="text-sm font-medium">Região do Brasil</label><Select value={s.region} disabled={running||geo.isLoading||!geo.hasToken||!!geo.error} onValueChange={region=>change({region})}><SelectTrigger id="modelo02-region"><SelectValue placeholder="Selecionar região"/></SelectTrigger><SelectContent>{REGIONS.map(r=><SelectItem key={r.id} value={r.id} disabled={!citiesFor({...s,region:r.id},geo.citiesByUf).length}>{r.label}</SelectItem>)}</SelectContent></Select></div>
   <div className="space-y-1.5"><label htmlFor="modelo02-quarter" className="text-sm font-medium">Trimestre</label><Select value={String(s.quarter)} disabled={running} onValueChange={v=>change({quarter:Number(v)})}><SelectTrigger id="modelo02-quarter"><SelectValue/></SelectTrigger><SelectContent>{[1,2,3,4].map(q=><SelectItem key={q} value={String(q)}>{q}º trimestre</SelectItem>)}</SelectContent></Select></div>
   <div className="space-y-1.5"><label htmlFor="modelo02-month" className="text-sm font-medium">Mês de encerramento</label><Input id="modelo02-month" readOnly value={['março','junho','setembro','dezembro'][s.quarter-1]} className="bg-muted"/></div>
   <div className="space-y-1.5"><label htmlFor="modelo02-year" className="text-sm font-medium">Ano</label><Select value={String(s.year)} disabled={running} onValueChange={v=>change({year:Number(v)})}><SelectTrigger id="modelo02-year"><SelectValue/></SelectTrigger><SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
  </div>
  {geo.isLoading&&<BrainLoadingState variant="field" title="Carregando municípios autorizados"/>}
  {!geo.hasToken&&<p role="status" className="text-sm text-muted-foreground">Faça login no Geobrain para carregar as regiões disponíveis.</p>}
  {geo.error&&<Alert variant="destructive"><AlertTitle>Não foi possível carregar os municípios</AlertTitle><AlertDescription>{geo.error.message}<Button className="mt-3 block" variant="outline" onClick={geo.reload}>Tentar novamente</Button></AlertDescription></Alert>}
  {geo.hasToken&&!geo.isLoading&&!geo.error&&geo.citiesByUf&&!Object.keys(geo.citiesByUf).length&&<p role="status" className="text-sm text-muted-foreground">Seu acesso não retornou municípios monitorados.</p>}
  {region&&<><p className="text-sm">Região {region.label} · {cities.length} municípios monitorados autorizados · {period(s).label} · INCC-DI.</p>{!!missing.length&&<p role="status" className="text-sm text-destructive">UFs sem municípios autorizados: {missing.join(', ')}. A geração representará somente o recorte com acesso.</p>}<details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Conferir recorte e capitais</summary><p className="mt-2 text-muted-foreground">Mapas finais: {region.capitals.map(([uf,city])=>`${city}/${uf}`).join(', ')}. Somente capitais, sem RM.</p><div className="mt-2 max-h-56 overflow-auto">{cities.map(c=><p key={`${c.uf}/${c.city}`}>{c.city} / {c.uf}</p>)}</div></details></>}
  <Button disabled={!ready||running} onClick={()=>void generate()}>Gerar relatório</Button>{!running&&issue&&<p role="status" className="text-sm text-muted-foreground">{issue}</p>}
  </section>
  {running&&progress&&<ReportLoading label="Carregamento do Modelo 02" title="Consultando fontes do Modelo 02" description={progress.waiting?'Aguardando resposta da API · retomada automática':progress.message} startedAt={startedAt} onCancel={()=>active.current?.abort()} steps={stages.map((stage,i)=>{const current=stages.findIndex(v=>v.id===progress.stage);return {id:stage.id,title:stage.title,status:i<current?'done' as const:i===current?'running' as const:'waiting' as const,work:i===current?{completed:progress.completed,total:progress.total,unit:stage.id==='sources'?'fontes':stage.id==='calculations'?'blocos':'páginas'}:undefined,message:i===current?progress.message:undefined};})}/>}
  {error&&<Alert variant="destructive"><AlertTitle>Geração não concluída</AlertTitle><AlertDescription>{error}<Button className="mt-3 block" variant="outline" disabled={!ready||running} onClick={()=>void generate()}>Tentar novamente</Button></AlertDescription></Alert>}{notice&&<p role="status" className="text-sm">{notice}</p>}
  {report&&<><section className="space-y-2 rounded-xl border bg-card p-4" aria-label="Diagnóstico da geração"><h2 className="font-semibold">Diagnóstico da geração</h2><p className="text-sm">{report.slides.length} posições · {pages.length} páginas · {report.slides.filter(s=>s.status==='available').length} disponíveis · {report.slides.filter(s=>s.status==='waiting-source').length} aguardando fonte.</p><p className="text-xs text-muted-foreground">Mapas divididos por capital quando necessário. Critérios e ressalvas nos insights e no JSON.</p></section><Suspense fallback={<BrainLoadingState variant="operation" title="Carregando exportações"/>}><Exports report={report}/></Suspense></>}
  {!running&&<Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="slides">Slides</TabsTrigger><TabsTrigger value="insights" disabled={!report}>Insights do analista</TabsTrigger><TabsTrigger value="references">Referências</TabsTrigger></TabsList><TabsContent value="slides" className="mt-4 space-y-4">{visible?<>{navigation}<ReportSlideHeading page={page+1} title={visible.slide.title} onExpand={()=>setExpanded(true)}/>{!expanded&&surface}<details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">Detalhes deste slide</summary><p className="mt-3 text-sm">{visible.slide.note}</p>{visible.slide.warnings.map((warning,i)=><p key={i} className="mt-2 text-sm text-muted-foreground">{warning}</p>)}</details><ReportSlideDialog open={expanded} onOpenChange={setExpanded} title={`Região ${region?.label} · slides do relatório`} description={period(s).label} navigation={navigation}>{surface}</ReportSlideDialog></>:<p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Selecione a região e a competência para gerar a prévia.</p>}</TabsContent><TabsContent value="insights" className="mt-4">{report&&<Suspense fallback={<BrainLoadingState variant="operation" title="Preparando insights"/>}><Insights report={report} onOpenSlide={number=>{setPage(number-1);setExpanded(false);setTab('slides');}}/></Suspense>}</TabsContent><TabsContent value="references" className="mt-4 space-y-3"><p className="text-sm text-muted-foreground">Modelo-base: apresentações institucionais regionais do 4T2025. Conteúdo quantitativo recalculado para a competência selecionada, sem copiar números antigos.</p>{REGIONS.map(r=><article key={r.id} className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Região {r.label}</h2><p className="text-sm text-muted-foreground">Referência: {r.referenceSlides} slides. Número de páginas geradas varia com municípios e mapas.</p><a className="text-sm text-primary underline" href={`https://drive.google.com/file/d/${r.sourceId}/view`} target="_blank" rel="noreferrer">Abrir referência original</a></article>)}</TabsContent></Tabs>}
 </div>;
}
