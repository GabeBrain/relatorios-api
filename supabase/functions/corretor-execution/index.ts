import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.3';
import { recommendationContext, ensureRecommendation, recommendationStep } from './recommendation.ts';

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
      if(consult){try{context=recommendationContext(context,version);}catch{return json({error:'Conteúdo consultivo inválido ou grande demais.'},400);}
        if(body.budgetUsd<context.quote.maximumUsd)return json({error:'O limite precisa cobrir a reserva máxima da recomendação.'},400);}
      const contextHash = await hash(canonical(context));
      const {error:insertError} = await db.from('corretor_executions').insert({study_id:body.studyId,version_n:body.version,document_sha1:version.sha1,context_hash:contextHash,confirmed_context:context,owner_hash:owner,budget_usd:body.budgetUsd,...(consult?{purpose:'recommendation',engine:'recommendation-v1',estimated_usd:context.quote.estimateUsd}:{})});
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
      return json({id:run.id,state:run.state,spentUsd:Number(run.spent_usd),reservedUsd:Number(run.reserved_usd)});
    }
    const {data:run,error} = await db.from('corretor_executions').select('*').eq('id',body.executionId).eq('owner_hash',owner).single();
    if(error||!run)return json({error:'Execução não autorizada.'},403);
    if(body.action==='recommendation_step')return await recommendationStep(db,run,owner,url,key,json,hash,canonical);
    if(body.action==='recommendation_resume'){
      if(run.state==='failed')return json({error:'Esta tentativa não pode ser retomada. Confira o histórico e autorize uma nova geração se necessário.'},409);
      if(run.purpose!=='recommendation'||!Number.isFinite(body.budgetUsd)||body.budgetUsd>100||body.budgetUsd<Number(run.confirmed_context.quote.maximumUsd)||Number(run.reserved_usd)>0)return json({error:'Confira limite e chamadas com retorno pendente antes de retomar.'},409);
      if(run.state==='completed')return json({id:run.id,state:run.state});
      const {error:updateError}=await db.from('corretor_executions').update({state:'prepared',budget_usd:body.budgetUsd,updated_at:new Date().toISOString()}).eq('id',run.id);
      if(updateError)throw updateError;return json({id:run.id,state:'prepared'});
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
    if(body.action!=='batch'||run.purpose==='recommendation'||!allowed.has(body.functionName)||!body.payload||!['gpt-4o','gpt-4o-mini'].includes(body.payload.model))return json({error:'Lote inválido.'},400);
    const payload = body.payload, serialized = canonical(payload);
    if(serialized.length>16*1024*1024)return json({error:'Lote grande demais.'},413);
    // Limite conservador: janela máxima do modelo, inclusive imagem e prompt.
    // Não usamos a estimativa otimista do navegador para autorizar uma chamada.
    const inputMax = 128000; // Janela máxima dos dois modelos, limite conservador de entrada.
    const outputMax = body.functionName==='analyze-text-batch'?1500:body.functionName==='analyze-ata-image'?2000:4000;
    const rates = payload.model==='gpt-4o'?[2.5,10]:[0.15,0.6];
    const reserve = (inputMax*rates[0]+outputMax*rates[1])/1e6;
    const batchHash = await hash(`${body.functionName}:continuous-v1:${serialized}`);
    const {data:claim,error:claimError} = await db.rpc('corretor_claim_batch',{p_execution:run.id,p_owner:owner,p_hash:batchHash,p_function:body.functionName,p_reserve:reserve});
    if(claimError)return json({error:'Lote bloqueado: confira o limite autorizado, outra execução em andamento ou um retorno ainda desconhecido.'},409);
    if(claim.cached)return json({...claim.response,replayed:true});
    let response: Response;
    try { response = await fetch(`${url}/functions/v1/${body.functionName}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json','x-corretor-execution':run.id},body:serialized}); }
    catch { return json({error:safeError},409); }
    const result = await response.json();
    if(!response.ok||result.error) {
      // Reserva mantida: uma falha após envio pode já ter consumido tokens.
      await db.from('corretor_execution_batches').update({state:'unknown'}).eq('execution_id',run.id).eq('batch_hash',batchHash);
      return json({error:safeError},409);
    }
    if(!Number.isFinite(result.inputTokens)||!Number.isFinite(result.outputTokens))return json({error:safeError},409);
    const cost = (result.inputTokens*rates[0]+result.outputTokens*rates[1])/1e6;
    const {error:finishError} = await db.rpc('corretor_finish_batch',{p_execution:run.id,p_hash:batchHash,p_response:result,p_cost:cost});
    if(finishError)return json({error:safeError},409);
    return json(result);
  } catch { return json({error:'O controle de execução ainda não está disponível. Confira a publicação da função e da atualização do banco.'},503); }
});
