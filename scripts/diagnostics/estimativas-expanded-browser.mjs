import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const folder='.local-inputs/estimativas-vendas/expanded/browser';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[],checks=[];
function fixture(i){return{building_id:i,name:`Empreendimento ${String(i).padStart(3,'0')}`,release_date:'2024-01-01',typologies_history:Array.from({length:33},(_,m)=>({period:`${2024+Math.floor(m/12)}-${String(m%12+1).padStart(2,'0')}`,typology_id:i,pattern:'Loteamento Fechado',qty:300,typology_stock:300-(m+1)*5,sold_in_period:5,gross_sales:6,distractions:1,time_on_sale:m+1}))};}
for(const width of [390,768,1440,1920])for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>failures.push(String(e)));
 await page.addInitScript(({theme})=>{const now=Date.now();localStorage.setItem('brain-auth',JSON.stringify({state:{token:'synthetic-local-only',email:'',issuedAt:now,expiresAt:now+3600000},version:0}));localStorage.setItem('vite-ui-theme',theme);},{theme});
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();if(url.pathname.includes('monitored-cities'))return route.fulfill({json:{data:[{city:'Curitiba',state:'PR'}],links:{next:null}}});if(url.pathname.includes('building-with-history-internal')){await new Promise(r=>setTimeout(r,100));return route.fulfill({json:{data:Array.from({length:100},(_,i)=>fixture(i+1)),meta:{last_page:1}}});}return route.abort();});
 await page.goto('http://127.0.0.1:8080/rebrain/estimativas-vendas');
 await page.getByRole('combobox').first().click();await page.getByRole('option',{name:'PR',exact:true}).click();
 await page.getByRole('combobox').nth(1).click();await page.getByPlaceholder(/Buscar munic/).fill('Curitiba');await page.getByText('Curitiba',{exact:true}).last().click();
 await page.getByRole('button',{name:'Consultar empreendimentos'}).click();await page.getByText(/100 empreendimentos/).first().waitFor();
 await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
 if(width===1440&&theme==='light'){for(const n of [1,5,20]){await page.getByRole('button',{name:'Escolher empreendimentos'}).click();const picker=page.getByRole('dialog');await picker.getByRole('button',{name:'Limpar seleção'}).click();for(let i=0;i<n;i++)await picker.getByRole('checkbox').nth(i+1).check();await page.keyboard.press('Escape');await page.getByTestId('forecast-card').first().waitFor();if(await page.getByTestId('forecast-card').count()!==Math.min(n,12))failures.push(`Wrong visible cards for ${n}`);}}
 const start=performance.now();await page.getByRole('button',{name:'Escolher empreendimentos'}).click();const dialog=page.getByRole('dialog');
 await dialog.getByRole('button',{name:'Selecionar 100 resultados'}).click();await page.keyboard.press('Escape');
 await page.getByTestId('forecast-card').nth(11).waitFor();
 if(await page.getByTestId('forecast-card').count()!==12)failures.push('Pagination did not show 12');
 await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.getByTestId('forecast-card').first().getByText('Empreendimento 013',{exact:true}).waitFor();
 await page.getByRole('button',{name:/Ver detalhe/}).first().click();await page.getByRole('dialog').waitFor();
 const dialogOverflow=await page.getByRole('dialog').evaluate(el=>el.scrollWidth>el.clientWidth+2);if(dialogOverflow)failures.push(`Dialog overflow ${width}`);
 await page.screenshot({path:`${folder}/${width}-${theme}-detail.png`});await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.activeElement?.textContent?.includes('Ver detalhe'));const focused=await page.evaluate(()=>document.activeElement?.textContent?.includes('Ver detalhe'));if(!focused)failures.push(`Focus not restored ${width}`);
 // select presentation with the shared Radix control
 await page.locator('label').filter({hasText:'Visualização'}).getByRole('combobox').click();await page.getByRole('option',{name:'Carteira agregada',exact:true}).click();
 await page.getByText('Carteira · 100 de 100 membros avaliáveis',{exact:true}).waitFor();
 if(width===1440&&theme==='light'){
  await page.locator('label').filter({hasText:'Visualização'}).getByRole('combobox').click();await page.getByRole('option',{name:'Sobrepor até 5 curvas',exact:true}).click();
  const overlay=page.locator('.ev-panel').filter({hasText:'Destaque até cinco empreendimentos'});for(let i=0;i<5;i++)await overlay.getByRole('checkbox').nth(i).check();if(!await overlay.getByRole('checkbox').nth(5).isDisabled())failures.push('Overlay did not cap at five');
  await page.locator('label').filter({hasText:'Visualização'}).getByRole('combobox').click();await page.getByRole('option',{name:'Carteira agregada',exact:true}).click();
 }

 await page.getByRole('button',{name:'Executar retrospectiva'}).click();await page.getByText(/alvos comparáveis/).waitFor();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar todos os membros CSV'}).click();const d=await download;await d.saveAs(`${folder}/${width}-${theme}.csv`);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);if(overflow)failures.push(`Page overflow ${width}`);
 await page.screenshot({path:`${folder}/${width}-${theme}-portfolio.png`,fullPage:true});
 checks.push({selectionAndFlowMs:Math.round(performance.now()-start),width,theme,selected:100,visible:12,pagination:true,portfolio:true,retrospective:true,focus:focused,overflow,dialogOverflow});await context.close();
}
await browser.close();await writeFile(`${folder}/report.json`,JSON.stringify({checks,failures},null,2));console.log(JSON.stringify({checks,failures},null,2));if(failures.length)process.exitCode=1;
