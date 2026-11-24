import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
const base='http://127.0.0.1:4223',folder=resolve('.local-inputs/relatorios-lucas/modelo-03/visual-2026-11-24');await mkdir(folder,{recursive:true});
const server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4223'],{windowsHide:true,stdio:'ignore'});let browser;const results=[],errors=[];
try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,250));}assert.ok(ready);browser=await chromium.launch({channel:'msedge',headless:true});
 for(const scenario of [{width:1440,dark:false,periodicity:'quarterly',exports:true},{width:390,dark:true,periodicity:'monthly'},{width:1440,dark:true,periodicity:'semiannual'},{width:390,dark:false,state:'error'},{width:1440,dark:false,state:'empty'},{width:390,dark:true,state:'no-token'},{width:1440,dark:true,state:'429'}].filter(s=>!process.argv.includes('--export-only')||s.exports)){
  const context=await browser.newContext({viewport:{width:scenario.width,height:1000},acceptDownloads:true});let fixture=[],heavy=0,rateLimited=false;
  if(scenario.state!=='no-token')await context.addInitScript(()=>localStorage.setItem('brain-auth',JSON.stringify({state:{token:'synthetic-only',email:'fixture@example.invalid',issuedAt:Date.now(),expiresAt:Date.now()+3600000},version:0})));
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();
   if(url.pathname==='/public-api/monitored-cities'){
    await new Promise(r=>setTimeout(r,400));if(scenario.state==='error')return route.fulfill({status:503,body:'unavailable'});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:scenario.state==='empty'?[]:[{city:'Curitiba',state:'PR'},{city:'Araucária',state:'PR'},{city:'Londrina',state:'PR'},{city:'Timon',state:'MA'}],links:{next:null}})});
   }
   if(!['geobrain.com.br','app.geobrain.com.br'].includes(url.hostname))return route.abort();heavy++;
   if(scenario.state==='429'&&!rateLimited){rateLimited=true;return route.fulfill({status:429,headers:{'Retry-After':'60'},body:'limit'});}
   const metric=url.pathname.endsWith('building-with-history-internal')?'details':url.pathname.split('/').at(-1),city=url.searchParams.get('city'),segment=url.searchParams.get('type')??url.searchParams.get('type[]'),group=url.searchParams.get('group_by')??'Empreendimento';
   const source=fixture.find(s=>s.city===city&&s.segment===segment&&s.metric===metric&&s.group===group);assert.ok(source,`${city}/${segment}/${metric}/${group}`);
   const n=Number(url.searchParams.get('page')??1),last=Math.ceil(source.rows.length/100);let rows=source.rows;if(metric!=='details'){const a=url.searchParams.get('start_period').slice(0,7),b=url.searchParams.get('end_period').slice(0,7);rows=rows.filter(r=>r.period.slice(0,7)>=a&&r.period.slice(0,7)<=b);}
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:rows.slice((n-1)*100,n*100),meta:{current_page:n,last_page:Math.max(1,Math.ceil(rows.length/100)),total:rows.length}})});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/rebrain/relatorios-institucionais/modelo-03`);await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),scenario.dark);
  await page.getByRole('heading',{name:'Modelo 03',exact:true}).waitFor();
  if(scenario.state&&scenario.state!=='429'){
   if(scenario.state==='error')await page.getByText('Falha ao carregar /monitored-cities:',{exact:false}).waitFor();
   if(scenario.state==='empty')await page.getByText('Seu acesso não retornou municípios monitorados.').waitFor();
   if(scenario.state==='no-token')await page.getByText('Faça login no cabeçalho para carregar os municípios monitorados.').waitFor();
   assert.ok(await page.getByRole('button',{name:'Gerar relatório',exact:true}).isDisabled());assert.equal(heavy,0);
  }else{
   await page.getByText('Carregando municípios autorizados',{exact:true}).waitFor({state:'hidden'});
   await page.locator('#modelo03-preset').click();await page.getByRole('option',{name:'Curitiba · ADEMI-PR',exact:true}).click();
   await page.getByRole('button',{name:'1 municípios selecionados',exact:true}).click();
   assert.equal(await page.getByRole('option',{name:'Londrina / PR',exact:false}).count(),0);
   assert.equal(await page.getByRole('option',{name:'Timon / MA',exact:false}).count(),0);
   await page.getByRole('option',{name:'Araucária / PR',exact:false}).click();await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('button',{name:'Araucária / PR ×',exact:true}).count(),0);
   await page.getByRole('button',{name:'Restaurar recorte da referência',exact:true}).click();
   assert.ok(await page.getByRole('button',{name:'Araucária / PR ×',exact:true}).isVisible());
   if(scenario.periodicity&&scenario.periodicity!=='quarterly'){await page.locator('#modelo03-periodicity').click();await page.getByRole('option',{name:scenario.periodicity==='monthly'?'Mensal':'Semestral',exact:true}).click();}
   await page.locator('#modelo03-position').click();await page.getByRole('option',{name:scenario.periodicity==='monthly'?'junho':scenario.periodicity==='semiannual'?'1º semestre':'2º trimestre',exact:true}).click();
   fixture=await page.evaluate(async periodicity=>{const {fixture,selection}=await import('/src/features/relatorios-institucionais/modelo-03/__tests__/fixture.ts');return fixture({...selection,periodicity:periodicity??'quarterly',position:periodicity==='monthly'?6:periodicity==='semiannual'?1:2});},scenario.periodicity);
   await page.locator('[data-modelo03-slide="1"]').screenshot({path:resolve(folder,`cover-${scenario.width}-${scenario.dark}.png`)});
   await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();await page.getByText('Consultando fontes do Modelo 03',{exact:true}).waitFor();
   const bounds=await page.getByRole('status').filter({hasText:'Consultando fontes do Modelo 03'}).evaluate(el=>{const r=el.getBoundingClientRect(),main=el.closest('main')?.getBoundingClientRect();return {position:getComputedStyle(el).position,left:r.left,right:r.right,mainLeft:main?.left??0,mainRight:main?.right??innerWidth};});
   assert.equal(bounds.position,'absolute');assert.ok(bounds.left>=bounds.mainLeft&&bounds.right<=bounds.mainRight+1);
   const loading=page.getByRole('region',{name:'Carregamento do relatório Modelo 03',exact:true});
   assert.ok(await loading.isVisible());assert.equal(await loading.locator('li[aria-current="step"]').count(),1);
   assert.equal(await page.locator('[data-modelo03-loading-viewport]').count(),0);
   assert.equal(await page.locator('[data-modelo03-slide]').count(),0);
   if(scenario.state==='429'){
    await page.getByText('Aguardando resposta da API · retomada automática',{exact:true}).waitFor();await page.screenshot({path:resolve(folder,'429.png'),fullPage:true});await page.getByRole('button',{name:'Cancelar consulta',exact:true}).click();await page.getByText('Consulta cancelada. Você pode gerar novamente.').waitFor();
   }else{
    await page.screenshot({path:resolve(folder,`loading-${scenario.width}-${scenario.dark}.png`),fullPage:true});
    await page.getByRole('heading',{name:'Diagnóstico da geração',exact:true}).waitFor({timeout:120000});assert.ok(await page.getByText('58 com dados disponíveis',{exact:false}).isVisible());assert.ok(await page.getByText('0 aguardando fonte',{exact:false}).isVisible());
    await page.locator('#modelo03-page').click();await page.getByRole('option',{name:/Empreendimentos verticais lançados$/}).first().click();
    await page.locator('[data-modelo03-slide="46"]').screenshot({path:resolve(folder,`slide-${scenario.width}-${scenario.dark}-${scenario.periodicity}.png`)});await page.screenshot({path:resolve(folder,`chart-${scenario.width}-${scenario.dark}-${scenario.periodicity}.png`),fullPage:true});
    if(scenario.exports){
     for(const [label,extension] of [['Baixar diagnóstico JSON','json'],['Baixar conferência CSV','csv'],['Baixar PPTX editável','pptx']]){
      const waiting=page.waitForEvent('download',{timeout:120000});await page.getByRole('button',{name:label,exact:true}).click();const file=await waiting,path=resolve(folder,`modelo03.${extension}`);await file.saveAs(path);
      if(extension==='json'){const audit=JSON.parse(await readFile(path,'utf8'));assert.equal(audit.summary.available,58);assert.equal(audit.summary.waitingSource,0);assert.equal(audit.criteria.monetarySeries,'INCC-DI');assert.ok(!JSON.stringify(audit).includes('Private project name'));results.push({download:extension,positions:audit.summary.total});}
      if(extension==='csv'){const csv=await readFile(path,'utf8');assert.ok(csv.includes('fonte-agregada'));assert.ok(!csv.includes('Private project name'));}
      if(extension==='pptx'){const files=unzipSync(new Uint8Array(await readFile(path))),slides=Object.keys(files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n));assert.ok(slides.length>=97);assert.ok(files['customXml/modelo03-audit.xml']);const editable=strFromU8(files['ppt/slides/slide1.xml']);assert.ok(editable.includes('PANORAMA'));results.push({download:extension,pages:slides.length});}
      await page.getByText('Arquivo gerado. Download iniciado.',{exact:true}).waitFor();
     }
    }
    const calls=heavy;await page.locator('#modelo03-year').click();await page.getByRole('option',{name:'2025',exact:true}).click();assert.equal(await page.getByRole('heading',{name:'Diagnóstico da geração',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Baixar PPTX editável',exact:true}).count(),0);assert.equal(heavy,calls);
   }
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:resolve(folder,`page-${scenario.width}-${scenario.dark}-${scenario.state??scenario.periodicity}.png`),fullPage:true});results.push({...scenario,heavy});await context.close();console.log(JSON.stringify({scenario,heavy}));
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({source:'synthetic intercepted API; not real authenticated market data',results,errors},null,2));console.log('All Modelo 03 visual scenarios passed');
}finally{await browser?.close();server.kill();}
