import LoadingSurface from './LoadingSurface';
import CorretorLoadingState from './CorretorLoadingState';
import RecommendationResult from './RecommendationResult';
import { plainRecommendation } from '../lib/recommendation-presentation';
import { processingMessage } from '../lib/processing-message';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Download, FileUp, Pause, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadPptx, savePptx } from '../lib/v3/pptx-store';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import type { Ir } from '../lib/audit/ir';
import type { StudyV3 } from '../lib/v3/db';
import type { VersionRecord } from '../lib/projects';
import { recommendationSource } from '../lib/v3/consulting-suggestion';
import { listRecommendations, runRecommendation, quoteRecommendation, PROMPT_VERSION, RECOMMENDATION_STATES, type RecommendationRecord } from '../lib/recommendations';
import { studyHref } from '../lib/study-navigation';

export interface RecommendationStudy { study:StudyV3; version:VersionRecord }
interface Props {study?:StudyV3;version?:VersionRecord;preparedIr?:Ir;ensureStudy?:()=>Promise<RecommendationStudy>;context?:string;onBusyChange?:(busy:boolean)=>void}
export default function StudyRecommendation({study,version,preparedIr,ensureStudy,context='',onBusyChange}:Props){
 const [refreshing,setRefreshing]=useState(false);
 const [linked,setLinked]=useState<RecommendationStudy|null>(study&&version?{study,version}:null);
 const [ir,setIr]=useState<Ir|null>(preparedIr??null),[records,setRecords]=useState<RecommendationRecord[]>([]),[selected,setSelected]=useState<RecommendationRecord|null>(null);
 const [loading,setLoading]=useState(!preparedIr),[historyLoading,setHistoryLoading]=useState(Boolean(study)),[running,setRunning]=useState(false),[error,setError]=useState(''),[wantNew,setWantNew]=useState(false),[copied,setCopied]=useState(false);
 const [budget,setBudget]=useState(0);
 const stop=useRef(false),lock=useRef(false),mounted=useRef(true),fileInput=useRef<HTMLInputElement>(null);
 const quote=useMemo(()=>{try{return ir?{value:quoteRecommendation(recommendationSource(ir).slides),error:''}:null;}catch(e){return {value:null,error:e instanceof Error?e.message:'Conteúdo insuficiente para recomendar.'};}},[ir]);
 const source=useMemo(()=>ir?recommendationSource(ir):null,[ir]);
 useEffect(()=>{if(quote?.value)setBudget(Math.ceil(quote.value.maximumUsd*100)/100);},[quote]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop.current=true;};},[]);
 useEffect(()=>{let active=true;if(!study||!version)return;
  setLoading(true);setHistoryLoading(true);
  listRecommendations(study.id).then(rows=>{if(active){const current=rows.filter(r=>r.version_n===version.n);setRecords(current);setSelected(current.find(r=>r.content)??current[0]??null);}}).catch(e=>{if(active)setError(processingMessage(e));}).finally(()=>{if(active)setHistoryLoading(false);});
  loadPptx(version.sha1??'').then(async file=>file?pptxToIr(file.bytes,file.name):null).then(value=>{if(active)setIr(value);}).catch(()=>{if(active)setError('Não foi possível preparar o original deste navegador. Selecione o PowerPoint da versão.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[study,version]);
 async function refresh(target=linked){
  if(!target)return;setRefreshing(true);
  try{const current=(await listRecommendations(target.study.id)).filter(r=>r.version_n===target.version.n);if(mounted.current){setRecords(current);setSelected(current.find(r=>r.content)??current[0]??null);}return current;}
  finally{if(mounted.current)setRefreshing(false);}
 }

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
  }catch(e){if(mounted.current)setError(processingMessage(e));if(target)await refresh(target).catch(()=>{});}
  finally{lock.current=false;onBusyChange?.(false);if(mounted.current)setRunning(false);}
 }
 const unknown=records.some(r=>Number(r.reserved_usd)>0),hasResult=records.some(r=>r.content),showForm=!hasResult||wantNew;
 function download(){if(!selected?.content)return;const url=URL.createObjectURL(new Blob([plainRecommendation(selected.content)],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`sugestao-analise-versao-${selected.version_n}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 return <section className="cp-panel cr-workspace" aria-label="Sugestão de análise">
  <h2><Sparkles size={20} aria-hidden="true"/> Sugestão de análise</h2>
  <LoadingSurface busy={historyLoading||refreshing} initial={historyLoading&&!records.length} label="Atualizando sugestões…">
  {records.length>0&&<div className="cr-history" aria-label="Histórico de recomendações">{records.map(r=><Button key={r.id} variant="outline" aria-pressed={selected?.id===r.id} disabled={running} onClick={()=>setSelected(r)}>{RECOMMENDATION_STATES[r.state]} · {new Date(r.created_at).toLocaleString('pt-BR')}</Button>)}</div>}
  {selected&&<div className="cr-state"><strong>{RECOMMENDATION_STATES[selected.state]} · versão {selected.version_n}</strong>{Number(selected.reserved_usd)>0&&<p role="status">Uma etapa ainda aguarda confirmação. Atualize o histórico antes de tentar novamente.</p>}{selected.error_message&&<p role="alert">Não foi possível concluir esta etapa. Atualize o histórico ou procure a equipe de suporte.</p>}</div>}
  {selected?.content&&<><div className="cp-actions"><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(plainRecommendation(selected.content!)).then(()=>setCopied(true)).catch(()=>setError('Não foi possível copiar. Você pode baixar o texto.'))}>{copied?<Check size={16}/>:<Copy size={16}/>}Copiar tudo</Button><Button variant="outline" onClick={download}><Download size={16}/>Baixar texto</Button><Button variant="outline" disabled={running||unknown} onClick={()=>setWantNew(true)}>Preparar outras sugestões</Button></div>{selected.state==='partial'&&<p role="status">Resultado parcial: uma etapa não foi concluída por inteiro. Confira a cobertura antes de utilizar.</p>}<RecommendationResult key={selected.id} text={selected.content}/></>}
  {showForm&&<>
   {loading?<CorretorLoadingState title="Preparando conteúdo da apresentação…" />:!ir?<><p>Selecione o PowerPoint desta versão para preparar a recomendação.</p><Button variant="outline" onClick={()=>fileInput.current?.click()}><FileUp size={18}/>Selecionar PowerPoint da versão</Button></>:quote?.error?<p role="alert">{quote.error}</p>:quote?.value&&<>
    <div className="cr-estimate"><h3>Conferir antes de gerar</h3><p>{quote.value.slides} slides úteis</p><p className="cp-muted">Leitura de textos e tabelas nativas do PowerPoint. Planilhas, PDF e conteúdo só em imagem não entram nesta recomendação. {source?.withoutText??0} slides sem texto suficiente; {source?.limitedSlides??0} slides com texto limitado a 6.000 caracteres.</p>
    {budget>100&&<p role="status">Este estudo precisa de apoio da equipe para continuar. Seus materiais estão preservados.</p>}
    <Button disabled={running||historyLoading||unknown||budget<quote.value.maximumUsd||budget>100||!Number.isFinite(budget)} onClick={()=>void generate()}>{running?'Preparando sugestões…':records.some(r=>['prepared','interrupted','running'].includes(r.state))?'Retomar sugestões':'Preparar sugestões'}</Button></div>
   </>}
  </>}
  <input ref={fileInput} hidden type="file" accept=".pptx" onChange={e=>{const f=e.target.files?.[0];e.target.value='';void attach(f);}}/>
  {running&&<div><CorretorLoadingState title={selected?'Preparando sugestões de análise…':'Vinculando apresentação ao estudo…'} description="Organizando a leitura do estudo e a síntese.">{selected&&selected.total_requests>0&&<p className="cp-brain-stages">Etapas confirmadas · {selected.provider_calls}/{selected.total_requests}</p>}</CorretorLoadingState><Button variant="outline" onClick={()=>{stop.current=true;}}><Pause size={16}/>Pausar após a chamada atual</Button></div>}
  {error&&<p role="alert">{error}</p>}
  {linked&&<div className="cp-actions"><Button variant="ghost" disabled={running} onClick={()=>void refresh().catch(e=>setError(processingMessage(e)))}><RefreshCw size={16}/>Atualizar histórico</Button><Link className="cp-inline" to={studyHref(linked.study.id,'recomendacao',context,linked.version.id)}>Abrir sugestões do estudo</Link></div>}
 </LoadingSurface></section>;
}
