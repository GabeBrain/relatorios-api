import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/relatorios-lucas/fortaleza/neighborhood-2026-11-12');
await mkdir(folder,{recursive:true});
await writeFile(resolve(folder,'preview.html'),'<html><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixtures/fortaleza-export-preview.tsx"></script></body></html>');
const base='http://127.0.0.1:4188',server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4188','--strictPort'],{windowsHide:true,stdio:'ignore'});
let browser;
try{
  let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}assert.ok(ready);
  browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],results=[];
  for(const width of [1440,390])for(const dark of [false,true])for(const mode of ['normal','missing-neighborhood','missing-snapshot']){
    const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await page.goto(`${base}/.local-inputs/relatorios-lucas/fortaleza/neighborhood-2026-11-12/preview.html?${mode}`);
    await page.getByRole('button',{name:'52',exact:true}).click();await page.evaluate(async dark=>{document.documentElement.classList.toggle('dark',dark);await document.fonts.ready;},dark);
    const slide=page.getByRole('img',{name:'Fortaleza · slide 52',exact:true});await slide.waitFor();
    await slide.locator('image').evaluateAll(async nodes=>{await Promise.all(nodes.map(node=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=node.getAttribute('href');if(image.complete&&image.naturalWidth)resolve();})));});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const text=await slide.textContent();assert.equal(text.includes('Aguardando conferência da fonte'),mode==='missing-snapshot');
    if(mode==='missing-neighborhood'){
      assert.ok(text.includes('Bairro não informado'));assert.ok(text.includes('1.000'));
      await page.getByText('Origem e cálculo deste slide',{exact:true}).click();assert.ok((await page.locator('main,body').first().innerText()).includes('valores preservados no grupo Bairro não informado'));
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await slide.screenshot({path:resolve(folder,`${width}-${dark}-${mode}.png`)});results.push({width,dark,mode});await page.close();
  }
  assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({source:'synthetic-only',results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();server.kill();}
