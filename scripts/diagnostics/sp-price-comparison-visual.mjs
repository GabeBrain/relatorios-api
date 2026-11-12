import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/sp-price-comparison-2026-11-12'),base='http://127.0.0.1:4185';
await mkdir(folder,{recursive:true});
await writeFile(resolve(folder,'preview.html'),'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/scripts/fixtures/sp-corrections-preview.tsx"></script></body></html>');
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4185','--strictPort'],{windowsHide:true,stdio:'ignore'});
let browser;
try{
  let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}assert.ok(ready);
  browser=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
  for(const width of [1440,390])for(const dark of [false,true]){
    const page=await browser.newPage({viewport:{width,height:1000}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await page.goto(`${base}/.local-inputs/sp-price-comparison-2026-11-12/preview.html?compare-prices`);
    await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
    await page.getByText('Comparar médias incluindo tipologias esgotadas',{exact:true}).click();
    const comparison=page.locator('details').filter({has:page.getByText('Comparar médias incluindo tipologias esgotadas',{exact:true})});
    assert.equal(await comparison.locator('tbody tr').count(),3);
    assert.ok((await comparison.textContent()).includes('Slide 53'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await comparison.screenshot({path:resolve(folder,`${width}-${dark}.png`)});
    results.push({width,dark,rows:3});await page.close();
  }
  assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();server.kill();}
