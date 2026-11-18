import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/relatorios-lucas/preview-editor');await mkdir(folder,{recursive:true});
for(const name of ['sp-editor','fortaleza-complete'])await writeFile(resolve(folder,`${name}.html`),`<html><body><div id="root"></div><script type="module" src="/scripts/fixtures/${name}-preview.tsx"></script></body></html>`);
const base='http://127.0.0.1:4192',server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4192','--strictPort'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}assert.ok(ready);
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const name of ['sp-editor','fortaleza-complete']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await page.goto(`${base}/.local-inputs/relatorios-lucas/preview-editor/${name}.html`);
  await page.getByText('Editar este slide na prévia',{exact:true}).click();
  await page.getByRole('button',{name:'Adicionar texto',exact:true}).click();
  await page.getByLabel('Conteúdo',{exact:true}).fill('Manchete editada na prévia');
  const note=()=>page.locator('[data-editable-slide] [data-manual-slide-layer] tspan').filter({hasText:'Manchete editada na prévia'});
  assert.equal(await note().count(),1);
  const second=name==='sp-editor'?page.getByRole('button',{name:/^2\. /}):page.getByRole('button',{name:'2',exact:true});await second.click();assert.equal(await note().count(),0);
  const first=name==='sp-editor'?page.getByRole('button',{name:/^1\. /}):page.getByRole('button',{name:'1',exact:true});await first.click();assert.equal(await note().count(),1);
  await page.locator('[data-editable-slide]').screenshot({path:resolve(folder,`${name}.png`)});
  await page.getByRole('button',{name:'Restaurar slide 1'}).click();assert.equal(await note().count(),0);
  await second.click();await page.getByRole('combobox',{name:/Texto do slide/}).click();await page.getByRole('option').first().click();
  await page.getByLabel('Conteúdo',{exact:true}).fill('Texto original revisado');
  const exported=await page.evaluate(async name=>{
    const surface=document.querySelector('[data-editable-slide]');
    const module=await import(name==='sp-editor'?'/src/features/relatorios-institucionais/sp/pptx-export.ts':'/src/features/relatorios-institucionais/fortaleza/pptx-export.ts');
    return (name==='sp-editor'?module.spSvgTexts(surface):module.fortalezaNativeTexts(surface).texts).map(t=>t.text);
  },name);
  assert.ok(exported.includes('Texto original revisado'));assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Both previews: edit, navigate, retain, restore, no runtime errors.');
}finally{await browser?.close();server.kill();}
