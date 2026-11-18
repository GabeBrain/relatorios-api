import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {unzipSync} from 'fflate';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/relatorios-lucas/native-pptx-2026-11-12');await mkdir(folder,{recursive:true});
for(const [name,fixture] of [['fortaleza','fortaleza-complete'],['sp','sp-corrections'],['quarterly','fortaleza-quarterly']])await writeFile(resolve(folder,`${name}.html`),`<html><body><div id="root"></div><script type="module" src="/scripts/fixtures/${fixture}-preview.tsx"></script></body></html>`);
const base='http://127.0.0.1:4193',server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4193'],{windowsHide:true,stdio:['ignore','pipe','pipe']});let browser;server.stderr.on('data',data=>process.stderr.write(data));
try{
 let ready=false;for(let i=0;i<80&&!ready;i++){try{ready=(await fetch(base)).ok;}catch{}if(!ready)await new Promise(done=>setTimeout(done,250));}assert.ok(ready);
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 if(!process.argv.includes('--sp')){
 await page.goto(`${base}/.local-inputs/relatorios-lucas/native-pptx-2026-11-12/fortaleza.html`);await page.getByRole('button',{name:'3',exact:true}).click();
 await page.getByText('Editar este slide na prévia',{exact:true}).click();await page.getByLabel('Selecionar textos clicando no slide').click();
 const id=await page.locator('[data-native-cell="1:1"] span').getAttribute('data-slide-text-id');assert.ok(id);
 await page.locator(`[data-slide-select="${id}"]`).click();await page.getByLabel('Conteúdo',{exact:true}).fill('Empreendimento revisado na célula');
 await page.getByRole('button',{name:'4',exact:true}).click();await page.getByRole('button',{name:'3',exact:true}).click();
 assert.equal(await page.locator('[data-slide-edit-source] tspan').filter({hasText:'Empreendimento revisado na célula'}).count(),1);
 const pending=page.waitForEvent('download',{timeout:180000});await page.getByRole('button',{name:'Baixar PPTX de conferência',exact:true}).click();const fort=await pending;await fort.saveAs(resolve(folder,'fortaleza.pptx'));
 const bytes=unzipSync(new Uint8Array(await readFile(resolve(folder,'fortaleza.pptx')))),decode=n=>new TextDecoder().decode(bytes[`ppt/slides/slide${n}.xml`]);
 for(let n=3;n<=7;n++)assert.ok(decode(n).includes('<a:tbl>'));
 assert.ok(decode(3).includes('Empreendimento revisado na célula'));assert.ok(decode(3).includes('FFFFFF'));assert.ok(decode(12).includes('<a:custGeom>'));assert.ok(!decode(12).includes('Lâmina Mensal'));assert.equal((decode(59).match(/Foto editável:/g)||[]).length,16);
 }
 await page.goto(`${base}/.local-inputs/relatorios-lucas/native-pptx-2026-11-12/sp.html?deck&native-prices=complete`);await page.locator('[data-review-deck] article').last().waitFor({state:'attached'});
 const spPending=page.waitForEvent('download',{timeout:180000});await page.evaluate(()=>window.exportReview());const sp=await spPending;await sp.saveAs(resolve(folder,'sp.pptx'));
 const spFiles=unzipSync(new Uint8Array(await readFile(resolve(folder,'sp.pptx')))),spSlide=new TextDecoder().decode(spFiles['ppt/slides/slide53.xml']);
 assert.equal(Object.keys(spFiles).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,85);assert.ok(spSlide.includes('<a:custGeom>'));assert.ok(!spSlide.includes('Arte e gráfico do slide'));const consulting=new TextDecoder().decode(spFiles['ppt/slides/slide83.xml']);assert.equal((consulting.match(/Foto editável:/g)||[]).length,15);const presentation=new TextDecoder().decode(spFiles['ppt/slides/slide2.xml']);assert.ok(presentation.includes('SOBRE ESTE RELATÓRIO'));assert.ok(presentation.includes('MERCADO IMOBILIÁRIO'));
 await page.goto(`${base}/.local-inputs/relatorios-lucas/native-pptx-2026-11-12/quarterly.html`);await page.getByRole('button',{name:'89',exact:true}).waitFor();
 const quarterlyPending=page.waitForEvent('download',{timeout:180000});await page.getByRole('button',{name:'Baixar PPTX de conferência',exact:true}).click();const quarterly=await quarterlyPending;await quarterly.saveAs(resolve(folder,'fortaleza-quarterly.pptx'));
 const quarterlyFiles=unzipSync(new Uint8Array(await readFile(resolve(folder,'fortaleza-quarterly.pptx'))));assert.equal(Object.keys(quarterlyFiles).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,89);const quarterlyBoard=new TextDecoder().decode(quarterlyFiles['ppt/slides/slide88.xml']);assert.equal((quarterlyBoard.match(/Foto editável:/g)||[]).length,16);assert.ok(new TextDecoder().decode(quarterlyFiles['ppt/slides/slide3.xml']).includes('<a:tbl>'));
 assert.deepEqual(errors,[]);console.log('Fortaleza60/89 and SP85 downloaded: native table cell edit retained; vector chart shapes present; no slide screenshot.');
}finally{await browser?.close();server.kill();}
