import { prepareRequest, recommendationProfile, LEGACY_RECOMMENDATION_PROFILE } from '../_shared/recommendation.ts';
const DEV_ORIGINS = ['http://localhost:8080','http://localhost:5173'];
Deno.serve(async req => {
 const origin=req.headers.get('origin')??'', allowed=[...DEV_ORIGINS,...(Deno.env.get('ALLOWED_ORIGINS')??'').split(',').map(s=>s.trim())];
 const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:DEV_ORIGINS[0],'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Content-Type':'application/json',Vary:'Origin'};
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return json({error:'Método não permitido.'},405);
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!service || req.headers.get('Authorization')!==`Bearer ${service}` || !req.headers.get('x-corretor-execution'))return json({error:'Confirme a execução pelo corretor antes de processar.'},403);
 try {
  const payload=await req.json();
  // Pedidos antigos sem perfil mantêm o contrato mini; nunca recebem o padrão novo.
  const profile=recommendationProfile(payload.profileId??LEGACY_RECOMMENDATION_PROFILE.id);
  if(payload.model!==profile.model||payload.promptVersion!==profile.promptVersion
    ||(payload.profileId&&payload.configVersion!==profile.configVersion))return json({error:'Configuração de geração inválida.'},400);
  const prepared=prepareRequest(payload,profile);
  const key=Deno.env.get('OPENAI_API_KEY');if(!key)return json({error:'O recomendador ainda não está disponível.'},503);
  const started=Date.now();
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:profile.model,
    ...(profile.reasoningEffort?{max_completion_tokens:prepared.maxOutputTokens,reasoning_effort:profile.reasoningEffort}:{max_tokens:prepared.maxOutputTokens}),
    service_tier:profile.serviceTier,store:false,messages:[{role:'user',content:prepared.prompt}]}),signal:AbortSignal.timeout(110000)});
  if(!response.ok)return json({error:'O provedor não confirmou a geração. Confira a execução antes de repetir.'},502);
  const data=await response.json(), usage=data.usage;
  if(!usage || !Number.isInteger(usage.prompt_tokens) || !Number.isInteger(usage.completion_tokens))return json({error:'Uso não confirmado pelo provedor. Não repita automaticamente.'},502);
  const content=data.choices?.[0]?.message?.content??'';
  return json({[prepared.mode==='batch'?'batch':'suggestion']:content,inputTokens:usage.prompt_tokens,outputTokens:usage.completion_tokens,cachedTokens:usage.prompt_tokens_details?.cached_tokens??0,
    reasoningTokens:usage.completion_tokens_details?.reasoning_tokens??null,model:data.model,requestedModel:profile.model,
    promptVersion:profile.promptVersion,priceVersion:profile.priceVersion,profileId:profile.id,configVersion:profile.configVersion,
    reasoningEffort:profile.reasoningEffort,requestedServiceTier:profile.serviceTier,serviceTier:data.service_tier??null,
    pricingSnapshot:{currency:'USD',per_tokens:1000000,price_version:profile.priceVersion,...profile.prices},
    endpoint:profile.endpoint,providerUsage:usage,requestId:data.id??null,latencyMs:Date.now()-started,finishReason:data.choices?.[0]?.finish_reason??null});
 } catch {return json({error:'O retorno da recomendação não pôde ser confirmado.'},502);}
});
