import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4199',folder=resolve('.local-inputs/relatorios-lucas/maceio/complete-page-2026-11-17');await mkdir(folder,{recursive:true});
const server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4199'],{windowsHide:true,stdio:'ignore'});let browser;const results=[],errors=[];
try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,250));}assert.ok(ready);browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [1440,390])for(const dark of [false,true])for(const coreBroken of [false,true])for(const quarterly of [false,true]){
  const context=await browser.newContext({viewport:{width,height:1000}}),cities=['Maceió','Pilar','Marechal Deodoro','Paripueira','Rio Largo','Barra de São Miguel','Coqueiro Seco'];let delayed=false,fixture;const historyKeys=new Set();
  await context.addInitScript(()=>localStorage.setItem('brain-auth',JSON.stringify({state:{token:'synthetic-only',email:'fixture@example.invalid',issuedAt:Date.now(),expiresAt:Date.now()+3600000},version:0})));
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();
   const reply=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname==='/public-api/monitored-cities'){await new Promise(r=>setTimeout(r,800));return reply({data:cities.map(city=>({city,state:'AL'})),links:{next:null}});}
   if(!['geobrain.com.br','app.geobrain.com.br'].includes(url.hostname))return route.abort();const city=url.searchParams.get('city'),metric=url.pathname.split('/').at(-1);
   const row={city,state:'AL',building_type:url.searchParams.get('type')??url.searchParams.get('type[]')??'Vertical'};
   if(metric==='building-with-history-internal'&&route.request().method()!=='POST')return route.fulfill({status:405,body:'method'});
   if(metric==='building-with-history')return reply({data:[row],meta:{total:1}});
   if(metric==='building')return reply({data:[{...row,building_id:city,release_date:'2026-05-01',standard:'Luxo'}],meta:{current_page:1,last_page:1,total:1}});
   const segment=row.building_type,group=url.searchParams.get('group_by')??'Padrão';
   const sources=segment==='Vertical'?fixture.sources:segment==='Horizontal'?fixture.horizontal:fixture.commercial;
   const source=sources?.find(source=>source.city===city&&source.metric===(metric==='building-with-history-internal'?'details':metric)&&source.group===(metric==='building-with-history-internal'?'Empreendimento':group));
   assert.ok(source,`${segment}/${city}/${metric}/${group}`);
   let data=source.rows;
   if(metric!=='building-with-history-internal'){
    const start=url.searchParams.get('start_period').slice(0,7),end=url.searchParams.get('end_period').slice(0,7);
    data=data.filter(row=>row.period.slice(0,7)>=start&&row.period.slice(0,7)<=end);
    const long=start.slice(0,4)<end.slice(0,4)-1;
    if(long){historyKeys.add(`${city}/${metric}/${group}`);if(!delayed){delayed=true;await new Promise(r=>setTimeout(r,800));}}
    if(coreBroken&&!long&&metric==='sales')data=data.map(row=>({...row,liquid_sales:null}));
   }
   if(metric!=='building-with-history-internal')data=data.map(({city:_city,state:_state,...fields})=>fields);
   const number=Number(url.searchParams.get('page')??1),last=Math.max(1,Math.ceil(data.length/100));
   return reply({data:data.slice((number-1)*100,number*100),meta:{current_page:number,last_page:last,total:data.length},links:{next:number===last?null:`${url.origin}${url.pathname}?page=${number+1}`}});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/rebrain/relatorios-institucionais/maceio`);await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
  await page.locator('#maceio-position').click();await page.getByRole('option',{name:'maio',exact:true}).click();
  if(quarterly){await page.locator('#maceio-periodicity').click();await page.getByRole('option',{name:'Trimestral',exact:true}).click();}
  fixture=await page.evaluate(async quarterly=>{const {remainingFixture}=await import('/src/features/relatorios-institucionais/maceio/__tests__/remaining-fixture.ts');return remainingFixture({uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:quarterly?'quarterly':'monthly',year:2026,position:quarterly?2:5});},quarterly);
  await page.getByRole('button',{name:'Gerar relatório',exact:true}).waitFor();await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
  await page.getByRole('region',{name:'Carregamento do relatório Maceió'}).waitFor();assert.ok(await page.getByRole('complementary').isVisible());
  await page.getByRole('button',{name:'40',exact:true}).waitFor({timeout:60000});await page.getByRole('button',{name:'19',exact:true}).click();assert.equal(await page.locator('[data-maceio-chart]').count(),1);assert.equal(historyKeys.size,quarterly?36:42);
  await page.getByRole('button',{name:'40',exact:true}).click();assert.equal(await page.locator('[data-maceio-chart]').count(),1);
  await page.getByRole('button',{name:'26',exact:true}).click();assert.equal(await page.locator('[data-maceio-pending]').count(),quarterly?1:0);assert.equal(await page.locator('#maceio-monetary-policy').count(),0);
  await page.getByRole('button',{name:quarterly?'72':'71',exact:true}).click();assert.equal(await page.locator('[data-maceio-chart]').count(),1);
  await page.getByRole('button',{name:quarterly?'74':'73',exact:true}).click();assert.equal(await page.locator('[data-maceio-pending]').count(),0);
  assert.equal(await page.locator('#maceio-price-policy').count(),0);assert.equal(await page.locator('[data-maceio-chart]').count(),1);
  if(quarterly){await page.getByRole('button',{name:'80',exact:true}).click();assert.equal(await page.locator('[data-maceio-chart]').count(),1);}
  await page.getByRole('button',{name:quarterly?'87':'82',exact:true}).click();assert.equal(await page.locator('[data-maceio-pending]').count(),0);assert.ok(await page.getByRole('button',{name:'Próximo',exact:true}).isDisabled());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:resolve(folder,`page-${width}-${dark}-${coreBroken}-${quarterly}.png`),fullPage:true});results.push({width,dark,coreBroken,quarterly,historyCalls:historyKeys.size});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({source:'intercepted synthetic API; no authenticated collection',results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();server.kill();}
