import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const folder = resolve('.local-inputs/sp-diagnostic-2026-11-12');
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (const width of [1440, 390]) for (const dark of [false, true]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:5179' ? route.continue() : route.abort());
    await page.goto('http://127.0.0.1:5179/.local-inputs/sp-diagnostic-2026-11-12/preview.html');
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar diagnóstico JSON', exact: true }).click()]);
    const path = resolve(folder, `diagnostic-${width}-${dark}.json`);
    await download.saveAs(path);
    const json = await readFile(path, 'utf8'), snapshot = JSON.parse(json);
    assert.equal(snapshot.slides.length, 85);
    assert.equal(snapshot.quarter, '3T2026');
    assert.equal(snapshot.throughMonth, '2026-08');
    assert.equal(snapshot.analystApproval, false);
    assert.equal(/typologies_history|Authorization|Bearer/.test(json), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: resolve(folder, `download-${width}-${dark}.png`) });
    results.push({ width, dark, download: download.suggestedFilename(), slides: snapshot.slides.length, errors });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(folder, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
