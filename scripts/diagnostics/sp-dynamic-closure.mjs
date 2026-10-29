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
  let closing = '07', slow = false, failure = false, empty = false, granularFailure = false, slowNeighborhood = false, slowStock = false, negativeSales = false, neighborhoodCalls = 0, calls = 0, granularCalls = 0;
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
    if (url.pathname.endsWith('/building-with-history')) {
      if (Number(url.searchParams.get('per_page')) === 100) {
        neighborhoodCalls++;
        if (slowNeighborhood) await new Promise(done => setTimeout(done, 1500));
        const rows = recorded.groups.map((standard, i) => ({ building_id: i+1, city: 'São Paulo', state: 'SP', building_type: 'Vertical', release_date: '2020-01-01', neighborhood: `Bairro ${i+1}`, standard,
          typologies_history: ['07','08','09'].filter(month => month <= closing).map(month => ({ typology_id: i+1, period: `2026-${month}-01`, sold_in_period: negativeSales && month === '07' && i === 0 ? -10000 : month === '09' ? observed.septemberSales[i] : recorded.sales[`2026-${month}`][i] })) }));
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: rows, meta: { current_page: 1, last_page: 1, total: 7 }, links: { next: null } }) });
      }
      calls++;
      if (failure) return route.fulfill({ status: 403, body: '{}' });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: empty ? [] : [{ city: 'São Paulo', state: 'SP', building_type: 'Vertical', period: '2026-08-01' }], meta: { total: 5183 }, links: { next: null } }) });
    }
    if (url.pathname.includes('/temporal-analysis-city/')) {
      if (slowStock && url.pathname.endsWith('/stock') && url.searchParams.get('start_period') === '2021-01-01') await new Promise(done => setTimeout(done, 1500));
      const metric = url.pathname.split('/').at(-1);
      const field = { sales: 'liquid_sales', releases: 'releases_in_period', stock: 'stock' }[metric];
      const months = Object.fromEntries(Object.entries(recorded[metric]).filter(([month]) => month < '2026-09').map(([month, values]) => [month, [...values]]));
      months['2026-09'] = metric === 'stock' ? observed.septemberStock : metric === 'sales' ? observed.septemberSales : observed.septemberReleases;
      if (negativeSales && metric === 'sales') months['2026-07'][0] = -10000;
      if (metric === 'stock') months['2026-08'] = observed.augustStock;
      if (url.searchParams.get('start_period') === '2021-01-01') {
        const all = [];
        for (let year = 2021; year <= 2026; year++) for (let m = 1; m <= 12; m++) {
          const month = `${year}-${String(m).padStart(2, '0')}`;
          if (month > `2026-${closing}`) continue;
          for (const [i, group] of recorded.groups.entries()) all.push({ period: `${month}-01`, group, building_type: 'Vertical', [field]: months[month]?.[i] ?? (metric === 'stock' ? 1000 + i * 50 : 100 + i * 5 + m), ...(metric === 'releases' ? { vgv_release: (months[month]?.[i] ?? (metric === 'stock' ? 1000 + i * 50 : 100 + i * 5 + m)) * 100000.25 } : metric === 'sales' ? { vgv_liquid_sales: (months[month]?.[i] ?? 100 + i * 5 + m) * 100000.25 } : {}) });
        }
        const p = Number(url.searchParams.get('page')), last = Math.ceil(all.length / 100);
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: all.slice((p - 1) * 100, p * 100), meta: { current_page: p, last_page: last, total: all.length }, links: { next: p < last ? `?page=${p + 1}` : null } }) });
      }

      if (url.searchParams.get('group_by') === 'Tipologia') {
        const start = url.searchParams.get('start_period').slice(0, 7), end = url.searchParams.get('end_period').slice(0, 7);
        const rows = [];
        for (let year = 2025; year <= 2026; year++) for (let m = 1; m <= 12; m++) {
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
        await page.getByText(/Séries de vendas líquidas conferidas desde janeiro/).waitFor();
        await page.getByText(/Tipologias conferidas:/).waitFor();
        await page.getByText(/Oferta histórica conferida desde janeiro/).waitFor();
        await page.getByText(/VGV vendido corrigido pelo INCC-DI/).waitFor();
        await page.getByText(/VGL corrigido pelo INCC-DI para 2026-09/).waitFor();
        for (const slide of [13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,32,33,34,35,36,37,38,39,40,41,42,43,44,46,47,48,50]) {
          await openSlide(slide);
          if (slide === 39) await page.getByText(/Vendas por bairro conferidas por mês/).waitFor();
          await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
          if (slide === 23) await writeFile(resolve(output, 'comparison-dom.json'), JSON.stringify(await page.getByRole('article').evaluate(el => Array.from(el.querySelectorAll('svg text')).slice(0, 4).map(e => ({ text: e.textContent, html: e.outerHTML, box: e.getBoundingClientRect().toJSON(), fill: getComputedStyle(e).fill }))), null, 2));
          assert.doesNotMatch(await page.getByRole('article').innerText(), /Dados em confer\u00eancia|Comparativo em confer\u00eancia|Bairros em confer\u00eancia|Ranking de bairros em confer\u00eancia|Hist\u00f3rico em confer\u00eancia/);
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
  slowNeighborhood = true;
  await page.getByRole('button', { name: 'Conferir dados reais', exact: true }).click();
  await page.getByText(/Oferta histórica conferida desde janeiro/).waitFor();
  const beforeNeighborhood = neighborhoodCalls;
  await openSlide(39);
  await page.getByRole('button', { name: 'Cancelar vendas por bairro', exact: true }).waitFor();
  await page.getByLabel('0:01 decorridos').waitFor();
  assert.equal(neighborhoodCalls, beforeNeighborhood + 1);
  assert.equal(await page.getByRole('dialog', { name: 'Consulta do relatório' }).count(), 0);
  await page.getByRole('button', { name: 'Cancelar vendas por bairro', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, 'neighborhood-loading.png') });
  await page.getByRole('button', { name: 'Cancelar vendas por bairro', exact: true }).click();
  await page.getByText('Vendas por bairro indisponíveis', { exact: true }).waitFor();
  slowNeighborhood = false;
  await page.getByRole('button', { name: 'Conferir vendas por bairro', exact: true }).click();
  await page.getByText(/Vendas por bairro conferidas por mês/).waitFor();
  slowStock = true;
  await page.getByRole('button', { name: 'Conferir dados reais', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar oferta histórica', exact: true }).waitFor();
  await page.getByLabel('0:01 decorridos').waitFor();
  assert.equal(await page.getByRole('dialog', { name: 'Consulta do relatório' }).count(), 0);
  await page.getByRole('button', { name: 'Cancelar oferta histórica', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, 'stock-loading.png') });
  await page.getByRole('button', { name: 'Cancelar oferta histórica', exact: true }).click();
  await page.getByText('Oferta histórica indisponível', { exact: true }).waitFor();
  assert.equal(await page.getByRole('cell', { name: '126.307', exact: true }).count() > 0, true);
  slowStock = false;
  await page.getByRole('button', { name: 'Conferir oferta histórica', exact: true }).click();
  await page.getByText(/Oferta histórica conferida desde janeiro/).waitFor();
  negativeSales = true;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Conferir dados reais', exact: true }).click();
  await page.getByText(/VGV vendido corrigido pelo INCC-DI/).waitFor();
  await page.getByText(/Oferta histórica conferida desde janeiro/).waitFor();
  for (const slide of [39,44,50]) {
    await openSlide(slide);
    if (slide === 39) await page.getByText(/Vendas por bairro conferidas por mês/).waitFor();
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    await page.getByRole('article').screenshot({ path: resolve(output, `negative-${slide}.png`) });
    if (slide === 44) assert.match(await page.getByRole('article').innerText(), /negativas preservadas/);
  }
  negativeSales = false;
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
  const result = { results, errorAndEmptyBlocked: true, granularFailurePreservesMunicipal: true, rootCalls: calls, granularCalls, neighborhoodCalls, neighborhoodOnDemandAndCancel: true, stockSlowCancelAndRetry: true, negativeMonetaryAndNeighborhoodCases: true, pageErrors: errors, realApiCalls: 0, september: 'user-provided-2026-10-29; other months from earlier fixtures, projects synthetic, not a quarterly baseline' };
  await writeFile(resolve(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill();
}
