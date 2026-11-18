import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
const output=resolve('.local-inputs/relatorios-lucas/sp/corrections-2026-11-11');
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'preview.html'),'<html><body style="margin:0"><div id="root"></div><script type="module" src="/scripts/fixtures/sp-corrections-preview.tsx"></script></body></html>');
const base='http://127.0.0.1:4181';
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4181','--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,VITE_MAPBOX_ACCESS_TOKEN:''}});
const errors=[],results=[];let browser;
try {
  let ready=false;
  for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{/* startup */}if(!ready)await new Promise(done=>setTimeout(done,250));}
  assert.ok(ready);
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  page.on('pageerror',error=>errors.push(error.message));
  const selected=[2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18,26,30,31,39,45,46,49,52,53,60,63,64,65,67,70,74,79,80,81,82,83,84,85];
  for(const width of process.argv.includes('--export-only')?[]:[1440,390]){
    await page.setViewportSize({width,height:900});
    for(const number of selected){
      await page.goto(`${base}/.local-inputs/relatorios-lucas/sp/corrections-2026-11-11/preview.html?page=${number}`);
      const slide=page.locator('[data-review-preview]');await slide.locator('article').waitFor();
      await page.evaluate(()=>document.fonts.ready);await slide.evaluate(async node=>Promise.all([...node.querySelectorAll('img')].map(image=>image.decode())));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const text=await slide.innerText();
      assert.ok(!text.includes('Trimestre completo até'));
      assert.ok(!text.includes('SindusconPR'));
      if(number===39){assert.ok(text.includes('24,6%'));assert.ok(text.includes('3,6%'));}
      const fonts=await slide.locator('svg text').evaluateAll(nodes=>[...new Set(nodes.map(node=>getComputedStyle(node).fontFamily))]);
      assert.ok(fonts.every(font=>font.startsWith('Tahoma')));
      if(number===6)assert.equal(await slide.locator('text').filter({hasText:/^SUMÁRIO$/}).getAttribute('font-size'),'40');
      await slide.screenshot({path:resolve(output,`${width}-slide-${number}.png`)});
      results.push({width,slide:number,fonts});
      if([6,39,82,83].includes(number)){
        await page.evaluate(()=>document.documentElement.classList.add('dark'));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        await slide.screenshot({path:resolve(output,`${width}-dark-slide-${number}.png`)});
        results.push({width,slide:number,fonts,theme:'dark'});
      }
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${base}/.local-inputs/relatorios-lucas/sp/corrections-2026-11-11/preview.html?page=6&deck`);
  await page.locator('[data-review-deck] > div > article').last().waitFor();
  const downloadPromise=page.waitForEvent('download',{timeout:240000});
  downloadPromise.catch(()=>{});
  await page.evaluate(async()=>{try{await window.exportReview();}catch(error){throw new Error(`Export progress ${document.documentElement.dataset.exportProgress}: ${error?.message??error?.type??String(error)}`);}});
  const download=await downloadPromise;await download.saveAs(resolve(output,'sp-corrections-synthetic.pptx'));
  const zip=unzipSync(new Uint8Array(await readFile(resolve(output,'sp-corrections-synthetic.pptx'))));
  const slides=Object.keys(zip).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));assert.equal(slides.length,85);
  const xml=slides.map(name=>new TextDecoder().decode(zip[name])).join('');
  assert.ok(!xml.includes('Trimestre completo até'));assert.ok(!xml.includes('SindusconPR'));
  assert.ok(xml.includes('24,6%'));
  assert.ok([...xml.matchAll(/<a:latin[^>]*typeface="([^"]+)"/g)].every(match=>match[1]==='Tahoma'));
  assert.ok(new TextDecoder().decode(zip['ppt/slides/slide6.xml']).includes('sz="3000"'));
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'results.json'),JSON.stringify({results,errors,slides:85,externalNetwork:'blocked',source:'synthetic/replayed fixtures; not market validation'},null,2));
  console.log(JSON.stringify({visualCases:results.length,slides:85,errors}));
}finally{await browser?.close();server.kill();}
