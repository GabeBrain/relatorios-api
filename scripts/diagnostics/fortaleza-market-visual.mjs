import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Synthetic transport only. Never allow this diagnostic to call a real provider.
const base = 'http://127.0.0.1:5179', routePath = '/rebrain/relatorios-institucionais/fortaleza';
const folder = resolve('.local-inputs/relatorios-lucas/fortaleza/market-ui');
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const cities = ['Fortaleza', 'Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú'];
function months(start, end) {
  const values = [];
  for (let year = Number(start.slice(0, 4)), month = Number(start.slice(5, 7)); `${year}-${String(month).padStart(2, '0')}` <= end.slice(0, 7);) {
    values.push(`${year}-${String(month).padStart(2, '0')}`); month++; if (month > 12) { month = 1; year++; }
  }
  return values;
}
async function scenario({ mode = 'success', slow = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(() => localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-fortaleza-market', email: 'fixture@example.invalid', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, version: 0 })));
  const calls = [], state = { mode, slow };
  await context.route('**/*', async request => {
    const url = new URL(request.request().url());
    if (url.origin === base) return request.continue();
    if (url.pathname === '/public-api/monitored-cities') return request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: cities.map(city => ({ city, state: 'CE' })), links: { next: null } }) });
    if (url.hostname === 'geobrain.com.br' && url.pathname.startsWith('/public-api/')) {
      assert.equal(request.request().method(), 'GET');
      const city = url.searchParams.get('city'), metric = url.pathname.split('/').at(-1);
      calls.push({ city, metric });
      if (state.mode === 'forbidden' || state.mode === 'city-failure' && city === 'Aquiraz' && metric === 'sales') return request.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
      if (metric === 'building-with-history') return request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ city, state: 'CE', building_type: 'Vertical', period: '2026-10-01' }], meta: { total: 20 } }) });
      if (metric === 'building') {
        const type = url.searchParams.get('type');
        const data = [{ building_id: `${city}-${type}`, name: 'Empreendimento sintético', city, state: 'CE', building_type: type, release_date: '2026-06-01', neighborhood: 'Centro', standard: type === 'Horizontal' ? 'Condomínio de Casas' : 'Standard', incorporators: [{ id: 1, name: 'Incorporadora sintética' }] }];
        return request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, meta: { current_page: 1, last_page: 1, total: 1 } }) });
      }
      assert.ok(['releases', 'sales', 'stock'].includes(metric));
      assert.deepEqual(url.searchParams.getAll('type[]'), ['Vertical']);
      assert.equal(url.searchParams.get('uf'), 'CE');
      const periods = months(url.searchParams.get('start_period'), url.searchParams.get('end_period'));
      const data = state.mode === 'empty' ? [] : periods.flatMap((month, index) => ['Econômico', 'Standard'].map((group, groupIndex) => ({ city, state: 'CE', building_type: 'Vertical', period: `${month}-01`, group, [metric === 'releases' ? 'releases_in_period' : metric === 'sales' ? 'liquid_sales' : 'stock']: metric === 'releases' ? groupIndex === 0 ? 10 : 0 : metric === 'sales' ? groupIndex === 0 ? 15 : -1 : groupIndex === 0 ? 100 - index * 5 : 50 + index })));
      if (state.mode === 'missing' && metric === 'sales') data.pop();
      if (state.mode === 'balance' && metric === 'stock') { data.at(-2).stock++; data.at(-1).stock--; }
      if (state.slow && metric === 'sales') await new Promise(resolveDelay => setTimeout(resolveDelay, 1600));
      try { return await request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, meta: { current_page: 1, last_page: 1, total: data.length }, links: { next: null } }) }); } catch { /* cancelled request/context */ }
      return;
    }
    return request.abort();
  });
  const page = await context.newPage();
  await page.goto(base + routePath);
  await page.getByRole('heading', { name: 'Fortaleza / SINDUSCON-CE', exact: true }).waitFor();
  await page.getByText('Conferindo municípios autorizados', { exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('combobox').first().click(); await page.getByRole('option', { name: 'CE', exact: true }).click();
  await page.getByRole('combobox').nth(1).click(); await page.getByRole('option', { name: 'Fortaleza', exact: true }).click();
  assert.equal(calls.length, 0, 'No market query before an explicit action.');
  await page.locator('#fortaleza-periodicity').click(); await page.getByRole('option', { name: 'Trimestral', exact: true }).click();
  await page.locator('#fortaleza-position').click(); await page.getByRole('option', { name: '2º trimestre', exact: true }).click();
  await page.locator('#fortaleza-year').click(); await page.getByRole('option', { name: '2026', exact: true }).click();
  return { context, page, calls, state };
}
async function consult(page) {
  await page.getByRole('button', { name: 'Gerar prévia vertical', exact: true }).click();
  await page.getByRole('region', { name: 'Dados verticais consultados' }).waitFor();
}
async function inspectSlides(page, label) {
  await page.getByRole('tab', { name: 'Slides', exact: true }).click();
  const region = page.getByRole('region', { name: 'Slides implementados Fortaleza', exact: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const dark of [false, true]) {
      await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
      for (let number = 1; number <= 10; number++) {
        await region.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: String(number), exact: true }).click();
        await region.getByRole('img', { name: `Fortaleza \u00b7 slide ${number}`, exact: true }).waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('main').evaluate(main => main.scrollWidth > main.clientWidth), false);
      }
      await region.scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(folder, `slides-${label}-${width}-${dark ? 'dark' : 'light'}.png`) });
    }
  }
}
try {
  const success = await scenario({ slow: true });
  await success.page.getByRole('button', { name: 'Gerar prévia vertical', exact: true }).click();
  await success.page.getByText('Consultando núcleo residencial vertical', { exact: true }).waitFor();
  assert.equal(await success.page.getByRole('region', { name: 'Etapas da prévia vertical' }).locator('li').count(), 4);
  await success.page.screenshot({ path: resolve(folder, 'loading.png') });
  await success.page.getByRole('region', { name: 'Dados verticais consultados' }).waitFor();
  const panel = success.page.getByRole('region', { name: 'Dados verticais consultados' });
  await panel.getByRole('heading', { name: 'Unidades lançadas na janela' }).waitFor();
  assert.equal(success.calls.length, 7);
  assert.equal(await success.page.getByRole('region', { name: 'Etapas da prévia vertical' }).getByText('Concluída', { exact: true }).count(), 4);
  await inspectSlides(success.page, 'quarterly');
  await success.page.getByRole('tab', { name: 'Estrutura', exact: true }).click();
  await success.page.getByRole('region', { name: 'Estrutura preparada', exact: true }).waitFor();
  await panel.getByText('Conferir padrões informados pela API', { exact: true }).click();
  assert.ok((await panel.getByRole('table', { name: 'Balanço vertical por padrão' }).innerText()).includes('-1'));
  for (const width of [1440, 390]) {
    await success.page.setViewportSize({ width, height: 1100 });
    if (width === 390) await success.page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().width < 100);
    for (const dark of [false, true]) {
      await success.page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
      await success.page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))); });
      await panel.scrollIntoViewIfNeeded();
      assert.equal(await success.page.locator('main').evaluate(main => main.scrollWidth > main.clientWidth), false);
      await success.page.screenshot({ path: resolve(folder, `result-${width}-${dark ? 'dark' : 'light'}.png`) });
    }
  }
  await success.page.locator('#fortaleza-periodicity').click(); await success.page.getByRole('option', { name: 'Mensal', exact: true }).click();
  assert.equal(await panel.count(), 0, 'Filter changes invalidate old observations.');
  assert.ok((await success.page.getByLabel('Mês de referência', { exact: true }).innerText()).includes('junho'));
  await success.page.getByLabel('Mês de referência', { exact: true }).click();
  await success.page.getByRole('option', { name: 'julho', exact: true }).click();
  success.state.slow = false;
  await consult(success.page);
  await success.page.getByRole('heading', { name: 'Residencial vertical · 07/2026', exact: true }).waitFor();
  assert.equal(await success.page.getByRole('list', { name: 'Páginas do relatório' }).locator('li').count(), 60);
  await inspectSlides(success.page, 'monthly');
  const completedCalls = success.calls.length;
  await success.page.getByLabel('Ano de referência', { exact: true }).click();
  await success.page.getByRole('option', { name: '2025', exact: true }).click();
  assert.equal(await panel.count(), 0);
  assert.equal(success.calls.length, completedCalls);
  results.push('Consulta explícita curta; carregamento lento Brain; trimestre e negativos; 1440/390 claro/escuro; invalidação por filtro.');
  await success.context.close();

  for (const mode of ['missing', 'empty', 'balance', 'forbidden']) {
    const test = await scenario({ mode }); await consult(test.page);
    const target = test.page.getByRole('region', { name: 'Dados verticais consultados' });
    if (mode === 'balance') { await target.getByText(/balanço\(s\)/).waitFor(); await target.getByText('Conferir padrões informados pela API', { exact: true }).click(); }
    else { assert.equal(await target.getByRole('heading', { name: 'Unidades lançadas na janela' }).count(), 0); await target.getByText(mode === 'empty' ? 'Sem observações para este recorte' : 'Cobertura ainda incompleta', { exact: true }).waitFor(); assert.ok((await test.page.getByRole('region', { name: 'Etapas da prévia vertical' }).locator('li').filter({ hasText: 'Organizar a prévia' }).innerText()).includes('Aguardando')); }
    results.push(`Estado ${mode} preserva valores/cobertura sem fabricar total.`); await test.context.close();
  }
  const recovery = await scenario({ mode: 'city-failure' });
  await recovery.page.locator('#fortaleza-territory').click(); await recovery.page.getByRole('option', { name: 'Fortaleza e RM · 5 municípios', exact: true }).click();
  await consult(recovery.page);
  assert.equal(recovery.calls.filter(call => call.city === 'Fortaleza' && call.metric !== 'building').length, 4);
  recovery.state.mode = 'success'; await recovery.page.getByRole('button', { name: 'Tentar cidades faltantes', exact: true }).click();
  await recovery.page.getByRole('table', { name: 'Balanço consolidado vertical' }).waitFor();
  assert.equal(recovery.calls.filter(call => call.city === 'Fortaleza' && call.metric !== 'building').length, 4);
  assert.equal(recovery.calls.filter(call => call.city === 'Aquiraz' && call.metric !== 'building').length, 7);
  await inspectSlides(recovery.page, 'five-cities');
  results.push('Recuperação de Aquiraz preserva as quatro cidades concluídas e só depois consolida o conjunto.');
  await recovery.context.close();

  const cancelled = await scenario({ slow: true });
  await cancelled.page.getByRole('button', { name: 'Gerar prévia vertical', exact: true }).click();
  await cancelled.page.getByText('Consultando núcleo residencial vertical', { exact: true }).waitFor();
  await cancelled.page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
  await cancelled.page.getByText('Consulta cancelada. Nenhum resultado parcial foi consolidado.', { exact: true }).waitFor();
  assert.equal(await cancelled.page.getByRole('region', { name: 'Dados verticais consultados' }).count(), 0);
  results.push('Cancelamento não publica resultado parcial.'); await cancelled.context.close();
  await writeFile(resolve(folder, 'results.json'), JSON.stringify({ results, externalNetwork: 'blocked', source: 'synthetic fixtures only' }, null, 2));
  console.log(JSON.stringify({ scenarios: results.length, results }, null, 2));
} finally { await browser.close(); }
