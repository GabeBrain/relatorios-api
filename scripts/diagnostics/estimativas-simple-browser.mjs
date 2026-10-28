import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import assert from 'node:assert/strict';
const folder = '.local-inputs/estimativas-vendas/simplificacao-20261028'; await mkdir(folder, { recursive: true });
const base = process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8085/rebrain/estimativas-vendas';
const fixture = (id, type) => ({ building_id: id, name: `Projeto ${id}`, release_date: '2025-01-01', typologies_history: Array.from({ length: id === 2 ? 8 : 9 }, (_, i) => ({ period: `2026-${String(i + 1).padStart(2, '0')}`, typology_id: String(id), pattern: type === 'Vertical' ? 'Standard' : id === 3 ? 'Standard' : 'Loteamento Fechado', qty: 100, typology_stock: id === 4 ? 0 : 80 - i * 2, sold_in_period: 2, building_status: 'Ativo' })) });
const browser = await chromium.launch({ headless: true }); const results = []; let activePage;
try {
 for (const width of [1440, 768, 390]) for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true }); const page = await context.newPage(); activePage = page; let calls = 0; const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(theme => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'fixture', issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); localStorage.setItem('vite-ui-theme', theme); }, theme);
  await page.route('**/*', async route => { const u = new URL(route.request().url()); if (u.hostname === '127.0.0.1') return route.continue(); if (u.pathname.includes('monitored-cities')) return route.fulfill({ json: { data: [{ city: 'Curitiba', state: 'PR', region: 'Sul' }, { city: 'Florianópolis', state: 'SC', region: 'Sul' }], links: { next: null } } }); if (u.pathname.includes('building-with-history-internal')) { calls++; await new Promise(r => setTimeout(r, 200)); const type = u.searchParams.get('type'); return route.fulfill({ json: { data: type === 'Horizontal' ? [1, 2, 3, 4].map(id => fixture(id, type)) : [], meta: { last_page: 1 } } }); } return route.abort(); });
  await page.goto(base); await page.getByRole('heading', { name: 'Estimativas de vendas', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Preparar lote', exact: true }).count(), 0); assert.equal(await page.getByText('Do histórico à próxima decisão.', { exact: true }).count(), 0);
  await page.getByRole('combobox', { name: 'Estados', exact: true }).click(); await page.getByRole('option', { name: 'PR', exact: true }).click(); await page.getByRole('option', { name: 'SC', exact: true }).click(); await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Cidades', exact: true }).click(); await page.getByRole('option', { name: 'Curitiba/PR', exact: true }).click(); await page.keyboard.press('Escape');
  await page.evaluate(t => document.documentElement.classList.toggle('dark', t === 'dark'), theme); await page.screenshot({ path: `${folder}/${width}-${theme}-entry.png`, fullPage: true });
  await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).click();
  await page.getByRole('button', { name: 'Lista de curvas', exact: true }).click();
  await page.getByRole('button', { name: 'Explorar curva de Projeto 1', exact: true }).waitFor({ timeout: 90000 });
  await page.getByRole('img', { name: 'Curva de vendas de Projeto 1' }).waitFor();
  await page.evaluate(t => document.documentElement.classList.toggle('dark', t === 'dark'), theme);
  assert.equal(calls, 2, 'cidades escolhidas não completam SC implicitamente');
  assert.equal(await page.getByRole('button', { name: 'Selecionar Projeto 3', exact: true }).count(), 0);
  assert.equal(await page.getByRole('region', { name: 'Seleção para exportação' }).count(), 0);
  await page.getByRole('button', { name: 'Selecionar Projeto 1', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Selecionar Projeto 1', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Explorar curva de Projeto 1', exact: true }).click();
  let dialog = page.getByRole('dialog'); await dialog.getByRole('img', { name: 'Histórico, previsão e dados posteriores' }).waitFor();
  assert.match(await dialog.locator('.evx-chart-caption').innerText(), /Vendas acumuladas.*unidades/);
  assert.equal(await dialog.locator('input[type=range],input[type=month]').count(), 0);
  await dialog.getByRole('button', { name: 'Período anterior', exact: true }).click();
  await dialog.getByRole('region', { name: 'Resumo do backtest' }).waitFor();
  await dialog.getByText(/Comparação disponível até/).waitFor();
  await dialog.getByRole('button', { name: '6 meses', exact: true }).click();
  await dialog.locator('.evx-chart-caption').filter({ hasText: '6 meses' }).waitFor();
  await dialog.locator('.evx-graph-layout').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${folder}/${width}-${theme}-detail.png` });
  assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 2), false);
  await page.keyboard.press('Escape'); assert.equal(await page.getByRole('button', { name: 'Selecionar Projeto 1', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Mostrar todos', exact: true }).click();
  await page.getByRole('button', { name: 'Selecionar Projeto 3', exact: true }).click();
  await page.getByRole('button', { name: 'Marcar todos os Finotti', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Selecionar Projeto 3', exact: true }).count(), 0);
  // Projeto 2 ends in August, so the frozen reference is blocked: it must not be selected as Finotti.
  await page.getByRole('button', { name: 'Mostrar todos', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Selecionar Projeto 3', exact: true }).getAttribute('aria-pressed'), 'false');
  await page.getByRole('button', { name: 'Selecionar Projeto 2', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar seleção', exact: true }).click();
  dialog = page.getByRole('dialog'); await dialog.getByRole('img', { name: 'Comparação de curvas' }).waitFor();
  assert.match(await dialog.getByRole('combobox', { name: 'Alinhar comparação' }).innerText(), /Tempo após/);
  await page.screenshot({ path: `${folder}/${width}-${theme}-compare.png` }); await page.keyboard.press('Escape');
  await page.getByRole('region', { name: 'Seleção para exportação' }).getByRole('button', { name: 'Baixar previsões', exact: true }).click();
  const downloadWait = page.waitForEvent('download'); await page.getByRole('dialog').getByRole('button', { name: 'Baixar previsões em Excel', exact: true }).click();
  const path = `${folder}/${width}-${theme}-previsoes.xlsx`; await (await downloadWait).saveAs(path);
  const wb = XLSX.read(await readFile(path), { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets.previsoes);
  assert.equal(rows.length, 24); assert.ok(rows.some(r => r.id_empreendimento === '2' && r.inicio === '2026-08')); assert.ok(rows.every(r => r.importavel === false));
  assert.equal(calls, 2); assert.deepEqual(errors, []); await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
  await page.screenshot({ path: `${folder}/${width}-${theme}-list.png`, fullPage: true });
  results.push({ width, theme, success: true, calls, excelRows: rows.length, errors }); await context.close();
 }
 await writeFile(`${folder}/browser-result.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} catch (e) { if (activePage) { await activePage.screenshot({ path: `${folder}/failure.png` }).catch(() => {}); await writeFile(`${folder}/failure.txt`, await activePage.locator('body').innerText().catch(() => '') + '\n' + String(e)); } console.error(e); process.exitCode = 1; }
finally { await browser.close(); }
