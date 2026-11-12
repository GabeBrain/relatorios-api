import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const folder = '.local-inputs/estimativas-vendas/mosaico-20261028'; await mkdir(folder, { recursive: true });
const base = process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8087/rebrain/estimativas-vendas';
const browser = await chromium.launch({ headless: true }), results = []; let activePage;
try {
 for (const [count, width, theme] of [[146, 1440, 'light'], [478, 1440, 'dark'], [501, 390, 'light'], [146, 768, 'dark']]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); activePage = page; let calls = 0; const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-only', issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); });
  await page.route('**/*', route => { const url = new URL(route.request().url()); if (url.hostname === '127.0.0.1') return route.continue();
   if (url.pathname.includes('monitored-cities')) return route.fulfill({ json: { data: [{ city: 'Curitiba', state: 'PR', region: 'Sul' }], links: { next: null } } });
   if (url.pathname.includes('building-with-history-internal')) { calls++; return route.fulfill({ json: { data: url.searchParams.get('type') === 'Horizontal' ? Array.from({ length: count }, (_, i) => ({ building_id: String(i + 1), name: `Sintético ${String(i + 1).padStart(3, '0')}`, release_date: '2025-01-01', typologies_history: Array.from({ length: 9 }, (_, j) => ({ period: `2026-${String(j + 1).padStart(2, '0')}`, typology_id: String(i + 1), pattern: i % 7 === 0 ? 'Standard' : 'Loteamento Fechado', qty: 300, typology_stock: 100 + i % 150 - j * 2, sold_in_period: 2, building_status: 'Ativo' })) })) : [], meta: { last_page: 1 } } }); }
   return route.abort();
  });
  await page.goto(base); await page.getByRole('combobox', { name: 'Estados', exact: true }).click(); await page.getByRole('option', { name: 'PR', exact: true }).click(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).click(); const started = Date.now();
  const map = page.getByRole('region', { name: 'Mapa de curvas', exact: true }); await map.waitFor({ timeout: 90000 });
  assert.equal(await page.locator('main.evx-page > details').count(), 0, 'ações e filtros sem expanders');
  assert.equal(await page.getByRole('group', { name: 'Tipo de empreendimento', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Ordenar por vendas previstas', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('.evm-map')?.getAttribute('aria-busy') === 'false', { timeout: 90000 });
  const elapsedMs = Date.now() - started;
  const finotti = count - Math.ceil(count / 7); assert.equal(await page.locator('.evm-tile').count(), Math.min(500, finotti));
  await page.evaluate(t => document.documentElement.classList.toggle('dark', t === 'dark'), theme);
  await page.locator('.evx-header').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${folder}/${count}-${width}-${theme}-controls.png` });
  await page.getByRole('button', { name: 'Comparar curvas', exact: true }).click();
  const first = page.locator('.evm-tile').first(); await first.click(); assert.equal(await first.getAttribute('aria-pressed'), 'true');
  await page.locator('.evm-card').first().getByRole('button', { name: /Explorar curva de/ }).click();
  await page.getByRole('dialog').getByRole('img', { name: 'Histórico, previsão e dados posteriores' }).waitFor();
  await page.keyboard.press('Escape'); assert.equal(await first.getAttribute('aria-pressed'), 'true', 'explorar dentro do card não altera seleção');
  await page.getByRole('button', { name: 'Mostrar cards detalhados', exact: true }).click(); assert.equal(await page.locator('.evm-tile').count(), Math.min(60, finotti));
  assert.equal(await page.locator('.evm-tile').first().getAttribute('aria-pressed'), 'true');
  await map.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${folder}/${count}-${width}-${theme}-detail.png`, fullPage: true });
  await page.getByRole('button', { name: 'Mostrar cards mini', exact: true }).click(); await page.getByRole('button', { name: 'Abrir configura\u00e7\u00f5es', exact: true }).click(); await page.getByRole('button', { name: 'Mostrar todos', exact: true }).click(); await page.getByRole('button', { name: 'Voltar \u00e0s curvas', exact: true }).click();
  assert.equal(await page.locator('.evm-tile').count(), Math.min(500, count));
  if (count > 500) { await page.getByRole('button', { name: 'Próxima página do mapa', exact: true }).click(); assert.equal(await page.locator('.evm-tile').count(), 1); await page.getByRole('button', { name: 'Página anterior do mapa', exact: true }).click(); }
  await page.getByRole('button', { name: 'Ordenar por vendas previstas', exact: true }).click();
  assert.equal(await page.locator('.evm-card').first().getAttribute('class').then(s => s.includes('evm-unavailable')), false);
  await page.getByRole('button', { name: 'Marcar estimativas aprovadas', exact: true }).click();
  assert.equal(await page.locator('.evm-unavailable').count(), 0); assert.equal(await page.locator('.evm-tile[aria-pressed=true]').count(), Math.min(500, finotti));
  await page.getByRole('button', { name: 'Abrir configura\u00e7\u00f5es', exact: true }).click(); await page.getByRole('button', { name: 'Lista de curvas', exact: true }).click(); await page.getByRole('button', { name: 'Voltar \u00e0s curvas', exact: true }).click(); assert.equal(await page.locator('.evx-open-row[aria-pressed=true]').count(), Math.min(15, finotti));
  await page.getByRole('button', { name: 'Abrir configura\u00e7\u00f5es', exact: true }).click(); await page.getByRole('button', { name: 'Mapa de curvas', exact: true }).click(); await page.getByRole('button', { name: 'Voltar \u00e0s curvas', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.evm-map')?.getAttribute('aria-busy') === 'false');
  assert.equal(calls, 2); assert.deepEqual(errors, []); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
  await page.locator('.evm-map').screenshot({ path: `${folder}/${count}-${width}-${theme}-map.png` });
  results.push({ synthetic: true, count, width, theme, elapsedMs, calls, errors, overflow: false }); await context.close();
 }
 await writeFile(`${folder}/browser-result.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} catch (e) { if (activePage) { await activePage.screenshot({ path: `${folder}/failure.png`, fullPage: true }).catch(() => {}); await writeFile(`${folder}/failure.txt`, await activePage.locator('body').innerText().catch(() => '') + String(e)); } console.error(e); process.exitCode = 1; }
finally { await browser.close(); }
