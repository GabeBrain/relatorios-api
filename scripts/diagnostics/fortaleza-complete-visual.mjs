import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import assert from 'node:assert/strict';
const quarterly=process.argv.includes('--quarterly'),count=quarterly?89:60,kind=quarterly?'trimestral':'mensal';
const folder=resolve(`.local-inputs/relatorios-lucas/fortaleza/review-2026-11-13/${kind}`);await mkdir(folder,{recursive:true});
await writeFile(resolve(folder,'preview.html'),`<html><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixtures/fortaleza-${quarterly?'quarterly':'complete'}-preview.tsx"></script></body></html>`);
const previewPath=`/.local-inputs/relatorios-lucas/fortaleza/review-2026-11-13/${kind}/preview.html`;
const port=process.argv.includes('--export')?'4191':'4189',base=`http://127.0.0.1:${port}`,server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),port],{windowsHide:true,stdio:'ignore'});
let browser;
try{
  let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}assert.ok(ready);
  browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],results=[];
  for(const width of process.argv.includes('--export')?[1440]:[1440,390])for(const dark of process.argv.includes('--export')?[false]:[false,true]){
    const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
    await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await page.goto(`${base}${previewPath}`);
    await page.getByRole('button',{name:String(count),exact:true}).waitFor();await page.evaluate(async dark=>{document.documentElement.classList.toggle('dark',dark);await document.fonts.ready;},dark);
    assert.ok(await page.getByRole('button',{name:'Baixar PPTX de conferência',exact:true}).isEnabled());
    const names=[];
    for(const number of process.argv.includes('--export')?(quarterly?[42,54,59,68,75,83]:[2,3,4,5,6,7,10,45,47,52]):Array.from({length:count},(_,index)=>index+1)){
      await page.getByRole('button',{name:String(number),exact:true}).click();const slide=page.locator(`[data-editable-slide="${number}"] > svg[role="img"]`);await slide.waitFor();
      await slide.locator('image').evaluateAll(async nodes=>{await Promise.all(nodes.map(node=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=node.getAttribute('href');if(image.complete&&image.naturalWidth)resolve();})));});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const content=await slide.textContent();assert.ok(!content.includes('Aguardando conferência da fonte'));assert.ok(!content.includes('NaN'));
      if(number===2){assert.ok(content.includes('Base consultada:'));assert.ok(content.includes('não representa'));}
      if(!quarterly&&number>=3&&number<=7){
        names.push(...[...content.matchAll(/Projeto sintético \d+/g)].map(match=>match[0]));
        const clipping=await slide.locator('foreignObject').evaluateAll(nodes=>nodes.filter(node=>{const span=node.querySelector('span');return span&&span.textContent&&span.getBoundingClientRect().height>node.getBoundingClientRect().height+1;}).length);
        assert.equal(clipping,0,`Slide${number}: texto cortado`);
      }
      if(!quarterly&&number===10)assert.ok(content.includes('85–86'));
      if(!quarterly&&number>=47&&number<=55){
        const layout=await slide.evaluate(svg=>{
          const title=svg.querySelector('[data-monthly-table-heading]').getBoundingClientRect(),table=svg.querySelector('[aria-label="Tabela de oferta e vendas"]').getBoundingClientRect(),frame=svg.getBoundingClientRect();
          return {separated:title.bottom<table.top,inside:table.bottom<=frame.top+frame.height*635/720+1};
        });
        assert.ok(layout.separated&&layout.inside,`Cabeçalho/tabela fora do espaço reservado: ${number}`);
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await slide.screenshot({path:resolve(folder,`${number}-${width}-${dark}.png`)});results.push({number,width,dark});
    }
    if(!quarterly){assert.equal(names.length,86);assert.equal(new Set(names).size,86);}
    if(process.argv.includes('--export')){
      for(const format of ['pptx','pdf']){

        const downloadPending=page.waitForEvent('download',{timeout:300000});downloadPending.catch(()=>{});
        await page.getByRole('button',{name:format==='pdf'?'Baixar PDF de conferência':'Baixar PPTX de conferência',exact:true}).click();
        const region=page.getByRole('region',{name:`Exportar Fortaleza ${kind}`});
        const failure=region.getByRole('alert').waitFor({timeout:300000}).then(async()=>{throw new Error(await region.getByRole('alert').innerText());});failure.catch(()=>{});
        const timer=setInterval(async()=>{try{console.log(JSON.stringify({format,kind,progress:(await region.innerText()).match(/Gerando[^\n]+/)?.[0]}));}catch{}},15000);
        let download;try{download=await Promise.race([downloadPending,failure]);}finally{clearInterval(timer);}
        const path=resolve(folder,`complete.${format}`);await download.saveAs(path);const bytes=await readFile(path);
        if(format==='pdf')assert.equal((await PDFDocument.load(bytes)).getPageCount(),count);
        else{const files=unzipSync(bytes);assert.equal(Object.keys(files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,count);if(!quarterly){for(const number of [3,4,5,6,7])assert.ok(new TextDecoder().decode(files[`ppt/slides/slide${number}.xml`]).includes('<a:tbl>'));const all=[3,4,5,6,7].map(number=>new TextDecoder().decode(files[`ppt/slides/slide${number}.xml`])).join(' ');for(let i=1;i<=86;i++)assert.ok(all.includes(`Projeto sintético ${String(i).padStart(2,'0')}`),`Nome${i} fora do PPTX`);}const audit=new TextDecoder().decode(files['customXml/fortaleza-audit.xml']);assert.ok(audit.includes('fortaleza-diagnostic-v1'));assert.ok(!audit.includes('synthetic-complete-fixture'));assert.ok(!audit.includes('synthetic-quarterly'));}
        assert.equal(await page.locator('[data-fortaleza-export-slide]').count(),0);
        results.push({format,pages:count});console.log(JSON.stringify({completed:format,kind}));
      }
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);await writeFile(resolve(folder,process.argv.includes('--export')?'export-results.json':'results.json'),JSON.stringify({source:quarterly?'synthetic-only':'real municipal aggregates; synthetic registry and detailed histories',results,errors},null,2));console.log(JSON.stringify({passed:results.length,kind,errors}));
}finally{await browser?.close();server.kill();}
