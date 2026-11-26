import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Button} from '@/components/ui/button';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';
import {Progress} from '@/components/ui/progress';
import {addNativePptxSlide,patchNativePptx,type NativePatch} from '../shared/native-pptx';
import {embedReportPptxAudit} from '../shared/pptx-audit';
import {addCharts,preserveChartBlanks} from './native-charts';
import {ReportSlide} from './ReportSlide';
import {physicalPages} from './calculate';
import {filename,period,regionOf} from './model';
import {runWorker} from './worker-client';
import type {Report} from './types';
const download=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};
async function readyImages(root:HTMLElement|null,signal:AbortSignal){
 const started=Date.now();while(root?.querySelector('[data-map-loading="true"]')){if(signal.aborted)throw new DOMException('Cancelado.','AbortError');if(Date.now()-started>30000)throw new Error('A base cartográfica não concluiu. Aguarde a prévia e tente exportar novamente.');await new Promise(r=>setTimeout(r,150));}
 await new Promise<void>((resolve,reject)=>{
  const finish=(error?:Error)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);if(error)reject(error);else resolve();},abort=()=>finish(new DOMException('Cancelado.','AbortError')),timer=setTimeout(()=>finish(new Error('Uma fonte não concluiu o carregamento. Tente novamente.')),20000);
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
  document.fonts.ready.then(()=>finish(),()=>finish(new Error('Não foi possível carregar as fontes.')));
 });
}
export default function Exports({report}:{report:Report}){
 const [job,setJob]=useState<{kind:'json'|'csv'|'pptx';controller:AbortController;startedAt:number}|null>(null),[progress,setProgress]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const current=useRef<typeof job>(null),started=useRef<typeof job>(null),deck=useRef<HTMLDivElement>(null),pages=useMemo(()=>physicalPages(report.slides),[report]);
 useEffect(()=>()=>{current.current?.controller.abort();current.current=null;},[report]);
 const portal=useMemo(()=>job?.kind==='pptx'?createPortal(<div ref={deck} aria-hidden="true" style={{position:'fixed',left:-5000,top:0,width:1280,pointerEvents:'none'}}>{pages.map((page,i)=><div data-modelo02-export={i+1} key={i} style={{width:1280,height:720}}><ReportSlide page={page} selection={report.selection} exporting/></div>)}</div>,document.body):null,[job,pages,report]);
 useEffect(()=>{
  if(!job||started.current===job)return;started.current=job;const signal=job.controller.signal;
  void(async()=>{try{
   if(job.kind!=='pptx'){const text=await runWorker<string>({mode:job.kind,report},signal);if(current.current!==job||signal.aborted)return;download(new Blob([text],{type:job.kind==='json'?'application/json':'text/csv;charset=utf-8'}),`${filename(report.selection)}-${job.kind==='json'?'diagnostico.json':'conferencia.csv'}`);}
   else{
    await new Promise(r=>setTimeout(r,0));await readyImages(deck.current,signal);
    const {default:Pptx}=await import('pptxgenjs'),pptx=new Pptx();pptx.layout='LAYOUT_WIDE';pptx.author='Brain Inteligência Estratégica';pptx.title=`Região ${regionOf(report.selection)?.label} · ${period(report.selection).label}`;
    const patches:NativePatch[]=[],nodes=[...(deck.current?.querySelectorAll<HTMLElement>('[data-modelo02-export]')??[])];if(nodes.length!==pages.length)throw new Error('Prévia indisponível para exportação.');
    for(let i=0;i<nodes.length;i++){
     if(signal.aborted||current.current!==job)throw new DOMException('Cancelado.','AbortError');
     const slide=await addNativePptxSlide(pptx,nodes[i],signal,patches),page=pages[i];if(page.slide.status==='available')addCharts(slide,page.charts);slide.addNotes([`Referência: ${page.slide.referenceNumbers?.join(', ')}`,page.slide.id,page.slide.title,page.slide.note,...page.slide.warnings,...page.slide.map?.points.map(point=>`${point.name}: ${point.stock} unidades; ${point.family}`)??[]].join('\n'));setProgress(Math.round((i+1)/nodes.length*95));await new Promise(r=>setTimeout(r,0));
    }
    const audit=JSON.parse(await runWorker<string>({mode:'json',report},signal));
    const blob=await pptx.write({outputType:'blob',compression:true}) as Blob;if(signal.aborted||current.current!==job)return;
    const bytes=embedReportPptxAudit(preserveChartBlanks(patchNativePptx(new Uint8Array(await blob.arrayBuffer()),patches)),audit,{part:'customXml/modelo02-audit.xml',namespace:'urn:brain:modelo02:audit:v1',relationshipId:'rIdModelo02Audit'});
    download(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}),`${filename(report.selection)}-editavel.pptx`);
   }
   setProgress(100);setNotice('Arquivo gerado. Download iniciado.');
  }catch(e){if(current.current===job){if(signal.aborted)setNotice('Exportação cancelada.');else setError(e instanceof Error?e.message:'Falha ao exportar.');}}
  finally{if(current.current===job){current.current=null;setJob(null);}}
  })();
 },[job,pages,report]);
 const start=(kind:'json'|'csv'|'pptx')=>{if(current.current)return;const next={kind,controller:new AbortController(),startedAt:Date.now()};current.current=next;setError('');setNotice('');setProgress(0);setJob(next);};
 return <section className="space-y-3 rounded-xl border bg-card p-4" aria-label="Exportação de Institucionais Imprensa"><h2 className="font-semibold">Arquivos desta geração</h2><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!!job} onClick={()=>start('json')}>Baixar diagnóstico JSON</Button><Button variant="outline" disabled={!!job} onClick={()=>start('csv')}>Baixar conferência CSV</Button><Button disabled={!!job} onClick={()=>start('pptx')}>Baixar PPTX editável</Button></div><p className="text-sm text-muted-foreground">{pages.length} páginas na prévia e no PPTX. Gráficos com Editar Dados, textos, tabelas e marcadores editáveis; bases cartográficas e artes são imagens. CSV inclui a conferência dos empreendimentos localizados.</p>{job&&<><BrainLoadingState variant="operation" title={`Preparando ${job.kind.toUpperCase()}`} startedAt={job.startedAt}/><Progress value={progress}/><Button variant="outline" onClick={()=>job.controller.abort()}>Cancelar exportação</Button></>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}{portal}</section>;
}
