import { reviewProfile, executionReviewProfile, ACTIVE_REVIEW_PROFILE, stableReview, reviewCost, type ReviewTask, type ReviewModel } from '../_shared/reviewer.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.3';
import { recommendationContext, ensureRecommendation, recommendationStep, requireRecommendationProfileSchema } from './recommendation.ts';
import { executionRecommendationProfile } from '../_shared/recommendation.ts';

const allowed = new Set(['analyze-text-batch','analyze-table-image','analyze-ata-image']);
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(b => b.toString(16).padStart(2,'0')).join('');
const canonical = (value: unknown): string => JSON.stringify(value, (_k,v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b))) : v);
const safeError = 'Não foi possível confirmar a execução. Nenhum lote com retorno desconhecido será repetido automaticamente.';
Deno.serve(async req => {
  const origin = req.headers.get('origin') ?? '';
  const origins = ['http://localhost:5173','http://localhost:8080',...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(s=>s.trim()).filter(Boolean)];
  const cors = { 'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0], 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info', Vary:'Origin' };
  const json = (data: unknown, status=200) => new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  if(req.method!=='POST')return json({error:'Método não permitido.'},405);
  try {
    const body = await req.json();
    if(typeof body.owner !== 'string' || !/^[a-f0-9]{64}$/.test(body.owner))return json({error:'Identificação local da execução inválida.'},400);
    const owner = await hash(body.owner);
    const url = Deno.env.get('SUPABASE_URL')!, key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(url,key);
    if(body.action==='start') {
      if(!Number.isFinite(body.budgetUsd)||body.budgetUsd<=0||body.budgetUsd>100||!Number.isInteger(body.version)||typeof body.context!=='object')return json({error:'Confira o lote e o limite de custo.'},400);
      const {data:version,error:versionError} = await db.from('study_versions').select('id,sha1,n_slides').eq('study_id',body.studyId).eq('n',body.version).single();
      if(versionError||!version?.sha1||version.sha1!==body.documentSha1)return json({error:'O arquivo não corresponde à versão registrada.'},409);
      const consult=body.context?.purpose==='recommendation';
      let context=body.context;
      let validationBudgetId: string | undefined;
      if(!consult && context?.reviewProfileId) {
        const {data:binding,error:bindingError}=await db.from('corretor_review_validation_studies').select('budget_id,owner_hash').eq('study_id',body.studyId).maybeSingle();
        if(bindingError)return json({error:'Publique a migration de perfis do revisor antes de avaliar.'},409);
        if(binding) {
          if(binding.owner_hash!==owner)return json({error:'Este estudo está reservado para validação técnica.'},403);
          validationBudgetId=binding.budget_id;body.budgetUsd=Math.min(body.budgetUsd,3);
        }
      }
      if(body.validationBudgetId!==undefined) {
        if(consult || req.headers.get('authorization')!==`Bearer ${key}` || body.validationBudgetId!=='amanda-review-2026-10-21')return json({error:'Validacao tecnica nao autorizada.'},403);
        const {data:budget,error:budgetError}=await db.from('corretor_review_validation_budgets').select('budget_usd').eq('id',body.validationBudgetId).single();
        if(budgetError||!budget||body.budgetUsd>Math.min(3,Number(budget.budget_usd)))return json({error:'Confira o teto global da validacao.'},409);
        validationBudgetId=body.validationBudgetId;
      }
      if(consult){try{context=recommendationContext(context,version);await requireRecommendationProfileSchema(db);
          context.usageOrigin=Deno.env.get('CORRETOR_USAGE_ORIGIN')==='development'?'development':'production';
        }catch(error){return json({error:error instanceof Error?error.message:'Conteúdo consultivo inválido ou grande demais.'},400);}
        if(body.budgetUsd<context.quote.maximumUsd)return json({error:'O limite precisa cobrir a reserva máxima da recomendação.'},400);}
      if(!consult) {
        const rawContext={...context};delete rawContext.reviewProfileId;delete rawContext.reviewProfile;delete rawContext.usageOrigin;delete rawContext.validationBudgetId;
        let resumed=false;
        if(typeof body.resumeExecutionId==='string') {
          const {data:prior}=await db.from('corretor_executions').select('*').eq('id',body.resumeExecutionId).eq('owner_hash',owner).eq('study_id',body.studyId).eq('version_n',body.version).eq('document_sha1',body.documentSha1).maybeSingle();
          if(!prior)return json({error:'A tentativa anterior não pôde ser confirmada. Confira antes de iniciar outra.'},409);
          try { executionReviewProfile(prior.confirmed_context); }
          catch(error) { return json({error:error instanceof Error?error.message:'Confira o perfil da tentativa anterior antes de retomar.'},409); }
          if(prior.state==='completed')return json({id:prior.id,state:'completed',reviewProfileId:executionReviewProfile(prior.confirmed_context).id});
          if(prior && prior.state!=='completed' && prior.purpose!=='recommendation') {
            const oldBase={...prior.confirmed_context};delete oldBase.reviewProfile;delete oldBase.usageOrigin;delete oldBase.validationBudgetId;
            if(stableReview(oldBase)!==stableReview(rawContext))return json({error:'Os materiais ou dados diferem da tentativa anterior. Confira antes de retomar.'},409);
            context=prior.confirmed_context;executionReviewProfile(context);resumed=true;
          }
        }
        if(!resumed && context.reviewProfileId) {
          if(context.reviewProfileId!==ACTIVE_REVIEW_PROFILE)return json({error:'Atualize a página para usar o perfil atual da revisão.'},409);
          const profile=reviewProfile(context.reviewProfileId);
          const {data:schema,error:schemaError}=await db.rpc('corretor_review_profile_schema');
          if(schemaError||schema!==1)return json({error:'Publique a migration de perfis do revisor antes de avaliar.'},409);
          context=profile.reasoningEffort?{...rawContext,reviewProfile:profile,usageOrigin:validationBudgetId?'validation':'production',...(validationBudgetId?{validationBudgetId}:{})}:rawContext;
        }
        else if(!resumed)context=rawContext;
      }
      const contextHash = await hash(canonical(context));
      const {error:insertError} = await db.from('corretor_executions').insert({study_id:body.studyId,version_n:body.version,document_sha1:version.sha1,context_hash:contextHash,confirmed_context:context,owner_hash:owner,budget_usd:body.budgetUsd,...(validationBudgetId?{validation_budget_id:validationBudgetId}:{}),...(consult?{purpose:'recommendation',engine:'recommendation-v1',estimated_usd:context.quote.estimateUsd}:{})});
      if(insertError&&insertError.code!=='23505')throw insertError;
      const {data:run,error} = await db.from('corretor_executions').select('*').eq('study_id',body.studyId).eq('version_n',body.version).eq('context_hash',contextHash).single();
      if(error)throw error;
      if(run.owner_hash!==owner)return json({error:'Este lote já foi iniciado em outro navegador. Confira a execução antes de iniciar outro.'},409);
      if(consult)await ensureRecommendation(db,run,version.id);
      if(run.state==='running' && Number(run.reserved_usd)>0)return json({error:'Há um lote em andamento ou com resultado desconhecido. Confira antes de retomar.'},409);
      if(run.state!=='completed') {
        // O novo limite inclui o gasto anterior. Reservas desconhecidas permanecem retidas.
        if(body.budgetUsd<Number(run.spent_usd)+Number(run.reserved_usd))return json({error:'O limite precisa cobrir o gasto e as reservas anteriores.'},409);
        const {error:updateError}=await db.from('corretor_executions').update({budget_usd:body.budgetUsd,state:'prepared',updated_at:new Date().toISOString()}).eq('id',run.id);
        if(updateError)throw updateError;
      }
      return json({id:run.id,state:run.state,...(!consult?{reviewProfileId:executionReviewProfile(run.confirmed_context).id}:{}),...(consult?{profileId:executionRecommendationProfile(run.confirmed_context).id}:{}),spentUsd:Number(run.spent_usd),reservedUsd:Number(run.reserved_usd)});
    }
    const {data:run,error} = await db.from('corretor_executions').select('*').eq('id',body.executionId).eq('owner_hash',owner).single();
    if(error||!run)return json({error:'Execução não autorizada.'},403);
    if(body.action==='recommendation_step')return await recommendationStep(db,run,owner,url,key,json,hash,canonical);
    if(body.action==='recommendation_resume'){
      if(run.purpose!=='recommendation')return json({error:'Esta execução não é consultiva.'},400);
      let profile;
      try{profile=executionRecommendationProfile(run.confirmed_context);if(run.confirmed_context.profile)await requireRecommendationProfileSchema(db);}
      catch(error){return json({error:error instanceof Error?error.message:'Confira a configuração da geração.'},409);}
      if(run.state==='failed')return json({error:'Esta tentativa não pode ser retomada. Confira o histórico e autorize uma nova geração se necessário.'},409);
      if(run.purpose!=='recommendation'||!Number.isFinite(body.budgetUsd)||body.budgetUsd>100||body.budgetUsd<Number(run.confirmed_context.quote.maximumUsd)||Number(run.reserved_usd)>0)return json({error:'Confira limite e chamadas com retorno pendente antes de retomar.'},409);
      if(run.state==='completed')return json({id:run.id,state:run.state,profileId:profile.id});
      const {error:updateError}=await db.from('corretor_executions').update({state:'prepared',budget_usd:body.budgetUsd,updated_at:new Date().toISOString()}).eq('id',run.id);
      if(updateError)throw updateError;return json({id:run.id,state:'prepared',profileId:profile.id});
    }
    if(body.action==='status')return json({state:run.state,spentUsd:Number(run.spent_usd),reservedUsd:Number(run.reserved_usd)});
    if(body.action==='finish') {
      if(!['interrupted','failed','completed'].includes(body.state))return json({error:'Estado inválido.'},400);
      if(body.state==='completed') {
        if(run.purpose==='recommendation')return json({error:'O resultado consultivo é concluído pelo servidor após a contabilização.'},409);
        const {data:study,error:reportError}=await db.from('studies_v3').select('relatorio').eq('id',run.study_id).single();
        if(reportError||!study?.relatorio||Date.parse(study.relatorio.geradoEm??'')<Date.parse(run.created_at)||!Number.isFinite(Date.parse(study.relatorio.geradoEm??''))||Number(run.reserved_usd)>0)return json({error:'A execução ainda não tem um relatório completo ou há lote sem retorno confirmado.'},409);
      }
      const {error:updateError}=await db.from('corretor_executions').update({state:body.state,updated_at:new Date().toISOString()}).eq('id',run.id);
      if(updateError)throw updateError;return json({ok:true});
    }
    if(body.action!=='batch'||run.purpose==='recommendation'||!allowed.has(body.functionName)||!body.payload)return json({error:'Lote inválido.'},400);
    const task=body.functionName as ReviewTask;
    const profile=executionReviewProfile(run.confirmed_context);
    const profiled=Boolean(run.confirmed_context.reviewProfile);
    const model=body.payload.model as ReviewModel;
    if(profiled ? model!==profile.models[task] : !['gpt-4o','gpt-4o-mini'].includes(model))return json({error:'Modelo não corresponde ao perfil confirmado.'},400);
    const payload=body.payload, serialized=canonical(payload);
    if(serialized.length>16*1024*1024)return json({error:'Lote grande demais.'},413);
    const outputMax=profile.maxOutput[task];
    const reserve=profiled?reviewCost(profile.inputMax,outputMax,0,model,profile):(128000*(model==='gpt-4o'?2.5:0.15)+outputMax*(model==='gpt-4o'?10:0.6))/1e6;
    const batchHash=await hash(profiled?`${task}:${profile.namespace}:${profile.id}:${serialized}`:`${task}:continuous-v1:${serialized}`);
    const {data:claim,error:claimError} = await db.rpc('corretor_claim_batch',{p_execution:run.id,p_owner:owner,p_hash:batchHash,p_function:body.functionName,p_reserve:reserve});
    if(claimError)return json({error:'Lote bloqueado: confira o limite autorizado, outra execução em andamento ou um retorno ainda desconhecido.'},409);
    if(claim.cached)return json({...claim.response,replayed:true});
    const unknown=async(evidence:unknown=null)=>{
      // Não sobrescrever um finish já confirmado caso apenas sua resposta de rede tenha falhado.
      await db.from('corretor_execution_batches').update({state:'unknown',response:evidence}).eq('execution_id',run.id).eq('batch_hash',batchHash).eq('state','running');
      return json({error:safeError},409);
    };
    let response: Response;
    try { response = await fetch(`${url}/functions/v1/${body.functionName}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json','x-corretor-execution':run.id},body:serialized,signal:AbortSignal.timeout(130000)}); }
    catch { return await unknown(); }
    const result = await response.json().catch(()=>null);
    if(!result || !response.ok || !Number.isSafeInteger(result.inputTokens) || !Number.isSafeInteger(result.outputTokens))return await unknown(result);
    if(profiled && (result.profileId!==profile.id || result.configVersion!==profile.configVersion || result.requestedModel!==model || result.reasoningEffort!==profile.reasoningEffort || result.promptVersion!==profile.promptVersion || result.priceVersion!==profile.priceVersion || result.serviceTier!==profile.serviceTier))return await unknown(result);
    if(profiled && (result.inputTokens>profile.inputMax || result.outputTokens>profile.maxOutput[task] || typeof result.model!=='string' || !result.model.startsWith(model)))return await unknown(result);
    let cost: number;
    try { cost=profiled?reviewCost(result.inputTokens,result.outputTokens,result.cachedTokens??0,model,profile):(result.inputTokens*(model==='gpt-4o'?2.5:0.15)+result.outputTokens*(model==='gpt-4o'?10:0.6))/1e6; }
    catch { return await unknown(result); }
    const {error:finishError} = await db.rpc('corretor_finish_batch',{p_execution:run.id,p_hash:batchHash,p_response:result,p_cost:cost});
    if(finishError)return await unknown(result);
    return json({...result,costUsd:cost},result.error?422:200);
  } catch { return json({error:'O controle de execução ainda não está disponível. Confira a publicação da função e da atualização do banco.'},503); }
});
