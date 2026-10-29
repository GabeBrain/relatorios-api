import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Own local app, synthetic authentication and mixed-date replays, all external traffic blocked.
const output = resolve('.local-inputs/relatorios-lucas/sp/dynamic-closure');
await mkdir(output, { recursive: true });
const recorded = JSON.parse(await readFile('src/features/relatorios-institucionais/sp/__tests__/fixtures/sp-municipal-2026.json', 'utf8'));
const observed = JSON.parse(await readFile('src/features/relatorios-institucionais/sp/__tests__/fixtures/sp-september-user-2026-10-29.json', 'utf8'));
const original = JSON.parse((await readFile('src/features/relatorios-institucionais/sp/original-slides.ts', 'utf8')).split(' = ')[1].split(' as const;')[0]);
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
  let closing = '07', slow = false, failure = false, empty = false, granularFailure = false, calls = 0, granularCalls = 0;
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
      const rows = (pageNumber === 1 ? ['2026-07-10', '2026-08-20'] : ['2026-09-15', '2026-06-01']).map((date, i) => ({ building_id: (pageNumber - 1) * 2 + i + 1, city: 'São Paulo', state: 'SP', building_type: 'Vertical', release_date: date, standard: ['Compacto', 'Econ\u00f4mico', 'Standard', 'Luxo'][(pageNumber - 1) * 2 + i], period: '2026-08-01' }));
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: rows, meta: { current_page: pageNumber, last_page: 2, total: 4 } }) });
    }
    if (url.pathname.endsWith('/building-with-history')) {
      calls++;
      if (failure) return route.fulfill({ status: 403, body: '{}' });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: empty ? [] : [{ city: 'São Paulo', state: 'SP', building_type: 'Vertical', period: '2026-08-01' }], meta: { total: 5183 }, links: { next: null } }) });
    }
    if (url.pathname.includes('/temporal-analysis-city/')) {
      const metric = url.pathname.split('/').at(-1);
      const field = { sales: 'liquid_sales', releases: 'releases_in_period', stock: 'stock' }[metric];
      const months = Object.fromEntries(Object.entries(recorded[metric]).filter(([month]) => month < '2026-09'));
      months['2026-09'] = metric === 'stock' ? observed.septemberStock : metric === 'sales' ? observed.septemberSales : observed.septemberReleases;
      if (metric === 'stock') months['2026-08'] = observed.augustStock;
      if (metric === 'releases' && url.searchParams.get('start_period') === '2021-01-01') {
        const all = [];
        for (let year = 2021; year <= 2026; year++) for (let m = 1; m <= 12; m++) {
          const month = `${year}-${String(m).padStart(2, '0')}`;
          if (month > `2026-${closing}`) continue;
          for (const [i, group] of recorded.groups.entries()) all.push({ period: `${month}-01`, group, building_type: 'Vertical', releases_in_period: months[month]?.[i] ?? 100 + i * 5 + m });
        }
        const p = Number(url.searchParams.get('page')), last = Math.ceil(all.length / 100);
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: all.slice((p - 1) * 100, p * 100), meta: { current_page: p, last_page: last, total: all.length }, links: { next: p < last ? `?page=${p + 1}` : null } }) });
      }

      return reply(Object.entries(months).flatMap(([month, values]) => values.map((value, index) => ({ period: `${month}-01`, group: recorded.groups[index], building_type: 'Vertical', [field]: value }))).filter(row => row.period >= url.searchParams.get('start_period') && row.period <= url.searchParams.get('end_period') && row.period <= `2026-${closing}-31`));
    }
    if (url.origin === base) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  const openSlide = number => page.getByRole('button', { name: `${number}. ${original[number - 1].title}`, exact: true }).click();
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
      await page.getByText(month === '09' ? 'Trimestre completo nas séries municipais da API' : 'Conferência parcial de dados da API', { exact: true }).waitFor();
      if (month === '09') { await page.getByText(/Balanço 2026-09: diferença de 22 unidades entre estoque/).waitFor(); await page.getByRole('cell', { name: '126.307', exact: true }).first().waitFor(); }
      const heading = page.getByRole('heading', { name: /São Paulo \/ SP/ });
      assert.match(await heading.innerText(), month === '09' ? /trimestre completo até setembro/ : /parcial até/);
      await page.getByText(/Cobertura conferida:/).waitFor();
      assert.equal(await page.getByRole('cell', { name: 'Indisponível', exact: true }).count(), 0);
      await openSlide(13);
      assert.match(await page.getByRole('article').innerText(), /Reconstitui\u00e7\u00e3o do cadastro atual/);
      assert.match(await page.getByRole('article').innerText(), new RegExp(`Lan\u00e7amentos no trimestre selecionado\\s+${Number(month) - 6}`));
      await page.getByRole('article').screenshot({ path: resolve(output, `${width}-${dark ? 'dark' : 'light'}-${month}-projects.png`) });
      await page.getByText('Séries de unidades lançadas conferidas desde janeiro de 2021. Cinco páginas históricas disponíveis.', { exact: true }).waitFor();
      await openSlide(18);
      await page.getByRole('article').screenshot({ path: resolve(output, `${width}-${dark ? 'dark' : 'light'}-${month}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth + 1), false);
      if (month === '09') {
        for (let slide = 13; slide <= 22; slide++) {
          await openSlide(slide);
          assert.doesNotMatch(await page.getByRole('article').innerText(), /Dados em confer\u00eancia/);
          await page.getByRole('article').screenshot({ path: resolve(output, `${width}-${dark ? 'dark' : 'light'}-original-${slide}.png`) });
        }
        await page.getByText('Diferenças de balanço por grupo', { exact: true }).click();
        await page.getByText('Diferenças de balanço por grupo', { exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(output, `${width}-${dark ? 'dark' : 'light'}-balance-details.png`) });
        await page.locator('main').evaluate(element => { element.scrollTop = 0; });
        await page.screenshot({ path: resolve(output, `${width}-${dark ? 'dark' : 'light'}-summary.png`) });
        await openSlide(46);
        assert.match(await page.getByRole('article').innerText(), /126.307/);
      }

    }
    slow = true;
    await page.getByRole('button', { name: 'Conferir dados reais', exact: true }).click();
    await page.getByText('Trimestre completo nas séries municipais da API', { exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog', { name: 'Consulta do relatório' }).count(), 0);
    await page.getByLabel('0:01 decorridos').waitFor();
    assert.equal(await page.getByRole('cell', { name: '126.307', exact: true }).count() > 0, true);
    await page.locator('main').evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: resolve(output, `${width}-${dark ? 'dark' : 'light'}-loading.png`) });
    await page.getByRole('button', { name: 'Cancelar contagem', exact: true }).click();
    await page.getByText('Contagem de empreendimentos indisponível', { exact: true }).waitFor();
    assert.equal(await page.getByRole('region', { name: 'Prévia do estudo' }).count(), 1);
    slow = false;
    results.push({ width, dark, transitions: ['partial-1', 'partial-2', 'quarter-closed'], municipalVisibleDuringSlowCountAndCancel: true });
  }
  granularFailure = true;
  await page.getByRole('button', { name: 'Conferir dados reais', exact: true }).click();
  await page.getByText('Contagem de empreendimentos indisponível', { exact: true }).waitFor();
  await page.getByText('Trimestre completo nas séries municipais da API', { exact: true }).waitFor();
  assert.equal(await page.getByRole('cell', { name: 'Indisponível', exact: true }).count(), 1);
  granularFailure = false; failure = true;
  await page.getByRole('button', { name: 'Conferir dados reais', exact: true }).click();
  await page.getByText('Não foi possível preparar a prévia', { exact: true }).waitFor();
  failure = false; empty = true;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await page.getByText('Não foi possível preparar a prévia', { exact: true }).waitFor();
  assert.equal(await page.getByRole('region', { name: 'Prévia do estudo' }).count(), 0);
  assert.deepEqual(errors, []);
  const result = { results, errorAndEmptyBlocked: true, granularFailurePreservesMunicipal: true, rootCalls: calls, granularCalls, pageErrors: errors, realApiCalls: 0, september: 'user-provided-2026-10-29; other months from earlier fixtures, projects synthetic, not a quarterly baseline' };
  await writeFile(resolve(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill();
}
