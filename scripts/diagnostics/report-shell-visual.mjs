import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4231',folder=resolve('.local-inputs/relatorios-lucas/shared-shell-2026-11-24');await mkdir(folder,{recursive:true});
const server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4231'],{windowsHide:true,stdio:'ignore'});let browser;const results=[],errors=[];
try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,250));}assert.ok(ready);browser=await chromium.launch({channel:'msedge',headless:true});
 for(const kind of ['sp','fortaleza','maceio'])for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await page.goto(`${base}/rebrain/relatorios-institucionais/modelo-03`);await page.getByRole('heading',{name:'Modelo 03',exact:true}).waitFor();await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),mobile);
  const mount=loading=>page.evaluate(async({kind,loading})=>(await import('/scripts/diagnostics/report-shell-fixtures.tsx')).mount(kind,loading),{kind,loading});
  await mount(true);await page.getByRole('heading',{name:'Gerando seu relatório',exact:true}).waitFor();await page.waitForTimeout(700);
  const region=page.getByRole('region',{name:kind==='sp'?'Etapas de geração':'Carregamento do relatório',exact:true});assert.ok(await region.isVisible());
  assert.ok(await region.locator('ol').evaluate(el=>el.classList.contains('md:grid-cols-2')));assert.ok(await region.locator('img').evaluate(el=>el.getBoundingClientRect().height<=28));assert.ok(await region.locator('[aria-label$="decorridos"]').isVisible());
  await page.screenshot({path:resolve(folder,`${kind}-${mobile}-loading.png`),fullPage:true});await page.getByRole('button',{name:kind==='sp'?'Cancelar geração':'Cancelar consulta',exact:true}).click();assert.equal(await page.locator('[data-cancelled="true"]').count(),1);
  await mount(false);const nav=page.getByRole('navigation').filter({has:page.getByRole('button',{name:'Anterior',exact:true})});await nav.waitFor();
  assert.equal(await nav.getByRole('button',{name:'Anterior',exact:true}).isDisabled(),true);await nav.getByRole('button',{name:'2',exact:true}).click();assert.equal(await nav.getByRole('button',{name:'2',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Ampliar slides',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.getByRole('button',{name:'Próximo',exact:true}).click();assert.equal(await dialog.getByRole('button',{name:'3',exact:true}).getAttribute('aria-current'),'page');
  await page.screenshot({path:resolve(folder,`${kind}-${mobile}-expanded.png`),fullPage:true});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await nav.getByRole('button',{name:'3',exact:true}).getAttribute('aria-pressed'),'true');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({kind,width:mobile?390:1440,loading:true,cancel:true,navigation:true,expanded:true});await context.close();console.log(JSON.stringify(results.at(-1)));
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify({source:'Offline fixtures and actual preview components; no authenticated API',results,errors},null,2));
}finally{await browser?.close();server.kill();}
