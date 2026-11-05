import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { spGranularFixture } from './sp-granular-fixture.mjs';

// Own local app, synthetic authentication and mixed-date replays, GeoBrain calls intercepted; only Mapbox basemap requests allowed.
const output = resolve('.local-inputs/relatorios-lucas/sp/institutional-editable');
await mkdir(output, { recursive: true });
const recorded = JSON.parse(await readFile('src/features/relatorios-institucionais/sp/__tests__/fixtures/sp-municipal-2026.json', 'utf8'));
const observed = JSON.parse(await readFile('src/features/relatorios-institucionais/sp/__tests__/fixtures/sp-september-user-2026-10-29.json', 'utf8'));
const original = JSON.parse((await readFile('src/features/relatorios-institucionais/sp/original-slides.ts', 'utf8')).split(' = ')[1].split(' as const;')[0]);
const base = 'http://127.0.0.1:4176';
const server = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '4176', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
let browser;
const results = [];
const quick=process.env.SP_DIAGNOSTIC_QUICK==='1';
const mapboxResponses=[];
try {
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    if (server.exitCode !== null) throw new Error('Servidor local não iniciou.');
    try { ready = (await fetch(base)).ok; } catch { /* startup */ }
    if (!ready) await new Promise(done => setTimeout(done, 250));
  }
  assert.ok(ready);
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext();
  await context.addInitScript(() => { if(location.protocol==='http:')localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-only', email: 'fixture@example.invalid', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, version: 0 })); });
  let closing = '07', slow = false, failure = false, empty = false, granularFailure = false, slowNeighborhood = false, slowStock = false, negativeSales = false, detailsCase = 'normal', neighborhoodCalls = 0, calls = 0, granularCalls = 0, slowMapbox = false, mapboxFailure = false, historyFailure=false;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data, meta: { current_page: 1, last_page: 1, total: data.length }, links: { next: null } }) });
    if (url.pathname.endsWith('/monitored-cities')) return reply([{ city: 'São Paulo', state: 'SP' }]);
    if (url.pathname.endsWith('/building')) {
      granularCalls++;
      assert.equal(route.request().method(), 'GET');
      assert.equal(url.searchParams.get('type'), 'Vertical');
      assert.equal(url.searchParams.get('city'), 'São Paulo');
      if (slow) await new Promise(done => setTimeout(done, 1500));
      if (granularFailure) return route.fulfill({ status: 403, body: '{}' });
      const pageNumber = Number(url.searchParams.get('page'));
      const rows = (pageNumber === 1 ? ['2026-07-10', '2026-08-20'] : ['2026-09-15', '2026-06-01']).map((date, i) => ({ building_id: (pageNumber - 1) * 2 + i + 1, city: 'São Paulo', state: 'SP', building_type: 'Vertical', release_date: date, neighborhood: `Bairro ${(pageNumber - 1) * 2 + i + 1}`, total_units: (() => { const month = date.slice(0, 7); const values = month === '2026-09' ? observed.septemberReleases : recorded.releases[month]; return values?.reduce((a, b) => a + b, 0) ?? 0; })(), standard: ['Compacto', 'Econ\u00f4mico', 'Standard', 'Luxo'][(pageNumber - 1) * 2 + i], period: '2026-08-01' }));
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: rows, meta: { current_page: pageNumber, last_page: 2, total: 4 } }) });
    }
    if (url.pathname.endsWith('/building-with-history') || url.pathname.endsWith('/building-with-history-internal')) {
      if (Number(url.searchParams.get('per_page')) === 100) {
        assert.equal(url.origin,'https://app.geobrain.com.br');
        assert.equal(url.pathname,'/public-api/v2/building-with-history-internal');
        assert.equal(route.request().method(),'POST');
        assert.equal(route.request().postData(),null);
        neighborhoodCalls++;
        if(detailsCase==='v2-denied')return route.fulfill({status:403,body:'{}'});
        if (slowNeighborhood) await new Promise(done => setTimeout(done, 5000));
        const values = (metric,month,i) => {
          if (negativeSales && metric === 'sales' && month === '2026-07' && i === 0) return -10000;
          if (month === '2026-09') return (metric === 'stock' ? observed.septemberStock : metric === 'sales' ? observed.septemberSales : observed.septemberReleases)[i];
          if (month === '2026-08' && metric === 'stock') return observed.augustStock[i];
          return recorded[metric][month]?.[i] ?? (metric === 'stock' ? 1000+i*50 : 100+i*5+Number(month.slice(5)));
        };
        const rows = spGranularFixture(recorded.groups,values,`2026-${closing}`);
        if(detailsCase==='historical-fields')for(const building of rows){
          for(const row of building.typologies_history){row.pattern=building.standard;row.estagio_empreendimento='Pronto';row.building_status='Ativo';}
          building.standard='Alto';
        }
        if (detailsCase === 'pattern-shift') for (const row of rows) {
          if (row.standard === 'Alto') row.standard = 'Compacto';
          else if (row.standard === 'Compacto') row.standard = 'Alto';
        }
        if (detailsCase === 'mcmv-shift') for (const row of rows) {
          if (row.standard === 'Econômico') row.standard = 'Compacto';
          else if (row.standard === 'Compacto') row.standard = 'Econômico';
        }
        if (detailsCase === 'gap') rows[0].typologies_history = rows[0].typologies_history.filter(row => row.period !== '2024-09-01');
        if (detailsCase === 'missing-area') rows[0].typologies_history.find(row => row.period === `2026-${closing}-01`).private_area = null;
        if (detailsCase === 'capacity-diagnostic') rows[0].typologies_history.find(row => row.period === `2026-${closing}-01`).sold = -9;
        if (detailsCase === 'signed-stock') rows[0].typologies_history.find(row => row.period === '2026-06-01').typology_stock = -1;
        if (detailsCase === 'missing-price-sold-out') {
          const active=rows[0],sample=active.typologies_history.find(row=>row.period===`2026-${closing}-01`&&row.typology_stock>0);
          active.typologies_history.push({...sample,typology_id:999999,typology_stock:0,qty:100,sold:100,sold_in_period:0,price:null});
        }
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: rows, meta: { current_page: 1, last_page: 1, total: rows.length }, links: { next: null } }) });
      }
      calls++;
      if(slow)await new Promise(done=>setTimeout(done,1500));
      if (failure) return route.fulfill({ status: 403, body: '{}' });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: empty ? [] : [{ city: 'São Paulo', state: 'SP', building_type: 'Vertical', period: '2026-08-01' }], meta: { total: 5183 }, links: { next: null } }) });
    }
    if (url.pathname.includes('/temporal-analysis-city/')) {
      if(historyFailure&&url.searchParams.get('start_period')==='2021-01-01')return route.fulfill({status:429,headers:{'Retry-After':'0'},body:'{}'});
      if (slowStock && url.pathname.endsWith('/stock') && /-01-01$/.test(url.searchParams.get('start_period')??'')) await new Promise(done => setTimeout(done, 5000));
      const metric = url.pathname.split('/').at(-1);
      const field = { sales: 'liquid_sales', releases: 'releases_in_period', stock: 'stock' }[metric];
      const months = Object.fromEntries(Object.entries(recorded[metric]).filter(([month]) => month < '2026-09').map(([month, values]) => [month, [...values]]));
      months['2026-09'] = metric === 'stock' ? observed.septemberStock : metric === 'sales' ? observed.septemberSales : observed.septemberReleases;
      if (negativeSales && metric === 'sales') months['2026-07'][0] = -10000;
      if (metric === 'stock') months['2026-08'] = observed.augustStock;
      if (url.searchParams.get('group_by') !== 'Tipologia') {
        const all = [];
        for (let year = 2017; year <= 2026; year++) for (let m = 1; m <= 12; m++) {
          const month = `${year}-${String(m).padStart(2, '0')}`;
          if (month > `2026-${closing}`) continue;
          for (const [i, group] of recorded.groups.entries()) all.push({ period: `${month}-01`, group, building_type: 'Vertical', [field]: months[month]?.[i] ?? (metric === 'stock' ? 1000 + i * 50 : 100 + i * 5 + m), ...(metric === 'releases' ? { vgv_release: (months[month]?.[i] ?? (metric === 'stock' ? 1000 + i * 50 : 100 + i * 5 + m)) * 100000.25 } : metric === 'sales' ? { vgv_liquid_sales: (months[month]?.[i] ?? 100 + i * 5 + m) * 100000.25 } : {}) });
        }
        if(detailsCase==='signed-stock'&&metric==='stock')for(const row of all)if(row.period==='2026-06-01'&&row.group===recorded.groups[0])row.stock-=Math.floor(row.stock*.1);
        const filtered=all.filter(row=>row.period>=url.searchParams.get('start_period')&&row.period<=url.searchParams.get('end_period'));
        const p = Number(url.searchParams.get('page')), last = Math.max(1,Math.ceil(filtered.length / 100));
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: filtered.slice((p - 1) * 100, p * 100), meta: { current_page: p, last_page: last, total: filtered.length }, links: { next: p < last ? `?page=${p + 1}` : null } }) });
      }

      if (url.searchParams.get('group_by') === 'Tipologia') {
        const start = url.searchParams.get('start_period').slice(0, 7), end = url.searchParams.get('end_period').slice(0, 7);
        const rows = [];
        for (let year = 2017; year <= 2026; year++) for (let m = 1; m <= 12; m++) {
          const month = `${year}-${String(m).padStart(2, '0')}`;
          if (month < start || month > end || month > `2026-${closing}`) continue;
          const total = months[month]?.reduce((a, b) => a + b, 0) ?? recorded.groups.reduce((sum, _, i) => sum + (metric === 'stock' ? 1000 + i * 50 : 100 + i * 5 + m), 0);
          const values = [.1, .6, .2].map(share => Math.floor(total * share)); values.push(total - values.reduce((a,b) => a+b,0));
          rows.push(...values.map((value, i) => ({ period: `${month}-01`, group: `${i+1} dormit\u00f3rio${i ? 's' : ''}`, building_type: 'Vertical', [field]: value })));
        }
        return reply(rows);
      }
      return reply(Object.entries(months).flatMap(([month, values]) => values.map((value, index) => ({ period: `${month}-01`, group: recorded.groups[index], building_type: 'Vertical', [field]: value, ...(metric === 'releases' ? { vgv_release: value * 100000.25 } : metric === 'sales' ? { vgv_liquid_sales: value * 100000.25 } : {}) }))).filter(row => row.period >= url.searchParams.get('start_period') && row.period <= url.searchParams.get('end_period') && row.period <= `2026-${closing}-31`));
    }
    if (url.hostname === 'api.mapbox.com') {if(slowMapbox)await new Promise(done=>setTimeout(done,1400));return mapboxFailure?route.abort():route.continue();}
    if (url.origin === base) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  closing='09';
  for(const width of [1440,390])for(const dark of [false,true]){
    await page.setViewportSize({width,height:1000});
    await page.goto(`${base}/rebrain/relatorios-institucionais/sp`);
    await page.getByRole('heading',{name:'SP institucional',exact:true}).waitFor();
    if(width<640&&await page.getByRole('button',{name:'Recolher menu',exact:true}).count())await page.getByRole('button',{name:'Recolher menu',exact:true}).click();
    await page.evaluate(value=>document.documentElement.classList.toggle('dark',value),dark);
    await page.getByRole('combobox').first().click();await page.getByRole('option',{name:'SP',exact:true}).click();
    await page.getByText('Selecione o município',{exact:true}).click();await page.getByRole('option',{name:'São Paulo',exact:true}).click();
    await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
    await page.getByRole('heading',{name:/Relatório gerado/}).waitFor({timeout:60000});
    for(const slide of [5,7]){
      await page.getByRole('button',{name:`${slide}. ${original[slide-1].title}`,exact:true}).click();
      const article=page.getByRole('article');await article.scrollIntoViewIfNeeded();
      await article.evaluate(async element=>Promise.all([...element.querySelectorAll('img')].map(img=>img.decode().catch(()=>{}))));
      const labels=await article.locator('svg text').allTextContents();
      assert.equal(labels.length,slide===5?18:7);
      if(slide===7){assert.ok(labels.includes('SETEMBRO DE 2026'));assert.ok(!labels.includes('JUNHO DE 2026'));}
      await article.screenshot({path:resolve(output,`${width}-${dark}-slide-${slide}.png`)});
      results.push({width,dark,slide,nativeLabels:labels.length});
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  const before={calls,granularCalls,neighborhoodCalls};
  const downloadPromise=page.waitForEvent('download',{timeout:240000});
  await page.getByRole('button',{name:'Baixar PPTX editável',exact:true}).click();
  const download=await downloadPromise;await download.saveAs(resolve(output,'institutional-editable-3T2026.pptx'));
  assert.deepEqual({calls,granularCalls,neighborhoodCalls},before);
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'results.json'),JSON.stringify({results,errors,noAdditionalBusinessCalls:true},null,2));
  console.log(JSON.stringify({results,errors,editablePptx:true}));
}finally{await browser?.close();server.kill();}
