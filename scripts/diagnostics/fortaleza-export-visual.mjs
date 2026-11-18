import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import assert from 'node:assert/strict';
const output=resolve('.local-inputs/relatorios-lucas/fortaleza/export-2026-11-11');await mkdir(output,{recursive:true});
await writeFile(resolve(output,'preview.html'),'<html><body><div id="root"></div><script type="module" src="/scripts/fixtures/fortaleza-export-preview.tsx"></script></body></html>');
const base='http://127.0.0.1:4183',errors=[],results=[];let browser;
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4183','--strictPort'],{windowsHide:true,stdio:'ignore'});
try{
  let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}assert.ok(ready);
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/.local-inputs/relatorios-lucas/fortaleza/export-2026-11-11/preview.html`);await page.getByRole('button',{name:'Baixar PPTX de conferência'}).waitFor();
  await page.getByRole('button',{name:'57',exact:true}).click();await page.getByText('Personalizar equipe e fotos',{exact:true}).click();await page.getByLabel('Nome',{exact:true}).fill('Equipe QA da edição');
  const preview=page.locator('section[aria-label="Slides implementados Fortaleza"] > div.overflow-hidden');
  const selected=process.argv.includes('--faithful-only')?[11,13,15,57]:process.argv.includes('--remaining')||process.argv.includes('--pdf-only')||process.argv.includes('--ui-only')?[]:Array.from({length:60},(_,i)=>i+1);
  for(const n of selected){await page.getByRole('button',{name:String(n),exact:true}).click();await documentReady();await preview.screenshot({path:resolve(output,`preview-${n}.png`)});}
  async function documentReady(){await page.evaluate(()=>document.fonts.ready);}
  for(const width of [1440,390])for(const dark of [false,true]){
    await page.setViewportSize({width,height:1000});await page.evaluate(value=>document.documentElement.classList.toggle('dark',value),dark);
    await page.getByRole('region',{name:'Exportar Fortaleza mensal'}).scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.getByRole('region',{name:'Exportar Fortaleza mensal'}).screenshot({path:resolve(output,`controls-${width}-${dark}.png`)});results.push({width,dark,overflow:false});
  }
  await page.setViewportSize({width:1440,height:1000});
  if(process.argv.includes('--ui-only')){
    let downloads=0;page.on('download',()=>downloads++);
    const start=()=>page.getByRole('button',{name:'Baixar PPTX de conferência',exact:true}).click();
    await start();await page.getByText(/Gerando PowerPoint:/).waitFor();
    await page.getByRole('region',{name:'Exportar Fortaleza mensal'}).screenshot({path:resolve(output,'loading-export.png')});
    await page.getByRole('button',{name:'Cancelar exportação',exact:true}).click();await page.getByText('Exportação cancelada. Inicie novamente para usar a prévia atual.',{exact:true}).waitFor();
    assert.equal(downloads,0);results.push({cancelNoDownload:true});
    await page.evaluate(()=>{
      const observer=new MutationObserver(()=>{const image=document.querySelector('[data-fortaleza-export-slide="1"] image');if(image){image.setAttribute('href','data:image/png;base64,invalid');observer.disconnect();}});
      observer.observe(document.body,{subtree:true,childList:true});
    });
    await start();await page.getByRole('region',{name:'Exportar Fortaleza mensal'}).getByRole('alert').waitFor();
    assert.equal(downloads,0);results.push({imageFailureNoDownload:true});
    await start();await page.getByText(/Gerando PowerPoint:/).waitFor();await page.getByRole('button',{name:'Cancelar exportação',exact:true}).click();await page.getByText('Exportação cancelada. Inicie novamente para usar a prévia atual.',{exact:true}).waitFor();
    results.push({retryAvailable:true});
  }
  for(const mode of process.argv.includes('--ui-only')?[]:process.argv.includes('--faithful-only')?['faithful']:process.argv.includes('--pdf-only')?['pdf']:process.argv.includes('--remaining')?['editable','pdf']:['faithful','editable','pdf']){
    if(mode==='editable'){await page.getByRole('combobox',{name:'PowerPoint para conferência',exact:true}).click();await page.getByRole('option',{name:'Textos e células editáveis',exact:true}).click();}
    const pending=page.waitForEvent('download',{timeout:300000});pending.catch(()=>{});
    await page.getByRole('button',{name:mode==='pdf'?'Baixar PDF de conferência':'Baixar PPTX de conferência',exact:true}).click();
    const alert=page.getByRole('region',{name:'Exportar Fortaleza mensal'}).getByRole('alert');
    const failed=alert.waitFor({timeout:300000}).then(async()=>{throw new Error(`Export ${mode}: ${await alert.innerText()}`);});failed.catch(()=>{});
    const timer=setInterval(async()=>{try{const text=await page.getByRole('region',{name:'Exportar Fortaleza mensal'}).innerText();console.log(JSON.stringify({mode,progress:text.match(/Gerando[^\n]+/)?.[0]}));}catch{}},15000);
    let download;try{download=await Promise.race([pending,failed]);}finally{clearInterval(timer);}
    const path=resolve(output,mode==='pdf'?'mensal.pdf':`mensal-${mode}.pptx`);await download.saveAs(path);
    if(mode==='pdf'){const pdf=await PDFDocument.load(await readFile(path));assert.equal(pdf.getPageCount(),60);}
    else{
      const files=unzipSync(new Uint8Array(await readFile(path))),text=name=>new TextDecoder().decode(files[name]);
      assert.equal(Object.keys(files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,60);
      const audit=text('customXml/fortaleza-audit.xml');assert.ok(audit.includes('fortaleza-diagnostic-v1'));assert.ok(!audit.includes('SYNTHETIC_PRIVATE'));
      if(mode==='editable'){assert.ok(text('ppt/slides/slide57.xml').includes('Equipe QA da edição'));assert.ok(text('ppt/slides/slide3.xml').includes('Empreendimento sintético QA'));assert.ok(text('ppt/slides/slide57.xml').includes('Montserrat'));}
    }
    results.push({format:mode,download:download.suggestedFilename(),pages:60});
    console.log(JSON.stringify({completed:mode,path}));
  }
  assert.deepEqual(errors,[]);const suffix=process.argv.includes('--ui-only')?'ui':process.argv.includes('--faithful-only')?'faithful':process.argv.includes('--pdf-only')?'pdf':process.argv.includes('--remaining')?'remaining':'all';
  await writeFile(resolve(output,`results-${suffix}.json`),JSON.stringify({source:'invented offline fixture; all external network blocked',results,errors},null,2));
  console.log(JSON.stringify({passed:results.length,errors,output}));
}finally{await browser?.close();server.kill();}
