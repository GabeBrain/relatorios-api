import { createClient } from 'npm:@supabase/supabase-js@2.105.3';
// Biblioteca pública: apenas derivados de visualização; nunca assinar PPTX/Excel por este endpoint.
Deno.serve(async request => {
 const origin=request.headers.get('Origin')??'';
 const allowed=['https://geobrain-relatorios.lovable.app','http://localhost:5176','http://127.0.0.1:5176',...(Deno.env.get('ALLOWED_ORIGINS')??'').split(',').map(s=>s.trim()).filter(Boolean)];
 const cors={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],Vary:'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(origin&&!allowed.includes(origin))return reply({error:'Origem não permitida.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
 try {
  const text=await request.text();if(text.length>1024)return reply({error:'Solicitação inválida.'},413);
  const {assetId}=JSON.parse(text);if(typeof assetId!=='string'||! /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(assetId))return reply({error:'Identificador inválido.'},400);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:asset,error}=await admin.from('corretor_material_assets').select('path,kind').eq('id',assetId).single();
  if(error||!asset||!['preview_pdf','preview_slide'].includes(asset.kind))return reply({error:'Prévia não disponível.'},404);
  const {data,error:signError}=await admin.storage.from('corretor-materiais').createSignedUrl(asset.path,120);
  if(signError||!data?.signedUrl)return reply({error:'Prévia não disponível.'},404);
  return reply({url:data.signedUrl,expiresIn:120});
 }catch{return reply({error:'Não foi possível abrir a prévia.'},503);}
});
