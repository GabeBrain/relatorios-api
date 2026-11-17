import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4203',folder=resolve('.local-inputs/relatorios-lucas/maceio/caged-2026-11-17/page');await mkdir(folder,{recursive:true});
const server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4203'],{windowsHide:true,stdio:'ignore'});let browser;const results=[],errors=[];
try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,250));}assert.ok(ready);browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [1440,390])for(const quarterly of [false,true])for(const state of ['success','empty','error']){
  const dark=width===390,context=await browser.newContext({viewport:{width,height:1000}}),cities=['Maceió','Pilar','Marechal Deodoro','Paripueira','Rio Largo','Barra de São Miguel','Coqueiro Seco'];let fixture,caged,cagedCalls=0;
  await context.addInitScript(()=>localStorage.setItem('brain-auth',JSON.stringify({state:{token:'synthetic-only',email:'fixture@example.invalid',issuedAt:Date.now(),expiresAt:Date.now()+3600000},version:0})));
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname.endsWith('/functions/v1/caged-report')){
    cagedCalls++;await new Promise(r=>setTimeout(r,1600));return state==='error'?reply({error:'source unavailable'},502):reply({report:state==='empty'?{...caged,completePeriods:[],rows:[]}:caged});
   }
   if(url.pathname==='/public-api/monitored-cities')return reply({data:cities.map(city=>({city,state:'AL'})),links:{next:null}});
   if(url.hostname!=='geobrain.com.br')return route.abort();const city=url.searchParams.get('city'),metric=url.pathname.split('/').at(-1),row={city,state:'AL',building_type:url.searchParams.get('type')??url.searchParams.get('type[]')??'Vertical'};
   if(metric==='building-with-history')return reply({data:[row],meta:{total:1}});
   if(metric==='building')return reply({data:[{...row,building_id:city,release_date:'2026-05-01',standard:'Luxo'}],meta:{current_page:1,last_page:1,total:1}});
   const sources=row.building_type==='Vertical'?fixture.sources:row.building_type==='Horizontal'?fixture.horizontal:fixture.commercial,group=url.searchParams.get('group_by')??'Padrão';
   const source=sources?.find(s=>s.city===city&&s.metric===(metric==='building-with-history-internal'?'details':metric)&&s.group===(metric==='building-with-history-internal'?'Empreendimento':group));assert.ok(source);
   let data=source.rows;if(metric!=='building-with-history-internal'){const start=url.searchParams.get('start_period').slice(0,7),end=url.searchParams.get('end_period').slice(0,7);data=data.filter(row=>row.period.slice(0,7)>=start&&row.period.slice(0,7)<=end);}
   const page=Number(url.searchParams.get('page')??1),last=Math.max(1,Math.ceil(data.length/100));return reply({data:data.slice((page-1)*100,page*100),meta:{current_page:page,last_page:last,total:data.length},links:{next:page===last?null:`${url.origin}${url.pathname}?city=${encodeURIComponent(city)}&page=${page+1}`}});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/rebrain/relatorios-institucionais/maceio`);await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
  await page.locator('#maceio-position').click();await page.getByRole('option',{name:'maio',exact:true}).click();if(quarterly){await page.locator('#maceio-periodicity').click();await page.getByRole('option',{name:'Trimestral',exact:true}).click();}
  const payload=await page.evaluate(async quarterly=>{
   const {remainingFixture}=await import('/src/features/relatorios-institucionais/maceio/__tests__/remaining-fixture.ts');const {cagedFixture}=await import('/src/features/relatorios-institucionais/maceio/__tests__/caged-fixture.ts');
   return {fixture:remainingFixture({uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:quarterly?'quarterly':'monthly',year:2026,position:quarterly?2:5}),caged:cagedFixture(quarterly?'2026-06':'2026-05','2017-01',true)};
  },quarterly);fixture=payload.fixture;caged=payload.caged;
  await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
  await page.getByText('Consultando agregados CAGED do MTE',{exact:true}).waitFor({timeout:60000});const overlay=page.getByRole('region',{name:'Carregamento do relatório Maceió'});assert.ok(await overlay.isVisible());assert.ok(await overlay.locator('img').count());await page.screenshot({path:resolve(folder,`loading-${width}-${quarterly}-${state}.png`),fullPage:true});
  await page.getByRole('button',{name:'9',exact:true}).waitFor({timeout:60000});await page.getByRole('button',{name:'9',exact:true}).click();assert.equal(cagedCalls,1);assert.equal(await page.locator('[data-maceio-caged]').count(),state==='success'?1:0);assert.equal(await page.locator('[data-maceio-pending]').count(),state==='success'?0:1);
  if(state!=='success'){await page.getByRole('button',{name:'Tentar fontes pendentes',exact:true}).waitFor();}
  for(const slide of [10,11,12,13,14]){await page.getByRole('button',{name:String(slide),exact:true}).click();assert.equal(await page.locator('[data-maceio-caged]').count(),state==='success'?1:0);}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:resolve(folder,`result-${width}-${quarterly}-${state}.png`),fullPage:true});results.push({width,quarterly,state,cagedCalls});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({source:'intercepted synthetic API and CAGED; no remote deployment',results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}catch(error){console.error(JSON.stringify({errors}));throw error;}finally{await browser?.close();server.kill();}
