import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Download, FileUp, Pause, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { loadPptx, savePptx } from '../lib/v3/pptx-store';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import type { Ir } from '../lib/audit/ir';
import type { StudyV3 } from '../lib/v3/db';
import type { VersionRecord } from '../lib/projects';
import { recommendationSource } from '../lib/v3/consulting-suggestion';
import { listRecommendations, runRecommendation, quoteRecommendation, PROMPT_VERSION, RECOMMENDATION_STATES, type RecommendationRecord } from '../lib/recommendations';
import { formatBRL, FX_BRL_PER_USD } from '../lib/v3/config';
import { studyHref } from '../lib/study-navigation';

export interface RecommendationStudy { study:StudyV3; version:VersionRecord }
interface Props {study?:StudyV3;version?:VersionRecord;preparedIr?:Ir;ensureStudy?:()=>Promise<RecommendationStudy>;context?:string;onBusyChange?:(busy:boolean)=>void}
const usd=(n:number)=>`US$ ${Number(n).toFixed(4).replace('.',',')}`;
function TextResult({text}:{text:string}){return <article className="cr-text">{text.split(/\n\s*\n/).map((p,i)=>p.startsWith('## ')?<h2 key={i}>{p.slice(3)}</h2>:p.startsWith('### ')?<h3 key={i}>{p.slice(4)}</h3>:<p key={i}>{p}</p>)}</article>;}
export default function StudyRecommendation({study,version,preparedIr,ensureStudy,context='',onBusyChange}:Props){
 const [linked,setLinked]=useState<RecommendationStudy|null>(study&&version?{study,version}:null);
 const [ir,setIr]=useState<Ir|null>(preparedIr??null),[records,setRecords]=useState<RecommendationRecord[]>([]),[selected,setSelected]=useState<RecommendationRecord|null>(null);
 const [loading,setLoading]=useState(!preparedIr),[historyLoading,setHistoryLoading]=useState(Boolean(study)),[running,setRunning]=useState(false),[error,setError]=useState(''),[wantNew,setWantNew]=useState(false),[copied,setCopied]=useState(false);
 const [budget,setBudget]=useState(0),[elapsed,setElapsed]=useState(0);
 const stop=useRef(false),lock=useRef(false),mounted=useRef(true),fileInput=useRef<HTMLInputElement>(null);
 const quote=useMemo(()=>{try{return ir?{value:quoteRecommendation(recommendationSource(ir).slides),error:''}:null;}catch(e){return {value:null,error:e instanceof Error?e.message:'Conteúdo insuficiente para recomendar.'};}},[ir]);
 const source=useMemo(()=>ir?recommendationSource(ir):null,[ir]);
 useEffect(()=>{if(quote?.value)setBudget(Math.ceil(quote.value.maximumUsd*100)/100);},[quote]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop.current=true;};},[]);
 useEffect(()=>{if(!running)return;const start=Date.now();setElapsed(0);const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer);},[running]);
 useEffect(()=>{let active=true;if(!study||!version)return;
  setLoading(true);setHistoryLoading(true);
  listRecommendations(study.id).then(rows=>{if(active){const current=rows.filter(r=>r.version_n===version.n);setRecords(current);setSelected(current.find(r=>r.content)??current[0]??null);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setHistoryLoading(false);});
  loadPptx(version.sha1??'').then(async file=>file?pptxToIr(file.bytes,file.name):null).then(value=>{if(active)setIr(value);}).catch(()=>{if(active)setError('Não foi possível preparar o original deste navegador. Selecione o PowerPoint da versão.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[study,version]);
 async function refresh(target=linked){if(!target)return;const current=(await listRecommendations(target.study.id)).filter(r=>r.version_n===target.version.n);if(mounted.current){setRecords(current);setSelected(current.find(r=>r.content)??current[0]??null);}return current;}
 async function attach(file?:File){if(!file||!linked||lock.current)return;setLoading(true);setError('');try{const bytes=new Uint8Array(await file.arrayBuffer());const value=await pptxToIr(bytes,file.name);if(value.sha1!==linked.version.sha1)throw new Error('O arquivo não corresponde à versão selecionada.');await savePptx(value.sha1,file.name,bytes);setIr(value);}catch(e){setError(e instanceof Error?e.message:'Não foi possível ler o original.');}finally{setLoading(false);}}
 async function generate(){
  if(lock.current||!ir||!quote?.value||budget<quote.value.maximumUsd||budget>100)return;
  lock.current=true;stop.current=false;setRunning(true);onBusyChange?.(true);setError('');
  let target=linked;
  try{
   if(!target){if(!ensureStudy)throw new Error('Vincule a apresentação ao estudo.');target=await ensureStudy();if(mounted.current)setLinked(target);}
   if(stop.current)return;
   if(target.version.sha1!==ir.sha1)throw new Error('Confira a versão da apresentação antes de gerar.');
   const current=await refresh(target)??[];
   const unknown=current.find(r=>Number(r.reserved_usd)>0);if(unknown)throw new Error('Há uma chamada com retorno pendente. Confira a execução antes de autorizar outra.');
   const saved=current.find(r=>r.content&&r.prompt_version===PROMPT_VERSION);
   if(saved&&!wantNew){setSelected(saved);return;}
   const resume=current.find(r=>['prepared','running','interrupted'].includes(r.state)&&!r.content);
   setSelected(resume??null);
   await runRecommendation({studyId:target.study.id,version:target.version.n,sha1:ir.sha1,ir,budgetUsd:budget,resume,cancelled:()=>stop.current,onProgress:record=>{if(mounted.current){setSelected(record);setRecords(rows=>[record,...rows.filter(r=>r.id!==record.id)]);}}});
   if(mounted.current){setWantNew(false);await refresh(target);}
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'A recomendação não foi concluída.');if(target)await refresh(target).catch(()=>{});}
  finally{lock.current=false;onBusyChange?.(false);if(mounted.current)setRunning(false);}
 }
 const unknown=records.some(r=>Number(r.reserved_usd)>0),hasResult=records.some(r=>r.content),showForm=!hasResult||wantNew;
 function download(){if(!selected?.content)return;const url=URL.createObjectURL(new Blob([selected.content],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`recomendacao-versao-${selected.version_n}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 return <section className="cp-panel cr-workspace" aria-label="Sugestão de análise">
  <h2><Sparkles size={20} aria-hidden="true"/> Sugestão de análise</h2>
  {historyLoading&&<p role="status">Consultando recomendações guardadas…</p>}
  {records.length>0&&<div className="cr-history" aria-label="Histórico de recomendações">{records.map(r=><Button key={r.id} variant="outline" aria-pressed={selected?.id===r.id} disabled={running} onClick={()=>setSelected(r)}>{RECOMMENDATION_STATES[r.state]} · {new Date(r.created_at).toLocaleString('pt-BR')}</Button>)}</div>}
  {selected&&<div className="cr-usage"><strong>{RECOMMENDATION_STATES[selected.state]} · versão {selected.version_n}</strong><p>Previsão {usd(selected.estimated_usd)} · limite {usd(selected.budget_usd)} · uso confirmado {usd(selected.spent_usd)} · {selected.provider_calls}/{selected.total_requests} chamadas</p>{Number(selected.reserved_usd)>0&&<p role="status">Reserva com retorno pendente: {usd(selected.reserved_usd)}. A cobrança final ainda não foi confirmada.</p>}<p className="cp-muted">Diferença da previsão: {usd(Number(selected.spent_usd)-Number(selected.estimated_usd))}, com {usd(selected.reserved_usd)} ainda reservado. O limite pertence à execução completa.</p><p className="cp-muted">{selected.input_tokens} tokens de entrada · {selected.cached_tokens} em cache · {selected.output_tokens} de saída · {selected.model} {selected.provider_latency_ms!==undefined && `· ${(selected.provider_latency_ms/1000).toFixed(1).replace('.',',')}s no provedor`}</p>{selected.error_message&&<p role="alert">{selected.error_message}</p>}</div>}
  {selected?.content&&<><div className="cp-actions"><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(selected.content!).then(()=>setCopied(true)).catch(()=>setError('Não foi possível copiar. Você pode baixar o texto.'))}>{copied?<Check size={16}/>:<Copy size={16}/>}Copiar texto</Button><Button variant="outline" onClick={download}><Download size={16}/>Baixar texto</Button><Button variant="outline" disabled={running||unknown} onClick={()=>setWantNew(true)}>Preparar outras sugestões</Button></div>{selected.state==='partial'&&<p role="status">Resultado parcial: houve limite de saída em uma etapa. Confira a cobertura antes de utilizar.</p>}<TextResult text={selected.content}/></>}
  {showForm&&<>
   {loading?<p role="status">Preparando conteúdo e previsão…</p>:!ir?<><p>Selecione o PowerPoint desta versão para preparar a recomendação.</p><Button variant="outline" onClick={()=>fileInput.current?.click()}><FileUp size={18}/>Selecionar PowerPoint da versão</Button></>:quote?.error?<p role="alert">{quote.error}</p>:quote?.value&&<>
    <div className="cr-estimate"><h3>Conferir antes de gerar</h3><p>{quote.value.slides} slides úteis · {quote.value.batches} lote(s){quote.value.batches>1?' + compilação final':''} · {quote.value.requests} chamada(s) previstas</p><p className="cp-muted">Leitura de textos e tabelas nativas do PowerPoint. Planilhas, PDF e conteúdo só em imagem não entram nesta recomendação. {source?.withoutText??0} slides sem texto suficiente; {source?.limitedSlides??0} slides com texto limitado a 6.000 caracteres.</p><p>Previsão conservadora: <strong>{usd(quote.value.estimateUsd)} · {formatBRL(quote.value.estimateUsd)}</strong></p><p className="cp-muted">GPT-4o mini · câmbio de referência R$ {FX_BRL_PER_USD.toFixed(2).replace('.',',')}/US$. O custo calculado pelos tokens pode variar da previsão.</p>
    <Label htmlFor="recommendation-budget">Limite autorizado em dólares (US$)</Label><Input id="recommendation-budget" type="number" min={quote.value.maximumUsd} max="100" step="any" disabled={running} value={budget} onChange={e=>setBudget(Number(e.target.value))}/><p className="cp-muted">Reserva máxima calculada: {usd(quote.value.maximumUsd)}. Confirmar autoriza este lote; reabrir resultado não cobra novamente.</p>
    <Button disabled={running||historyLoading||unknown||budget<quote.value.maximumUsd||budget>100||!Number.isFinite(budget)} onClick={()=>void generate()}>{running?'Preparando sugestões…':records.some(r=>['prepared','interrupted','running'].includes(r.state))?'Confirmar custo e retomar sugestões':'Confirmar custo e preparar sugestões'}</Button></div>
   </>}
  </>}
  <input ref={fileInput} hidden type="file" accept=".pptx" onChange={e=>{const f=e.target.files?.[0];e.target.value='';void attach(f);}}/>
  {running&&<div role="status"><p>Geração em andamento · {elapsed}s · {selected?.provider_calls??0} chamadas confirmadas</p><Progress value={selected?Math.round(selected.provider_calls/selected.total_requests*100):0}/><Button variant="outline" onClick={()=>{stop.current=true;}}><Pause size={16}/>Pausar após a chamada atual</Button></div>}
  {error&&<p role="alert">{error}</p>}
  {linked&&<div className="cp-actions"><Button variant="ghost" disabled={running} onClick={()=>void refresh().catch(e=>setError(e.message))}><RefreshCw size={16}/>Atualizar histórico</Button><Link className="cp-inline" to={studyHref(linked.study.id,'recomendacao',context,linked.version.id)}>Abrir sugestões do estudo</Link></div>}
 </section>;
}
