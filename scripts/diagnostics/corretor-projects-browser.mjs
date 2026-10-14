// Bancada local isolada: intercepta todos os serviços externos; nunca usa IA ou banco real.
import {chromium} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const bank=JSON.parse(readFileSync('.local-inputs/audit-20261013/bank.json','utf8'));
const samples=bank.filter(c=>/Jardim Monte Bello|VAP_03ago|Castro Alves/.test(c.study.nome));
const selected=samples.find(c=>c.study.nome.includes('Jardim Monte Bello'));
if(!selected)throw Error('Snapshot CJ necessário');
const file=resolve('src/features/corretor/lib/v3/__tests__/teste_corretor.pptx'),raw=readFileSync(file);
const sha1=createHash('sha1').update(raw).digest('hex'),sha256=createHash('sha256').update(raw).digest('hex');
const out=resolve('.local-inputs/projects-browser-'+Date.now());mkdirSync(out,{recursive:true});
const owner='11111111-1111-4111-8111-111111111111',host='mxinpvcqzbfbzjodhgtz.supabase.co';
const session={access_token:[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:owner,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.'),refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:owner,email:'fixture@example.invalid',app_metadata:{},user_metadata:{},aud:'authenticated',created_at:'2026-10-14T00:00:00Z'}};
const versions=selected.study.study_versions.map((v,i)=>({...v,...(i===0?{sha1,arquivo:'teste_corretor.pptx'}:{})}));
versions.sort((a,b)=>b.n-a.n);versions[0].sha1=sha1;versions[0].arquivo='teste_corretor.pptx';
let profiles=[],originals=[],stored=false,offset=0,writes=[],functions=[],errors=[],requests=[],toasts=[];
const browser=await chromium.launch({headless:true});
async function context(){const ctx=await browser.newContext();await ctx.addInitScript(({session,host})=>localStorage.setItem('sb-'+host.split('.')[0]+'-auth-token',JSON.stringify(session)),{session,host});
 await ctx.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
  if(url.hostname!==host)return route.abort();
  const path=url.pathname,method=req.method();let data=[];const headers={'access-control-allow-origin':'*','access-control-expose-headers':'Location,Upload-Offset,Tus-Resumable','tus-resumable':'1.0.0'};
  requests.push({path,method});
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,HEAD,OPTIONS'}});
  if(path.includes('/functions/v1/')){functions.push(path);return route.abort();}
  if(path.endsWith('/auth/v1/user'))data=session.user;
  else if(path.endsWith('/studies_v3'))data=samples.map(c=>({...c.study,study_versions:c===selected?versions:c.study.study_versions,findings_v3:c.findings.map(f=>({status:f.status})),study_sources_v3:[]}));
  else if(path.endsWith('/corretor_projects')){
   if(method==='GET')data=profiles;
   else {const body=req.postDataJSON();const row={...body,id:profiles[0]?.id??'33333333-3333-4333-8333-333333333333',updated_at:new Date().toISOString()};profiles=[row];data=row;writes.push({path,method});}
  }else if(path.endsWith('/study_versions'))data=versions;
  else if(path.endsWith('/corretor_originals'))data=originals;
  else if(path.endsWith('/register_corretor_original')){
   const body=req.postDataJSON();if(!stored||body.p_sha256!==sha256||body.p_sha1!==sha1||body.p_bytes!==raw.length)throw Error('Bad original contract');
   originals=[{id:'original',project_id:body.p_project,version_id:body.p_version,path:body.p_path,sha256,sha1,bytes:raw.length,original_name:'teste_corretor.pptx',created_at:new Date().toISOString()}];data='original';writes.push({path,method});
  }else if(path.includes('/storage/v1/object/')&&method==='HEAD')return route.fulfill({status:stored?200:404,headers});
  else if(path.endsWith('/storage/v1/upload/resumable')&&method==='POST')return route.fulfill({status:201,headers:{...headers,location:'https://'+host+'/storage/v1/upload/resumable/fixture','upload-offset':'0'}});
  else if(path.endsWith('/upload/resumable/fixture')){
   if(method==='PATCH'){offset+=req.postDataBuffer()?.length??0;stored=offset===raw.length;}
   return route.fulfill({status:method==='HEAD'?200:204,headers:{...headers,'upload-offset':String(offset),'upload-length':String(raw.length)}});
  }else if(path.includes('/storage/v1/object/'))return route.fulfill({status:200,body:raw,headers:{...headers,'content-type':'application/octet-stream'}});
  return route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify(data)});
 });return ctx;}
const ctx=await context(),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.exposeFunction('fixtureToast',text=>toasts.push(text));await page.addInitScript(()=>{addEventListener('DOMContentLoaded',()=>new MutationObserver(()=>{document.querySelectorAll('[data-sonner-toast]').forEach(el=>window.fixtureToast(el.textContent));}).observe(document.body,{childList:true,subtree:true}));});
process.on('uncaughtException',async e=>{writeFileSync(resolve(out,'failure.json'),JSON.stringify({error:e.message,writes,stored,offset,errors,requests,toasts,text:await page.locator('body').innerText()},null,2));await page.screenshot({path:resolve(out,'failure.png'),fullPage:true});console.error(out);await browser.close();process.exit(1);});
await page.goto('http://127.0.0.1:5176/corretor',{waitUntil:'networkidle'});
const measurements=[];
for(const width of [1440,1024,390,320]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>document.querySelector('.corretor-projects').clientWidth>200);measurements.push({width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),contentWidth:await page.locator('.corretor-projects').evaluate(el=>el.clientWidth)});await page.screenshot({path:resolve(out,`portfolio-${width}.png`),fullPage:true});}
await page.getByRole('button',{name:'Expandir menu',exact:true}).click();await page.getByRole('button',{name:'Fechar menu',exact:true}).waitFor();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Fechar menu',exact:true}).waitFor({state:'hidden'});
await page.setViewportSize({width:1440,height:1000});await page.getByLabel('Buscar projetos').fill('Monte Bello');await page.getByRole('link',{name:'Abrir projeto'}).click();
await page.getByRole('button',{name:'Completar cadastro'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
if(!await page.getByRole('button',{name:'Completar cadastro'}).evaluate(el=>el===document.activeElement))throw Error('Foco não restaurado ao cancelar cadastro');
await page.getByRole('button',{name:'Completar cadastro'}).click();await page.getByLabel('Nome do projeto',{exact:true}).fill('Jardim Monte Bello · cadastro fixture');await page.getByLabel('Cliente',{exact:true}).fill('Cliente de demonstração');await page.getByRole('button',{name:'Salvar cadastro',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
await page.getByRole('tab',{name:'Materiais',exact:true}).click();await page.locator('input[type=file]').setInputFiles(file);await page.getByText('Original guardado no projeto.',{exact:true}).waitFor({timeout:30000});await page.screenshot({path:resolve(out,'materials-upload.png'),fullPage:true});
const fresh=await context(),p2=await fresh.newPage();p2.on('pageerror',e=>errors.push(e.message));
await p2.goto(`http://127.0.0.1:5176/corretor/projetos/${selected.study.id}`,{waitUntil:'networkidle'});await p2.getByRole('tab',{name:'Materiais',exact:true}).click();await p2.getByText('Original indisponível neste navegador.',{exact:true}).waitFor();await p2.getByRole('button',{name:'Recuperar neste navegador'}).click();await p2.getByText('Original disponível neste navegador.',{exact:true}).waitFor({timeout:15000});await p2.screenshot({path:resolve(out,'materials-new-browser.png'),fullPage:true});
await p2.getByRole('tab',{name:'Histórico',exact:true}).click();await p2.screenshot({path:resolve(out,'history.png'),fullPage:true});
await p2.evaluate(()=>document.documentElement.classList.add('dark'));await p2.waitForFunction(()=>getComputedStyle(document.querySelector('.cp-tabs [role=tab][data-state=active]')).color==='rgb(46, 56, 32)');await p2.screenshot({path:resolve(out,'history-dark.png'),fullPage:true});
if(functions.length||errors.length||measurements.some(m=>m.overflow))throw Error(JSON.stringify({functions,errors,measurements}));
writeFileSync(resolve(out,'result.json'),JSON.stringify({scope:'snapshot de estudos existentes; serviços/identidade simulados; PPTX sintético explícito para transferência',measurements,writes,functions,errors,uploadedBytes:offset,recovery:'novo contexto, cofre vazio → hash confirmado → disponível'},null,2));
await browser.close();console.log(out);
