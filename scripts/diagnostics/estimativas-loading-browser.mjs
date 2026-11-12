import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const output='.local-inputs/estimativas-vendas/loading-browser';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[];
for(const mode of ['cancel','error','empty']){
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{const now=Date.now();localStorage.setItem('brain-auth',JSON.stringify({state:{token:'local-ui-test',issuedAt:now,expiresAt:now+3600000},version:0}));});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();
  if(url.pathname.includes('monitored-cities')){await new Promise(r=>setTimeout(r,700));return route.fulfill({json:{data:[{city:'Goiânia',state:'GO'}],links:{next:null}}});}
  if(url.pathname.includes('building-with-history-internal')){
   if(mode==='cancel'){await new Promise(r=>setTimeout(r,2000));try{await route.fulfill({json:{data:[],meta:{last_page:1}}});}catch{/* request intentionally cancelled */}return;}
   if(mode==='error')return route.fulfill({status:500,json:{message:'local test failure'}});
   return route.fulfill({json:{data:[],meta:{last_page:1}}});
  }
  return route.abort();
 });
 await page.goto('http://127.0.0.1:8081/rebrain/estimativas-vendas');
 await page.getByRole('status').filter({hasText:'Consultando municípios'}).locator('img').waitFor();
 await page.getByRole('combobox').first().click();await page.getByRole('option',{name:'GO',exact:true}).click();
 await page.getByRole('combobox').nth(1).click();await page.getByPlaceholder(/Buscar munic/).fill('Goiânia');await page.getByText('Goiânia',{exact:true}).last().click();
 await page.getByRole('button',{name:'Consultar empreendimentos',exact:true}).click();
 if(mode==='cancel'){
  const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.getByRole('status').locator('img').first().waitFor();
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).focus();await page.keyboard.press('Tab');
  if(!await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')))throw new Error('Loading focus escaped');
  await page.screenshot({path:`${output}/brain-cancel.png`});await page.keyboard.press('Escape');
  await page.getByRole('alert').filter({hasText:'Operação cancelada'}).waitFor();
 }else if(mode==='error')await page.getByRole('alert').filter({hasText:'Falha no histórico'}).waitFor();
 else await page.getByText('Monte sua comparação',{exact:true}).waitFor();
 if(await page.getByTestId('forecast-card').count())throw new Error('A failed/empty/cancelled response created a chart');
 if(errors.length)throw new Error(errors.join('\n'));
 checks.push({mode,fieldBrainLogo:true,noFalseCharts:true,keyboardCancel:mode==='cancel',pageErrors:errors});await page.close();
}
await browser.close();await writeFile(`${output}/report.json`,JSON.stringify(checks,null,2));console.log(JSON.stringify(checks,null,2));
