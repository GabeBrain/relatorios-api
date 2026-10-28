import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
import assert from 'node:assert/strict';
const folder = process.env.ESTIMATIVAS_EVIDENCE_DIR ?? '.local-inputs/estimativas-vendas/curitiba-ciencia-20261027/browser';
await mkdir(folder, { recursive: true });
const base = process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8083/rebrain/estimativas-vendas';
function fixture(i, type) {
  return { building_id: i, name: `${type} exemplo ${i}`, release_date: i % 2 ? '2020-01-01' : '2025-01-01', estimation: false,
    typologies_history: Array.from({ length: 7 }, (_, m) => {
      const index = 2025 * 12 + 2 + 3 * m;
      return { period: `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`, typology_id: i, pattern: type === 'Vertical' ? 'Standard' : i % 3 ? 'Loteamento Fechado' : 'Standard', qty: 100, typology_stock: i % 7 === 0 ? 0 : Math.max(0, 90 - m * 7), sold_in_period: 7 };
    }) };
}
const browser = await chromium.launch({ headless: true });
const evidence = [];
async function setup(width, theme, mode = 'normal') {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage(); let calls = 0, failing = mode === 'fail', delay = 650;
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(({ theme }) => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'synthetic-local-only', email: '', issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); localStorage.setItem('vite-ui-theme', theme); }, { theme });
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') return route.continue();
    if (u.pathname.includes('monitored-cities')) return route.fulfill({ json: { data: mode === 'unauthorized' ? [{ city: 'Rio Branco', state: 'AC', region: 'Norte' }] : [{ city: 'Curitiba', state: 'PR', region: 'Sul' }], links: { next: null } } });
    if (u.pathname.includes('building-with-history-internal')) {
      calls++;
      await new Promise(r => setTimeout(r, delay));
      if (failing && u.searchParams.get('type') === 'Vertical') return route.fulfill({ status: 400, json: { message: 'Falha controlada da fonte' } });
      if (mode === 'empty') return route.fulfill({ json: { data: [], meta: { last_page: 1 } } });
      const type = u.searchParams.get('type'), n = Number(u.searchParams.get('page'));
      const rows = Array.from({ length: 13 }, (_, i) => fixture(i + (type === 'Horizontal' ? 1 : 101), type));
      return route.fulfill({ json: { data: n === 1 ? rows.slice(0, 7) : rows.slice(7), meta: { last_page: 2 } } });
    }
    return route.abort();
  });
  await page.goto(base);
  await page.getByRole('heading', { name: 'Estimativas de vendas', exact: true }).waitFor();
  return { context, page, errors, calls: () => calls, recover: () => { failing = false; }, slow: () => { delay = 2000; } };
}
try {
  for (const width of [390, 768, 1440]) for (const theme of ['light', 'dark']) {
    const test = await setup(width, theme), { context, page } = test;
    await page.getByRole('button', { name: 'Carregar Curitiba', exact: true }).click();
    await page.getByRole('dialog').waitFor(); assert.ok(await page.getByRole('dialog').locator('img').count() > 0);
    await page.screenshot({ path: `${folder}/${width}-${theme}-loading.png` });
    await page.getByRole('region', { name: 'Catálogo de estudos' }).waitFor({ timeout: 90000 });
    await page.evaluate(t => document.documentElement.classList.toggle('dark', t === 'dark'), theme);
    assert.equal(test.calls(), 4);
    await page.getByText('Por que as contagens não se somam?', { exact: true }).click();
    await page.getByRole('table', { name: 'Empreendimentos em comum entre condições' }).waitFor();
    await page.screenshot({ path: `${folder}/${width}-${theme}-catalog.png`, fullPage: true });
    await page.getByRole('button', { name: /Panorama de Curitiba/ }).click();
    await page.getByRole('region', { name: 'Período explicado' }).waitFor();
    await page.getByRole('button', { name: 'Executar retrospectiva', exact: true }).click();
    await page.getByRole('region', { name: 'Resultados da retrospectiva' }).waitFor({ timeout: 90000 });
    await page.getByRole('img', { name: /Erro médio em unidades/ }).waitFor();
    await page.getByRole('region', { name: 'Nível de evidência' }).waitFor();
    await page.getByRole('navigation', { name: 'Jornada do estudo' }).getByRole('button', { name: /Investigar casos/ }).click();
    const callCount = test.calls();
    await page.getByPlaceholder('Nome ou ID').fill('ausente'); await page.getByText(/Nenhum empreendimento corresponde/).waitFor();
    await page.getByPlaceholder('Nome ou ID').fill('');
    await page.getByRole('button', { name: 'Explorar caso', exact: true }).nth(1).click();
    let dialog = page.getByRole('dialog'); await dialog.getByRole('img', { name: /Histórico usado, previsões/ }).waitFor();
    await dialog.getByRole('button', { name: 'Como foi calculado', exact: true }).click();
    assert.equal(await dialog.locator('input[type=number]').count(), 0);
    assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 2), false);
    await page.screenshot({ path: `${folder}/${width}-${theme}-detail.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.match(await page.evaluate(() => document.activeElement?.textContent), /Explorar caso/);
    await page.getByRole('button', { name: 'Carteira e sobreposição', exact: true }).click();
    dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Sobrepor · % em estoque', exact: true }).click();
    assert.equal(await dialog.locator('input[type=checkbox]:checked').count(), 8);
    assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 2), false);
    await page.keyboard.press('Escape');
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Baixar evidências do estudo', exact: true }).click();
    const download = await downloadPromise, name = `${folder}/${width}-${theme}-evidence.zip`; await download.saveAs(name);
    const files = unzipSync(await readFile(name)); assert.ok(files['manifesto.json']); assert.ok(files['avaliacoes.csv']);
    const manifest = JSON.parse(strFromU8(files['manifesto.json'])); assert.equal(manifest.buildings, 26);
    const body = await page.locator('main.ev-science').innerText(); assert.match(body, /Histórico reportado/);
    assert.equal(test.calls(), callCount);
    await page.screenshot({ path: `${folder}/${width}-${theme}-results.png`, fullPage: true });
    await page.getByRole('button', { name: 'Preparar lote', exact: true }).click(); await page.getByRole('heading', { name: 'Onde vamos preparar as estimativas?' }).waitFor();
    await page.getByRole('button', { name: 'Voltar aos estudos', exact: true }).click();
    await page.getByRole('region', { name: 'Resultados da retrospectiva' }).waitFor();
    if (width === 1440 && theme === 'light') {
      await page.getByRole('button', { name: 'Dados e qualidade', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Dados e conferência', exact: true }).click();
      let check = page.getByRole('dialog').last();
      assert.equal(await check.getByRole('link', { name: /Análise Temporal Excel/ }).getAttribute('href'), 'https://app.geobrain.com.br/analise-temporal-excel');
      assert.ok(await check.getByLabel('Arquivo Excel do Geobrain').isDisabled());
      await check.getByLabel('Confirmo esses filtros').check(); assert.ok(await check.getByLabel('Arquivo Excel do Geobrain').isEnabled());
      await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Período e métodos', exact: true }).click();
      let settings = page.getByRole('dialog'); await settings.getByRole('combobox').first().click();
      await page.getByRole('option', { name: '2026-09', exact: true }).click();
      await settings.getByRole('button', { name: 'Aplicar ao estudo', exact: true }).click();
      await page.getByRole('button', { name: 'Executar retrospectiva', exact: true }).click();
      await page.getByRole('region', { name: 'Resultados da retrospectiva' }).waitFor({ timeout: 60000 });
      await page.getByText('Sem comparações válidas neste grupo', { exact: true }).waitFor();
      await page.getByPlaceholder('Nome ou ID').fill('Horizontal exemplo 7');
      await page.getByRole('button', { name: 'Explorar caso', exact: true }).click();
      await page.getByText(/Nenhum método selecionado produz previsão/).waitFor();
      await page.keyboard.press('Escape'); await page.getByPlaceholder('Nome ou ID').fill('Horizontal exemplo 2');
      await page.getByRole('button', { name: 'Explorar caso', exact: true }).click();
      assert.ok(await page.getByRole('dialog').getByRole('button', { name: 'Referência Finotti', exact: true }).isEnabled());
      await page.keyboard.press('Escape');
      assert.equal(test.calls(), callCount, 'reference reproduction and Excel controls use local data');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
    assert.deepEqual(test.errors, []);
    evidence.push({ width, theme, transport: 'synthetic-local-only', calls: test.calls(), brain: true, study: true, focus: true, portfolio: true, evidenceZip: true, operationPreserved: true, noExtraAnalysisRequests: true, overflow: false, errors: test.errors });
    await context.close();
  }
  for (const mode of ['unauthorized', 'empty', 'fail', 'cancel']) {
    const test = await setup(1440, 'light', mode), { page, context } = test;
    if (mode === 'unauthorized') { await page.getByText(/Curitiba\/PR não está disponível/).waitFor(); assert.ok(await page.getByRole('button', { name: 'Carregar Curitiba' }).isDisabled()); assert.equal(test.calls(), 0); }
    else {
      if (mode === 'cancel') test.slow();
      await page.getByRole('button', { name: 'Carregar Curitiba', exact: true }).click();
      if (mode === 'cancel') {
        await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.waitForTimeout(2500); assert.equal(await page.getByRole('region', { name: 'Catálogo de estudos' }).count(), 0);
      } else if (mode === 'empty') await page.getByText(/Nenhum empreendimento retornou/).waitFor();
      else {
        await page.getByRole('alert').waitFor(); assert.equal(await page.getByRole('region', { name: 'Catálogo de estudos' }).count(), 0);
        test.recover(); await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await page.getByRole('region', { name: 'Catálogo de estudos' }).waitFor();
      }
    }
    assert.deepEqual(test.errors, []); evidence.push({ mode, passed: true, calls: test.calls(), errors: test.errors }); await context.close();
  }
  await writeFile(`${folder}/result.json`, JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence, null, 2));
} finally { await browser.close(); }
