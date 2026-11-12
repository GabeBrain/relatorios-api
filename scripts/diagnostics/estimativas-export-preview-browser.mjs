import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import assert from 'node:assert/strict';
const folder = '.local-inputs/estimativas-vendas/export-preview-20261029'; await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true }); const results = []; let page;
try {
 for (const [width, theme] of [[1440, 'light'], [1440, 'dark'], [390, 'light']]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' }); page = await context.newPage(); let calls = 0; const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-only', issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); });
  await page.route('**/*', route => { const u = new URL(route.request().url()); if (u.hostname === '127.0.0.1') return route.continue();
   if (u.pathname.includes('monitored-cities')) return route.fulfill({ json: { data: [{ city: 'Curitiba', state: 'PR', region: 'Sul' }], links: { next: null } } });
   if (u.pathname.includes('building-with-history-internal')) { calls++; return route.fulfill({ json: { data: u.searchParams.get('type') === 'Horizontal' ? Array.from({ length: 6 }, (_, i) => ({ building_id: String(i + 1), name: `Projeto ${i + 1}`, release_date: '2025-01-01', typologies_history: Array.from({ length: 9 }, (_, j) => ({ period: `2026-${String(j + 1).padStart(2, '0')}`, typology_id: String(i + 1), pattern: 'Loteamento Fechado', qty: 300, typology_stock: 150 - j * 2, sold_in_period: 2, building_status: 'Ativo' })) })) : [], meta: { last_page: 1 } } }); } return route.abort();
  });
  await page.goto(process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8087/rebrain/estimativas-vendas');
  await page.getByRole('combobox', { name: 'Estados', exact: true }).click(); await page.getByRole('option', { name: 'PR', exact: true }).click(); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.evm-map')?.getAttribute('aria-busy') === 'false', { timeout: 90000 });
  await page.evaluate(t => document.documentElement.classList.toggle('dark', t === 'dark'), theme);
  await page.getByRole('button', { name: 'Baixar estimativas aprovadas', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('region', { name: 'Prévia do Excel', exact: true }).waitFor({ timeout: 90000 });
  assert.equal(await dialog.locator('tbody tr').count(), 50);
  const original = await dialog.locator('thead th[data-column]').evaluateAll(els => els.map(el => el.dataset.column)); assert.equal(original.length, 13);
  // Desktop drag and a keyboard alternative both exercise the same order contract.
  if (width === 1440) await dialog.getByRole('button', { name: 'Mover coluna mes', exact: true }).dragTo(dialog.locator('thead th[data-column="id_empreendimento"]'));
  else { const handle = dialog.getByRole('button', { name: 'Mover coluna mes', exact: true }); await handle.focus(); for (let i = 0; i < 5; i++) await page.keyboard.press('Alt+ArrowLeft'); }
  assert.equal(await dialog.locator('thead th[data-column]').first().getAttribute('data-column'), 'mes');
  await dialog.getByRole('button', { name: 'Opções da coluna cidade', exact: true }).click(); await page.getByRole('menuitem', { name: 'Ocultar coluna', exact: true }).click();
  assert.equal(await dialog.locator('th[data-column="cidade"]').count(), 0); await dialog.getByRole('button', { name: 'Mostrar coluna cidade', exact: true }).waitFor();
  const columns = await dialog.locator('thead th[data-column]').evaluateAll(els => els.map(el => el.dataset.column));
  const preview = await dialog.locator('tbody tr').evaluateAll(rows => rows.map(row => Array.from(row.querySelectorAll('td')).map(td => td.textContent)));
  const downloadWait = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Baixar previsões em Excel', exact: true }).click();
  const filename = `${folder}/${width}-${theme}-previsoes.xlsx`; await (await downloadWait).saveAs(filename);
  const wb = XLSX.read(await readFile(filename), { type: 'array' }), data = XLSX.utils.sheet_to_json(wb.Sheets.previsoes, { header: 1, defval: null });
  assert.deepEqual(data[0], columns); assert.equal(data.length, 73); assert.deepEqual(data.slice(1, 51).map(row => row.map(v => v === null ? '' : String(v))), preview);
  assert.equal(wb.Sheets.previsoes.B2.t, 's'); assert.equal(wb.Sheets.previsoes.L2.v, false); assert.ok(wb.SheetNames.includes('leia_me'));
  await dialog.getByRole('button', { name: 'Mostrar coluna cidade', exact: true }).click(); assert.equal(await dialog.locator('thead th[data-column]').last().getAttribute('data-column'), 'cidade');
  await dialog.getByRole('button', { name: 'Restaurar colunas', exact: true }).click(); assert.deepEqual(await dialog.locator('thead th[data-column]').evaluateAll(els => els.map(el => el.dataset.column)), original);
  const overflow = await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 2); assert.equal(overflow, false);
  await dialog.locator('.eve-table-scroll').evaluate(el => { el.scrollLeft = 0; el.scrollTop = 0; }); await page.mouse.move(0, 0); await page.screenshot({ path: `${folder}/${width}-${theme}-preview.png` });
  assert.equal(calls, 2); assert.deepEqual(errors, []); results.push({ width, theme, synthetic: true, previewRows: 50, workbookRows: data.length - 1, columnsExported: columns.length, reorder: width === 1440 ? 'drag' : 'keyboard', hiddenColumnOmitted: true, previewMatchesWorkbook: true, calls, errors, overflow }); await context.close();
 }
 await writeFile(`${folder}/browser-result.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} catch (e) { if (page) { await page.screenshot({ path: `${folder}/failure.png` }).catch(() => {}); await writeFile(`${folder}/failure.txt`, await page.locator('body').innerText().catch(() => '') + String(e)); } console.error(e); process.exitCode = 1; }
finally { await browser.close(); }
