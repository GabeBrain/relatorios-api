import { partitionSlides, validateRecommendationSlides, quoteRecommendation, prepareRequest, recommendationCost, RECOMMENDATION_MODEL, PROMPT_VERSION, PRICE_VERSION, MAX_MEMO_BYTES, utf8 } from '../_shared/recommendation.ts';
const fn = 'analyze-consulting-suggestion';
// Adaptador limitado ao cliente administrativo criado pelo controlador.
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;
export function recommendationContext(value: Record<string, unknown>, version: { n_slides: number }) {
  const slides = validateRecommendationSlides(value.slides);
  if(slides.some(s=>s.n>version.n_slides))throw new Error('Há referência fora da versão do estudo.');
  if(typeof value.attemptId!=='string'||value.attemptId.length>80||!value.attemptId.length)throw new Error('Confirmação de geração inválida.');
  const quote = quoteRecommendation(slides);
  const limitedSlides = Number.isInteger(value.limitedSlides) ? Math.max(0,Math.min(slides.length,Number(value.limitedSlides))) : 0;
  return {purpose:'recommendation',attemptId:value.attemptId,slides,model:RECOMMENDATION_MODEL,promptVersion:PROMPT_VERSION,priceVersion:PRICE_VERSION,quote,
    coverage:{source:'pptx-texto-tabelas-nativas',totalSlides:version.n_slides,readableSlides:slides.length,withoutText:version.n_slides-slides.length,limitedSlides}};
}
export async function ensureRecommendation(db:DB,run:DB,versionId:string) {
  const context=run.confirmed_context;
  const {error}=await db.from('corretor_recommendations').upsert({execution_id:run.id,study_id:run.study_id,version_id:versionId,version_n:run.version_n,document_sha1:run.document_sha1,model:RECOMMENDATION_MODEL,prompt_version:PROMPT_VERSION,price_version:PRICE_VERSION,estimated_usd:context.quote.estimateUsd,budget_usd:run.budget_usd,total_requests:context.quote.requests,coverage:context.coverage},{onConflict:'execution_id',ignoreDuplicates:true});
  if(error)throw error;
}
export async function recommendationStep(db:DB,run:DB,owner:string,url:string,key:string,json:(v:unknown,status?:number)=>Response,hash:(v:string)=>Promise<string>,canonical:(v:unknown)=>string) {
  if(run.purpose!=='recommendation')return json({error:'Esta execução não é consultiva.'},400);
  const getResult=async()=>{const {data,error}=await db.from('corretor_recommendations').select('*').eq('execution_id',run.id).single();if(error)throw error;return data;};
  const record=await getResult();
  if(['completed','partial'].includes(record.state))return json({done:true,result:record});
  if(!['prepared','running'].includes(run.state))return json({error:'Confirme o custo para retomar a recomendação.'},409);
  const context=run.confirmed_context, batches=partitionSlides(validateRecommendationSlides(context.slides));
  if(context.promptVersion!==PROMPT_VERSION||context.priceVersion!==PRICE_VERSION)return json({error:'O contrato mudou. Confira uma nova previsão antes de gerar.'},409);
  const {data:rows,error}=await db.from('corretor_execution_batches').select('*').eq('execution_id',run.id);
  if(error)throw error;
  if(rows.some((r:DB)=>r.state!=='completed'))return json({error:'Há uma chamada em andamento ou com retorno desconhecido. Não será repetida.'},409);
  let payload:DB=null; const memos=[];
  for(const batch of batches){
    const candidate={model:RECOMMENDATION_MODEL,promptVersion:PROMPT_VERSION,mode:batches.length===1?'single':'batch',slides:batch};
    const identity=await hash(`${fn}:recommendation-v1:${canonical(candidate)}`);
    const previous=rows.find((r:DB)=>r.batch_hash===identity);
    if(!previous){payload=candidate;break;}
    if(batches.length>1){
      if(typeof previous.response?.batch!=='string'||!previous.response.batch.trim()||utf8(previous.response.batch)>MAX_MEMO_BYTES){
        await db.from('corretor_recommendations').update({state:'failed',error_message:'Um lote não retornou um memo completo dentro do limite. O uso confirmado foi registrado.'}).eq('execution_id',run.id);
        await db.from('corretor_executions').update({state:'failed'}).eq('id',run.id);
        return json({error:'Um lote precisa de conferência; os memos confirmados foram preservados.'},409);
      }
      memos.push({firstSlide:batch[0].n,lastSlide:batch.at(-1)!.n,content:previous.response.batch});
    }
  }
  if(!payload){
    if(batches.length===1)return json({error:'O lote foi contabilizado, mas o resultado precisa de conferência.'},409);
    payload={model:RECOMMENDATION_MODEL,promptVersion:PROMPT_VERSION,mode:'compile',batches:memos};
  }
  const prepared=prepareRequest(payload),batchHash=await hash(`${fn}:recommendation-v1:${canonical(payload)}`);
  const {data:claim,error:claimError}=await db.rpc('corretor_claim_batch',{p_execution:run.id,p_owner:owner,p_hash:batchHash,p_function:fn,p_reserve:prepared.reserveUsd});
  if(claimError)return json({error:'Lote bloqueado: confira limite, concorrência ou retorno desconhecido.'},409);
  if(claim.cached)return json({done:false,replayed:true});
  const unknown=async()=>{
    await db.from('corretor_execution_batches').update({state:'unknown'}).eq('execution_id',run.id).eq('batch_hash',batchHash);
    await db.from('corretor_executions').update({state:'interrupted'}).eq('id',run.id);
    return json({error:'Retorno não confirmado. A reserva foi mantida e esta chamada não será repetida automaticamente.'},409);
  };
  let result:DB;
  try{
    const response=await fetch(`${url}/functions/v1/${fn}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json','x-corretor-execution':run.id},body:JSON.stringify(payload)});
    result=await response.json();if(!response.ok||result.error)return await unknown();
    if(typeof result.model!=='string'||!result.model.startsWith(RECOMMENDATION_MODEL)||!['stop','length','content_filter'].includes(result.finishReason))return await unknown();
    recommendationCost(result.inputTokens,result.outputTokens,result.cachedTokens??0);
    if(result.requestedModel!==RECOMMENDATION_MODEL||result.promptVersion!==PROMPT_VERSION||result.priceVersion!==PRICE_VERSION||!Number.isInteger(result.latencyMs)||result.latencyMs<0)return await unknown();
  }catch{return await unknown();}
  const cost=recommendationCost(result.inputTokens,result.outputTokens,result.cachedTokens??0);
  // Uso confirmado continua contabilizado mesmo se o provedor omitir o texto.
  // A forma canônica permite concluir como falha, sem repetir uma chamada já paga.
  if(payload.mode==='batch')result.batch=typeof result.batch==='string'?result.batch:'';
  else result.suggestion=typeof result.suggestion==='string'?result.suggestion:'';
  const {error:finishError}=await db.rpc('corretor_finish_batch',{p_execution:run.id,p_hash:batchHash,p_response:result,p_cost:cost});
  if(finishError)return await unknown();
  const saved=await getResult();
  if(saved.state==='failed')return json({error:saved.error_message??'A geração precisa de conferência.'},409);
  return json({done:['completed','partial'].includes(saved.state),result:saved,phase:payload.mode});
}
