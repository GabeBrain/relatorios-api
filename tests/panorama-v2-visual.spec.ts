import { test, expect } from '@playwright/test';
import path from 'node:path';

const fixtureRow = { period: '2026-06-01', building_type: 'Vertical', group: 'Standard', liquid_sales: 12, vgv_liquid_sales: 4_800_000, stock: 30, vgv_stock: 12_000_000, ivv: 15, average_price: 400_000, average_price_per_meter: 8_000 };

test('Panorama V2 preserves the institutional backgrounds in preview and PDF', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'visual-fixture', email: 'qa@brain.srv.br', issuedAt: Date.now(), expiresAt: Date.now() + 60 * 60_000 }, version: 0 })));
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/monitored-cities')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [{ state: 'SP', city: 'Jundiaí' }], links: { next: null } }) });
    if (url.includes('building-with-history')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [], meta: { last_page: 1 } }) });
    if (url.includes('temporal-analysis-city')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [fixtureRow], meta: { last_page: 1 } }) });
    return route.continue();
  });

  await page.goto('http://127.0.0.1:5174/rebrain/panorama-secovi-fiergs');
  await page.locator('#panorama-cities-trigger').click();
  await page.getByText('Jundiaí', { exact: true }).last().click();
  await page.getByRole('button', { name: 'Gerar relatório' }).click();
  await expect(page.getByText('Página 1 de 59', { exact: false })).toBeVisible({ timeout: 30_000 });

  const capture = async (name: string) => page.locator('.panorama-report-page').screenshot({ path: path.resolve(`.tmp/panorama-v2-visual/${name}.png`) });
  await capture('preview-cover');
  await page.getByRole('button', { name: 'Próxima' }).click(); await capture('preview-summary');
  await page.getByRole('button', { name: 'Próxima' }).click(); await capture('preview-divider');
  for (let i = 0; i < 9; i += 1) await page.getByRole('button', { name: 'Próxima' }).click();
  await capture('preview-table');
  for (let i = 0; i < 43; i += 1) await page.getByRole('button', { name: 'Próxima' }).click();
  await capture('preview-team');
  await page.getByRole('button', { name: 'Próxima' }).click(); await capture('preview-consultant');
  await page.getByRole('button', { name: 'Próxima' }).click(); await capture('preview-closing');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180_000 }),
    page.getByRole('button', { name: 'Baixar PDF' }).click(),
  ]);
  await download.saveAs(path.resolve('.tmp/panorama-v2-visual/panorama-v2.pdf'));
  expect(download.suggestedFilename()).toContain('panorama-jundiai');
});
