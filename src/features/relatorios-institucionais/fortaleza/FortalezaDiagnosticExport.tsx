import { useEffect,useRef,useState } from 'react';
import { Button } from '@/components/ui/button';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import type { FortalezaGenerationState } from './useFortalezaMarket';
import type { FortalezaSelection } from './model';
import type { buildFortalezaDiagnostic,DiagnosticGeneration } from './diagnostic';
type Snapshot=ReturnType<typeof buildFortalezaDiagnostic>;
export function FortalezaDiagnosticExport({selection,state}:{selection:FortalezaSelection;state:FortalezaGenerationState}){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[startedAt,setStartedAt]=useState<number|null>(null),[cancelled,setCancelled]=useState(false);const running=useRef<Worker|null>(null);
  useEffect(()=>{
    setSnapshot(null);setError(false);setCancelled(false);setLoading(state.phase==='done');
    if(state.phase!=='done')return;
    let worker:Worker|undefined,active=true;setStartedAt(Date.now());
    try {
      worker=new Worker(new URL('./diagnostic.worker.ts',import.meta.url),{type:'module'});
      running.current=worker;
      worker.onmessage=(event:MessageEvent<{type:string;snapshot?:Snapshot}>)=>{if(!active||running.current!==worker)return;setLoading(false);if(event.data.type==='ready'&&event.data.snapshot)setSnapshot(event.data.snapshot);else setError(true);worker?.terminate();running.current=null;};
      worker.onerror=()=>{if(!active||running.current!==worker)return;setLoading(false);setError(true);worker?.terminate();running.current=null;};
      const generation:DiagnosticGeneration={phase:state.phase,startedAt:state.startedAt,finishedAt:state.finishedAt,blueprint:state.blueprint,report:state.report,intro:state.intro,monthlyLaunches:state.monthlyLaunches};
      worker.postMessage({selection,generation});
    } catch {setLoading(false);setError(true);}
    return ()=>{active=false;worker?.terminate();if(running.current===worker)running.current=null;};
  },[state,selection,attempt]);
  if(state.phase!=='done')return null;
  const download=()=>{if(!snapshot)return;const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`fortaleza-${selection.periodicity==='monthly'?`mensal-${selection.year}-${String(selection.position).padStart(2,'0')}`:`trimestral-${selection.position}T${selection.year}`}-diagnostico.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <section className="space-y-3 rounded-xl border bg-card p-4" aria-label="Diagnóstico do relatório"><h2 className="font-semibold">Diagnóstico da geração</h2><p className="text-sm text-muted-foreground">Preparado automaticamente com a situação e os valores calculados de cada slide, fontes e pendências. Não inclui token, fotos ou históricos individuais e não equivale à homologação.</p>
    {loading&&<div className="flex flex-wrap items-center gap-3"><BrainLoadingState variant="field" title="Preparando diagnóstico JSON" startedAt={startedAt}/><Button variant="outline" onClick={()=>{running.current?.terminate();running.current=null;setLoading(false);setCancelled(true);}}>Cancelar diagnóstico</Button></div>}
    {cancelled&&<p role="status">Diagnóstico cancelado.<Button variant="outline" className="ml-3" onClick={()=>setAttempt(value=>value+1)}>Preparar diagnóstico</Button></p>}
    {error&&<p role="alert" className="text-sm text-destructive">Não foi possível preparar o diagnóstico.<Button variant="outline" className="ml-3" onClick={()=>setAttempt(value=>value+1)}>Tentar diagnóstico novamente</Button></p>}
    {snapshot&&<><p className="text-sm">{snapshot.slides.length} slides · {snapshot.summary.available} com dados disponíveis · {snapshot.summary['source-pending']} aguardando fonte · {snapshot.summary['editorial-review']} para revisão editorial{snapshot.summary['not-implemented']?` · ${snapshot.summary['not-implemented']} ainda não implementados`:''}.</p><Button variant="outline" onClick={download}>Baixar diagnóstico JSON</Button></>}
  </section>;
}
