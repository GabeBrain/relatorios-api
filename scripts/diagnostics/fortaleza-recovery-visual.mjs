import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const folder=resolve('.local-inputs/relatorios-lucas/fortaleza/review-2026-11-13/recovery');
await mkdir(folder,{recursive:true});
const base='http://127.0.0.1:4193',cities=['Fortaleza','Aquiraz','Caucaia','Eusébio','Maracanaú'];
const server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4193'],{windowsHide:true,stdio:'ignore'});
let browser;
const results=[],errors=[];
try{
  let ready=false;
  for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}
  assert.ok(ready);browser=await chromium.launch({channel:'msedge',headless:true});
  for(const quarterly of [false,true])for(const fault of ['core','intro']){
    const width=fault==='core'?1440:390,kind=quarterly?'trimestral':'mensal';
    const context=await browser.newContext({viewport:{width,height:1000}});
    await context.addInitScript(()=>localStorage.setItem('brain-auth',JSON.stringify({state:{token:'synthetic-recovery-only',email:'fixture@example.invalid',issuedAt:Date.now(),expiresAt:Date.now()+3600000},version:0})));
    let broken=true,slow=true;const calls=[];
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());if(url.origin===base)return route.continue();
      const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(url.pathname==='/public-api/monitored-cities')return reply({data:cities.map(city=>({city,state:'CE'})),links:{next:null}});
      if(!['geobrain.com.br','app.geobrain.com.br'].includes(url.hostname))return route.abort();
      const city=url.searchParams.get('city'),metric=url.pathname.split('/').at(-1),type=url.searchParams.get('type')??url.searchParams.get('type[]');
      const call={city,metric,type};calls.push(call);
      if(metric==='building-with-history'){
        if(slow){slow=false;await new Promise(done=>setTimeout(done,1200));}
        return reply({data:[{city,state:'CE',building_type:'Vertical'}],meta:{total:1}});
      }
      if(metric==='building'){
        if(broken&&fault==='intro'&&city==='Aquiraz'&&type==='Vertical')return reply({},422);
        return reply({data:[{building_id:`${city}/${type}`,city,state:'CE',building_type:type,standard:type==='Horizontal'?'Condomínio de Casas':'Standard',release_date:'2026-06-01',name:'Cadastro sintético de recuperação'}],meta:{total:1,current_page:1,last_page:1}});
      }
      if(metric==='building-with-history-internal'){
        const months=Array.from({length:quarterly?27:13},(_,i)=>new Date(Date.UTC(2026,6-(quarterly?27:13)+i,1)).toISOString().slice(0,7));
        const products=type==='Vertical'?['Standard']:['Condomínio de Casas','Loteamento Fechado','Loteamento Aberto'];
        const data=products.map((standard,i)=>({building_id:`${city}/${type}/${i}`,city,state:'CE',building_type:type,standard,release_date:'2020-01-01',neighborhood:'Bairro sintético',typologies:[{id:i+1,type_of_typology:'Padrão'}],typologies_history:months.map(month=>({period:`${month}-01`,typology_id:i+1,qty:100,typology_stock:10,sold_in_period:1,number_bedroom:2,private_area:50,price:100000,price_private_area:2000}))}));
        return reply({data,meta:{total:data.length,current_page:1,last_page:1}});
      }
      assert.ok(['releases','sales','stock'].includes(metric));
      const months=[],start=url.searchParams.get('start_period'),end=url.searchParams.get('end_period');
      for(const date=new Date(`${start.slice(0,7)}-01T00:00:00Z`);date.toISOString().slice(0,7)<=end.slice(0,7);date.setUTCMonth(date.getUTCMonth()+1))months.push(date.toISOString().slice(0,7));
      call.short=months.length<10;
      const groups=type==='Horizontal'?['Condomínio de Casas','Loteamento Fechado','Loteamento Aberto']:['Standard'];
      const field=metric==='stock'?'stock':metric==='sales'?'liquid_sales':'releases_in_period';
      const rows=months.flatMap(month=>groups.map(group=>({city,state:'CE',building_type:type,group,period:`${month}-01`,[field]:broken&&fault==='core'&&city==='Aquiraz'&&metric==='sales'&&months.length<10?null:metric==='stock'?100:1,vgv_release:100000,vgv_liquid_sales:100000})));
      return reply({data:rows,meta:{total:rows.length,current_page:1,last_page:1},links:{next:null}});
    });
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/rebrain/relatorios-institucionais/fortaleza`);
    await page.locator('#fortaleza-periodicity').waitFor();
    if(quarterly){await page.locator('#fortaleza-periodicity').click();await page.getByRole('option',{name:'Trimestral',exact:true}).click();}
    await page.locator('#fortaleza-position').click();await page.getByRole('option',{name:quarterly?'2º trimestre':'junho',exact:true}).click();
    await page.locator('#fortaleza-year').click();await page.getByRole('option',{name:'2026',exact:true}).click();
    await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),fault==='intro');
    const generate=page.getByRole('button',{name:quarterly?'Gerar prévia vertical':'Gerar prévia mensal',exact:true});
    await generate.click();
    const loading=page.getByRole('region',{name:'Carregamento do relatório Fortaleza',exact:true});
    await loading.waitFor();assert.ok(await loading.locator('[role="status"] img').count()>0);
    await loading.screenshot({path:resolve(folder,`${kind}-${fault}-loading.png`)});
    const retry=page.getByRole('button',{name:'Tentar cidades faltantes',exact:true});await retry.waitFor({timeout:60000});
    assert.ok(await generate.isEnabled());
    const before=calls.length;broken=false;
    await retry.click();
    await page.waitForFunction(label=>![...document.querySelectorAll('button')].find(button=>button.textContent===label)?.disabled,quarterly?'Gerar prévia vertical':'Gerar prévia mensal');
    assert.equal(await retry.count(),0);
    const delta=calls.slice(before),core=delta.filter(call=>call.metric==='building-with-history'||call.short&&['sales','stock','releases'].includes(call.metric));
    if(fault==='core'){assert.equal(core.length,4);assert.ok(core.every(call=>call.city==='Aquiraz'));}
    else{assert.equal(core.length,0);assert.equal(delta.filter(call=>call.metric==='building').length,15);}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    results.push({kind,fault,width,retryRequests:delta.length,brainLoading:true,externalRequests:'intercepted'});
    await context.close();
  }
  assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();server.kill();}
