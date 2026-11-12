import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base = 'http://127.0.0.1:5179';
const folder = resolve('.local-inputs/relatorios-lucas/fortaleza/intro-visual');
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  for (const model of ['junho','julho']) for (let number = 1; number <= 10; number++) {
    await page.goto(`${base}/.local-inputs/relatorios-lucas/fortaleza/intro-preview.html?model=${model}&page=${number}`);
    await page.getByRole('img', { name: `Fortaleza · slide ${number}`, exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('svg image').evaluate(async image => { const value = new Image(); value.src = image.getAttribute('href'); await value.decode(); });
    const shot = await page.screenshot({ path: resolve(folder, `${model}-${number}.png`) });
    const metrics = await page.evaluate(async ({ model, number, screenshot }) => {
      const load = async source => { const img = new Image(); img.src = source; await img.decode(); return img; };
      const first = await load(`/.local-inputs/relatorios-lucas/fortaleza/${model}-intro-original-${number}.png`), second = await load(screenshot);
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720; const context = canvas.getContext('2d');
      context.drawImage(first,0,0); const a=context.getImageData(0,0,1280,720).data; context.clearRect(0,0,1280,720); context.drawImage(second,0,0); const b=context.getImageData(0,0,1280,720).data;
      let changed=0,error=0;for(let i=0;i<a.length;i+=4){const delta=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2])); if(delta>20)changed++;error+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);}
      const overflow=[...document.querySelectorAll('.fortaleza-intro-cell')].filter(cell=>cell.firstElementChild.scrollHeight>cell.clientHeight+2).length;
      return { changedPercent:changed/(1280*720)*100,meanError:error/(1280*720*3),overflow };
    }, { model, number, screenshot: `data:image/png;base64,${shot.toString('base64')}` });
    results.push({ model, page: number, ...metrics });
  }
} finally { await browser.close(); }
await writeFile(resolve(folder,'results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
