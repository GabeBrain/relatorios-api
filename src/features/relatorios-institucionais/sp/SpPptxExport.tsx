import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import type { SpPreview } from './model';
import { reviewSpSlides,spReviewSnapshot } from './review';

interface Job {manualEdits?:unknown;report:SpPreview;render:(page:number)=>ReactNode;controller:AbortController;startedAt:number}
export function SpPptxExport({report,renderSlide,manualEdits}:{manualEdits?:unknown;report:SpPreview;renderSlide:(page:number)=>ReactNode}) {
  const [job,setJob]=useState<Job|null>(null),[progress,setProgress]=useState(0),[error,setError]=useState(''),[message,setMessage]=useState('');
  const deck=useRef<HTMLDivElement>(null),started=useRef<AbortController|null>(null),current=useRef<Job|null>(null);
  useEffect(()=>()=>{current.current?.controller.abort();current.current=null;},[]);
  useEffect(()=>{current.current?.controller.abort();},[manualEdits]);
  useEffect(()=>{if(current.current&&current.current.report!==report)current.current.controller.abort();},[report]);
  useEffect(()=>{
    if(!job||started.current===job.controller)return;
    started.current=job.controller;
    void (async()=>{
      try {
        const {buildSpEditablePptx}=await import('./pptx-export');
        const signal=job.controller.signal;
        const slides=[...(deck.current?.querySelectorAll<HTMLElement>('[data-sp-export-slide] > :first-child')??[])];
        const deadline=Date.now()+20_000;
        while(deck.current?.querySelector('[data-sp-map-loading="true"]')){
          if(signal.aborted)throw new DOMException('Cancelado','AbortError');
          if(Date.now()>deadline)throw new Error('A base cartográfica não concluiu o carregamento. Tente novamente.');
          await new Promise(done=>setTimeout(done,100));
        }
        const audit={...spReviewSnapshot(job.report,reviewSpSlides(job.report)),manualEdits:job.manualEdits};
        const blob=await buildSpEditablePptx(slides,job.report.quarter,signal,value=>setProgress(value),audit);
        if(signal.aborted)return;
        const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`sp-institucional-${job.report.quarter}-conferencia-editavel.pptx`;link.click();
        window.setTimeout(()=>URL.revokeObjectURL(url),60_000);setMessage('PPTX gerado com 85 slides. Download iniciado.');
      } catch(cause) {
        if(current.current!==job)return;
        if(job.controller.signal.aborted)setMessage('Exportação cancelada.');
        else setError(cause instanceof Error?cause.message:'Não foi possível gerar o PPTX. Tente novamente.');
      } finally {
        if(current.current===job){current.current=null;setJob(null);}
      }
    })();
  },[job]);
  const exportDeck=useMemo(()=>job?createPortal(<div ref={deck} aria-hidden="true" style={{position:'fixed',left:-1400,top:0,width:1280,pointerEvents:'none',zIndex:-1}}>{Array.from({length:85},(_,i)=><div key={i} data-sp-export-slide={i+1} style={{position:'relative',width:1280,height:720}}>{job.render(i+1)}</div>)}</div>,document.body):null,[job]);
  return <section aria-label="Exportação PowerPoint" className="space-y-3 rounded-lg border bg-card p-4">
    <Button disabled={!!job} onClick={()=>{const next={report,manualEdits,render:renderSlide,controller:new AbortController(),startedAt:Date.now()};current.current=next;setError('');setMessage('');setProgress(0);setJob(next);}}>Baixar PPTX editável</Button>
    <p className="text-sm text-muted-foreground">Versão para conferência, com 85 slides e as pendências atuais. Textos, células, elementos vetoriais dos gráficos e retratos editáveis; imagens da referência e bases cartográficas substituíveis individualmente. Não realiza novas consultas Geobrain.</p>
    {job&&<><BrainLoadingState variant="operation" title={progress?`Gerando PowerPoint: ${progress} de 85 slides`:'Preparando PowerPoint…'} description="Mantenha esta aba aberta até concluir o arquivo." startedAt={job.startedAt}/><Button variant="outline" onClick={()=>job.controller.abort()}>Cancelar exportação</Button></>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{message&&<p role="status" className="text-sm">{message}</p>}
    {exportDeck}
  </section>;
}
