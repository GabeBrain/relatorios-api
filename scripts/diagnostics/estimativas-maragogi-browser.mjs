// Local replay of a read-only API snapshot. No live token in this browser run.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const folder = '.local-inputs/estimativas-vendas/maragogi-historico-20261028'; await mkdir(folder, { recursive: true });
const buildings = JSON.parse(await readFile(`${folder}/snapshot.json`, 'utf8'));
const browser = await chromium.launch({ headless: true }); let page;
const results = [];
try {
 for (const width of [1440, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' }); page = await context.newPage(); const errors = []; let calls = 0;
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'local-replay', issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); });
  await page.route('**/*', route => { const u = new URL(route.request().url()); if (u.hostname === '127.0.0.1') return route.continue();
   if (u.pathname.includes('monitored-cities')) return route.fulfill({ json: { data: [{ city: 'Maragogi', state: 'AL', region: 'Nordeste' }], links: { next: null } } });
   if (u.pathname.includes('building-with-history-internal')) { calls++; return route.fulfill({ json: { data: buildings.filter(b => b.sourceType === u.searchParams.get('type')), meta: { last_page: 1 } } }); } return route.abort();
  });
  await page.goto(process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8087/rebrain/estimativas-vendas');
  await page.getByRole('combobox', { name: 'Estados', exact: true }).click(); await page.getByRole('option', { name: 'AL', exact: true }).click(); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.evm-map')?.getAttribute('aria-busy') === 'false', { timeout: 90000 });
  await page.getByRole('button', { name: 'Ordenar por vendas previstas', exact: true }).click();
  const names = await page.locator('.evm-tile').evaluateAll(els => els.map(el => el.getAttribute('aria-label').replace('Explorar curva de ', '')));
  await page.locator('.evm-tile').first().click(); let dialog = page.getByRole('dialog');
  await dialog.getByRole('img', { name: 'Histórico, previsão e dados posteriores' }).waitFor();
  await dialog.getByRole('button', { name: 'Próximo empreendimento', exact: true }).click();
  await page.getByRole('dialog').getByRole('heading', { name: names[1], exact: true }).waitFor(); await page.keyboard.press('Escape');
  assert.equal(await page.locator('.evx-selection').count(), 0); assert.equal(await page.locator('.evm-tile[aria-pressed]').count(), 0);
  await page.getByPlaceholder('Nome ou ID').fill('75803'); await page.getByRole('button', { name: 'Explorar curva de Max Tulum - Bloco B', exact: true }).click(); dialog = page.getByRole('dialog');
  await dialog.getByText('13 registros válidos · origem de coleta não confirmada', { exact: true }).waitFor();
  await dialog.getByRole('img', { name: 'Histórico, previsão e dados posteriores' }).waitFor();
  await dialog.locator('.recharts-line-dots .recharts-dot').first().waitFor();
  assert.equal(await dialog.locator('details').count(), 0); assert.equal(await dialog.getByRole('combobox', { name: 'Começar a previsão' }).count(), 0);
  const dots = await dialog.locator('.recharts-line-dots .recharts-dot').count(); assert.ok(dots >= 13, `13 historical records must remain visible, got ${dots}`);
  const overflow = await dialog.evaluate(el => ({ horizontal: el.scrollWidth > el.clientWidth + 2, vertical: el.scrollHeight > el.clientHeight + 2 })); assert.equal(overflow.horizontal, false); if (width === 1440) assert.equal(overflow.vertical, false);
  await page.screenshot({ path: `${folder}/${width}-max-tulum.png` });
  await dialog.getByRole('button', { name: 'Backtest', exact: true }).click(); await dialog.getByRole('button', { name: 'Período anterior', exact: true }).click(); await dialog.getByRole('region', { name: 'Resumo do backtest' }).waitFor();
  await page.keyboard.press('Escape'); await page.getByPlaceholder('Nome ou ID').fill(''); await page.getByRole('button', { name: 'Comparar curvas', exact: true }).click();
  await page.locator('.evm-tile').nth(0).click(); assert.equal(await page.getByRole('button', { name: /^Comparar \d+ curvas$/ }).isEnabled(), false);
  await page.locator('.evm-tile').nth(1).click(); assert.equal(await page.getByRole('button', { name: /^Comparar \d+ curvas$/ }).isEnabled(), true);
  assert.match(await page.getByRole('button', { name: /^Comparar \d+ curvas$/ }).getAttribute('class'), /evx-compare-ready/);
  await page.getByRole('button', { name: /^Comparar \d+ curvas$/ }).click(); await page.getByRole('dialog').getByRole('img', { name: 'Comparação de curvas' }).waitFor();
  assert.deepEqual(errors, []); assert.equal(calls, 2); results.push({ width, source: 'authenticated snapshot replay', buildings: buildings.length, historicalDots: dots, overflow, errors, calls }); await context.close();
 }
 await writeFile(`${folder}/browser-result.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} catch (e) { if (page) { await page.screenshot({ path: `${folder}/failure.png` }).catch(() => {}); await writeFile(`${folder}/failure.txt`, await page.locator('body').innerText().catch(() => '') + String(e)); } console.error(e); process.exitCode = 1; }
finally { await browser.close(); }
