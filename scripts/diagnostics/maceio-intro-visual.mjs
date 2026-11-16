import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/relatorios-lucas/maceio/intro-visual-2026-11-16');await mkdir(folder,{recursive:true});
await writeFile(resolve(folder,'preview.html'),'<div id="root"></div><script type="module" src="/scripts/fixtures/maceio-intro-preview.tsx"></script>');
const base='http://127.0.0.1:4197',url=`${base}/.local-inputs/relatorios-lucas/maceio/intro-visual-2026-11-16/preview.html`;
const server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4197'],{windowsHide:true,stdio:'ignore'});let browser;const results=[],errors=[];
try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [1440,390])for(const dark of [false,true]){
  const context=await browser.newContext({viewport:{width,height:1000}});await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.getByRole('button',{name:'20',exact:true}).waitFor();await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
  for(const quarterly of [false,true]){
   if(quarterly)await page.getByRole('button',{name:'Trocar modelo',exact:true}).click();
    for(let n=1;n<=40;n++){
    await page.getByRole('button',{name:String(n),exact:true}).click();const slide=page.getByRole('img',{name:`Maceió · slide ${n}`,exact:true});await slide.waitFor();
    await slide.locator('image').evaluateAll(async nodes=>{await Promise.all(nodes.map(node=>new Promise((done,fail)=>{const img=new Image();img.onload=done;img.onerror=fail;img.src=node.getAttribute('href');if(img.complete&&img.naturalWidth)done();})));});
    assert.ok(!(await slide.textContent()).includes('NaN'));
    if(n>=16&&![29,39].includes(n))assert.equal(await slide.locator('[data-maceio-chart]').count(),1);
    if(n>=9&&n<=14)assert.equal(await slide.locator('[data-maceio-pending]').count(),1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    await slide.screenshot({path:resolve(folder,`${quarterly?'quarterly':'monthly'}-${n}-${width}-${dark}.png`)});results.push({quarterly,n,width,dark});
   }
   await page.getByRole('button',{name:'Trocar fonte',exact:true}).click();assert.equal(await page.locator('[data-maceio-pending]').count(),1);await page.getByRole('button',{name:'Trocar fonte',exact:true}).click();
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({source:'synthetic fixtures; no authenticated API',results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();server.kill();}
