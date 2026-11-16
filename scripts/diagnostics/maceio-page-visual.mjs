import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4199',folder=resolve('.local-inputs/relatorios-lucas/maceio/page-visual-2026-11-16');await mkdir(folder,{recursive:true});
const server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4199'],{windowsHide:true,stdio:'ignore'});let browser;const results=[],errors=[];
try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,250));}assert.ok(ready);browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [1440,390])for(const dark of [false,true])for(const coreBroken of [false,true]){
  const context=await browser.newContext({viewport:{width,height:1000}}),cities=['Maceió','Pilar','Marechal Deodoro','Paripueira','Rio Largo','Barra de São Miguel','Coqueiro Seco'];let delayed=false,historyCalls=0;
  await context.addInitScript(()=>localStorage.setItem('brain-auth',JSON.stringify({state:{token:'synthetic-only',email:'fixture@example.invalid',issuedAt:Date.now(),expiresAt:Date.now()+3600000},version:0})));
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();
   const reply=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname==='/public-api/monitored-cities'){await new Promise(r=>setTimeout(r,800));return reply({data:cities.map(city=>({city,state:'AL'})),links:{next:null}});}
   if(url.hostname!=='geobrain.com.br')return route.abort();const city=url.searchParams.get('city'),metric=url.pathname.split('/').at(-1);
   const row={city,state:'AL',building_type:'Vertical'};
   if(metric==='building-with-history')return reply({data:[row],meta:{total:1}});
   if(metric==='building')return reply({data:[{...row,building_id:city,release_date:'2026-05-01',standard:'Luxo'}],meta:{current_page:1,last_page:1,total:1}});
   if(metric==='building-with-history-internal')return reply({data:[{...row,building_id:city,neighborhood:'Bairro de teste',typologies_history:[]}],meta:{current_page:1,last_page:1,total:1}});
   assert.ok(['releases','sales','stock'].includes(metric));const start=url.searchParams.get('start_period').slice(0,7),end=url.searchParams.get('end_period').slice(0,7),months=[];
   for(const d=new Date(`${start}-01T00:00:00Z`);d.toISOString().slice(0,7)<=end;d.setUTCMonth(d.getUTCMonth()+1))months.push(d.toISOString().slice(0,7));
   if(months.length>12){historyCalls++;if(!delayed){delayed=true;await new Promise(r=>setTimeout(r,800));}}
   const data=months.map(month=>({...row,group:'Médio Padrão',period:`${month}-01`,vgv_release:1000,vgv_liquid_sales:1000,[metric==='stock'?'stock':metric==='sales'?'liquid_sales':'releases_in_period']:coreBroken&&metric==='sales'?null:metric==='stock'?100:1}));
   return reply({data,meta:{current_page:1,last_page:1,total:data.length},links:{next:null}});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/rebrain/relatorios-institucionais/maceio`);await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
  await page.getByRole('button',{name:'Gerar relatório',exact:true}).waitFor();await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
  await page.getByRole('region',{name:'Carregamento do relatório Maceió'}).waitFor();assert.ok(await page.getByRole('complementary').isVisible());
  await page.getByRole('button',{name:'40',exact:true}).waitFor({timeout:60000});await page.getByRole('button',{name:'19',exact:true}).click();assert.equal(await page.locator('[data-maceio-chart]').count(),1);assert.equal(historyCalls,35);
  await page.getByRole('button',{name:'40',exact:true}).click();assert.equal(await page.locator('[data-maceio-chart]').count(),1);
  await page.getByRole('button',{name:'26',exact:true}).click();assert.equal(await page.locator('[data-maceio-pending]').count(),1);await page.locator('#maceio-monetary-policy').click();await page.getByRole('option',{name:'INCC-DI · usar após confirmar o critério',exact:true}).click();assert.equal(await page.locator('[data-maceio-chart]').count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:resolve(folder,`page-${width}-${dark}-${coreBroken}.png`),fullPage:true});results.push({width,dark,coreBroken,historyCalls});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({source:'intercepted synthetic API; no authenticated collection',results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();server.kill();}
