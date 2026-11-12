import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const folder=resolve('.local-inputs/fiergs-capas-20261013');
await mkdir(folder,{recursive:true});
await build({entryPoints:[resolve('scripts/fixtures/fiergs-custom-cover-preview.tsx')],outfile:`${folder}/cover-fixtures.cjs`,bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},alias:{'@':resolve('src')},external:['react','react-dom/server']});
const cases=createRequire(import.meta.url)(`${folder}/cover-fixtures.cjs`).fixtures();
const css=(await Promise.all(['src/styles/geobrain-tokens.css','src/features/panorama-secovi-fiergs/print/panorama-print.css','src/features/panorama-secovi-fiergs/print/custom-fiergs-covers.css'].map(path=>readFile(path,'utf8')))).join('\n');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
await page.route('**/*',route=>route.abort());
const results=[];
try {
  for (const width of [960,1920,480]) {
    await page.setViewportSize({width,height:Math.ceil(width*9/16)});
    for (const sample of cases) {
      const html=`<html><head><meta charset="utf-8"><style>${css} body{margin:0} .preview{width:${width}px;height:${width*9/16}px;min-height:0!important}.preview .panorama-page-content{padding:1.35cqw 1.8cqw 2.2cqw;box-sizing:border-box}</style></head><body><section class="preview panorama-report-page panorama-fiergs-page"><div class="panorama-page-content">${sample.html}</div></section></body></html>`;
      await page.setContent(html);
      await page.evaluate(()=>document.fonts.ready);
      const result=await page.evaluate(()=>{
        const box=document.querySelector('.preview').getBoundingClientRect();
        const container=document.querySelector('.panorama-custom-cover,.panorama-custom-territory');
        const overflow=[];
        for(const el of container.querySelectorAll('h1,h2,li,li strong,footer,header')) {
          const rect=el.getBoundingClientRect();
          const style=getComputedStyle(el);
          const clipped=(style.overflowX==='hidden'&&el.scrollWidth>el.clientWidth+1)||(style.overflowY==='hidden'&&el.scrollHeight>el.clientHeight+1);
          if(rect.left<box.left-1||rect.right>box.right+1||rect.top<box.top-1||rect.bottom>box.bottom+1||clipped)overflow.push({tag:el.tagName,text:el.textContent,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}});
        }

        const header=container.querySelector('header').getBoundingClientRect();
        const footer=container.querySelector('footer').getBoundingClientRect();
        for(const el of container.querySelectorAll('li')){const r=el.getBoundingClientRect();if(r.top<header.bottom+4||r.bottom>footer.top-4)overflow.push({tag:'LI_OVERLAP',text:el.textContent});}
        for(const el of container.querySelectorAll('h1,h2,li strong')) {
          const range=document.createRange();range.selectNodeContents(el);
          const parent=el.closest('li')?.getBoundingClientRect()||box;
          for(const rect of range.getClientRects())if(rect.left<parent.left-1||rect.right>parent.right+1||rect.top<parent.top-1||rect.bottom>parent.bottom+1)overflow.push({tag:'TEXT_OVERFLOW',text:el.textContent});
        }
        const cards=[...container.querySelectorAll('li')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,text:el.textContent};});
        const rows=new Map();for(const r of cards){const key=Math.round(r.y);rows.set(key,[...(rows.get(key)||[]),r]);}
        const symmetric=[...rows.values()].every(row=>Math.abs((Math.min(...row.map(r=>r.x))+Math.max(...row.map(r=>r.x+r.w)))/2-(box.x+box.width/2))<2);
        return {overflow,symmetric,cards:cards.length};
      });
      results.push({id:sample.id,width,...result});
      if(width===960)await page.screenshot({path:`${folder}/${sample.id}.png`});
      if(width===960&&sample.id==='cover-conjunto')await writeFile(`${folder}/cover-conjunto.html`,html);
    }
  }
}finally{await browser.close();}
await writeFile(`${folder}/layout-results.json`,JSON.stringify(results,null,2));
const failed=results.filter(row=>row.overflow.length||!row.symmetric);
console.log(JSON.stringify({cases:results.length,failed},null,2));
if(failed.length)process.exitCode=1;
