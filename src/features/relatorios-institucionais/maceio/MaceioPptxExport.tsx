import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Button} from '@/components/ui/button';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';
import {maceioPeriod,maceioPeriodIsClosed,maceioReference,type MaceioSelection} from './model';
import type {MaceioGenerationState} from './useMaceioMarket';
import type {DiagnosticGeneration} from './diagnostic';
import type {MaceioPptxAudit} from './pptx-export';

interface Job {selection:MaceioSelection;generation:DiagnosticGeneration;count:number;controller:AbortController;startedAt:number;render:(page:number)=>ReactNode}
export default function MaceioPptxExport({selection,generation,renderSlide,revision}:{selection:MaceioSelection;generation:MaceioGenerationState|null;renderSlide:(page:number)=>ReactNode;revision:unknown}){
 const [job,setJob]=useState<Job|null>(null),[progress,setProgress]=useState(0),[stage,setStage]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 const active=useRef<Job|null>(null),deck=useRef<HTMLDivElement>(null),started=useRef<Job|null>(null),worker=useRef<Worker|null>(null);
 useEffect(()=>{active.current?.controller.abort();setError('');setMessage('');},[revision]);
 useEffect(()=>()=>{active.current?.controller.abort();active.current=null;worker.current?.terminate();},[]);
 useEffect(()=>{
  if(!job||started.current===job)return;started.current=job;
  void(async()=>{
   try{
    // Paint the loading state before processing the complete deck.
    await new Promise<void>(resolve=>setTimeout(resolve,0));
    if(job.controller.signal.aborted)throw new DOMException('Exportação cancelada.','AbortError');
    const audit=await new Promise<MaceioPptxAudit>((resolve,reject)=>{
     const instance=new Worker(new URL('./pptx-audit.worker.ts',import.meta.url),{type:'module'});worker.current=instance;
     const cleanup=()=>{instance.terminate();if(worker.current===instance)worker.current=null;job.controller.signal.removeEventListener('abort',abort);};
     const abort=()=>{cleanup();reject(new DOMException('Exportação cancelada.','AbortError'));};
     instance.onmessage=(event:MessageEvent<{type:string;audit?:MaceioPptxAudit}>)=>{cleanup();if(event.data.type==='ready'&&event.data.audit)resolve(event.data.audit);else reject(new Error('Não foi possível preparar a auditoria do PowerPoint. Tente novamente.'));};
     instance.onerror=()=>{cleanup();reject(new Error('Não foi possível preparar a auditoria do PowerPoint. Tente novamente.'));};
     job.controller.signal.addEventListener('abort',abort,{once:true});
     if(job.controller.signal.aborted){abort();return;}
     try{instance.postMessage({selection:job.selection,generation:job.generation});}catch(cause){cleanup();reject(cause);}
    });
    if(active.current!==job||job.controller.signal.aborted)return;
    setStage('Gerando páginas editáveis');
    const {buildMaceioPptx,maceioPptxFilename}=await import('./pptx-export');
    const slides=[...(deck.current?.querySelectorAll<HTMLElement>('[data-maceio-export-slide]')??[])];
    const blob=await buildMaceioPptx(slides,{selection:job.selection,signal:job.controller.signal,audit,onProgress:value=>{if(active.current===job&&!job.controller.signal.aborted)setProgress(value);}});
    if(active.current!==job||job.controller.signal.aborted)return;
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=maceioPptxFilename(job.selection);link.click();setTimeout(()=>URL.revokeObjectURL(url),60_000);
    setMessage(`PowerPoint editável gerado com ${job.count} páginas. Download iniciado.`);
   }catch(cause){
    if(active.current!==job)return;
    if(job.controller.signal.aborted)setMessage('Exportação cancelada. Você pode iniciar novamente.');
    else setError(cause instanceof Error?cause.message:'Não foi possível gerar o PowerPoint. Tente novamente.');
   }finally{if(active.current===job){if(job.controller.signal.aborted)setMessage('Exportação cancelada. Você pode iniciar novamente.');active.current=null;setJob(null);}}
  })();
 },[job]);
 const count=maceioReference(selection.periodicity).slideCount,blueprint=generation?.blueprint;
 const ready=generation?.phase==='done'&&!!generation.intro&&!!blueprint&&blueprint.period.end===maceioPeriod(selection).end&&blueprint.reference.slideCount===count&&Object.keys(selection).every(key=>blueprint.selection[key as keyof MaceioSelection]===selection[key as keyof MaceioSelection])&&maceioPeriodIsClosed(selection);
 const start=()=>{
  if(!ready||!generation||active.current)return;
  const snapshot:DiagnosticGeneration={phase:generation.phase,startedAt:generation.startedAt,finishedAt:generation.finishedAt,blueprint:generation.blueprint,report:generation.report,intro:generation.intro};
  const next:Job={selection:{...selection},generation:snapshot,count,controller:new AbortController(),startedAt:Date.now(),render:renderSlide};active.current=next;setError('');setMessage('');setProgress(0);setStage('Preparando fontes e avisos');setJob(next);
 };
 return <section className="space-y-3 rounded-xl border bg-card p-4" aria-label="Exportar PowerPoint Maceió">
  <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">PowerPoint editável</h3><Button disabled={!ready||!!job} onClick={start}>Baixar PPTX editável</Button></div>
  <p className="text-sm text-muted-foreground">{count} páginas na ordem da prévia. Textos, células e elementos dos gráficos são editáveis; fotos e artes são imagens substituíveis. Os gráficos usam formas separadas. Requer Tahoma instalada.</p>
  <p className="text-xs text-muted-foreground">Usa os dados desta geração. Fontes pendentes permanecem identificadas; cobertura, avisos e competência CAGED constam nas notas e na auditoria do arquivo.</p>
  {!ready&&!job&&<p className="text-sm text-muted-foreground">Conclua uma geração deste período para liberar o download.</p>}
  {job&&<><BrainLoadingState variant="operation" title={`${stage} · ${progress} de ${job.count} páginas`} startedAt={job.startedAt}/><Button variant="outline" onClick={()=>job.controller.abort()}>Cancelar exportação</Button></>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{message&&<p role="status" className="text-sm">{message}</p>}
  {job&&createPortal(<div ref={deck} aria-hidden="true" style={{position:'fixed',left:-3000,top:0,width:1280,pointerEvents:'none',zIndex:-1}}>{Array.from({length:job.count},(_,i)=><div key={i} data-maceio-export-slide={i+1} style={{width:1280,height:720,position:'relative',overflow:'hidden'}}>{job.render(i+1)}</div>)}</div>,document.body)}
 </section>;
}
