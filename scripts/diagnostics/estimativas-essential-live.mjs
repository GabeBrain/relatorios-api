// Real authenticated, read-only API exercise of the local compiled UI. Never prints credentials.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { unzipSync, strFromU8 } from 'fflate';
import assert from 'node:assert/strict';
const folder = '.local-inputs/estimativas-vendas/essencial-v1-20261028/live'; await mkdir(folder, { recursive: true });
const raw = await readFile('.secrets/geobrain.env', 'utf8');
const env = Object.fromEntries(raw.split(/\r?\n/).flatMap(line => { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line); return m ? [[m[1], m[2].trim().replace(/^(['"])(.*)\1$/, '$2')]] : []; }));
let token = env.GEOBRAIN_TOKEN;
if (!token || !(await fetch('https://geobrain.com.br/public-api/monitored-cities?per_page=1&page=1', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) })).ok) {
  const r = await fetch('https://geobrain.com.br/public-api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: env.GEOBRAIN_EMAIL, password: env.GEOBRAIN_PASSWORD }), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Authentication HTTP ${r.status}`); token = (await r.json()).token; if (!token) throw new Error('Missing authentication token');
}
const browser = await chromium.launch({ headless: true });
const network = [], errors = []; let page;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true }); page = await context.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.url().includes('building-with-history-internal')) { const u = new URL(r.url()); network.push({ type: u.searchParams.get('type'), page: u.searchParams.get('page'), status: r.status() }); } });
  await page.addInitScript(({ token }) => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token, issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); }, { token });
  await page.goto(process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8085/rebrain/estimativas-vendas');
  const selector = page.getByRole('region', { name: 'Escolher universo' });
  await selector.getByRole('combobox').first().click({ timeout: 90000 }); await page.getByRole('option', { name: 'PR', exact: true }).click();
  await selector.getByRole('combobox').nth(1).click();
  await page.getByPlaceholder('Buscar município…').fill('Curitiba'); await page.getByRole('option', { name: 'Curitiba', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar cidade', exact: true }).click();
  const begin = performance.now(); await page.getByRole('button', { name: 'Carregar empreendimentos', exact: true }).click();
  await Promise.race([page.getByRole('region', { name: 'Universo carregado' }).waitFor({ timeout: 300000 }), page.getByRole('alert').waitFor({ timeout: 300000 }).then(async () => { throw new Error(await page.getByRole('alert').innerText()); })]);
  const loadSeconds = (performance.now() - begin) / 1000;
  await page.getByRole('region', { name: 'Empreendimentos e curvas' }).getByRole('img').first().waitFor({ timeout: 120000 });
  const firstCurveSeconds = (performance.now() - begin) / 1000;
  await page.screenshot({ path: `${folder}/list.png`, fullPage: true });
  const calls = network.length;
  const sample = JSON.parse(await readFile('.local-inputs/estimativas-vendas/essencial-v1-20261028/amostra-revisavel.json', 'utf8'));
  const id = sample.find(c => c.condition === 'tipologia_unica_finotti' && c.available).id;
  await page.getByPlaceholder('Nome ou ID').fill(id);
  await page.getByRole('region', { name: 'Empreendimentos e curvas' }).getByRole('button').first().click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('img', { name: 'Histórico, previsão e dados posteriores', exact: true }).waitFor({ timeout: 90000 });
  const minDate = await dialog.getByLabel('Prever a partir de', { exact: true }).getAttribute('min');
  const maxDate = await dialog.getByLabel('Prever a partir de', { exact: true }).getAttribute('max');
  const index = date => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
  const dates = Array.from({ length: Math.max(1, index(maxDate) - index(minDate)) }, (_, i) => { const n = index(minDate) + i; return `${Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`; });
  const timings = [];
  for (let i = 0; i < 20; i++) {
    const date = dates[i % dates.length], started = performance.now();
    await dialog.getByLabel('Prever a partir de', { exact: true }).fill(date);
    await dialog.locator('section[aria-busy=false]').waitFor({ timeout: 90000 });
    await dialog.locator('.evx-chart-caption').filter({ hasText: `início ${date}` }).waitFor();
    timings.push(performance.now() - started);
  }
  await dialog.evaluate(el => { el.scrollTop = 0; }); await page.screenshot({ path: `${folder}/backtest.png` });
  await dialog.getByRole('button', { name: 'Voltar à previsão atual', exact: true }).click(); await dialog.locator('section[aria-busy=false]').waitFor();
  await dialog.getByRole('button', { name: 'Exportar empreendimento', exact: true }).click();
  const wait = page.waitForEvent('download'); await page.getByRole('dialog').getByRole('button', { name: 'Baixar pacote para revisão', exact: true }).click({ timeout: 90000 });
  await (await wait).saveAs(`${folder}/package.zip`);
  const files = unzipSync(await readFile(`${folder}/package.zip`)); const manifest = JSON.parse(strFromU8(files['manifesto.json']));
  assert.equal(manifest.selected, 1); assert.equal(manifest.importable, false); assert.ok(files['CANDIDATO_NAO_IMPORTAR.xlsx']);
  const sorted = [...timings].sort((a, b) => a - b);
  const report = { environment: 'local UI + API real autenticada; nenhuma interceptação', source: await page.getByRole('region', { name: 'Universo carregado', includeHidden: true }).innerText(), loadSeconds, firstCurveSeconds, interactions: timings.length, p50Ms: sorted[9], p95Ms: sorted[18], firstPassMs: timings.slice(0, 6), cachePassMs: timings.slice(6), requestsDuringAnalysis: network.length - calls, network, errors, reviewedPackage: { selected: manifest.selected, forecastRows: manifest.forecastRows, candidateRows: manifest.candidateRows, snapshotHash: manifest.snapshotHash } };
  await writeFile(`${folder}/result.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  assert.equal(report.requestsDuringAnalysis, 0); assert.ok(network.every(r => r.status === 200)); assert.deepEqual(errors, []);
} catch (e) { if (page) { await page.screenshot({ path: `${folder}/failure.png` }).catch(() => {}); await writeFile(`${folder}/failure-text.txt`, await page.locator('body').innerText().catch(() => '')); } await writeFile(`${folder}/failure.json`, JSON.stringify({ error: String(e), network, errors }, null, 2)); console.error(e); process.exitCode = 1; }
finally { await browser.close(); }
