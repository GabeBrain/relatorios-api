import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
import assert from 'node:assert/strict';
const folder = process.env.ESTIMATIVAS_EVIDENCE_DIR ?? '.local-inputs/estimativas-vendas/essencial-v1-20261028/browser';
const base = process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8085/rebrain/estimativas-vendas';
await mkdir(folder, { recursive: true });
function fixture(i, type) {
  return { building_id: i, name: `${type} exemplo ${i}`, release_date: i % 2 ? '2020-01-01' : '2025-01-01', typologies_history: Array.from({ length: 22 }, (_, m) => {
    const index = 2025 * 12 + m; return { period: `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`, typology_id: i, pattern: type === 'Vertical' ? 'Standard' : i % 3 ? 'Loteamento Fechado' : 'Standard', qty: 100, typology_stock: i % 7 === 0 && m === 21 ? 0 : Math.max(0, 90 - m * 2), sold_in_period: 2, building_status: 'Ativo' };
  }) };
}
const browser = await chromium.launch({ headless: true });
const evidence = [];
async function setup(width, theme, mode = 'normal') {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage(); const errors = []; let calls = 0, fail = mode === 'fail', active = 0, peak = 0;
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(({ theme }) => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-local-only', issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); localStorage.setItem('vite-ui-theme', theme); }, { theme });
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') return route.continue();
    if (u.pathname.includes('monitored-cities')) return route.fulfill({ json: { data: mode === 'unauthorized' ? [] : [{ city: 'Curitiba', state: 'PR', region: 'Sul' }], links: { next: null } } });
    if (u.pathname.includes('building-with-history-internal')) {
      calls++; active++; peak = Math.max(peak, active); await new Promise(r => setTimeout(r, mode === 'cancel' ? 3000 : 300)); active--;
      if (fail && u.searchParams.get('type') === 'Vertical') return route.fulfill({ status: 400, json: { message: 'Falha controlada' } });
      if (mode === 'empty') return route.fulfill({ json: { data: [], meta: { last_page: 1 } } });
      const type = u.searchParams.get('type'), pageNo = Number(u.searchParams.get('page')), rows = Array.from({ length: 13 }, (_, n) => fixture(n + (type === 'Horizontal' ? 1 : 101), type));
      return route.fulfill({ json: { data: pageNo === 1 ? rows.slice(0, 7) : rows.slice(7), meta: { last_page: 2 } } });
    }
    return route.abort();
  });
  await page.goto(base); await page.getByRole('heading', { name: 'Estimativas de vendas', exact: true }).waitFor();
  return { context, page, errors, calls: () => calls, peak: () => peak, recover: () => { fail = false; } };
}
async function choose(test) {
  const { page } = test;
  await page.getByRole('button', { name: 'Estado', exact: true }).click();
  await page.getByRole('combobox', { name: 'Estado autorizado', exact: true }).click();
  await page.getByRole('option', { name: 'PR', exact: true }).click();
  await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).click();
}
try {
  for (const width of [1440, 768, 390]) for (const theme of ['light', 'dark']) {
    const t = await setup(width, theme), { page } = t;
    await page.screenshot({ path: `${folder}/${width}-${theme}-entry.png`, fullPage: true });
    await choose(t); await page.getByRole('status').filter({ hasText: 'Carregando empreendimentos' }).waitFor();
    assert.ok(await page.getByRole('status').filter({ hasText: 'Carregando empreendimentos' }).locator('img').count());
    await page.screenshot({ path: `${folder}/${width}-${theme}-loading.png` });
    await page.getByRole('button', { name: 'Explorar Horizontal exemplo 2', exact: true }).waitFor({ timeout: 90000 });
    await page.getByRole('img', { name: 'Curva de estoque de Horizontal exemplo 2', exact: true }).waitFor();
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    const calls = t.calls(); assert.equal(calls, 4); assert.ok(t.peak() <= 8);
    await page.getByText('Filtros e condições de análise', { exact: true }).click();
    const available = page.getByRole('combobox', { name: 'Disponibilidade de previsão', exact: true });
    await available.click({ timeout: 90000 }); await page.getByRole('option', { name: 'Com referência Finotti', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Explorar Horizontal exemplo 1', exact: true }).count(), 0);
    await available.click(); await page.getByRole('option', { name: 'Todos', exact: true }).click();
    await page.getByText('Filtros e condições de análise', { exact: true }).click();
    await page.getByLabel('Selecionar Horizontal exemplo 2', { exact: true }).check();
    await page.getByPlaceholder('Nome ou ID').fill('Vertical');
    await page.getByText('1 selecionados · 1 fora do filtro atual', { exact: true }).waitFor();
    await page.getByPlaceholder('Nome ou ID').fill('');
    await page.screenshot({ path: `${folder}/${width}-${theme}-list.png`, fullPage: true });
    await page.getByRole('button', { name: 'Explorar Horizontal exemplo 2', exact: true }).click();
    const dialog = page.getByRole('dialog'); await dialog.getByRole('img', { name: 'Histórico, previsão e dados posteriores', exact: true }).waitFor();
    await dialog.getByLabel('Prever a partir de', { exact: true }).fill('2026-03');
    await dialog.getByRole('region', { name: 'Resumo do backtest' }).waitFor({ timeout: 60000 });
    assert.doesNotMatch(await dialog.locator('.recharts-legend-wrapper').innerText(), /Referência Finotti/);
    await dialog.getByText(/Comparação disponível até/).waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Baixar resumo do teste', exact: true }).isDisabled(), false);
    await dialog.getByLabel('Duração da previsão', { exact: true }).focus();
    await page.keyboard.press('Home');
    for (let i = 1; i < 8; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await dialog.getByRole('region', { name: 'Resumo do backtest' }).waitFor();
    await dialog.getByText(/Como foi calculado/, { exact: true }).click();
    assert.equal(await dialog.locator('input[type=number]').count(), 0);
    assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 2), false);
    await dialog.locator('.evx-graph-layout').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${folder}/${width}-${theme}-detail.png` });
    const reportWait = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Baixar resumo do teste', exact: true }).click();
    await (await reportWait).saveAs(`${folder}/${width}-${theme}-backtest.html`);
    await dialog.getByText('Testar em outras datas', { exact: true }).click();
    await dialog.getByLabel('Adicionar data ao teste', { exact: true }).fill('2026-04');
    await dialog.getByRole('button', { name: 'Adicionar data', exact: true }).click();
    await dialog.getByRole('button', { name: 'Comparar datas escolhidas', exact: true }).click();
    await dialog.getByText('Datas avaliadas: 2026-03, 2026-04. Este relatório é separado da exportação do intervalo principal.', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120); assert.match(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), /Explorar Horizontal exemplo 2/);
    await page.getByRole('button', { name: 'Exportar seleção', exact: true }).click();
    const review = page.getByRole('dialog'); const download = page.waitForEvent('download');
    await review.getByRole('button', { name: 'Baixar pacote para revisão', exact: true }).click({ timeout: 90000 });
    const zipPath = `${folder}/${width}-${theme}-package.zip`; await (await download).saveAs(zipPath);
    const files = unzipSync(await readFile(zipPath)); const manifest = JSON.parse(strFromU8(files['manifesto.json']));
    assert.equal(manifest.selected, 1); assert.equal(manifest.spec.cutoff, '2026-10'); assert.equal(manifest.importable, false); assert.equal(manifest.forecastRows, 12);
    assert.ok(files['CANDIDATO_NAO_IMPORTAR.xlsx']);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Comparar seleção', exact: true }).click();
    await page.getByRole('dialog').getByRole('img', { name: 'Carteira e dados posteriores' }).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Sobrepor curvas', exact: true }).click();
    await page.screenshot({ path: `${folder}/${width}-${theme}-portfolio.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Preparar lote', exact: true }).click(); await page.getByRole('heading', { name: 'Onde vamos preparar as estimativas?' }).waitFor();
    await page.getByRole('button', { name: 'Voltar às curvas', exact: true }).click();
    await page.getByRole('button', { name: 'Dados e metodologia', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dados e conferência', exact: true }).click();
    assert.equal(await page.getByRole('link', { name: /Análise Temporal Excel/ }).getAttribute('href'), 'https://app.geobrain.com.br/analise-temporal-excel');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    assert.equal(t.calls(), calls, 'exploração usa apenas dados carregados');
    assert.deepEqual(t.errors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
    evidence.push({ width, theme, success: true, calls, peak: t.peak(), errors: t.errors }); await t.context.close();
  }
  for (const mode of ['empty', 'fail', 'cancel', 'unauthorized']) {
    const t = await setup(1440, 'light', mode), { page } = t;
    if (mode === 'unauthorized') assert.equal(await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).isDisabled(), true);
    else {
      await choose(t);
      if (mode === 'cancel') { await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click(); assert.equal(await page.getByRole('region', { name: 'Universo carregado' }).count(), 0); }
      if (mode === 'empty') await page.getByText('Nenhum histórico disponível neste universo. Altere o recorte para continuar.', { exact: true }).waitFor();
      if (mode === 'fail') { await page.getByRole('alert').waitFor(); assert.equal(await page.getByRole('region', { name: 'Universo carregado' }).count(), 0); t.recover(); await page.getByRole('button', { name: 'Tentar novamente a consulta', exact: true }).click(); await page.getByRole('region', { name: 'Universo carregado' }).waitFor(); }
    }
    assert.deepEqual(t.errors, []); evidence.push({ mode, success: true }); await page.screenshot({ path: `${folder}/state-${mode}.png` }); await t.context.close();
  }
  await writeFile(`${folder}/result.json`, JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence, null, 2));
} catch (e) { await writeFile(`${folder}/failure.json`, JSON.stringify({ error: String(e), evidence }, null, 2)); console.error(e); process.exitCode = 1; }
finally { await browser.close(); }
