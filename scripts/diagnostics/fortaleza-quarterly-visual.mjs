import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/relatorios-lucas/fortaleza/quarterly-visual');
await mkdir(folder,{recursive:true});
await writeFile(resolve(folder,'preview.html'),'<html><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixtures/fortaleza-quarterly-preview.tsx"></script></body></html>');
const base='http://127.0.0.1:4186';
const server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4186'],{windowsHide:true,stdio:'ignore'});
let browser;
try{
  let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}assert.ok(ready);
  browser=await chromium.launch({channel:'msedge',headless:true});
  const errors=[],results=[];
  for(const width of [1440,390])for(const dark of [false,true]){
    const page=await browser.newPage({viewport:{width,height:1000}});
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await page.goto(`${base}/.local-inputs/relatorios-lucas/fortaleza/quarterly-visual/preview.html`);
    await page.getByRole('heading',{name:'Slides do relatório · Trimestral'}).waitFor();
    await page.evaluate(async dark=>{document.documentElement.classList.toggle('dark',dark);await document.fonts.ready;},dark);
    assert.equal(await page.getByRole('button',{name:'90',exact:true}).count(),0);
    for(let number=11;number<=89;number++){
      await page.getByRole('button',{name:String(number),exact:true}).click();
      const slide=page.getByRole('img',{name:`Fortaleza · slide ${number}`,exact:true});
      await slide.waitFor();
      await slide.locator('image').evaluateAll(async nodes=>{await Promise.all(nodes.map(node=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=node.getAttribute('href');if(image.complete&&image.naturalWidth)resolve();})));});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok(!(await slide.textContent()).includes('Aguardando conferência'));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.equal(await slide.locator('image').evaluateAll(nodes=>nodes.every(node=>Boolean(node.getAttribute('href')))),true);
      if([16,19,31,32].includes(number))assert.equal(await slide.locator('[data-municipal-row]').count(),6);
      else if(number<=39&&![20,23,26,28,33,36].includes(number))assert.equal(await slide.getByLabel('Histórico trimestral').locator('circle').count(),9);
      await slide.screenshot({path:resolve(folder,`${number}-${width}-${dark}.png`)});results.push({number,width,dark});
    }
    for(const mode of ['missing','empty']){
      await page.goto(`${base}/.local-inputs/relatorios-lucas/fortaleza/quarterly-visual/preview.html?${mode}`);
      await page.getByRole('button',{name:'12',exact:true}).click();
      assert.ok((await page.getByRole('img',{name:'Fortaleza · slide 12',exact:true}).textContent()).includes('Aguardando conferência da fonte'));
      results.push({width,dark,mode});
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({source:'synthetic-only',results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();server.kill();}
