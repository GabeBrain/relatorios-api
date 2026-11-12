import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const output='.local-inputs/estimativas-vendas/goiania-browser';await mkdir(output,{recursive:true});
const buildings=JSON.parse(await readFile('.local-inputs/estimativas-vendas/expanded/GO-Goiania-Vertical-snapshot.json','utf8'));
const browser=await chromium.launch({headless:true});
const checks=[],failures=[];
const visualCheck=process.argv.includes('--visual-check');
for(const width of (visualCheck?[390,1440]:[390,768,1440,1920]))for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>failures.push(String(e)));
 let reads=0,active=0,peak=0;
 await page.addInitScript(({theme})=>{const now=Date.now();localStorage.setItem('brain-auth',JSON.stringify({state:{token:'local-snapshot-only',email:'',issuedAt:now,expiresAt:now+3600000},version:0}));localStorage.setItem('vite-ui-theme',theme);},{theme});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();
  if(url.pathname.includes('monitored-cities'))return route.fulfill({json:{data:[{city:'Goiânia',state:'GO'}],links:{next:null}}});
  if(url.pathname.includes('building-with-history-internal')){
   reads++;active++;peak=Math.max(peak,active);const p=Number(url.searchParams.get('page'));
   await new Promise(r=>setTimeout(r,p===1?400:500+(7-p)*10));active--;
   return route.fulfill({json:{data:buildings.slice((p-1)*100,p*100),meta:{last_page:7}}});
  }
  return route.abort();
 });
 await page.goto('http://127.0.0.1:8081/rebrain/estimativas-vendas');
 await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
 await page.getByRole('combobox').first().click();await page.getByRole('option',{name:'GO',exact:true}).click();
 await page.getByRole('combobox').nth(1).click();await page.getByPlaceholder(/Buscar munic/).fill('Goiânia');await page.getByText('Goiânia',{exact:true}).last().click();
 await page.locator('label').filter({hasText:'Tipo na API'}).getByRole('combobox').click();await page.getByRole('option',{name:'Vertical',exact:true}).click();
 if(await page.getByRole('group',{name:'Comparar modelos',exact:true}).count())throw new Error('Models offered before source');
 const start=performance.now();await page.getByRole('button',{name:'Consultar empreendimentos',exact:true}).click();
 const loader=page.getByRole('status').filter({hasText:'Consultando Geobrain'});await loader.waitFor();
 if(!await loader.locator('img').first().isVisible())throw new Error('Brain logo missing');
 if(width===1440&&theme==='light')await page.screenshot({path:`${output}/brain-loading.png`});
 await page.getByTestId('forecast-card').nth(11).waitFor({timeout:120000});
 await page.getByRole('group',{name:'Comparar modelos',exact:true}).waitFor();
 const preparedMs=Math.round(performance.now()-start);
 if(await page.getByTestId('forecast-card').count()!==12)throw new Error('Wrong pagination');
 if(!await page.getByTestId('forecast-card').first().locator('.recharts-line-curve').count())throw new Error('No initial curve');
 await page.mouse.move(0,0);
 await page.screenshot({path:`${output}/${width}-${theme}-grid.png`,fullPage:true});
 await page.getByTestId('forecast-card').first().locator('.recharts-wrapper').hover({position:{x:130,y:130}});
 const tooltip=page.locator('.recharts-tooltip-wrapper').first();
 if(await tooltip.isVisible()){
  const box=await tooltip.boundingBox();if(box.x<0||box.x+box.width>width+1)failures.push(`Tooltip overflow ${width}/${theme}`);
 }
 await page.getByRole('button',{name:'Ritmo recente de estoque',exact:true}).click();
 await page.getByRole('button',{name:'Finotti por tipo · referência completa',exact:true}).click();
 if(reads!==7)throw new Error('Switching model queried API');
 const bands=await page.locator('.recharts-area').count();
 await page.getByRole('button',{name:'Ver detalhe',exact:false}).first().click();await page.getByRole('dialog').waitFor();
 const modalOverflow=await page.getByRole('dialog').evaluate(el=>el.scrollWidth>el.clientWidth+2);
 await page.screenshot({path:`${output}/${width}-${theme}-detail.png`});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Leitura automática',exact:true}).click();
 await page.getByRole('button',{name:'Carteira',exact:true}).click();await page.getByText(/Carteira · .* membros avaliáveis/).waitFor();
 const portfolio=await page.getByText(/Carteira · .* membros avaliáveis/).innerText();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 const contentWidth=(await page.locator('.ev-workbench').boundingBox()).width;
 if(width<768&&contentWidth<width-96)failures.push(`Sidebar compressed content ${contentWidth}/${width}`);
 if(overflow||modalOverflow)failures.push(`Overflow ${width}/${theme}`);
 await page.getByRole('button',{name:'Como as curvas são calculadas',exact:true}).click();await page.getByRole('dialog').waitFor();
 if(await page.getByRole('dialog').getByRole('checkbox').count())throw new Error('Methodology still needs confirmation');
 await page.screenshot({path:`${output}/${width}-${theme}-methodology.png`});await page.keyboard.press('Escape');
 checks.push({width,theme,source:'authenticated API snapshot, 641 buildings; transport mocked for deterministic UI test',reads,peak,preparedMs,autoSelected:641,visibleCards:12,bands,portfolio,overflow,modalOverflow,contentWidth});
 await context.close();
}
await browser.close();const result={checks,failures};await writeFile(`${output}/${visualCheck?'visual-report':'report'}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
