import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { fortalezaPeriod,type FortalezaSelection } from './model';
import { buildFortalezaDiagnostic } from './diagnostic';
import type { FortalezaGenerationState } from './useFortalezaMarket';
import type { FortalezaPptxMode } from './pptx-export';

interface Job {periodicity:'monthly'|'quarterly';count:number;format:'pptx'|'pdf';controller:AbortController;startedAt:number;mode:FortalezaPptxMode;period:string;audit:unknown;render:(page:number)=>ReactNode}
export default function FortalezaPptxExport({selection,generation,renderSlide,overflow,revision}:{selection:FortalezaSelection;generation:FortalezaGenerationState|null;renderSlide:(page:number)=>ReactNode;overflow:number;revision:unknown}){
  const [mode,setMode]=useState<FortalezaPptxMode>('faithful'),[job,setJob]=useState<Job|null>(null),[progress,setProgress]=useState(0),[error,setError]=useState(''),[message,setMessage]=useState('');
  const current=useRef<Job|null>(null),started=useRef<AbortController|null>(null),deck=useRef<HTMLDivElement>(null);
  useEffect(()=>()=>{current.current?.controller.abort();current.current=null;},[]);
  useEffect(()=>{current.current?.controller.abort();},[revision]);
  useEffect(()=>{
    if(!job||started.current===job.controller)return;started.current=job.controller;
    void(async()=>{
      try{
        const {buildFortalezaMonthlyExport}=await import('./pptx-export');
        const slides=[...(deck.current?.querySelectorAll<HTMLElement>('[data-fortaleza-export-slide]')??[])];
        const blob=await buildFortalezaMonthlyExport(slides,{format:job.format,period:job.period,periodicity:job.periodicity,mode:job.mode,signal:job.controller.signal,onProgress:value=>{if(current.current===job&&!job.controller.signal.aborted)setProgress(value);},audit:job.audit});
        if(current.current!==job)return;
        if(job.controller.signal.aborted){setMessage('Exportação cancelada. Inicie novamente para usar a prévia atual.');return;}
        const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=job.format==='pdf'?`fortaleza-${job.periodicity==='monthly'?'mensal':'trimestral'}-${job.period}-conferencia.pdf`:`fortaleza-${job.periodicity==='monthly'?'mensal':'trimestral'}-${job.period}-conferencia-${job.mode==='faithful'?'fiel':'editavel'}.pptx`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
        setMessage(`${job.format==='pdf'?'PDF':'PowerPoint'} de conferência gerado com ${job.count} páginas. Download iniciado.`);
      }catch(cause){
        if(current.current!==job)return;
        if(job.controller.signal.aborted)setMessage('Exportação cancelada. Inicie novamente para usar a prévia atual.');
        else setError(cause instanceof Error?cause.message:'Não foi possível gerar o arquivo. Tente novamente.');
      }finally{if(current.current===job){current.current=null;setJob(null);}}
    })();
  },[job]);
  const exportDeck=useMemo(()=>job?createPortal(<div ref={deck} aria-hidden="true" style={{position:'fixed',left:-3000,top:0,width:1280,pointerEvents:'none',zIndex:-1}}>{Array.from({length:job.count},(_,i)=><div key={i} data-fortaleza-export-slide={i+1} style={{width:1280,height:720,position:'relative',overflow:'hidden'}}>{job.render(i+1)}</div>)}</div>,document.body):null,[job]);
  const count=selection.periodicity==='monthly'?60:89;
  const ready=generation?.phase==='done'&&generation.blueprint?.period.end===fortalezaPeriod(selection).end&&generation.blueprint.reference.slideCount===count&&overflow===0;
  const start=(format:'pptx'|'pdf')=>{
    if(!ready||!generation)return;
    const period=fortalezaPeriod(selection).end.slice(0,7),exportMode=format==='pdf'?'faithful':mode,audit={schema:'fortaleza-pptx-review-v1',exportedAt:new Date().toISOString(),format,mode:exportMode,report:buildFortalezaDiagnostic(selection,generation)};
    const next={periodicity:selection.periodicity,count,format,controller:new AbortController(),startedAt:Date.now(),mode:exportMode,period,audit,render:renderSlide};current.current=next;setError('');setMessage('');setProgress(0);setJob(next);
  };
  return <section className="space-y-3 rounded-lg border bg-card p-4" aria-label={`Exportar Fortaleza ${selection.periodicity==='monthly'?'mensal':'trimestral'}`}>
    <div className="flex flex-wrap items-end gap-3"><div className="w-64 space-y-1.5"><label htmlFor="fortaleza-pptx-mode" className="text-sm font-medium">PowerPoint para conferência</label><Select value={mode} disabled={!!job} onValueChange={value=>setMode(value as FortalezaPptxMode)}><SelectTrigger id="fortaleza-pptx-mode"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="faithful">Fiel à prévia · lâminas em imagem</SelectItem><SelectItem value="editable">Textos e células editáveis</SelectItem></SelectContent></Select></div><Button disabled={!ready||!!job} onClick={()=>start('pptx')}>Baixar PPTX de conferência</Button><Button variant="outline" disabled={!ready||!!job} onClick={()=>start('pdf')}>Baixar PDF de conferência</Button></div>
    <p className="text-sm text-muted-foreground">{count} páginas na ordem original, com os dados e a equipe da prévia. Não consulta novamente a GeoBrain. Fontes pendentes e revisão metodológica permanecem na auditoria do arquivo.</p>
    <p className="text-xs text-muted-foreground">{mode==='faithful'?'Preserva a aparência em imagens de alta resolução. Edite os dados e a equipe na prévia antes de baixar.':'Textos e células dinâmicos editáveis; gráficos, fotos, rótulos inclinados e artes em imagem. Requer a fonte Montserrat instalada para manter as medidas.'}</p>
    {!ready&&!job&&<p className="text-sm text-muted-foreground">{overflow>0?`${overflow} lançamento(s) excedem as páginas iniciais. É necessário tratar a continuação antes de exportar.`:'Conclua uma geração para liberar o download.'}</p>}
    {job&&<><BrainLoadingState variant="operation" title={`Gerando ${job.format==='pdf'?'PDF':'PowerPoint'}: ${progress} de ${job.count} páginas`} startedAt={job.startedAt}/><Button variant="outline" onClick={()=>job.controller.abort()}>Cancelar exportação</Button></>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{message&&<p role="status" className="text-sm">{message}</p>}{exportDeck}
  </section>;
}
