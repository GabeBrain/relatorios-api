import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/relatorios-lucas/fortaleza/complete-2026-11-12');await mkdir(folder,{recursive:true});
await writeFile(resolve(folder,'preview.html'),'<html><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixtures/fortaleza-complete-preview.tsx"></script></body></html>');
const port=process.argv.includes('--export')?'4191':'4189',base=`http://127.0.0.1:${port}`,server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',port,'--strictPort'],{windowsHide:true,stdio:'ignore'});
let browser;
try{
  let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}assert.ok(ready);
  browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],results=[];
  for(const width of process.argv.includes('--export')?[1440]:[1440,390])for(const dark of process.argv.includes('--export')?[false]:[false,true]){
    const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
    await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await page.goto(`${base}/.local-inputs/relatorios-lucas/fortaleza/complete-2026-11-12/preview.html`);
    await page.getByRole('button',{name:'60',exact:true}).waitFor();await page.evaluate(async dark=>{document.documentElement.classList.toggle('dark',dark);await document.fonts.ready;},dark);
    assert.ok(await page.getByRole('button',{name:'Baixar PPTX de conferência',exact:true}).isEnabled());
    const names=[];
    for(const number of process.argv.includes('--export')?[2,3,4,5,6,7,10]:Array.from({length:60},(_,index)=>index+1)){
      await page.getByRole('button',{name:String(number),exact:true}).click();const slide=page.getByRole('img',{name:`Fortaleza · slide ${number}`,exact:true});await slide.waitFor();
      await slide.locator('image').evaluateAll(async nodes=>{await Promise.all(nodes.map(node=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=node.getAttribute('href');if(image.complete&&image.naturalWidth)resolve();})));});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const content=await slide.textContent();assert.ok(!content.includes('Aguardando conferência da fonte'));assert.ok(!content.includes('NaN'));
      if(number===2){assert.ok(content.includes('Base consultada:'));assert.ok(content.includes('não representa'));}
      if(number>=3&&number<=7){
        names.push(...[...content.matchAll(/Projeto sintético \d+/g)].map(match=>match[0]));
        const clipping=await slide.locator('foreignObject').evaluateAll(nodes=>nodes.filter(node=>{const span=node.querySelector('span');return span&&span.textContent&&span.getBoundingClientRect().height>node.getBoundingClientRect().height+1;}).length);
        assert.equal(clipping,0,`Slide${number}: texto cortado`);
      }
      if(number===10)assert.ok(content.includes('85–86'));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await slide.screenshot({path:resolve(folder,`${number}-${width}-${dark}.png`)});results.push({number,width,dark});
    }
    assert.equal(names.length,86);assert.equal(new Set(names).size,86);
    if(process.argv.includes('--export')){
      for(const format of ['pptx','pdf']){
        if(format==='pptx'){await page.getByRole('combobox',{name:'PowerPoint para conferência',exact:true}).click();await page.getByRole('option',{name:'Textos e células editáveis',exact:true}).click();}
        const downloadPending=page.waitForEvent('download',{timeout:300000});downloadPending.catch(()=>{});
        await page.getByRole('button',{name:format==='pdf'?'Baixar PDF de conferência':'Baixar PPTX de conferência',exact:true}).click();
        const failure=page.getByRole('region',{name:'Exportar Fortaleza mensal'}).getByRole('alert').waitFor({timeout:300000}).then(async()=>{throw new Error(await page.getByRole('alert').innerText());});failure.catch(()=>{});
        const timer=setInterval(async()=>{try{console.log(JSON.stringify({format,progress:(await page.getByRole('region',{name:'Exportar Fortaleza mensal'}).innerText()).match(/Gerando[^\n]+/)?.[0]}));}catch{}},15000);
        let download;try{download=await Promise.race([downloadPending,failure]);}finally{clearInterval(timer);}
        const path=resolve(folder,`complete.${format}`);await download.saveAs(path);const bytes=await readFile(path);
        if(format==='pdf')assert.equal((await PDFDocument.load(bytes)).getPageCount(),60);
        else{const files=unzipSync(bytes);assert.equal(Object.keys(files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,60);const all=[3,4,5,6,7].map(number=>new TextDecoder().decode(files[`ppt/slides/slide${number}.xml`])).join(' ');for(let i=1;i<=86;i++)assert.ok(all.includes(`Projeto sintético ${String(i).padStart(2,'0')}`),`Nome${i} fora do PPTX`);const audit=new TextDecoder().decode(files['customXml/fortaleza-audit.xml']);assert.ok(audit.includes('fortaleza-diagnostic-v1'));assert.ok(!audit.includes('synthetic-complete-fixture'));}
        results.push({format,pages:60});console.log(JSON.stringify({completed:format}));
      }
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);await writeFile(resolve(folder,process.argv.includes('--export')?'export-results.json':'results.json'),JSON.stringify({source:'real municipal aggregates; synthetic registry and detailed histories',results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();server.kill();}
