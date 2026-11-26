import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const folder=resolve('.local-inputs/relatorios-lucas/modelo-02/visual-2026-11-26-correction');await mkdir(folder,{recursive:true});
const server=spawn(process.execPath,[resolve('scripts/diagnostics/report-preview-server.mjs'),'4288'],{windowsHide:true,stdio:'ignore'});let browser;
try{
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4288')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}});
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());await page.goto('http://127.0.0.1:4288');
 const results=[];
 for(const size of [80,120]){
  const result=await page.evaluate(async size=>{
   const ReactModule=await import('/node_modules/.vite/deps/react.js'),React=ReactModule.default??ReactModule,DOM=await import('/node_modules/.vite/deps/react-dom_client.js'),createRoot=DOM.createRoot??DOM.default.createRoot,{ReportSlide}=await import('/src/features/relatorios-institucionais/modelo-02/ReportSlide.tsx'),{physicalPages}=await import('/src/features/relatorios-institucionais/modelo-02/calculate.ts');
   const rows=Array.from({length:size},(_,i)=>({label:`Município de teste com nome longo ${i+1}`,values:[['PR','SC','RS'][Math.min(2,Math.floor(i/Math.ceil(size/3)))]]}));
   const slide={id:'scope',title:'Municípios analisados',kind:'data',status:'available',tables:[{columns:['UF'],rows,formats:['text'],unit:'Fixture de densidade'}],warnings:[],sourceKeys:[],note:'Sintético',presentation:{kind:'cities'}};
   const pages=physicalPages([slide]),host=document.createElement('div');host.style.width='1280px';document.body.replaceChildren(host);createRoot(host).render(React.createElement('div',null,pages.map((p,i)=>React.createElement('div',{'data-page':i,key:i},React.createElement(ReportSlide,{page:p,selection:{region:'sul',quarter:3,year:2026}})))));
   await new Promise(r=>setTimeout(r,300));const svg=host.querySelector('svg'),labels=[...host.querySelectorAll('text')].filter(t=>t.textContent.startsWith('Município de teste'));
   return {size,pages:pages.length,labels:labels.length,minFont:Math.min(...labels.map(t=>Number(t.getAttribute('font-size')))),maxBaseline:Math.max(...labels.map(t=>Number(t.getAttribute('y')))),width:svg.getBoundingClientRect().width};
  },size);
  assert.equal(result.labels,size);assert.equal(result.pages,size===80?1:2);assert.ok(result.minFont>=13);assert.ok(result.maxBaseline<650);assert.equal(result.width,1280);
  await page.locator('[data-page="0"]').screenshot({path:resolve(folder,`dense-cities-${size}.png`)});results.push(result);
 }
 await writeFile(resolve(folder,'dense-cities.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser?.close();server.kill();}
