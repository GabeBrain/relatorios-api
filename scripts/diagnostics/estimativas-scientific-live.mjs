// Authenticated read-only local UI exercise. Credentials never enter the report.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const raw = await readFile('.secrets/geobrain.env', 'utf8');
const env = Object.fromEntries(raw.split(/\r?\n/).flatMap(line => { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line); return m ? [[m[1], m[2].trim().replace(/^(['"])(.*)\1$/, '$2')]] : []; }));
let token = env.GEOBRAIN_TOKEN;
if (!token || !(await fetch('https://geobrain.com.br/public-api/monitored-cities?per_page=1&page=1', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) })).ok) {
  const r = await fetch('https://geobrain.com.br/public-api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: env.GEOBRAIN_EMAIL, password: env.GEOBRAIN_PASSWORD }), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Authentication HTTP ${r.status}`); token = (await r.json()).token; if (!token) throw new Error('No authentication token');
}
const folder = '.local-inputs/estimativas-vendas/curitiba-ciencia-20261027/live'; await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
let page;
const network = [], errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.url().includes('building-with-history-internal')) { const u = new URL(r.url()); network.push({ type: u.searchParams.get('type'), page: u.searchParams.get('page'), status: r.status() }); console.log(JSON.stringify(network.at(-1))); } });
  await page.addInitScript(({ token }) => { const now = Date.now(); localStorage.setItem('brain-auth', JSON.stringify({ state: { token, email: '', issuedAt: now, expiresAt: now + 3600000 }, version: 0 })); }, { token });
  await page.goto(process.env.ESTIMATIVAS_LOCAL_URL ?? 'http://127.0.0.1:8083/rebrain/estimativas-vendas');
  const load = page.getByRole('button', { name: 'Carregar Curitiba', exact: true }); await load.waitFor({ timeout: 60000 }); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Carregar Curitiba' && !b.disabled), { timeout: 60000 });
  const start = performance.now(); await load.click(); console.log('Curitiba: loading started');
  await Promise.race([
    page.getByRole('region', { name: 'Catálogo de estudos' }).waitFor({ timeout: 300000 }),
    page.getByRole('alert').waitFor({ timeout: 300000 }).then(async () => { throw new Error(await page.getByRole('alert').innerText()); }),
  ]);
  const loadSeconds = (performance.now() - start) / 1000;
  await page.screenshot({ path: `${folder}/catalog.png` });
  await page.getByRole('button', { name: /Panorama de Curitiba/ }).click();
  const runStart = performance.now(); await page.getByRole('button', { name: 'Executar retrospectiva', exact: true }).click();
  await page.getByRole('region', { name: 'Resultados da retrospectiva' }).waitFor({ timeout: 240000 });
  const runSeconds = (performance.now() - runStart) / 1000;
  const requests = network.length;
  await page.getByRole('heading', { name: 'Quanto erramos em cada horizonte?' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${folder}/results.png` });
  await page.getByPlaceholder('Nome ou ID').fill('');
  await page.getByRole('button', { name: 'Explorar caso', exact: true }).nth(1).click();
  await page.getByRole('dialog').getByRole('img', { name: /Histórico usado, previsões/ }).waitFor();
  await page.screenshot({ path: `${folder}/detail.png` }); await page.keyboard.press('Escape');
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Baixar evidências do estudo', exact: true }).click();
  const download = await downloadPromise; await download.saveAs(`${folder}/evidence.zip`);
  const sourceSummary = await page.getByRole('region', { name: 'Fonte do estudo' }).innerText();
  const report = { transport: 'API real autenticada, sem interceptação', sourceSummary, loadSeconds, runSeconds, requestsDuringAnalysis: network.length - requests, network, errors, evidenceZip: true };
  await writeFile(`${folder}/result.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  assert.equal(network.length, 21); assert.ok(network.every(r => r.status === 200)); assert.equal(report.requestsDuringAnalysis, 0); assert.deepEqual(errors, []);
} catch (error) {
  const report = { transport: 'API real autenticada, sem interceptação', success: false, error: String(error), network, errors, alert: page ? await page.getByRole('alert').allTextContents().catch(() => []) : [] };
  if (page) { await page.screenshot({ path: `${folder}/failure.png` }).catch(() => {}); await writeFile(`${folder}/failure-text.txt`, await page.locator('body').innerText().catch(() => 'unavailable')); }
  await writeFile(`${folder}/failure.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); process.exitCode = 1;
} finally { await browser.close(); }
