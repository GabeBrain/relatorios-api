import { prepareRequest, RECOMMENDATION_MODEL, PROMPT_VERSION, PRICE_VERSION } from '../_shared/recommendation.ts';
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
  const payload=await req.json(), prepared=prepareRequest(payload);
  if(payload.model!==RECOMMENDATION_MODEL || payload.promptVersion!==PROMPT_VERSION)return json({error:'Modelo ou versão do prompt inválidos.'},400);
  const key=Deno.env.get('OPENAI_API_KEY');if(!key)return json({error:'O recomendador ainda não está disponível.'},503);
  const started=Date.now();
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:RECOMMENDATION_MODEL,max_tokens:prepared.maxOutputTokens,messages:[{role:'user',content:prepared.prompt}]})});
  if(!response.ok)return json({error:'O provedor não confirmou a geração. Confira a execução antes de repetir.'},502);
  const data=await response.json(), usage=data.usage;
  if(!usage || !Number.isInteger(usage.prompt_tokens) || !Number.isInteger(usage.completion_tokens))return json({error:'Uso não confirmado pelo provedor. Não repita automaticamente.'},502);
  const content=data.choices?.[0]?.message?.content??'';
  return json({[prepared.mode==='batch'?'batch':'suggestion']:content,inputTokens:usage.prompt_tokens,outputTokens:usage.completion_tokens,cachedTokens:usage.prompt_tokens_details?.cached_tokens??0,model:data.model,requestedModel:RECOMMENDATION_MODEL,promptVersion:PROMPT_VERSION,priceVersion:PRICE_VERSION,requestId:data.id??null,latencyMs:Date.now()-started,finishReason:data.choices?.[0]?.finish_reason??null});
 } catch {return json({error:'O retorno da recomendação não pôde ser confirmado.'},502);}
});
