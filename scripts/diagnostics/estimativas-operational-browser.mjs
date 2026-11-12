import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.local-inputs/estimativas-vendas/operacional-ui-20261027';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const evidence=[];
function fixture(i,type){return{building_id:i,name:`${type} exemplo ${i}`,release_date:'2026-01-01',estimation:false,typologies_history:Array.from({length:9},(_,m)=>({period:`2026-${String(m+1).padStart(2,'0')}`,typology_id:i,pattern:type==='Horizontal'?'Loteamento Fechado':'Standard',qty:100,typology_stock:100-(m+1)*9,sold_in_period:9,gross_sales:10,distractions:1,time_on_sale:m+1}))};}
try{
for(const width of [390,1440])for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',acceptDownloads:true});const page=await context.newPage();
 const errors=[];let calls=0;
 page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(({theme})=>{const now=Date.now();localStorage.setItem('brain-auth',JSON.stringify({state:{token:'synthetic-local-only',email:'',issuedAt:now,expiresAt:now+3600000},version:0}));localStorage.setItem('vite-ui-theme',theme);},{theme});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();
  if(u.pathname.includes('monitored-cities'))return route.fulfill({json:{data:[{city:'Curitiba',state:'PR',region:'Sul'}],links:{next:null}}});
  if(u.pathname.includes('building-with-history-internal')){calls++;const type=u.searchParams.get('type')??'Horizontal';await new Promise(r=>setTimeout(r,350));return route.fulfill({json:{data:Array.from({length:12},(_,i)=>fixture(i+(type==='Horizontal'?1:101),type)),meta:{last_page:1}}});}
  return route.abort();
 });
 await page.goto('http://127.0.0.1:8083/rebrain/estimativas-vendas');
 await page.getByRole('button',{name:'Estado',exact:true}).click();
 await page.getByRole('combobox').click();await page.getByRole('option',{name:'PR',exact:true}).click();
 await page.getByRole('button',{name:'Preparar análise'}).click();
 await page.getByRole('dialog').waitFor();assert.ok(await page.getByRole('dialog').locator('img').count()>0,'Brain logo during loading');
 await page.getByText('24 empreendimentos no recorte',{exact:true}).waitFor({timeout:60000});assert.equal(calls,2);
 await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);
 await page.getByRole('button',{name:'Incluir na proposta'}).first().click();
 await page.getByPlaceholder('Nome, ID ou cidade').fill('nada-corresponde');await page.getByText(/Nenhum empreendimento corresponde aos filtros/).waitFor();
 await page.getByRole('button',{name:'Revisar proposta (1)'}).click();let d=page.getByRole('dialog');await d.getByText('Horizontal exemplo 1 · 1',{exact:true}).waitFor();assert.ok(await d.getByRole('button',{name:'Exportar competências operacionais'}).isDisabled());
 const downloadPromise=page.waitForEvent('download');await d.getByRole('button',{name:'Baixar conferência',exact:true}).click();const download=await downloadPromise;await download.saveAs(`${out}/${width}-${theme}-conferencia.csv`);assert.match(await readFile(`${out}/${width}-${theme}-conferencia.csv`,'utf8'),/Horizontal exemplo 1/);
 await page.keyboard.press('Escape');await page.getByPlaceholder('Nome, ID ou cidade').fill('');
 await page.getByRole('button',{name:'Horizontal exemplo 1',exact:true}).click();d=page.getByRole('dialog');
 await d.getByRole('img',{name:/Vendas acumuladas em unidades/}).waitFor();await d.getByRole('button',{name:'Ritmo recente de estoque',exact:true}).click();
 await d.getByRole('button',{name:'24 meses',exact:true}).click();
 assert.equal(await d.locator('input[type=number]').count(),0);assert.equal(calls,2,'local interaction never refetches');
 assert.ok(await d.locator('.recharts-line').count()>=3);const overflow=await d.evaluate(el=>el.scrollWidth>el.clientWidth+2);assert.equal(overflow,false);
 await page.screenshot({path:`${out}/${width}-${theme}-detail.png`});await page.keyboard.press('Escape');
 assert.ok((await page.evaluate(()=>document.activeElement?.textContent))?.includes('Horizontal exemplo 1'),'focus returns to trigger');
 await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.getByRole('button',{name:'Vertical exemplo 109',exact:true}).waitFor();
 await page.screenshot({path:`${out}/${width}-${theme}-list.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);
 evidence.push({width,theme,transport:'synthetic-local',calls,brain:true,explicitComposition:true,filterPreserved:true,download:true,modelComparison:true,noParameterEditing:true,overflow:false,errors});await context.close();
}
await writeFile(`${out}/result.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}finally{await browser.close();}
