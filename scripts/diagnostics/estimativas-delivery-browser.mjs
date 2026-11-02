import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import assert from 'node:assert/strict';

const folder = '.local-inputs/estimativas-vendas/fluxo-entrega-20261102'; await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true }); const results = []; let page;
const url = process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8091/rebrain/estimativas-vendas';
const buildings = Array.from({ length: 8 }, (_, i) => ({ building_id: String(i + 1), name: `Projeto ${i + 1}`, release_date: '2025-01-01', typologies_history: Array.from({ length: i % 2 ? 9 : 12 }, (_, j) => ({ period: `2026-${String(j + 1).padStart(2, '0')}`, typology_id: String(i + 1), pattern: i === 6 ? 'Outro' : 'Loteamento Fechado', qty: 300, typology_stock: i === 7 ? 0 : 150 - j * 2, sold_in_period: 2, building_status: 'Ativo' })) }));
async function choose(label, option) { await page.locator('label').filter({ has: page.locator('span', { hasText: label }) }).getByRole('combobox').click(); await page.getByRole('option', { name: option, exact: true }).click(); }
async function load() { await page.getByRole('combobox', { name: 'Estados', exact: true }).click(); await page.getByRole('option', { name: 'PR', exact: true }).click(); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).click(); }
async function ready() { await page.locator('.evd-delivery .eve-preview').waitFor({ timeout: 90000 }); await page.waitForFunction(() => Array.from(document.querySelectorAll('.evd-delivery button')).some(b => b.textContent === 'Baixar previsões em Excel' && !b.disabled)); }
async function download(path) { const waiting = page.waitForEvent('download'); await page.locator('.evd-delivery').getByRole('button', { name: 'Baixar previsões em Excel', exact: true }).click(); await (await waiting).saveAs(path); return XLSX.read(await readFile(path), { type: 'array' }); }
try {
  for (const [width, theme] of [[1440, 'light'], [1440, 'dark'], [768, 'light'], [768, 'dark'], [390, 'light'], [390, 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce', hasTouch: width === 390 }); page = await context.newPage(); const errors = []; let calls = 0; let failNext = false;
    page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(() => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-only', issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); });
    await page.route('**/*', async route => {
      const u = new URL(route.request().url()); if (u.hostname === '127.0.0.1') return route.continue();
      if (u.pathname.includes('monitored-cities')) return route.fulfill({ json: { data: [{ city: 'Curitiba', state: 'PR', region: 'Sul' }], links: { next: null } } });
      if (u.pathname.includes('building-with-history-internal')) { calls++; await new Promise(resolve => setTimeout(resolve, 350)); if (failNext) { failNext = false; return route.fulfill({ status: 422, json: { message: 'Falha controlada de atualização' } }); } return route.fulfill({ json: { data: u.searchParams.get('type') === 'Horizontal' ? buildings : [], meta: { last_page: 1 } } }); }
      return route.abort();
    });
    await page.goto(url); await page.evaluate(t => document.documentElement.classList.toggle('dark', t === 'dark'), theme);
    const started = Date.now(); await load(); await page.getByText('Carregando empreendimentos', { exact: true }).waitFor(); await ready(); const firstPreviewMs = Date.now() - started;
    assert.equal(await page.locator('.evm-map').count(), 0); assert.equal(await page.locator('.evd-delivery tbody tr').count(), 50); assert.equal(calls, 2);
    await page.getByRole('button', { name: 'Sem referência (1)', exact: true }).click(); await page.getByRole('dialog').getByText('Projeto 7', { exact: true }).waitFor(); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Esgotados (1)', exact: true }).click(); await page.getByRole('dialog').getByText('Projeto 8', { exact: true }).waitFor(); await page.keyboard.press('Escape');
    const handle = page.getByRole('button', { name: 'Mover coluna mes', exact: true }); await handle.focus(); for (let i = 0; i < 5; i++) await page.keyboard.press('Alt+ArrowLeft');
    await page.getByRole('button', { name: 'Opções da coluna cidade', exact: true }).click(); await page.getByRole('menuitem', { name: 'Ocultar coluna', exact: true }).click();
    const columns = await page.locator('.evd-delivery thead th[data-column]').evaluateAll(els => els.map(el => el.dataset.column));
    const preview = await page.locator('.evd-delivery tbody tr').evaluateAll(rows => rows.map(row => Array.from(row.querySelectorAll('td')).map(td => td.textContent)));
    const workbook = await download(`${folder}/${width}-${theme}.xlsx`), data = XLSX.utils.sheet_to_json(workbook.Sheets.previsoes, { header: 1, defval: null });
    assert.equal(data.length, 73); assert.deepEqual(data[0], columns); assert.deepEqual(data.slice(1, 51).map(row => row.map(v => v === null ? '' : String(v))), preview);
    assert.ok(data.slice(1).every(row => row[columns.indexOf('metodo')] === 'finotti-reference' && row[columns.indexOf('importavel')] === false));
    await choose('Prever por', '3 meses'); await ready(); assert.equal(await page.locator('.evd-delivery tbody tr').count(), 18); assert.equal(await page.getByRole('button', { name: 'Mostrar coluna cidade', exact: true }).count(), 1);
    await choose('Tipo', 'Vertical'); await page.getByText('Nenhum empreendimento com referência calculável corresponde aos filtros.', { exact: false }).waitFor(); assert.equal(await page.locator('.evd-delivery').getByRole('button', { name: 'Baixar previsões em Excel', exact: true }).isEnabled(), false);
    await choose('Tipo', 'Todos os tipos'); await ready();
    await page.getByPlaceholder('Nome ou ID', { exact: true }).fill('Projeto 2'); await ready(); assert.equal(await page.locator('.evd-delivery tbody tr').count(), 3);
    await page.getByRole('button', { name: 'Limpar busca', exact: true }).click(); await ready();
    await page.getByRole('button', { name: 'Análise detalhada', exact: true }).click(); await page.waitForFunction(() => document.querySelector('.evm-map')?.getAttribute('aria-busy') === 'false');
    await page.getByRole('button', { name: 'Comparar curvas', exact: true }).click(); await page.getByRole('button', { name: 'Selecionar Projeto 1', exact: true }).click(); await page.getByRole('button', { name: 'Selecionar Projeto 2', exact: true }).click(); await page.getByRole('button', { name: 'Comparar 2 curvas', exact: true }).click();
    await page.getByRole('dialog').waitFor(); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Explorar curva de Projeto 1', exact: true }).click(); const detail = page.getByRole('dialog'); await detail.getByRole('button', { name: 'Backtest', exact: true }).click();
    await detail.locator('button[role="combobox"]').first().click(); await page.getByRole('option', { name: '2026-09', exact: true }).click();
    await detail.locator('.evf-frame-pending').waitFor({ state: 'hidden' }); await detail.getByText('Erro médio em unidades', { exact: false }).first().waitFor();
    await page.screenshot({ path: `${folder}/${width}-${theme}-backtest.png` }); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Previsões', exact: true }).click(); await ready(); assert.equal(await page.locator('.evm-map').count(), 0); assert.equal(await page.locator('.evd-delivery tbody tr').count(), 18);
    assert.deepEqual(await page.locator('.evd-delivery thead th[data-column]').evaluateAll(els => els.map(el => el.dataset.column)), columns); assert.equal(calls, 2);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2); assert.equal(overflow, false); assert.deepEqual(errors, []);
    await page.locator('.eve-table-scroll').evaluate(el => { el.scrollLeft = 0; el.scrollTop = 0; }); await page.screenshot({ path: `${folder}/${width}-${theme}-principal.png` });
    failNext = true; await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click(); await page.getByRole('alert').waitFor(); await ready();
    await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click(); await ready();
    assert.equal(await page.locator('.evd-delivery thead th[data-column]').count(), 13);
    assert.equal(await page.locator('.evd-delivery tbody tr').count(), 50);
    results.push({ width, theme, synthetic: true, firstPreviewMs, previewRows: 50, workbookRows: 72, columns: columns.length, callsBeforeExplicitRefresh: 2, noFallback: true, columnsPersist: true, comparisonAndBacktestIndependent: true, partialRefreshRetainsPrevious: true, successfulRefreshResetsColumns: true, overflow, errors }); await context.close();
  }
  for (const mode of ['empty', 'no-reference', 'cancel', 'error-retry', 'unauthorized']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 1000 } }); page = await context.newPage(); const errors = []; let calls = 0, fail = mode === 'error-retry';
    page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(() => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-only', issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); });
    await page.route('**/*', async route => {
      const u = new URL(route.request().url()); if (u.hostname === '127.0.0.1') return route.continue();
      if (u.pathname.includes('monitored-cities')) return route.fulfill({ json: { data: mode === 'unauthorized' ? [] : [{ city: 'Curitiba', state: 'PR', region: 'Sul' }], links: { next: null } } });
      if (u.pathname.includes('building-with-history-internal')) {
        calls++;
        if (mode === 'cancel') { await new Promise(resolve => setTimeout(resolve, 1500)); return route.fulfill({ json: { data: [], meta: { last_page: 1 } } }).catch(() => {}); }
        if (fail) return route.fulfill({ status: 422, json: { message: 'Falha controlada' } });
        return route.fulfill({ json: { data: mode === 'no-reference' && u.searchParams.get('type') === 'Horizontal' ? [buildings[6]] : [], meta: { last_page: 1 } } });
      }
      return route.abort();
    });
    await page.goto(url);
    if (mode === 'unauthorized') { await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).waitFor(); assert.equal(await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).isEnabled(), false); assert.equal(calls, 0); }
    else {
      await load();
      if (mode === 'cancel') { await page.getByRole('status').filter({ hasText: 'Carregando empreendimentos' }).locator('img').first().waitFor(); await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click(); assert.equal(await page.locator('.evd-delivery .eve-preview').count(), 0); }
      else if (mode === 'no-reference') await page.getByText('Nenhum empreendimento com referência calculável corresponde aos filtros.', { exact: false }).waitFor();
      else { if (mode === 'error-retry') { await page.getByRole('alert').waitFor(); fail = false; await page.getByRole('button', { name: 'Tentar novamente a consulta', exact: true }).click(); } await page.getByText('Nenhum histórico disponível neste universo.', { exact: false }).waitFor(); }
      assert.equal(await page.getByRole('button', { name: 'Baixar previsões em Excel', exact: true }).count(), 0);
    }
    await page.screenshot({ path: `${folder}/state-${mode}.png` }); assert.deepEqual(errors, []); results.push({ mode, synthetic: true, noFalseExport: true, calls, errors }); await context.close();
  }
  await writeFile(`${folder}/browser-result.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} catch (e) { if (page) { await page.screenshot({ path: `${folder}/failure.png` }).catch(() => {}); await writeFile(`${folder}/failure.txt`, await page.locator('body').innerText().catch(() => '') + '\n' + String(e)); } console.error(e); process.exitCode = 1; }
finally { await browser.close(); }
