import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const folder = '.local-inputs/estimativas-vendas/configuracoes-20261028'; await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true }); const results = []; let page;
try {
 for (const [width, theme] of [[1440, 'light'], [1440, 'dark'], [390, 'light']]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' }); page = await context.newPage(); let calls = 0; const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-only', issuedAt: now, expiresAt: now + 3600000 }, version: 0 }));
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker { postMessage(message, ...rest) { if (message?.kind === 'case') setTimeout(() => super.postMessage(message, ...rest), 400); else super.postMessage(message, ...rest); } };
  });
  await page.route('**/*', route => { const u = new URL(route.request().url()); if (u.hostname === '127.0.0.1') return route.continue();
    if (u.pathname.includes('monitored-cities')) return route.fulfill({ json: { data: [{ city: 'Curitiba', state: 'PR', region: 'Sul' }], links: { next: null } } });
    if (u.pathname.includes('building-with-history-internal')) { calls++; return route.fulfill({ json: { data: u.searchParams.get('type') === 'Horizontal' ? Array.from({ length: 81 }, (_, i) => ({ building_id: String(i + 1), name: `Projeto ${String(i + 1).padStart(3, '0')}`, release_date: '2025-01-01', typologies_history: Array.from({ length: 9 }, (_, j) => ({ period: `2026-${String(j + 1).padStart(2, '0')}`, typology_id: String(i + 1), pattern: i % 2 ? 'Standard' : 'Loteamento Fechado', qty: 300, typology_stock: i % 5 === 0 ? 0 : 150 - j * 2, sold_in_period: 2, building_status: 'Ativo' })) })) : [], meta: { last_page: 1 } } }); } return route.abort();
  });
  await page.goto(process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8087/rebrain/estimativas-vendas'); await page.getByRole('combobox', { name: 'Estados', exact: true }).click(); await page.getByRole('option', { name: 'PR', exact: true }).click(); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.evm-map')?.getAttribute('aria-busy') === 'false');
  await page.evaluate(t => document.documentElement.classList.toggle('dark', t === 'dark'), theme);
  const actions = page.locator('.evs-curve-actions');
  assert.equal(await actions.getByRole('button').count(), 4);
  const download = actions.getByRole('button', { name: 'Baixar estimativas aprovadas', exact: true });
  await download.hover();
  const actionStyle = await download.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, shadow: getComputedStyle(el).boxShadow }));
  assert.equal(actionStyle.background, 'rgba(0, 0, 0, 0)'); assert.equal(actionStyle.shadow, 'none');
  assert.equal(await page.locator('.evx-comparison-tools').count(), 0);
  assert.equal(await page.getByRole('button', { name: /Finotti/ }).count(), 0);
  assert.equal(await page.getByRole('group', { name: 'Duração da previsão' }).count(), 0); assert.equal(await page.getByRole('button', { name: 'Incluir esgotados' }).count(), 0);
  await page.locator('.evx-header').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${folder}/${width}-${theme}-main.png` });
  await page.getByRole('button', { name: 'Abrir configurações', exact: true }).click(); await page.getByRole('button', { name: '6 meses', exact: true }).click();
  await page.screenshot({ path: `${folder}/${width}-${theme}-settings.png` }); await page.getByRole('button', { name: /Outros empreendimentos/ }).click();
  let gallery = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Outros empreendimentos', exact: true }) }); await gallery.waitFor();
  const perPage = width < 700 ? 4 : 12; assert.equal(await gallery.locator('.evs-gallery-grid article').count(), perPage);
  await gallery.getByRole('button', { name: 'Próxima', exact: true }).click(); assert.match(await gallery.getByRole('navigation').innerText(), /Página 2/);
  await page.screenshot({ path: `${folder}/${width}-${theme}-gallery.png` }); assert.equal(await gallery.evaluate(el => el.scrollWidth > el.clientWidth + 2), false); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Abrir configurações', exact: true }).click(); await page.getByRole('button', { name: /Esgotados \(/ }).click();
  await page.getByRole('heading', { name: 'Empreendimentos esgotados', exact: true }).waitFor(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Mostrar cards detalhados', exact: true }).click(); await page.getByRole('button', { name: 'Mostrar cards mini', exact: true }).click();
  const buttons = page.locator('.evm-tile'), original = (await buttons.first().getAttribute('aria-label')).replace('Explorar curva de ', ''), target = (await buttons.nth(2).getAttribute('aria-label')).replace('Explorar curva de ', '');
  await buttons.first().click(); let dialog = page.getByRole('dialog'); await page.waitForFunction(() => document.querySelector('.evx-explorer')?.getAttribute('aria-busy') === 'false');
  await dialog.getByRole('button', { name: 'Próximo empreendimento', exact: true }).click(); await dialog.getByRole('button', { name: 'Próximo empreendimento', exact: true }).click();
  assert.equal(await dialog.getByRole('heading', { name: original, exact: true }).count(), 1, 'previous identity stays with previous values while pending');
  assert.equal(await dialog.locator('.evf-frame-pending').count(), 1);
  await page.screenshot({ path: `${folder}/${width}-${theme}-buffer.png` });
  await dialog.getByRole('heading', { name: target, exact: true }).waitFor(); await page.waitForFunction(() => document.querySelector('.evx-explorer')?.getAttribute('aria-busy') === 'false');
  assert.equal(await dialog.locator('.evf-frame').evaluate(el => el.dataset.displayedId === el.dataset.requestedId), true); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Comparar curvas', exact: true }).click(); await page.getByText('Escolha dois ou mais empreendimentos no mapa.', { exact: true }).waitFor();
  await page.locator('.evm-tile').nth(0).click(); await page.locator('.evm-tile').nth(1).click(); assert.equal(await page.getByRole('button', { name: 'Comparar 2 curvas', exact: true }).isEnabled(), true);
  assert.equal(calls, 2); assert.deepEqual(errors, []); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
  results.push({ width, theme, synthetic: true, calls, errors, galleryPerPage: perPage, rapidNavigationAtomic: true }); await context.close();
 }
 await writeFile(`${folder}/browser-result.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} catch (e) { if (page) { await page.screenshot({ path: `${folder}/failure.png` }).catch(() => {}); await writeFile(`${folder}/failure.txt`, await page.locator('body').innerText().catch(() => '') + String(e)); } console.error(e); process.exitCode = 1; }
finally { await browser.close(); }
