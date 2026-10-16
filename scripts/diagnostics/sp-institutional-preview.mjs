import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Local browser test only: own Vite server, synthetic login/catalog, no market API.
const output = resolve('.local-inputs/relatorios-lucas/sp', `template-review-${Date.now()}`);
await mkdir(output, { recursive: true });
const base = 'http://127.0.0.1:4174';
const server = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
let browser;
let page;
const results = [];
const recorded = JSON.parse(await readFile(resolve('src/features/relatorios-institucionais/sp/__tests__/fixtures/sp-municipal-2026.json'), 'utf8'));
try {
  let listening = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Servidor local não iniciou (porta reservada).');
    try { listening = (await fetch(base)).ok; } catch { /* server startup */ }
    if (listening) break;
    await new Promise(done => setTimeout(done, 250));
  }
  assert.ok(listening, 'Servidor local disponível');
  const channel = process.argv.find(arg => arg.startsWith('--channel='))?.slice('--channel='.length);
  if (channel && !['msedge', 'chrome'].includes(channel)) throw new Error('Canal de navegador inválido.');
  browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let catalogFailure = false;
  let catalogCalls = 0;
  const blockedExternal = [];
  const mockMarketCalls = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/monitored-cities')) {
      catalogCalls++;
      return route.fulfill({ status: catalogFailure ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ data: [{ city: 'São Paulo', state: 'SP' }, { city: 'Campinas', state: 'SP' }, { city: 'Rio de Janeiro', state: 'RJ' }], links: { next: null } }) });
    }
    if (url.pathname.endsWith('/building-with-history')) {
      mockMarketCalls.push({ path: url.pathname, query: Object.fromEntries(url.searchParams) });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [{ city: 'São Paulo', state: 'SP', building_type: 'Vertical', period: recorded.sample.root_period }], meta: { current_page: 1, total: 5183, last_page: 5183 }, links: { next: '?page=2' } }) });
    }
    const metric = url.pathname.split('/').at(-1);
    if (url.pathname.includes('/temporal-analysis-city/') && ['sales', 'releases', 'stock'].includes(metric)) {
      mockMarketCalls.push({ path: url.pathname, query: Object.fromEntries(url.searchParams) });
      // No real 2025 payload supplied: previous-year history is explicitly fictitious QA data.
      if (url.searchParams.get('start_period')?.startsWith('2025')) {
        const field = { sales: 'liquid_sales', releases: 'releases_in_period', stock: 'stock' }[metric];
        const totals = metric === 'stock' ? { '2025-06-01': 100000, '2025-07-01': 100500, '2025-08-01': 101000 } : metric === 'sales' ? { '2025-07-01': 9500, '2025-08-01': 10500 } : { '2025-07-01': 10000, '2025-08-01': 11000 };
        const data = Object.entries(totals).flatMap(([period, total]) => recorded.groups.map((group, index) => ({ period, group, building_type: 'Vertical', [field]: index === recorded.groups.length - 1 ? total - Math.floor(total / recorded.groups.length) * (recorded.groups.length - 1) : Math.floor(total / recorded.groups.length) })));
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data, meta: { current_page: 1, last_page: 1, total: data.length }, links: { next: null } }) });
      }
      const field = { sales: 'liquid_sales', releases: 'releases_in_period', stock: 'stock' }[metric];
      // Typology split is invented for UI QA. Only pattern rows replay recorded observations.
      const byTypology = url.searchParams.get('group_by') === 'Tipologia';
      const rows = Object.entries(recorded[metric]).flatMap(([month, observed]) => {
        const total = observed.reduce((a, b) => a + b, 0);
        const split = [.1, .6, .2].map(ratio => Math.floor(total * ratio));
        split.push(total - split.reduce((a, b) => a + b, 0));
        const values = byTypology ? split : observed;
        return values.map((value, index) => ({ period: `${month}-01`, group: byTypology ? `${index + 1} dormitório${index ? 's' : ''}` : recorded.groups[index], building_type: 'Vertical', [field]: value }));
      }).filter(row => row.period >= url.searchParams.get('start_period') && row.period <= url.searchParams.get('end_period'));
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: rows, meta: { current_page: 1, last_page: 1, total: rows.length }, links: { next: null } }) });
    }
    if (url.origin === base) return route.continue();
    blockedExternal.push(url.origin + url.pathname);
    return route.abort();
  });
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/rebrain/relatorios-institucionais/sp`);
  await page.getByRole('heading', { name: 'SP institucional', exact: true }).waitFor();
  await page.getByText('Faça login no cabeçalho para carregar os municípios monitorados.').waitFor();
  assert.equal(catalogCalls, 0);
  assert.equal(await page.getByRole('button', { name: 'Ver prévia com dados de teste' }).isDisabled(), true);
  results.push({ state: 'sem login', passed: true });
  await context.addInitScript(() => localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'fixture-only-not-a-credential', email: 'fixture@example.invalid', issuedAt: Date.now(), expiresAt: Date.now() + 3_600_000 }, version: 0 })));
  await page.reload();
  await page.getByRole('heading', { name: 'SP institucional', exact: true }).waitFor();
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'SP', exact: true }).click();
  await page.getByText('Selecione o município', { exact: true }).click();
  await page.getByPlaceholder('Buscar município…').fill('São Paulo');
  await page.getByRole('option', { name: 'São Paulo', exact: true }).click();
  await page.getByRole('button', { name: 'Ver prévia com dados de teste' }).click();
  await page.getByText('Trimestre ainda não fechado', { exact: true }).waitFor();
  assert.equal(await page.getByRole('cell', { name: 'Indisponível', exact: true }).count(), 4);
  results.push({ state: '3T bloqueado pelo fechamento de agosto', passed: true });
  await page.getByRole('button', { name: 'Conferir dados reais' }).click();
  await page.getByText('Conferência parcial de dados da API', { exact: true }).waitFor();
  assert.equal(await page.getByRole('cell', { name: '26.824', exact: true }).count(), 1);
  assert.equal(await page.getByRole('cell', { name: 'Indisponível', exact: true }).count(), 1);
  assert.equal(await page.getByRole('cell', { name: 'setembro de 2026', exact: true }).count(), 0);
  assert.equal(mockMarketCalls.length, 4);
  assert.ok(mockMarketCalls.slice(1).every(call => call.query.end_period === '2026-08-31'));
  results.push({ state: 'replay API real recebida: julho/agosto parcial e sem contagem de empreendimentos', passed: true });
  const patterns = page.getByRole('region', { name: 'Conferência dos padrões' });
  await patterns.getByText('Ver padrões recebidos da API', { exact: true }).click();
  assert.equal(await patterns.getByRole('row').count(), 8);
  assert.equal(await patterns.getByRole('cell', { name: 'MCMV', exact: true }).count(), 0);
  assert.equal(await patterns.getByRole('cell', { name: '20.328', exact: true }).count(), 1);
  await patterns.getByText('Ver padrões recebidos da API', { exact: true }).click();
  results.push({ state: 'sete padrões originais, sem MCMV inferido nem requests extras', passed: true });
  const slides = page.getByRole('region', { name: 'Páginas do relatório' });
  for (const [index, title] of ['Capa', 'Empreendimentos', 'Unidades lançadas', 'Vendas líquidas', 'Oferta final'].entries()) {
    await slides.getByRole('button', { name: `${index + 1}. ${title}`, exact: true }).click();
    const article = slides.getByRole('article');
    await article.locator('img').evaluate(image => image.decode());
    await article.screenshot({ path: resolve(output, `slide-${index + 1}.png`), animations: 'disabled' });
    assert.equal(await article.evaluate(element => element.scrollHeight > element.clientHeight + 1), false);
  }
  await slides.getByRole('button', { name: 'Ampliar slides' }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button', { name: '3. Unidades lançadas', exact: true }).click();
  await page.getByRole('dialog').screenshot({ path: resolve(output, 'expanded.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  assert.equal(mockMarketCalls.length, 4, 'Navegar e ampliar slides não consulta o provedor');
  results.push({ state: 'cinco páginas com arte original, escala 16:9 e ampliação sem nova consulta', passed: true });
  await page.getByRole('button', { name: 'Conferir tipologias', exact: true }).click();
  await page.getByText(/Tipologias conferidas:/).waitFor();
  assert.equal(mockMarketCalls.length, 8);
  assert.ok(mockMarketCalls.slice(5).every(call => call.query.group_by === 'Tipologia' && call.query.end_period === '2026-08-31'));
  for (const [index, title] of ['Lançamentos por tipologia', 'Vendas por tipologia', 'Oferta por tipologia'].entries()) {
    await slides.getByRole('button', { name: `${index + 6}. ${title}`, exact: true }).click();
    await slides.getByRole('article').locator('img').evaluate(image => image.decode());
    await slides.getByRole('article').screenshot({ path: resolve(output, `slide-${index + 6}-synthetic-typology.png`), animations: 'disabled' });
  }
  results.push({ state: 'tipologias fictícias: três slides reconciliados em oito requests mockados, não observações reais por dormitório', passed: true });
  for (const [index, title] of ['Lançamentos por segmento', 'Vendas por segmento', 'Oferta por segmento'].entries()) {
    await slides.getByRole('button', { name: `${index + 9}. ${title}`, exact: true }).click();
    await slides.getByRole('img', { name: 'Distribuição por segmento em unidades e participação percentual' }).waitFor();
    for (const group of ['Compactos', 'MCMV', 'Médio Padrão', 'Luxo']) assert.equal(await slides.getByRole('article').getByText(group, { exact: true }).count(), 1);
    await slides.getByRole('article').locator('img').evaluate(image => image.decode());
    await slides.getByRole('article').screenshot({ path: resolve(output, `slide-${index + 9}-confirmed-segment.png`), animations: 'disabled' });
    assert.equal(await slides.getByRole('article').getByRole('img', { name: 'Distribuição por tipologia em unidades e participação percentual' }).count(), 0);
  }
  assert.equal(mockMarketCalls.length, 8);
  results.push({ state: 'três segmentos preenchidos por regra confirmada, somas e grupos preservados sem requests extras', passed: true });
  await page.getByRole('button', { name: 'Conferir históricos', exact: true }).click();
  await page.getByText(/Três comparativos conferidos/).waitFor();
  assert.equal(mockMarketCalls.length, 16);
  const historicalCalls = mockMarketCalls.slice(-8).filter(call => !call.path.endsWith('/building-with-history'));
  assert.equal(historicalCalls.length, 6);
  assert.deepEqual(historicalCalls.filter(call => call.path.endsWith('/stock')).map(call => [call.query.start_period, call.query.end_period]), [['2026-06-01', '2026-08-31'], ['2025-06-01', '2025-08-31']]);
  assert.ok(historicalCalls.every(call => call.query.city === 'São Paulo' && call.query.uf === 'SP' && call.query.group_by === 'Padrão'));
  for (const [index, title] of ['lançamentos', 'vendas', 'oferta'].entries()) {
    await slides.getByRole('button', { name: `${index + 12}. Comparativo de ${title}`, exact: true }).click();
    const graph = `${title[0].toUpperCase()}${title.slice(1)} nos mesmos meses do ano atual e anterior`;
    await slides.getByRole('img', { name: graph }).waitFor();
    const historyLabels = await slides.locator('[data-history-value]').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }; }));
    for (let i = 0; i < historyLabels.length; i++) for (let j = i + 1; j < historyLabels.length; j++) {
      const a = historyLabels[i], b = historyLabels[j];
      assert.equal(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top, false, 'Rótulos históricos não se sobrepõem');
    }
    await slides.getByRole('article').screenshot({ path: resolve(output, `slide-${index + 12}-synthetic-2025.png`), animations: 'disabled' });
  }
  for (const [index, title] of ['Lançamentos por segmento', 'Vendas por segmento', 'Oferta por segmento'].entries()) {
    await slides.getByRole('button', { name: `${index + 9}. ${title}`, exact: true }).click();
    await slides.getByRole('img', { name: 'Comparação por segmento nos mesmos meses dos dois anos' }).waitFor();
    await slides.getByRole('article').screenshot({ path: resolve(output, `slide-${index + 9}-segment-history-synthetic-2025.png`), animations: 'disabled' });
  }
  await slides.getByRole('button', { name: 'Ampliar slides' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '13. Comparativo de vendas', exact: true }).click();
  await page.getByRole('dialog').screenshot({ path: resolve(output, 'batch-expanded-synthetic-2025.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  assert.equal(mockMarketCalls.length, 16);
  results.push({ state: 'três históricos em lote com 2025 fictício, oito requests adicionais mockados, balanços dos dois anos e navegação sem nova rede', passed: true });
  for (const [width, theme] of [[1440, 'light'], [1440, 'dark'], [390, 'light'], [390, 'dark']]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width < 640 && await page.getByRole('button', { name: 'Recolher menu', exact: true }).count()) await page.getByRole('button', { name: 'Recolher menu', exact: true }).click();
    if (width >= 640 && await page.getByRole('button', { name: 'Expandir menu', exact: true }).count()) await page.getByRole('button', { name: 'Expandir menu', exact: true }).click();
    await page.waitForFunction(narrow => Math.abs(document.querySelector('aside').getBoundingClientRect().width - (narrow ? 56 : 256)) < 1, width < 640);
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1 || document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth + 1);
    assert.equal(overflow, false, `${width}/${theme}: sem overflow da página`);
    await page.screenshot({ path: resolve(output, `sp-partial-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
    if (width < 640) {
      await page.locator('main').evaluate(element => { element.scrollTop = element.scrollHeight; });
      await page.screenshot({ path: resolve(output, `sp-partial-${width}-${theme}-indicators.png`), fullPage: true, animations: 'disabled' });
      await page.locator('main').evaluate(element => { element.scrollTop = 0; });
    }
    results.push({ state: 'replay municipal parcial, respostas registradas', width, theme, passed: true });
  }
  await page.getByLabel('Trimestre do estudo').focus();
  assert.equal(await page.getByLabel('Trimestre do estudo').evaluate(element => document.activeElement === element), true);
  await page.getByLabel('Trimestre do estudo').press('Enter');
  await page.getByRole('option', { name: '2T2026', exact: true }).press('Enter');
  assert.equal(await page.getByRole('region', { name: 'Prévia do estudo' }).count(), 0);
  await page.getByRole('button', { name: 'Ver prévia com dados de teste' }).click();
  await page.getByText('Prévia reconciliada com dados de teste', { exact: true }).waitFor();
  results.push({ state: 'alternância real/exemplo e trimestre invalida o resultado anterior', passed: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('section[aria-label="Seleção do estudo"]').getByText('São Paulo', { exact: true }).click();
  await page.getByPlaceholder('Buscar município…').fill('Campinas');
  await page.getByRole('option', { name: 'Campinas', exact: true }).click();
  assert.equal(await page.getByRole('region', { name: 'Prévia do estudo' }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Ver prévia com dados de teste' }).isDisabled(), true);
  results.push({ state: 'troca de município invalida prévia e bloqueia outra cidade', passed: true });
  catalogFailure = true;
  await page.reload();
  await page.getByText('Não foi possível carregar as cidades autorizadas', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Ver prévia com dados de teste' }).isDisabled(), true);
  results.push({ state: 'catálogo indisponível, sem fallback', passed: true });
  assert.deepEqual(errors, []);
  assert.equal(blockedExternal.some(url => /temporal-analysis|building-with-history/.test(url)), false);
  await writeFile(resolve(output, 'ui-results.json'), JSON.stringify({ results, catalogCalls, marketCalls: 0, mockMarketCalls, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ results, catalogCalls, marketCalls: 0, mockMarketCallCount: mockMarketCalls.length, pageErrors: errors }, null, 2));
} catch (error) {
  if (page) {
    await writeFile(resolve(output, 'ui-failure.txt'), await page.locator('body').innerText());
    await page.screenshot({ path: resolve(output, 'ui-failure.png'), fullPage: true });
  }
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
