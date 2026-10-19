import { partitionSlides, validateRecommendationSlides, quoteRecommendation, prepareRequest, recommendationCost, recommendationProfile, executionRecommendationProfile, MAX_MEMO_BYTES, utf8 } from '../_shared/recommendation.ts';
const fn = 'analyze-consulting-suggestion';
// Adaptador limitado ao cliente administrativo criado pelo controlador.
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;
export async function requireRecommendationProfileSchema(db: DB) {
  const {data,error}=await db.rpc('corretor_recommendation_profile_schema');
  if(error||data!==1)throw new Error('A geração aguarda a atualização técnica do sistema. Seus materiais estão preservados.');
}
export function recommendationContext(value: Record<string, unknown>, version: { n_slides: number }) {
  const profile=recommendationProfile();
  if(value.profileId!==profile.id||value.configVersion!==profile.configVersion)throw new Error('Atualize a página antes de preparar novas sugestões. Seus materiais estão preservados.');
  const slides = validateRecommendationSlides(value.slides);
  if(slides.some(s=>s.n>version.n_slides))throw new Error('Há referência fora da versão do estudo.');
  if(typeof value.attemptId!=='string'||value.attemptId.length>80||!value.attemptId.length)throw new Error('Confirmação de geração inválida.');
  const quote = quoteRecommendation(slides,profile);
  const limitedSlides = Number.isInteger(value.limitedSlides) ? Math.max(0,Math.min(slides.length,Number(value.limitedSlides))) : 0;
  return {purpose:'recommendation',attemptId:value.attemptId,slides,profile,model:profile.model,promptVersion:profile.promptVersion,priceVersion:profile.priceVersion,quote,
    coverage:{source:'pptx-texto-tabelas-nativas',totalSlides:version.n_slides,readableSlides:slides.length,withoutText:version.n_slides-slides.length,limitedSlides}};
}
export async function ensureRecommendation(db:DB,run:DB,versionId:string) {
  const context=run.confirmed_context,profile=executionRecommendationProfile(context);
  const metadata=context.profile?{profile_id:profile.id,config_version:profile.configVersion,reasoning_effort:profile.reasoningEffort,
    endpoint:profile.endpoint,service_tier:profile.serviceTier,pricing_snapshot:{currency:'USD',per_tokens:1000000,price_version:profile.priceVersion,...profile.prices},
    usage_origin:context.usageOrigin}:{};
  const {error}=await db.from('corretor_recommendations').upsert({execution_id:run.id,study_id:run.study_id,version_id:versionId,version_n:run.version_n,document_sha1:run.document_sha1,model:profile.model,prompt_version:profile.promptVersion,price_version:profile.priceVersion,estimated_usd:context.quote.estimateUsd,budget_usd:run.budget_usd,total_requests:context.quote.requests,coverage:context.coverage,...metadata},{onConflict:'execution_id',ignoreDuplicates:true});
  if(error)throw error;
}
export async function recommendationStep(db:DB,run:DB,owner:string,url:string,key:string,json:(v:unknown,status?:number)=>Response,hash:(v:string)=>Promise<string>,canonical:(v:unknown)=>string) {
  if(run.purpose!=='recommendation')return json({error:'Esta execução não é consultiva.'},400);
  const getResult=async()=>{const {data,error}=await db.from('corretor_recommendations').select('*').eq('execution_id',run.id).single();if(error)throw error;return data;};
  const record=await getResult();
  if(['completed','partial'].includes(record.state))return json({done:true,result:record});
  if(!['prepared','running'].includes(run.state))return json({error:'Confirme o custo para retomar a recomendação.'},409);
  const context=run.confirmed_context;
  let profile;
  try {profile=executionRecommendationProfile(context);if(context.profile)await requireRecommendationProfileSchema(db);}
  catch(error){return json({error:error instanceof Error?error.message:'Confira a configuração da geração.'},409);}
  if(record.model!==profile.model||record.prompt_version!==profile.promptVersion||record.price_version!==profile.priceVersion)return json({error:'O registro desta execução precisa de conferência técnica.'},409);
  const batches=partitionSlides(validateRecommendationSlides(context.slides));
  const config=context.profile?{profileId:profile.id,configVersion:profile.configVersion}:{};
  const {data:rows,error}=await db.from('corretor_execution_batches').select('*').eq('execution_id',run.id);
  if(error)throw error;
  if(rows.some((r:DB)=>r.state!=='completed'))return json({error:'Há uma chamada em andamento ou com retorno desconhecido. Não será repetida.'},409);
  let payload:DB=null; const memos=[];
  for(const batch of batches){
    const candidate={model:profile.model,promptVersion:profile.promptVersion,...config,mode:batches.length===1?'single':'batch',slides:batch};
    const identity=await hash(`${fn}:${context.profile?profile.hashNamespace:'recommendation-v1'}:${canonical(candidate)}`);
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
    payload={model:profile.model,promptVersion:profile.promptVersion,...config,mode:'compile',batches:memos};
  }
  const prepared=prepareRequest(payload,profile),batchHash=await hash(`${fn}:${context.profile?profile.hashNamespace:'recommendation-v1'}:${canonical(payload)}`);
  const {data:claim,error:claimError}=await db.rpc('corretor_claim_batch',{p_execution:run.id,p_owner:owner,p_hash:batchHash,p_function:fn,p_reserve:prepared.reserveUsd});
  if(claimError)return json({error:'Lote bloqueado: confira limite, concorrência ou retorno desconhecido.'},409);
  if(claim.cached)return json({done:false,replayed:true});
  const unknown=async(evidence?:unknown)=>{
    await db.from('corretor_execution_batches').update({state:'unknown',...(evidence?{response:evidence}:{})}).eq('execution_id',run.id).eq('batch_hash',batchHash);
    await db.from('corretor_executions').update({state:'interrupted'}).eq('id',run.id);
    return json({error:'Retorno não confirmado. A reserva foi mantida e esta chamada não será repetida automaticamente.'},409);
  };
  let result:DB=null;
  try{
    const response=await fetch(`${url}/functions/v1/${fn}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json','x-corretor-execution':run.id},body:JSON.stringify(payload),signal:AbortSignal.timeout(130000)});
    result=await response.json();if(!response.ok||result.error)return await unknown(result);
    if(typeof result.model!=='string'||!(result.model===profile.model||result.model.startsWith(profile.model+'-'))||!['stop','length','content_filter'].includes(result.finishReason))return await unknown(result);
    recommendationCost(result.inputTokens,result.outputTokens,result.cachedTokens??0,profile);
    if(result.requestedModel!==profile.model||result.promptVersion!==profile.promptVersion||result.priceVersion!==profile.priceVersion||!Number.isInteger(result.latencyMs)||result.latencyMs<0)return await unknown(result);
    if(context.profile&&(result.profileId!==profile.id||result.configVersion!==profile.configVersion||result.reasoningEffort!==profile.reasoningEffort||result.requestedServiceTier!==profile.serviceTier||result.serviceTier!==profile.serviceTier))return await unknown(result);
    if(result.reasoningTokens!=null&&(!Number.isInteger(result.reasoningTokens)||result.reasoningTokens<0||result.reasoningTokens>result.outputTokens))return await unknown(result);
  }catch{return await unknown(result);}
  const cost=recommendationCost(result.inputTokens,result.outputTokens,result.cachedTokens??0,profile);
  // Uso confirmado continua contabilizado mesmo se o provedor omitir o texto.
  // A forma canônica permite concluir como falha, sem repetir uma chamada já paga.
  if(payload.mode==='batch')result.batch=typeof result.batch==='string'?result.batch:'';
  else result.suggestion=typeof result.suggestion==='string'?result.suggestion:'';
  const {error:finishError}=await db.rpc('corretor_finish_batch',{p_execution:run.id,p_hash:batchHash,p_response:result,p_cost:cost});
  if(finishError)return await unknown(result);
  const saved=await getResult();
  if(saved.state==='failed')return json({error:saved.error_message??'A geração precisa de conferência.'},409);
  return json({done:['completed','partial'].includes(saved.state),result:saved,phase:payload.mode});
}
