// Verificação local: identidade, banco e rede externos integralmente simulados.
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const sample=JSON.parse(readFileSync('.local-inputs/audit-20261013/bank.json','utf8')).find(c=>c.study.nome.includes('Jardim Monte Bello'));
const study=structuredClone(sample.study),uid='11111111-2222-4333-8444-555555555555';
study.created_by=null;
const user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',app_metadata:{corretor_enabled:true,corretor_geo_until:new Date(Date.now()+3600000).toISOString()},user_metadata:{},created_at:new Date().toISOString()};
const jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,app_metadata:user.app_metadata}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.fixture';
const session={access_token:jwt,refresh_token:'fixture-no-real-credential',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user};
const out=resolve('.local-inputs/portfolio-flow-'+Date.now());mkdirSync(out,{recursive:true});
const result={checks:[],errors:[],measurements:[],functionCalls:0,simulatedProfileWrites:0};
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();
let profiles=[],studyReads=0;
await ctx.addInitScript(s=>localStorage.setItem('sb-mxinpvcqzbfbzjodhgtz-auth-token',JSON.stringify(s)),session);
await ctx.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.hostname==='127.0.0.1')return route.continue();
 if(!url.hostname.endsWith('.supabase.co'))return route.abort();
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
 if(url.pathname.includes('/functions/')){result.functionCalls++;return route.abort();}
 if(url.pathname.includes('/auth/v1/user'))return route.fulfill({json:user});
 if(url.pathname.includes('/auth/'))return route.fulfill({json:session});
 const table=url.pathname.split('/').at(-1);let data=[];
 if(table==='studies_v3'){
  studyReads++;
  data=url.searchParams.has('created_by')?[]:[{...study,findings_v3:sample.findings.map(f=>({status:f.status})),study_sources_v3:[]}];
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
 await page.goto('http://127.0.0.1:5184/corretor?scope=mine',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'Nenhum estudo associado à sua conta'}).waitFor();
 await page.getByRole('button',{name:'Ver todos os estudos',exact:true}).click();
 await page.getByRole('button',{name:'Completar cadastro',exact:true}).click();
 await page.getByRole('button',{name:'Salvar cadastro',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Meus estudos',exact:true}).click();
 await page.locator('.cp-row').waitFor();assert.equal(await page.locator('.cp-row').count(),1);
 assert.equal(study.created_by,null);assert.equal(result.simulatedProfileWrites,1);result.checks.push('salvar cadastro associa à carteira pessoal sem reatribuir autoria');
 await page.reload({waitUntil:'networkidle'});await page.locator('.cp-row').waitFor();result.checks.push('Meus estudos mantém cadastro após reload');
 await page.locator('.cp-row h2 a').click();await page.getByRole('link',{name:'Voltar aos estudos',exact:true}).waitFor();
 const before=studyReads;study.status='pronto';
 await page.getByRole('link',{name:'Voltar aos estudos',exact:true}).click();await page.locator('.cp-row').waitFor();
 assert(studyReads>before);await page.getByText('Entrega registrada',{exact:true}).waitFor();result.checks.push('voltar à carteira busca estado atualizado e inclui estudo concluído');
 await page.getByRole('combobox',{name:'Situação da carteira'}).click();await page.getByRole('option',{name:'Em andamento',exact:true}).click();
 await page.getByRole('button',{name:'Limpar filtros e mostrar estudos'}).click();await page.locator('.cp-row').waitFor();result.checks.push('filtro que oculta estudo oferece recuperação explícita');
 for(const width of [1440,1024,390,320]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(350);
  await page.screenshot({path:join(out,`portfolio-${width}.png`),fullPage:true});
 }
 await page.getByRole('link',{name:'Novo estudo',exact:true}).click();await page.getByRole('button',{name:'Escolher PowerPoint',exact:true}).waitFor();
 for(const width of [1440,1024,390,320]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(350);
  result.measurements.push(await page.evaluate(()=>({viewport:innerWidth,aside:document.querySelector('aside').getBoundingClientRect().width,main:document.querySelector('main').getBoundingClientRect().width,picker:document.querySelector('.cp-file-picker').getBoundingClientRect().width,icon:document.querySelector('.cp-file-symbol svg').getBoundingClientRect().width})));
  await page.screenshot({path:join(out,`new-${width}.png`),fullPage:true});
 }
 await page.locator('html').evaluate(el=>el.classList.add('dark'));await page.waitForTimeout(350);
 const dark=await page.locator('.cp-file-picker').first().evaluate(el=>({background:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color}));
 assert.equal(dark.background,'rgb(29, 33, 22)');assert.equal(dark.text,'rgb(243, 244, 239)');
 await page.screenshot({path:join(out,'new-dark-320.png'),fullPage:true});result.checks.push('campos de envio mantêm contraste no tema escuro após estabilizar transição');
 assert.equal(result.functionCalls,0);assert.equal(result.errors.length,0);result.status='pass';
}catch(e){result.status='failed';result.failure=e.stack;result.lastText=await page.locator('body').innerText();await page.screenshot({path:join(out,'failure.png'),fullPage:true});}
finally{writeFileSync(join(out,'result.json'),JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify({out,...result}));if(result.status!=='pass')process.exitCode=1;
