import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Own local app, synthetic authentication and September, all external traffic blocked.
const output = resolve('.local-inputs/relatorios-lucas/sp/dynamic-closure');
await mkdir(output, { recursive: true });
const recorded = JSON.parse(await readFile('src/features/relatorios-institucionais/sp/__tests__/fixtures/sp-municipal-2026.json', 'utf8'));
const base = 'http://127.0.0.1:4176';
const server = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '4176', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
let browser;
const results = [];
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
  await context.addInitScript(() => localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-only', email: 'fixture@example.invalid', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, version: 0 })));
  let closing = '07', slow = false, failure = false, empty = false, calls = 0;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const reply = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data, meta: { current_page: 1, last_page: 1, total: data.length }, links: { next: null } }) });
    if (url.pathname.endsWith('/monitored-cities')) return reply([{ city: 'São Paulo', state: 'SP' }]);
    if (url.pathname.endsWith('/building-with-history')) {
      calls++;
      if (slow) await new Promise(done => setTimeout(done, 1500));
      if (failure) return route.fulfill({ status: 403, body: '{}' });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: empty ? [] : [{ city: 'São Paulo', state: 'SP', building_type: 'Vertical', period: `2026-${closing}-01` }], meta: { total: 5183 }, links: { next: null } }) });
    }
    if (url.pathname.includes('/temporal-analysis-city/')) {
      const metric = url.pathname.split('/').at(-1);
      const field = { sales: 'liquid_sales', releases: 'releases_in_period', stock: 'stock' }[metric];
      const months = Object.fromEntries(Object.entries(recorded[metric]).filter(([month]) => month < '2026-09'));
      months['2026-09'] = metric === 'stock' ? recorded.stock['2026-08'].map(value => value + 6) : recorded.groups.map(() => metric === 'sales' ? 4 : 10);
      return reply(Object.entries(months).flatMap(([month, values]) => values.map((value, index) => ({ period: `${month}-01`, group: recorded.groups[index], building_type: 'Vertical', [field]: value }))).filter(row => row.period >= url.searchParams.get('start_period') && row.period <= url.searchParams.get('end_period')));
    }
    if (url.origin === base) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 390]) for (const dark of [false, true]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/rebrain/relatorios-institucionais/sp`);
    await page.getByRole('heading', { name: 'SP institucional', exact: true }).waitFor();
    if (width < 640 && await page.getByRole('button', { name: 'Recolher menu', exact: true }).count()) await page.getByRole('button', { name: 'Recolher menu', exact: true }).click();
    if (width >= 640 && await page.getByRole('button', { name: 'Expandir menu', exact: true }).count()) await page.getByRole('button', { name: 'Expandir menu', exact: true }).click();
    await page.waitForFunction(narrow => Math.abs(document.querySelector('aside').getBoundingClientRect().width - (narrow ? 56 : 256)) < 1, width < 640);
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'SP', exact: true }).click();
    await page.getByText('Selecione o município', { exact: true }).click();
    await page.getByRole('option', { name: 'São Paulo', exact: true }).click();
    for (const month of ['07', '08', '09']) {
      closing = month;
      await page.getByRole('button', { name: 'Conferir dados reais', exact: true }).click();
      await page.getByText(month === '09' ? 'Trimestre fechado nas séries municipais da API' : 'Conferência parcial de dados da API', { exact: true }).waitFor();
      const heading = page.getByRole('heading', { name: /São Paulo \/ SP/ });
      assert.match(await heading.innerText(), month === '09' ? /trimestre fechado até setembro/ : /parcial até/);
      assert.equal(await page.getByRole('cell', { name: 'Indisponível', exact: true }).count(), 1);
      await page.getByRole('button', { name: '3. Unidades lançadas', exact: true }).click();
      await page.getByRole('article').screenshot({ path: resolve(output, `${width}-${dark ? 'dark' : 'light'}-${month}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth + 1), false);
    }
    slow = true;
    await page.getByRole('button', { name: 'Conferir dados reais', exact: true }).click();
    const loading = page.getByRole('dialog', { name: 'Consulta do relatório' });
    await loading.waitFor();
    await loading.getByText('0:01 decorridos').waitFor();
    await page.screenshot({ path: resolve(output, `${width}-${dark ? 'dark' : 'light'}-loading.png`) });
    await page.keyboard.press('Escape');
    await loading.waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('region', { name: 'Prévia do estudo' }).count(), 0);
    slow = false;
    results.push({ width, dark, transitions: ['partial-1', 'partial-2', 'quarter-closed'], slowLoadingAndCancel: true });
  }
  failure = true;
  await page.getByRole('button', { name: 'Conferir dados reais', exact: true }).click();
  await page.getByText('Não foi possível preparar a prévia', { exact: true }).waitFor();
  failure = false; empty = true;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await page.getByText('Não foi possível preparar a prévia', { exact: true }).waitFor();
  assert.equal(await page.getByRole('region', { name: 'Prévia do estudo' }).count(), 0);
  assert.deepEqual(errors, []);
  const result = { results, errorAndEmptyBlocked: true, rootCalls: calls, pageErrors: errors, realApiCalls: 0, september: 'synthetic' };
  await writeFile(resolve(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill();
}
