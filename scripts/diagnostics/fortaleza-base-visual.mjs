import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Offline UI check. Start Vite locally first; every external request is intercepted.
const base = 'http://127.0.0.1:5179';
const routePath = '/rebrain/relatorios-institucionais/fortaleza';
const folder = resolve('.local-inputs/relatorios-lucas/fortaleza/ui');
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const cities = ['Fortaleza', 'Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú'];
const results = [], forbiddenMarketRequests = [];
async function scenario({ token = true, mode = 'success', available = cities, delay = 0 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(({ token }) => {
    if (token) localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-offline-fortaleza', email: 'fixture@example.invalid', issuedAt: Date.now(), expiresAt: Date.now() + 3600000 }, version: 0 }));
  }, { token });
  let state = mode;
  await context.route('**/*', async request => {
    const url = new URL(request.request().url());
    if (url.origin === base) return request.continue();
    if (url.pathname === '/public-api/monitored-cities') {
      if (delay) await new Promise(resolveDelay => setTimeout(resolveDelay, delay));
      if (state === 'error') return request.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
      return request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: available.map(city => ({ city, state: 'CE', region: 'Nordeste' })), links: { next: null } }) });
    }
    if (url.hostname.endsWith('geobrain.com.br')) forbiddenMarketRequests.push(url.pathname);
    return request.abort();
  });
  const page = await context.newPage();
  await page.goto(base + routePath);
  await page.getByRole('heading', { name: 'Fortaleza / SINDUSCON-CE', exact: true }).waitFor();
  return { context, page, recover: () => { state = 'success'; } };
}
async function chooseCity(page) {
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'CE', exact: true }).click();
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Fortaleza', exact: true }).click();
}
async function choose(page, id, name) {
  await page.locator(`#${id}`).click();
  await page.getByRole('option', { name, exact: true }).click();
}
try {
  const anonymous = await scenario({ token: false });
  await anonymous.page.getByText('Faça login no cabeçalho para carregar os municípios monitorados.').waitFor();
  assert.equal(await anonymous.page.getByRole('button', { name: 'Preparar estrutura', exact: true }).isDisabled(), true);
  assert.equal(await anonymous.page.locator(`aside a[href="${routePath}"]`).count(), 0);
  results.push('sem login bloqueia preparação; rota ausente no menu');
  await anonymous.context.close();

  const loaded = await scenario({ delay: 1800 });
  await loaded.page.getByText('Conferindo municípios autorizados', { exact: true }).waitFor();
  await loaded.page.screenshot({ path: resolve(folder, 'loading-desktop.png') });
  await loaded.page.getByText('Conferindo municípios autorizados', { exact: true }).waitFor({ state: 'hidden' });
  await chooseCity(loaded.page);
  await loaded.page.getByRole('button', { name: 'Preparar estrutura', exact: true }).click();
  await loaded.page.getByRole('region', { name: 'Estrutura preparada', exact: true }).waitFor();
  assert.equal(await loaded.page.getByRole('list', { name: 'Páginas do relatório' }).locator('li').count(), 89);
  results.push('catálogo lento com identidade Brain; trimestre prepara 89 páginas sem API de mercado');
  for (const width of [1440, 390]) {
    await loaded.page.setViewportSize({ width, height: 1100 });
    if (width === 390) await loaded.page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().width < 100);
    for (const dark of [false, true]) {
      await loaded.page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
      await loaded.page.evaluate(async () => {
        await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
        await new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
      });
      const overflow = await loaded.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `Overflow em ${width}/${dark}`);
      assert.equal(await loaded.page.locator('main').evaluate(main => main.scrollWidth > main.clientWidth), false, `Overflow do conteúdo em ${width}/${dark}`);
      await loaded.page.screenshot({ path: resolve(folder, `structure-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: false });
    }
  }
  await choose(loaded.page, 'fortaleza-periodicity', 'Mensal');
  await loaded.page.getByRole('region', { name: 'Estrutura preparada', exact: true }).waitFor({ state: 'hidden' });
  await loaded.page.getByRole('button', { name: 'Preparar estrutura', exact: true }).click();
  await loaded.page.getByRole('region', { name: 'Estrutura preparada', exact: true }).waitFor();
  assert.equal(await loaded.page.getByRole('list', { name: 'Páginas do relatório' }).locator('li').count(), 60);
  results.push('trocar periodicidade invalida resultado; mensal prepara 60 páginas');
  await loaded.page.setViewportSize({ width: 1440, height: 1100 });
  await loaded.page.getByRole('tab', { name: 'Referências', exact: true }).click();
  assert.equal(await loaded.page.getByRole('link', { name: 'Abrir material de referência' }).count(), 2);
  await loaded.page.screenshot({ path: resolve(folder, 'references.png') });
  await loaded.page.goto(base + '/inicio');
  await loaded.page.getByRole('heading', { name: /Bom|Olá|Início|trabalho|Rebrain|fazer|Ferramentas/i }).first().waitFor().catch(() => {});
  assert.equal(await loaded.page.locator(`a[href="${routePath}"]`).count(), 0);
  results.push('referências acessíveis; painel inicial sem link Fortaleza');
  await loaded.context.close();

  const failing = await scenario({ mode: 'error' });
  await failing.page.getByText('Cidades indisponíveis', { exact: true }).waitFor();
  assert.equal(await failing.page.getByRole('button', { name: 'Preparar estrutura', exact: true }).isDisabled(), true);
  failing.recover();
  await failing.page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await failing.page.getByText('Cidades indisponíveis', { exact: true }).waitFor({ state: 'hidden' });
  await chooseCity(failing.page);
  assert.equal(await failing.page.getByRole('button', { name: 'Preparar estrutura', exact: true }).isEnabled(), true);
  results.push('erro 403 bloqueia e recuperação explícita funciona');
  await failing.context.close();

  const empty = await scenario({ available: [] });
  await empty.page.getByText('Nenhum município monitorado disponível para este acesso.').waitFor();
  assert.equal(await empty.page.getByRole('button', { name: 'Preparar estrutura', exact: true }).isDisabled(), true);
  results.push('catálogo vazio sem fallback');
  await empty.context.close();

  const incomplete = await scenario({ available: ['Fortaleza'] });
  await incomplete.page.getByText('Conferindo municípios autorizados', { exact: true }).waitFor({ state: 'hidden' });
  await chooseCity(incomplete.page);
  await choose(incomplete.page, 'fortaleza-territory', 'Fortaleza e RM · 5 municípios');
  await incomplete.page.getByText(/O conjunto exige acesso aos cinco municípios/).waitFor();
  assert.equal(await incomplete.page.getByRole('button', { name: 'Preparar estrutura', exact: true }).isDisabled(), true);
  results.push('conjunto incompleto não vira recorte parcial');
  await incomplete.context.close();
  assert.deepEqual(forbiddenMarketRequests, []);
  await writeFile(resolve(folder, 'results.json'), JSON.stringify({ results, marketRequests: 0, externalNetwork: 'blocked' }, null, 2));
  console.log(JSON.stringify({ results, marketRequests: 0 }, null, 2));
} finally { await browser.close(); }
