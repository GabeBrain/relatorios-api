// Verificação local: identidade, banco e rede externos integralmente simulados.
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const sample=JSON.parse(readFileSync('.local-inputs/audit-20261013/bank.json','utf8')).find(c=>c.study.nome.includes('Jardim Monte Bello'));
const study=structuredClone(sample.study),uid='11111111-2222-4333-8444-555555555555';
study.created_by=uid;study.relatorio=null;
const user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',app_metadata:{corretor_enabled:true,corretor_geo_until:new Date(Date.now()+3600000).toISOString()},user_metadata:{},created_at:new Date().toISOString()};
const jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,app_metadata:user.app_metadata}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.fixture';
const session={access_token:jwt,refresh_token:'fixture-no-real-credential',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user};
const out=resolve('.local-inputs/study-trash-browser-'+Date.now());mkdirSync(out,{recursive:true});
const result={checks:[],errors:[],measurements:[],functionCalls:0,simulatedProfileWrites:0,simulatedDrafts:0,simulatedStartActions:[]};
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();
let profiles=[],studyReads=0,visibleStudies=[study];
await ctx.addInitScript(s=>{localStorage.setItem('sb-mxinpvcqzbfbzjodhgtz-auth-token',JSON.stringify(s));localStorage.setItem('brain-auth',JSON.stringify({state:{token:'fixture-api',email:s.user.email,issuedAt:Date.now(),expiresAt:Date.now()+3600000},version:0}));},session);
await ctx.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.hostname==='127.0.0.1')return route.continue();
 if(!url.hostname.endsWith('.supabase.co'))return route.abort();
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
 if(url.pathname.includes('/functions/')){result.functionCalls++;result.simulatedStartActions.push(req.postDataJSON()?.action);return route.fulfill({status:503,json:{error:'Indisponibilidade simulada antes de qualquer provedor.'}});}
 if(url.pathname.includes('/auth/v1/user'))return route.fulfill({json:user});
 if(url.pathname.includes('/auth/'))return route.fulfill({json:session});
 const table=url.pathname.split('/').at(-1);let data=[];
 if(table==='corretor_trash_study'){study.deleted_at=new Date().toISOString();return route.fulfill({json:true});}
 else if(table==='corretor_prepare_study'){
  const body=req.postDataJSON();let current=visibleStudies.find(s=>s.study_versions.some(v=>v.sha1===body.p_sha1));
  if(!current){result.simulatedDrafts++;current={...study,id:'22222222-3333-4444-8555-666666666666',created_by:uid,nome:body.p_name,status:'em_correcao',relatorio:null,cidade:null,uf:null,ata:null,ata_confirmada:false,custo_total:0,study_versions:[{id:'draft-version',n:1,n_slides:body.p_slides,sha1:body.p_sha1}]};visibleStudies.push(current);data={id:current.id,created:true};}
  else data={id:current.id,created:false};
  return route.fulfill({json:data});
 }else if(table==='studies_v3'){
  studyReads++;
  data=visibleStudies.filter(s=>!url.searchParams.has('created_by')||s.created_by===uid).map(s=>({...s,findings_v3:sample.findings.map(f=>({status:f.status})),study_sources_v3:[]}));
 }else if(table==='corretor_projects'){
  if(req.method()==='POST'){result.simulatedProfileWrites++;profiles=[{...req.postDataJSON(),id:'fixture-profile',updated_at:new Date().toISOString()}];}
  data=profiles;
 }else if(table==='study_versions')data=study.study_versions;
 else if(table==='findings_v3')data=sample.findings;
 if(req.headers().accept?.includes('vnd.pgrst.object'))data=data[0]??null;
 return route.fulfill({json:data});
});
page.on('pageerror',e=>result.errors.push(e.message));

try{
 await page.goto('http://127.0.0.1:5184/corretor',{waitUntil:'networkidle'});
 const trash=page.getByRole('button',{name:`Excluir estudo ${study.nome}`,exact:true});await trash.waitFor();
 page.once('dialog',d=>d.dismiss());await trash.click();assert.equal(await page.locator('.cp-row').count(),1);assert(!study.deleted_at);result.checks.push('lixeira na carteira para estudo incompleto; cancelar conserva registro');
 await page.locator('.cp-row h2 a').click();await page.getByRole('heading',{name:'Continuar avaliação',exact:true}).waitFor({timeout:30000});
 assert.equal(await page.getByRole('button',{name:`Excluir estudo ${study.nome}`,exact:true}).count(),1);result.checks.push('estudo incompleto aberto tem uma lixeira acessível sem depender do arquivo');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:`Excluir estudo ${study.nome}`,exact:true}).click();
 await page.waitForURL('**/corretor');await page.getByRole('heading',{name:'Sua lista de estudos começa aqui',exact:true}).waitFor();assert(study.deleted_at);assert.equal(visibleStudies.length,1);result.checks.push('exclusão lógica confirmada remove da carteira e preserva registro simulado');
 await page.reload({waitUntil:'networkidle'});await page.getByRole('heading',{name:'Sua lista de estudos começa aqui',exact:true}).waitFor();assert.equal(await page.locator('.cp-row').count(),0);assert.equal(result.functionCalls,0);result.checks.push('reload não ressuscita estudo removido; nenhuma IA');
 assert.deepEqual(result.errors,[]);result.status='pass';
}catch(e){result.status='failed';result.failure=e.stack;result.lastText=await page.locator('body').innerText();await page.screenshot({path:join(out,'failure.png'),fullPage:true});}
finally{writeFileSync(join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({out,...result}));await browser.close();}
if(result.status!=='pass')process.exitCode=1;
