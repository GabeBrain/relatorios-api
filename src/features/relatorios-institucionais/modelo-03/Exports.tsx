import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {addNativePptxSlide,patchNativePptx,type NativePatch} from '../shared/native-pptx';
import {embedReportPptxAudit} from '../shared/pptx-audit';
import {ReportSlide} from './ReportSlide';
import {presentationPages} from './presentation';
import {filename,diagnostic} from './diagnostic';
import {period} from './model';
import {runWorker} from './worker-client';
import type {Report} from './types';
const download=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};
function waitFonts(signal:AbortSignal){return new Promise<void>((resolve,reject)=>{const finish=(error?:Error)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);if(error)reject(error);else resolve();},abort=()=>finish(new DOMException('Cancelado.','AbortError')),timer=setTimeout(()=>finish(new Error('Uma fonte não concluiu o carregamento. Tente novamente.')),20000);signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}document.fonts.ready.then(()=>finish(),()=>finish(new Error('Não foi possível carregar as fontes.')));});}
export default function Exports({report}:{report:Report}){
 const [job,setJob]=useState<{kind:'json'|'csv'|'pptx';controller:AbortController;report:Report;startedAt:number}|null>(null),[value,setValue]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const active=useRef<typeof job>(null),deck=useRef<HTMLDivElement>(null),started=useRef<typeof job>(null);
 useEffect(()=>()=>{active.current?.controller.abort();active.current=null;},[report]);
 const portal=useMemo(()=>job?.kind==='pptx'?createPortal(<div ref={deck} aria-hidden="true" style={{position:'fixed',left:-4000,top:0,width:1280,pointerEvents:'none'}}>{presentationPages(job.report.slides).map((p,i)=><div key={i} data-modelo03-export={i+1} style={{width:1280,height:720}}><ReportSlide page={p} selection={job.report.selection}/></div>)}</div>,document.body):null,[job]);
 useEffect(()=>{
  if(!job||started.current===job)return;started.current=job;const signal=job.controller.signal;
  void(async()=>{try{
   if(job.kind!=='pptx'){const text=await runWorker<string>({mode:job.kind,report:job.report},signal);if(signal.aborted||active.current!==job)return;setValue(100);download(new Blob([text],{type:job.kind==='json'?'application/json':'text/csv;charset=utf-8'}),`${filename(job.report.selection)}-${job.kind==='json'?'diagnostico.json':'conferencia.csv'}`);}
   else{
    await new Promise(r=>setTimeout(r,0));await waitFonts(signal);
    const {default:Pptx}=await import('pptxgenjs');if(signal.aborted)return;
    const auditText=await runWorker<string>({mode:'json',report:job.report},signal),audit=JSON.parse(auditText) as ReturnType<typeof diagnostic>;
    const pptx=new Pptx();pptx.layout='LAYOUT_WIDE';pptx.author='Brain Inteligência Estratégica';pptx.title=`${job.report.selection.entity} · ${job.report.selection.city} · ${period(job.report.selection).label}`;
    pptx.subject='Modelo 03: textos, tabelas e gráficos em elementos vetoriais editáveis; diagnóstico nas notas e customXml.';
    const patches:NativePatch[]=[],nodes=[...(deck.current?.querySelectorAll<HTMLElement>('[data-modelo03-export]')??[])],pages=presentationPages(job.report.slides);
    if(nodes.length!==pages.length)throw new Error('A prévia do PowerPoint ainda não está disponível. Tente novamente.');
    for(let i=0;i<nodes.length;i++){
     if(signal.aborted)throw new DOMException('Cancelado.','AbortError');const slide=await addNativePptxSlide(pptx,nodes[i],signal,patches),p=pages[i];
     slide.addNotes([`${job.report.selection.entity} · ${period(job.report.selection).label}`,`Referência ADEMI-PR: posição ${p.slide.definition.sourcePage} · parte ${p.part}/${p.parts}`,`Situação: ${p.slide.status}`,p.slide.issue??'',...p.slide.warnings,p.slide.note,'Textos/células/gráficos vetoriais editáveis; artes institucionais são imagens substituíveis. Gráficos sem planilha vinculada. Não homologado.'].filter(Boolean).join('\n'));
     if(active.current!==job||signal.aborted)return;setValue(Math.round((i+1)/nodes.length*95));await new Promise(r=>setTimeout(r,0));
    }
    const blob=await pptx.write({outputType:'blob',compression:true}) as Blob;if(signal.aborted||active.current!==job)return;
    const bytes=embedReportPptxAudit(patchNativePptx(new Uint8Array(await blob.arrayBuffer()),patches),audit,{part:'customXml/modelo03-audit.xml',namespace:'urn:brain:modelo03:audit:v1',relationshipId:'rIdModelo03Audit'});
    if(signal.aborted||active.current!==job)return;setValue(100);download(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}),`${filename(job.report.selection)}-editavel.pptx`);
   }
   setNotice('Arquivo gerado. Download iniciado.');
  }catch(e){if(active.current===job){if(signal.aborted)setNotice('Exportação cancelada.');else setError(e instanceof Error?e.message:'Falha na exportação.');}}
  finally{if(active.current===job){active.current=null;setJob(null);}}
  })();
 },[job]);
 const start=(kind:'json'|'csv'|'pptx')=>{if(active.current)return;const next={kind,controller:new AbortController(),report,startedAt:Date.now()};active.current=next;setError('');setNotice('');setValue(0);setJob(next);};
 const count=presentationPages(report.slides).length;
 return <section className="space-y-3 rounded-xl border bg-card p-4" aria-label="Exportação do Modelo 03"><h2 className="font-semibold">Arquivos desta geração</h2><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!!job} onClick={()=>start('json')}>Baixar diagnóstico JSON</Button><Button variant="outline" disabled={!!job} onClick={()=>start('csv')}>Baixar conferência CSV</Button><Button disabled={!!job} onClick={()=>start('pptx')}>Baixar PPTX editável</Button></div><p className="text-sm text-muted-foreground">{count} páginas na prévia e no PowerPoint. Textos, células e gráficos vetoriais editáveis; artes institucionais são imagens substituíveis. JSON e CSV incluem os indicadores, cobertura, categorias e pendências.</p>{job&&<div className="space-y-3"><BrainLoadingState variant="operation" title={`Preparando ${job.kind.toUpperCase()} · ${value}%`} startedAt={job.startedAt}/><Progress value={value} aria-valuenow={value} className="mt-4 w-64 bg-muted"/><Button variant="outline" className="mt-4" onClick={()=>job.controller.abort()}>Cancelar exportação</Button></div>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}{portal}</section>;
}
