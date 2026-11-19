import { Alert,AlertTitle,AlertDescription } from '@/components/ui/alert';
import { MaceioProductReviewTable } from './MaceioProductReviewTable';
import { useEffect,useRef,useState } from 'react';
import { Button } from '@/components/ui/button';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import type { MaceioGenerationState } from './useMaceioMarket';
import type { MaceioSelection } from './model';
import type { buildMaceioDiagnostic,DiagnosticGeneration } from './diagnostic';
import type { MaceioClosedReview } from './closed-review';
import type { MaceioStockReview } from './stock-review';
type Snapshot=ReturnType<typeof buildMaceioDiagnostic>;
export function MaceioDiagnosticExport({selection,state}:{selection:MaceioSelection;state:MaceioGenerationState}){
  const [stockReview,setStockReview]=useState<MaceioStockReview|null>(null);
  const [closedReview,setClosedReview]=useState<MaceioClosedReview|null>(null);
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[startedAt,setStartedAt]=useState<number|null>(null),[cancelled,setCancelled]=useState(false);const running=useRef<Worker|null>(null);
  useEffect(()=>{
    setSnapshot(null);setClosedReview(null);setStockReview(null);setError(false);setCancelled(false);setLoading(state.phase==='done');
    if(state.phase!=='done')return;
    let worker:Worker|undefined,active=true;setStartedAt(Date.now());
    try {
      worker=new Worker(new URL('./diagnostic.worker.ts',import.meta.url),{type:'module'});
      running.current=worker;
      worker.onmessage=(event:MessageEvent<{type:string;snapshot?:Snapshot;closedReview?:MaceioClosedReview;stockReview?:MaceioStockReview}>)=>{if(!active||running.current!==worker)return;setLoading(false);if(event.data.type==='ready'&&event.data.snapshot){setSnapshot(event.data.snapshot);setClosedReview(event.data.closedReview??null);setStockReview(event.data.stockReview??null);}else setError(true);worker?.terminate();running.current=null;};
      worker.onerror=()=>{if(!active||running.current!==worker)return;setLoading(false);setError(true);worker?.terminate();running.current=null;};
      const generation:DiagnosticGeneration={phase:state.phase,startedAt:state.startedAt,finishedAt:state.finishedAt,blueprint:state.blueprint,report:state.report,intro:state.intro};
      worker.postMessage({selection,generation});
    } catch {setLoading(false);setError(true);}
    return ()=>{active=false;worker?.terminate();if(running.current===worker)running.current=null;};
  },[state,selection,attempt]);
  if(state.phase!=='done')return null;
  const download=()=>{if(!snapshot)return;const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`maceio-${selection.periodicity==='monthly'?`mensal-${selection.year}-${String(selection.position).padStart(2,'0')}`:`trimestral-${selection.position}T${selection.year}`}-diagnostico.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <section className="space-y-3 rounded-xl border bg-card p-4" aria-label="Diagnóstico do relatório"><h2 className="font-semibold">Diagnóstico da geração</h2><p className="text-sm text-muted-foreground">Resumo dos slides, valores calculados e fontes pendentes desta geração.</p>
    {loading&&<div className="flex flex-wrap items-center gap-3"><BrainLoadingState variant="field" title="Preparando diagnóstico JSON" startedAt={startedAt}/><Button variant="outline" onClick={()=>{running.current?.terminate();running.current=null;setLoading(false);setCancelled(true);}}>Cancelar diagnóstico</Button></div>}
    {cancelled&&<p role="status">Diagnóstico cancelado.<Button variant="outline" className="ml-3" onClick={()=>setAttempt(value=>value+1)}>Preparar diagnóstico</Button></p>}
    {error&&<p role="alert" className="text-sm text-destructive">Não foi possível preparar o diagnóstico.<Button variant="outline" className="ml-3" onClick={()=>setAttempt(value=>value+1)}>Tentar diagnóstico novamente</Button></p>}
    {snapshot&&<><p className="text-sm">{snapshot.slides.length} slides · {snapshot.summary.available} com dados disponíveis · {snapshot.summary['source-pending']} aguardando fonte · {snapshot.summary['editorial-review']} para revisão editorial{snapshot.summary['method-pending'] ? ` · ${snapshot.summary['method-pending']} aguardando critério` : ''}{snapshot.summary['not-implemented']?` · ${snapshot.summary['not-implemented']} ainda não implementados`:''}.</p><Button variant="outline" onClick={download}>Baixar diagnóstico JSON</Button></>}
    {closedReview&&closedReview.count>0&&<Alert variant="destructive"><AlertTitle>{closedReview.count} empreendimento(s) horizontal(is) com cadastro a conferir</AlertTitle><AlertDescription>O tipo de produto ainda não foi identificado. Confira os rótulos e as tipologias na tabela antes dos slides. Registros esgotados também podem aparecer na lista.</AlertDescription></Alert>}
    {closedReview&&closedReview.count>0&&<MaceioProductReviewTable projects={closedReview.projects??[]} label="Empreendimentos horizontais com cadastro a conferir"/>}
    {closedReview&&Boolean(closedReview.automaticProjects?.length)&&<details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Classificação automática: {closedReview.automaticProjects.length} empreendimento(s) como Condomínio de Casas/Sobrados</summary><p className="my-3 text-sm text-muted-foreground">Regra autorizada: horizontal sem tipo explícito, com quartos positivos na fotografia da competência selecionada. O cadastro Geobrain permanece inalterado; os dez IDs confirmados continuam com sua regra específica.</p><MaceioProductReviewTable projects={closedReview.automaticProjects} label="Empreendimentos classificados automaticamente por quartos"/></details>}
    {closedReview&&<div className="space-y-2 border-t pt-3"><p className="text-sm font-medium">Conferência de produtos horizontais não identificados</p><p className="text-sm text-muted-foreground">{closedReview.count} empreendimento(s) sem produto explícito identificado. A lista inclui nome, ID, município e campos de produto da API, inclusive rótulos desconhecidos e vazios, para revisão do analista. Inclui registros esgotados; casos já classificados e chácaras ficam fora.</p>{!closedReview.complete&&<p role="status" className="text-sm text-destructive">Lista parcial. Coleta horizontal pendente em: {closedReview.missingCities.join(', ')}.</p>}{closedReview.complete&&closedReview.count===0&&<p role="status" className="text-sm text-muted-foreground">Nenhum empreendimento horizontal sem tipo de produto identificado na coleta deste período.</p>}<Button variant="outline" disabled={!closedReview.count} onClick={()=>{const url=URL.createObjectURL(new Blob([closedReview.csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`maceio-${selection.periodicity}-${selection.year}-${selection.position}-horizontal-conferencia.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Baixar produtos sem classificação (CSV)</Button></div>}
    {stockReview&&<div className="space-y-2 border-t pt-3"><p className="text-sm font-medium">Conferência do estoque vertical por município</p><p className="text-sm text-muted-foreground">Compare os totais municipais com os empreendimentos e tipologias da mesma competência. O arquivo inclui nome, ID, estoque, padrão, dormitórios, status e lançamentos posteriores ao fechamento, além das diferenças por grupo. O municipal não informa quais IDs compõem seus totais.</p><p className="text-sm">{stockReview.mismatchCities.length?`Divergência de estoque: ${stockReview.mismatchCities.join(', ')}.`:'Nenhuma divergência de estoque confirmada nas fontes concluídas.'}{!stockReview.complete?' Conferência parcial: há fontes incompletas.':''}</p><Button variant="outline" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(stockReview,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`maceio-${selection.periodicity}-${selection.year}-${selection.position}-estoque-conferencia.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Baixar conferência de estoque (JSON)</Button></div>}
  </section>;
}
