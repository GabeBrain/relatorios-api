import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/relatorios-lucas/maceio/caged-2026-11-17/visual');await mkdir(folder,{recursive:true});
await writeFile(resolve(folder,'preview.html'),'<div id="root"></div><script type="module" src="/scripts/fixtures/maceio-caged-preview.tsx"></script>');
const base='http://127.0.0.1:4201',server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4201'],{windowsHide:true,stdio:'ignore'}),results=[],errors=[];let browser;
try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [1440,390])for(const dark of [false,true]){
  const context=await browser.newContext({viewport:{width,height:1000}});await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/.local-inputs/relatorios-lucas/maceio/caged-2026-11-17/visual/preview.html`);await page.getByRole('button',{name:'9',exact:true}).waitFor();await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
  for(const quarterly of [false,true]){
   if(quarterly)await page.getByRole('button',{name:'Trocar modelo',exact:true}).click();
   for(const state of ['success','empty','error']){
    await page.getByRole('button',{name:state,exact:true}).click();
    for(let slide=9;slide<=14;slide++){
     if(process.env.MACEIO_SLIDES&&!process.env.MACEIO_SLIDES.split(',').map(Number).includes(slide))continue;
     await page.getByRole('button',{name:String(slide),exact:true}).click();const svg=page.getByRole('img',{name:`Maceió · slide ${slide}`,exact:true});
     assert.equal(await svg.locator('[data-maceio-caged]').count(),state==='success'?1:0);assert.equal(await svg.locator('[data-maceio-pending]').count(),state==='success'?0:1);
     assert.ok(!/NaN|Infinity/.test(await svg.textContent()));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
     assert.ok(!(await svg.textContent()).includes('Quebra de série'));
     await svg.screenshot({path:resolve(folder,`${quarterly?'quarterly':'monthly'}-${slide}-${width}-${dark}-${state}.png`)});results.push({quarterly,slide,width,dark,state});
    }
   }
   await page.getByRole('button',{name:'success',exact:true}).click();await page.getByRole('button',{name:'Ampliar slides',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.getByRole('dialog').locator('[data-maceio-caged]').count(),1);await page.keyboard.press('Escape');
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(folder,process.env.MACEIO_SLIDES?'results-selection.json':'results.json'),JSON.stringify({source:'synthetic reconciled CAGED fixture; not remote runtime',results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}catch(error){console.error(JSON.stringify({errors}));throw error;}finally{await browser?.close();server.kill();}
