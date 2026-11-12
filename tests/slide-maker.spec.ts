import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * E2E do Slide Maker (§13): upload → perguntas → narrativa → ajuste de narrativa → aprovação →
 * download → ajuste pelo chat → v2, na interface real contra o serviço com agente simulado.
 * Capturas em .tmp/slide-maker-e2e/ (claro, escuro e celular) servem de evidência visual.
 */

const EVIDENCIAS = path.resolve('.tmp/slide-maker-e2e');
mkdirSync(EVIDENCIAS, { recursive: true });
const foto = (page: Page, nome: string) => page.screenshot({ path: path.join(EVIDENCIAS, `${nome}.png`), fullPage: true });

test.beforeEach(async ({ page }) => {
  // Nada sai para o Supabase real: log de atividade e Realtime ficam locais no teste.
  await page.route('**/functions/v1/log-activity', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.routeWebSocket(/realtime/, () => { /* canal simulado e mudo: a tela usa a consulta periódica */ });
});

test('fluxo completo do Slide Maker com o serviço simulado', async ({ page }) => {
  await page.goto('/slide-maker');

  // Identificação: só e-mail @brain.srv.br
  await expect(page.getByRole('heading', { name: 'Slide Maker', level: 1 })).toBeVisible();
  const email = page.getByLabel('E-mail');
  await email.fill('alguem@gmail.com');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Use seu e-mail @brain.srv.br.')).toBeVisible();
  await email.fill('teste.e2e@brain.srv.br');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Nenhuma apresentação ainda')).toBeVisible();
  await foto(page, '01-lista-vazia');

  // Nova apresentação: validação de arquivo antes do envio
  await page.getByRole('button', { name: 'Nova apresentação' }).click();
  await page.getByLabel('Nome da apresentação').fill('E2E — Domicílios vagos');
  await page.getByLabel(/Contexto em uma frase/).fill('Palestra de 15 min para incorporadores');
  const seletor = page.locator('input[type=file]');
  await seletor.setInputFiles([{ name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') }]);
  await expect(page.getByText('Tipo de arquivo não aceito.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar e enviar' })).toBeDisabled();
  await page.getByRole('button', { name: 'Remover virus.exe' }).click();
  await seletor.setInputFiles([{ name: 'estudo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%teste\n') }]);
  await foto(page, '02-nova-apresentacao');
  await page.getByRole('button', { name: 'Criar e enviar' }).click();

  // F1 → card de perguntas
  await expect(page).toHaveURL(/\/slide-maker\/[0-9a-f-]{36}$/);
  await expect(page.getByText('1 arquivo enviado')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /Lendo arquivos|Processando/ })).toBeVisible();
  await foto(page, '03-progresso');
  const responder = page.getByRole('button', { name: 'Enviar respostas' });
  await expect(responder).toBeVisible({ timeout: 30_000 });
  await expect(responder).toBeDisabled();
  await page.getByRole('button', { name: /Guilherme Werner/ }).click();
  await foto(page, '04-perguntas');
  await responder.click();

  // F2 → narrativa → pedir ajuste → nova narrativa → aprovar
  await expect(page.getByRole('button', { name: 'Aprovar e produzir' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Resposta: Guilherme Werner')).toBeVisible();
  await foto(page, '05-narrativa');
  await page.getByRole('button', { name: 'Pedir ajuste' }).click();
  await page.getByLabel('O que precisa mudar na narrativa?').fill('Inclua um bloco sobre Florianópolis');
  await page.getByRole('button', { name: 'Enviar ajuste' }).click();
  await expect(page.getByText('Ajuste na narrativa: Inclua um bloco sobre Florianópolis')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Narrativa proposta' })).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Aprovar e produzir' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Aprovar e produzir' }).click();

  // F3 → entrega v1, composer liberado, download do PPTX
  await expect(page.getByText('Seu deck está pronto — v1')).toBeVisible({ timeout: 30_000 });
  const composer = page.getByLabel('Pedir ajuste no deck');
  await expect(composer).toBeEnabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PPTX' }).click();
  const arquivo = await download;
  expect(arquivo.suggestedFilename()).toBe('Brain_simulado_v1.pptx');
  await foto(page, '06-entrega-v1');

  // F4 → ajuste pelo chat → v2; composer desabilitado e explicado durante a fase
  await composer.fill('Troque o título do slide 4');
  await page.getByRole('button', { name: 'Enviar pedido de ajuste' }).click();
  await expect(page.getByText('Aguarde o fim da etapa em andamento para pedir ajustes.')).toBeVisible();
  await expect(composer).toBeDisabled();
  await expect(page.getByText('Seu deck está pronto — v2')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Ajuste simulado')).toBeVisible();
  await page.getByRole('button', { name: 'Versões anteriores' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Versões do deck' });
  await expect(dialogo.getByRole('button', { name: 'Baixar versão 1' })).toBeVisible();
  await expect(dialogo.getByRole('button', { name: 'Baixar versão 2' })).toBeVisible();
  await foto(page, '07-versoes');
  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden();

  // Tema escuro e celular (evidência visual da conversa)
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400); // botões têm transition-colors: fotografar depois da transição
  await foto(page, '08-chat-escuro');
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByText('Seu deck está pronto — v2')).toBeVisible();
  await expect(page.getByRole('complementary')).toHaveClass(/w-14/); // menu recolhido no celular
  await foto(page, '09-chat-celular');
  await page.setViewportSize({ width: 1280, height: 800 });

  // Listas: "Meus trabalhos" abre o chat; "Todos os trabalhos" mostra só metadados
  await page.getByRole('link', { name: 'Apresentações' }).click();
  await expect(page.getByRole('link', { name: 'E2E — Domicílios vagos' })).toBeVisible();
  await expect(page.getByText('Entregue')).toBeVisible();
  await page.getByRole('tab', { name: 'Todos os trabalhos' }).click();
  await expect(page.getByText('teste.e2e@brain.srv.br · apresenta: Fábio Tadeu Araújo')).toBeVisible();
  await foto(page, '10-todos-os-trabalhos');
});

test('sem token neste navegador, o chat explica e não chama o serviço', async ({ page }) => {
  await page.goto('/slide-maker/00000000-0000-4000-8000-000000000000');
  await expect(page.getByText('Esta apresentação não está disponível neste navegador.')).toBeVisible();
});
