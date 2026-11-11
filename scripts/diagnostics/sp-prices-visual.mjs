import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const output=resolve('.local-inputs/relatorios-lucas/sp/prices-2026-11-11');
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'preview.html'),'<html><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixtures/sp-corrections-preview.tsx"></script></body></html>');
const base='http://127.0.0.1:4182',errors=[],results=[];
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4182','--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,VITE_MAPBOX_ACCESS_TOKEN:''}});
let browser;
try {
  let ready=false;
  for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}
  assert.ok(ready);
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  page.on('pageerror',error=>errors.push(error.message));
  for(const width of [1440,390])for(const mode of ['ready','gap','empty','error'])for(const number of [53,54,59,62,64]){
    await page.setViewportSize({width,height:900});
    await page.goto(`${base}/.local-inputs/relatorios-lucas/sp/prices-2026-11-11/preview.html?page=${number}&native-prices=${mode}`);
    const slide=page.locator('[data-review-preview]');await slide.locator('article').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    const svg=slide.locator('svg[aria-label^="Slide "]'),text=await svg.textContent();
    if(mode==='ready')assert.ok(text.includes('19.300'),`native price missing on ${number}`);
    if(mode==='empty'||mode==='error')assert.ok(!text.includes('19.300'));
    await slide.screenshot({path:resolve(output,`${width}-${mode}-${number}.png`)});
    results.push({width,mode,slide:number,passed:true});
  }
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'results.json'),JSON.stringify({source:'invented-native-prices; external network blocked',results,errors},null,2));
  console.log(JSON.stringify({passed:results.length,output,errors}));
}finally{await browser?.close();server.kill();}
