import { defineConfig, devices } from '@playwright/test';

/**
 * E2E do Slide Maker (INSTRUCOES §13): a interface real contra o serviço real com agente SIMULADO
 * (`gcp/slide-maker-agent/src/dev-local.ts`: banco, Storage e fila em memória; sem Supabase, Google
 * ou modelo). Configuração própria, para não depender do `playwright.config.ts` do Lovable.
 *
 *   npx playwright test -c playwright.slide-maker.config.ts
 */
const SERVICO = 'http://127.0.0.1:8787';
const APP = 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  testMatch: /slide-maker\.spec\.ts$/,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  // PW_CHANNEL=msedge (ou chrome) usa o navegador já instalado, quando o do Playwright não foi baixado.
  use: { baseURL: APP, trace: 'retain-on-failure', ...devices['Desktop Chrome'], ...(process.env.PW_CHANNEL && { channel: process.env.PW_CHANNEL }) },
  webServer: [
    {
      command: 'npm --prefix gcp/slide-maker-agent run build && node gcp/slide-maker-agent/dist/dev-local.js',
      url: `${SERVICO}/healthz`,
      env: { DEV_PORT: '8787', DEV_ATRASO_MS: '1500' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npx vite --port 8080 --strictPort',
      url: APP,
      env: { VITE_SLIDE_MAKER_AGENT_URL: SERVICO },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
