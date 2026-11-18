import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/sp-historical-sample-2026-11-12');
await mkdir(folder,{recursive:true});
await writeFile(resolve(folder,'preview.html'),'<html><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixtures/sp-corrections-preview.tsx"></script></body></html>');
const base='http://127.0.0.1:4184';
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4184','--strictPort'],{windowsHide:true,stdio:'ignore'});
let browser;
try{
  let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}assert.ok(ready);
  browser=await chromium.launch({channel:'msedge',headless:true});
  const errors=[],results=[];
  for(const width of [1440,390])for(const dark of [false,true]){
    const page=await browser.newPage({viewport:{width,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    for(const number of [9,10,11,53,55,57]){
      await page.goto(`${base}/.local-inputs/sp-historical-sample-2026-11-12/preview.html?page=${number}&historical-sample`);
      await page.locator('article').waitFor();await page.evaluate(async dark=>{document.documentElement.classList.toggle('dark',dark);await document.fonts.ready;},dark);
      const slide=page.locator('[data-review-preview]');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      if(number>=53){assert.equal(await slide.locator('g > title').count(),13);assert.ok((await slide.textContent()).includes('Amostra observada com cobertura parcial'));}
      await slide.screenshot({path:resolve(folder,`${number}-${width}-${dark}.png`)});
      results.push({width,dark,slide:number});
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({source:'synthetic-only',results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();server.kill();}
