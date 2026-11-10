import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:5179';
const folder = resolve('.local-inputs/relatorios-lucas/fortaleza/monthly-visual');
await mkdir(folder, { recursive: true });
const cities = ['Fortaleza', 'Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú'];
const standards = ['Econômico', 'Compacto', 'Standard', 'Médio', 'Médio-Alto', 'Alto', 'Luxo'];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const orderOnly = process.argv.includes('--order-only');
try {
  for (const width of orderOnly ? [1440] : [1440, 390]) for (const dark of orderOnly ? [false] : [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(({ dark }) => {
      localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-fortaleza-monthly', email: 'fixture@example.invalid', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, version: 0 }));
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, { dark });
    const calls = []; let mode = 'success';
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === base) return route.continue();
      const reply = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
      if (url.pathname === '/public-api/monitored-cities') return reply({ data: cities.map(city => ({ city, state: 'CE' })), links: { next: null } });
      if (url.hostname !== 'geobrain.com.br') return route.abort();
      const city = url.searchParams.get('city'), metric = url.pathname.split('/').at(-1);
      calls.push({ city, metric });
      if (metric === 'building-with-history') return reply({ data: [{ city, state: 'CE', building_type: 'Vertical' }], meta: { total: 1 } });
      if (metric === 'building') {
        const type = url.searchParams.get('type');
        return reply({ data: [{ building_id: `${city}-${type}`, city, state: 'CE', building_type: type, release_date: '2026-07-01', name: 'Empreendimento sintético', standard: type === 'Horizontal' ? 'Condomínio de Casas' : 'Econômico', neighborhood: 'Centro' }], meta: { total: 1, last_page: 1, current_page: 1 } });
      }
      assert.ok(['releases', 'sales', 'stock'].includes(metric));
      const start = url.searchParams.get('start_period'), end = url.searchParams.get('end_period'), months = [];
      for (let date = new Date(`${start.slice(0, 7)}-01T00:00:00Z`); date.toISOString().slice(0, 7) <= end.slice(0, 7); date.setUTCMonth(date.getUTCMonth() + 1)) months.push(date.toISOString().slice(0, 7));
      const historical = months.length === 25;
      let data = mode === 'empty' && historical ? [] : months.flatMap((month, index) => standards.map((group, groupIndex) => ({ city, state: 'CE', building_type: 'Vertical', period: `${month}-01`, group, [metric === 'releases' ? 'releases_in_period' : metric === 'sales' ? 'liquid_sales' : 'stock']: metric === 'stock' ? 100 : groupIndex === 0 ? 10 + index : 2 })));
      if (mode === 'missing' && historical) data.pop();
      if (mode === 'slow' && historical) await new Promise(done => setTimeout(done, 1200));
      const page = Number(url.searchParams.get('page') || 1), total = data.length, last = Math.max(1, Math.ceil(total / 100));
      data = data.slice((page - 1) * 100, page * 100);
      try { return await reply({ data, meta: { total, last_page: last, current_page: page }, links: { next: page === last ? null : 'https://provider.invalid/next' } }); } catch { /* Cancelled page. */ }
    });
    const page = await context.newPage();
    await page.goto(`${base}/rebrain/relatorios-institucionais/fortaleza`);
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    assert.match(await page.locator('#fortaleza-periodicity').innerText(), /Mensal/);
    await page.getByRole('heading', { name: 'Fortaleza / SINDUSCON-CE', exact: true }).waitFor();
    await page.getByRole('combobox').first().click(); await page.getByRole('option', { name: 'CE', exact: true }).click();
    // GeoApiScopeSelector uses a municipality combobox with search.
    const cityControl = page.getByRole('combobox').nth(1);
    await cityControl.click(); await page.getByRole('option', { name: 'Fortaleza', exact: true }).click();
    await page.locator('#fortaleza-position').click(); await page.getByRole('option', { name: 'julho', exact: true }).click();
    await page.locator('#fortaleza-year').click(); await page.getByRole('option', { name: '2026', exact: true }).click();
    await page.locator('#fortaleza-territory').click(); await page.getByRole('option', { name: 'Fortaleza e RM · 5 municípios', exact: true }).click();
    mode = orderOnly ? 'success' : 'slow'; await page.getByRole('button', { name: 'Gerar prévia vertical', exact: true }).click();
    if (!orderOnly) {
      await page.getByText(/lançamentos verticais 2024-07 a 2026-07/).first().waitFor();
      await page.screenshot({ path: resolve(folder, `loading-${width}-${dark}.png`) });
    }
    await page.getByRole('button', { name: 'Gerar prévia vertical', exact: true }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('button') || ![...document.querySelectorAll('button')].find(button => button.textContent === 'Gerar prévia vertical')?.disabled);
    mode = 'success';
    const count = calls.length;
    for (const number of [11,13,15]) {
      await page.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: String(number), exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      const slide = page.getByRole('img', { name: `Fortaleza · slide ${number}`, exact: true });
      assert.equal(await slide.getByLabel('Histórico de lançamentos pendente').count(), 0);
      await slide.screenshot({ path: resolve(folder, `slide-${number}-${width}-${dark}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    }
    assert.equal(calls.length, count, 'Slide navigation must not issue queries.');
    await page.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: '11', exact: true }).click();
    for (const number of [12,13,14,15]) {
      await page.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: 'Próximo', exact: true }).click();
      await page.getByRole('img', { name: `Fortaleza · slide ${number}`, exact: true }).waitFor();
      if (number === 12 || number === 14) {
        await page.getByLabel('Slide em preparação').waitFor();
        await page.getByRole('img', { name: `Fortaleza · slide ${number}`, exact: true }).screenshot({ path: resolve(folder, `pending-${number}-${width}-${dark}.png`) });
      }
    }
    assert.equal(calls.length, count, 'Official sequence must not issue queries.');
    if (!orderOnly && width === 1440 && !dark) {
      for (const scenario of ['missing','empty']) {
        mode = scenario; await page.getByRole('button', { name: 'Gerar prévia vertical', exact: true }).click();
        await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(button => button.textContent === 'Gerar prévia vertical')?.disabled);
        await page.getByRole('navigation', { name: 'Slides implementados', exact: true }).getByRole('button', { name: '13', exact: true }).click();
        await page.getByLabel('Histórico de lançamentos pendente').waitFor();
      }
      mode = 'slow'; await page.getByRole('button', { name: 'Gerar prévia vertical', exact: true }).click();
      await page.getByText(/lançamentos verticais 2024-07 a 2026-07/).first().waitFor();
      await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
      await page.getByText('Prévia cancelada', { exact: true }).waitFor();
    }
    results.push({ width, dark, calls: calls.length, slides: [11,13,15], officialSequence: [11,12,13,14,15], offline: true });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(folder, orderOnly ? 'order-results.json' : 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
