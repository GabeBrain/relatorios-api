import {ReportLoading} from './ReportLoading';
import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronsUpDown,FileChartColumn} from 'lucide-react';
import {Alert,AlertDescription,AlertTitle} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Command,CommandEmpty,CommandGroup,CommandInput,CommandItem,CommandList} from '@/components/ui/command';
import {Progress as ProgressBar} from '@/components/ui/progress';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';
import {GeoApiScopeSelector,useGeoApiScope,type GeoScope} from '@/features/shared/geo-api-scope-engine';
import {useAuthStore} from '@/store/auth-store';
import {PRESETS,regionalOptions,regionalDefaults,regionalMissing,regionalPreset,norm,period,periodIssue,periods,periodSize,rmLabel,scopeIssue,selectionKey,type Selection,type Periodicity} from './model';
import {DEFINITIONS_FOR} from './blueprint';
import {collect} from './api';
import {runWorker} from './worker-client';
import {presentationPages} from './presentation';
import {ReportSlide} from './ReportSlide';
import type {Progress,Report,Slide} from './types';
const Exports=lazy(()=>import('./Exports'));
const stages=[{id:'scope',label:'Validar recorte e competência'},{id:'sources',label:'Consultar fontes municipais'},{id:'calculations',label:'Calcular e conferir indicadores'},{id:'slides',label:'Organizar os slides'}];
const pct=(p:Progress)=>p.total?Math.floor(p.completed/p.total*100):0;
const initial=():Selection=>{const now=new Date(),previous=new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3-1,1);return {uf:'',city:'',entity:'ADEMI-PR',periodicity:'quarterly',year:previous.getFullYear(),position:Math.ceil((previous.getMonth()+1)/3),includeRm:false,rmCities:[]};};
export default function Modelo03Page(){
 const [s,setS]=useState<Selection>(initial),[presetId,setPresetId]=useState(''),[entityMode,setEntityMode]=useState('ADEMI-PR'),[rmOpen,setRmOpen]=useState(false),[report,setReport]=useState<Report|null>(null),[progress,setProgress]=useState<Progress|null>(null),[startedAt,setStartedAt]=useState<number|null>(null),[running,setRunning]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[page,setPage]=useState(0);
 const token=useAuthStore(state=>state.getToken()),active=useRef<AbortController|null>(null),key=selectionKey(s);
 const changeGeo=(next:GeoScope)=>{setPresetId('');setS(current=>({...current,...next,includeRm:!!regionalPreset(next.uf,next.city),rmCities:regionalDefaults(next.uf,next.city,geo.citiesByUf)}));};
 const geo=useGeoApiScope({value:{uf:s.uf,city:s.city},onChange:changeGeo}),preset=PRESETS.find(p=>p.id===presetId);
 useEffect(()=>{active.current?.abort();active.current=null;setRunning(false);setReport(null);setProgress(null);setError('');setNotice('');setPage(0);},[key,token]);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 const set=(patch:Partial<Selection>)=>setS(current=>({...current,...patch}));
 const usePreset=(id:string)=>{const p=PRESETS.find(p=>p.id===id);setPresetId(id);if(!p)return;const city=(geo.citiesByUf?.[p.uf]??[]).find(c=>norm(c)===norm(p.city))??'';setEntityMode(p.entity);set({...s,entity:p.entity,uf:city?p.uf:'',city,includeRm:p.regional!=='city',rmCities:regionalDefaults(p.uf,city,geo.citiesByUf)});};
 const unavailable=scopeIssue(s,geo.citiesByUf),calendarIssue=periodIssue(s),ready=geo.hasToken&&geo.strictReady&&!geo.error&&!geo.isLoading&&!unavailable&&!calendarIssue;
 const rmOptions=useMemo(()=>regionalOptions(s.uf,s.city,geo.citiesByUf),[geo.citiesByUf,s.uf,s.city]),regional=regionalPreset(s.uf,s.city),missing=regionalMissing(s.uf,s.city,geo.citiesByUf);
 const pages=useMemo(()=>presentationPages(report?.slides??[]),[report]),visible=pages[Math.min(page,Math.max(0,pages.length-1))];
 const summary=useMemo(()=>report?{available:report.slides.filter(s=>s.status==='available').length,waiting:report.slides.filter(s=>s.status==='waiting-source').length,editorial:report.slides.filter(s=>s.status==='editorial').length}:null,[report]);
 const cover:Slide={definition:{kind:'editorial',sourcePage:1,title:'Panorama do mercado imobiliário'},status:'editorial',issue:null,warnings:[],tables:[],sourceKeys:[],note:''};
 const generate=async()=>{
  if(!ready||active.current)return;const controller=new AbortController();active.current=controller;const selection=structuredClone(s),started=new Date().toISOString();setStartedAt(Date.now());setRunning(true);setReport(null);setPage(0);setError('');setNotice('');setProgress({stage:'scope',completed:0,total:1,message:'Confirmando acesso e período',waiting:false});
  const update=(p:Progress)=>{if(active.current===controller&&!controller.signal.aborted)setProgress(p);};
  try{
   const sources=await collect(selection,geo.citiesByUf,{token:token??'',signal:controller.signal,onProgress:update});
   update({stage:'calculations',completed:0,total:DEFINITIONS_FOR(selection.includeRm).length,message:'Conferindo fontes e fotografias históricas',waiting:false});
   const next=await runWorker<Report>({mode:'calculate',selection,sources,startedAt:started},controller.signal,update);
   update({stage:'slides',completed:0,total:1,message:'Organizando a prévia e a conferência',waiting:false});
   presentationPages(next.slides);
   if(controller.signal.aborted||active.current!==controller)return;setReport(next);update({stage:'slides',completed:1,total:1,message:'Prévia concluída',waiting:false});
  }catch(e){if(active.current!==controller)return;if(controller.signal.aborted)setNotice('Consulta cancelada. Você pode gerar novamente.');else setError(e instanceof Error?e.message:'Não foi possível gerar o relatório.');}
  finally{if(active.current===controller){active.current=null;setRunning(false);}}
 };
 const years=Array.from({length:new Date().getFullYear()-2020},(_,i)=>2021+i).reverse();
 const entities=[...new Set(PRESETS.map(p=>p.entity))];
 return <div className="relative mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
  <header className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relatórios institucionais</p><div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><FileChartColumn className="h-7 w-7" aria-hidden="true"/></span><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">Modelo 03</h1><Badge variant="secondary">Em implantação</Badge></div><p className="mt-1 text-sm text-muted-foreground">Panorama imobiliário por entidade e município · referência ADEMI-PR.</p></div></div></header>
  <section className="space-y-5 rounded-xl border bg-card p-4 sm:p-6" aria-label="Configuração do Modelo 03">
   <h2 className="font-semibold">Configure o relatório</h2>
   <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor="modelo03-preset" className="text-sm font-medium">Referência de entidade e cidade</label><Select value={presetId} disabled={running} onValueChange={usePreset}><SelectTrigger id="modelo03-preset"><SelectValue placeholder="Selecionar referência (opcional)"/></SelectTrigger><SelectContent>{PRESETS.map(p=><SelectItem key={p.id} value={p.id}>{p.city} · {p.entity}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><label htmlFor="modelo03-entity" className="text-sm font-medium">Entidade na capa e no relatório</label><Select value={entityMode} disabled={running} onValueChange={value=>{setEntityMode(value);set({entity:value==='custom'?'':value});}}><SelectTrigger id="modelo03-entity"><SelectValue/></SelectTrigger><SelectContent>{entities.map(entity=><SelectItem key={entity} value={entity}>{entity}</SelectItem>)}<SelectItem value="custom">Outra entidade</SelectItem></SelectContent></Select></div></div>
   {entityMode==='custom'&&<div className="space-y-1.5"><label htmlFor="modelo03-custom-entity" className="text-sm font-medium">Nome da entidade</label><Input id="modelo03-custom-entity" value={s.entity} maxLength={100} disabled={running} onChange={event=>set({entity:event.target.value})}/></div>}
   <GeoApiScopeSelector value={{uf:s.uf,city:s.city}} onChange={changeGeo} disabled={running}/>
   {geo.isLoading&&<BrainLoadingState variant="field" title="Carregando municípios autorizados"/>}
   {geo.hasToken&&!geo.isLoading&&!geo.error&&!geo.availableUfs.length&&<p role="status" className="text-sm text-muted-foreground">Seu acesso não retornou municípios monitorados.</p>}
   {preset&&<p className="text-sm text-muted-foreground">Referência: {preset.evidence} {!s.city?'Selecione a cidade no catálogo autorizado.':''}</p>}
   <div className="flex items-center gap-2"><Checkbox id="modelo03-rm" checked={s.includeRm} disabled={running||!s.city||!geo.strictReady||!regional} onCheckedChange={checked=>set({includeRm:checked===true,rmCities:checked===true?regionalDefaults(s.uf,s.city,geo.citiesByUf):[]})}/><label htmlFor="modelo03-rm" className="text-sm font-medium">Incluir região metropolitana</label></div>
   {s.includeRm&&<div className="space-y-3"><p className="text-sm text-muted-foreground">A faixa RM soma somente os municípios selecionados abaixo. A cidade principal é apresentada separadamente.</p><Popover open={rmOpen} onOpenChange={setRmOpen}><PopoverTrigger asChild><Button variant="outline" disabled={running||!geo.strictReady} className="h-auto min-h-10 w-full justify-between text-left"><span>{s.rmCities.length?`${s.rmCities.length} municípios selecionados`:'Selecionar municípios da RM'}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0"/></Button></PopoverTrigger><PopoverContent className="w-[min(420px,90vw)] p-0" align="start"><Command><CommandInput placeholder="Buscar município ou UF"/><CommandList><CommandEmpty>Nenhum município autorizado encontrado.</CommandEmpty><CommandGroup>{rmOptions.map(option=><CommandItem key={option.value} value={option.label} onSelect={()=>set({rmCities:s.rmCities.includes(option.value)?s.rmCities.filter(v=>v!==option.value):[...s.rmCities,option.value]})}><Check className={`mr-2 h-4 w-4 ${s.rmCities.includes(option.value)?'opacity-100':'opacity-0'}`}/>{option.label}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover>
    {!!s.rmCities.length&&<div className="flex flex-wrap gap-2">{s.rmCities.map(value=><Button key={value} size="sm" variant="secondary" disabled={running} onClick={()=>set({rmCities:s.rmCities.filter(v=>v!==value)})}>{rmLabel(value,s.uf)} ×</Button>)}</div>}
    {regional&&<Button variant="outline" size="sm" disabled={running} onClick={()=>set({rmCities:regionalDefaults(s.uf,s.city,geo.citiesByUf)})}>Restaurar recorte da referência</Button>}
    {!!missing.length&&<p role="status" className="text-sm text-muted-foreground">Municípios da referência sem acesso na API: {missing.join(', ')}. Não foram incluídos no cálculo.</p>}
   </div>}
   {s.city&&!regional&&<p className="text-sm text-muted-foreground">Sem recorte regional cadastrado para esta cidade.</p>}
   <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-1.5"><label htmlFor="modelo03-periodicity" className="text-sm font-medium">Periodicidade</label><Select value={s.periodicity} disabled={running} onValueChange={v=>{const next=v as Periodicity;set({periodicity:next,position:Math.ceil(s.position*periodSize(s.periodicity)/periodSize(next))});}}><SelectTrigger id="modelo03-periodicity"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="quarterly">Trimestral</SelectItem><SelectItem value="semiannual">Semestral</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><label htmlFor="modelo03-position" className="text-sm font-medium">Competência</label><Select value={String(s.position)} disabled={running} onValueChange={v=>set({position:Number(v)})}><SelectTrigger id="modelo03-position"><SelectValue/></SelectTrigger><SelectContent>{periods(s.periodicity).map(p=><SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><label htmlFor="modelo03-year" className="text-sm font-medium">Ano</label><Select value={String(s.year)} disabled={running} onValueChange={v=>set({year:Number(v)})}><SelectTrigger id="modelo03-year"><SelectValue/></SelectTrigger><SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div></div>
   <p className="text-sm font-medium">{period(s).label} · Correção monetária: INCC-DI</p>
   <Button disabled={!ready||running} onClick={()=>void generate()}>Gerar relatório</Button>
   {!running&&(calendarIssue||unavailable)&&<p role="status" className="text-sm text-muted-foreground">{calendarIssue??unavailable}</p>}
  </section>
  {running&&progress&&<ReportLoading title="Consultando fontes do Modelo 03" description={progress.waiting?'Aguardando resposta da API · retomada automática':progress.message} startedAt={startedAt}><ol className="mt-5 w-full max-w-md space-y-3">{stages.map((stage,i)=>{const current=stages.findIndex(v=>v.id===progress.stage),value=i<current?100:i===current?pct(progress):0;return <li key={stage.id} className="rounded-xl border bg-card p-3"><div className="mb-2 flex justify-between gap-2 text-sm"><span>{stage.label}</span><span>{value}%</span></div><ProgressBar value={value} aria-label={stage.label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-2.5 bg-muted"/></li>;})}</ol><Button variant="outline" className="mt-4" onClick={()=>active.current?.abort()}>Cancelar consulta</Button></ReportLoading>}
  {error&&<Alert variant="destructive"><AlertTitle>Geração não concluída</AlertTitle><AlertDescription>{error}<Button variant="outline" className="mt-3 block" disabled={!ready||running} onClick={()=>void generate()}>Tentar novamente</Button></AlertDescription></Alert>}
  {notice&&<p role="status" className="text-sm">{notice}</p>}
  {report&&summary&&<><section className="space-y-2 rounded-xl border bg-card p-4" aria-label="Diagnóstico da geração"><h2 className="font-semibold">Diagnóstico da geração</h2><p className="text-sm">{report.slides.length} posições · {summary.available} com dados disponíveis · {summary.waiting} aguardando fonte · {summary.editorial} editoriais · {pages.length} páginas na prévia.</p><p className="text-xs text-muted-foreground">Fontes externas e intenção de compra fora desta primeira versão. Textos prospectivos e equipe precisam da revisão do analista.</p></section><Suspense fallback={<BrainLoadingState variant="operation" title="Carregando exportações"/>}><Exports report={report}/></Suspense></>}
  <Tabs defaultValue="slides"><TabsList><TabsTrigger value="slides">Slides</TabsTrigger><TabsTrigger value="references">Referências e critérios</TabsTrigger></TabsList><TabsContent value="slides" className="mt-4 space-y-4">
   {visible&&<div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(v=>v-1)}>Anterior</Button><label htmlFor="modelo03-page" className="sr-only">Página da prévia</label><Select value={String(page)} onValueChange={v=>setPage(Number(v))}><SelectTrigger id="modelo03-page" className="w-64"><SelectValue/></SelectTrigger><SelectContent>{pages.map((p,i)=><SelectItem key={i} value={String(i)}>{i+1} · {p.slide.definition.title}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={page>=pages.length-1} onClick={()=>setPage(v=>v+1)}>Próximo</Button></div>}
   <div className="overflow-hidden border bg-white shadow-sm"><ReportSlide page={visible??{slide:cover,table:null,part:1,parts:1}} selection={s}/></div>
   {visible&&<details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-medium">Detalhes deste slide · referência {visible.slide.definition.sourcePage}</summary><p className="mt-3 text-sm">{visible.slide.issue??visible.slide.note}</p>{visible.slide.warnings.map((warning,i)=><p key={i} className="mt-2 text-sm text-muted-foreground">{warning}</p>)}</details>}
  </TabsContent><TabsContent value="references" className="mt-4 space-y-4"><Alert><AlertTitle>Base ADEMI-PR · 2T2026</AlertTitle><AlertDescription>58 posições de indicadores e 39 institucionais/editoriais antes dos ajustes de RM e paginação. INCC-DI definido como base. Oferta final é fotografia do fechamento; fluxos usam meses do período selecionado. Competências ausentes não são convertidas em zero.</AlertDescription></Alert><a className="text-sm text-primary underline" target="_blank" rel="noreferrer" href="https://drive.google.com/file/d/1cLd59MFqyICd7A7j9B-ZcUhot0W3O-xl/view">Abrir referência principal ADEMI-PR</a><div className="grid gap-3 sm:grid-cols-2">{PRESETS.map(p=><article key={p.id} className="space-y-2 rounded-xl border bg-card p-4"><h3 className="font-semibold">{p.city} · {p.entity}</h3><p className="text-xs text-muted-foreground">{p.regional==='city'?'Cidade única':p.regional==='pair'?'Conjunto de duas cidades':'Cidade e RM'} · {p.evidence}</p><a className="text-sm text-primary underline" href={`https://drive.google.com/file/d/${p.sourceId}/view`} target="_blank" rel="noreferrer">Abrir original</a></article>)}</div></TabsContent></Tabs>
 </div>;
}
