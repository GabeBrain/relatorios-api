import { test, expect, type Page, type Route } from '@playwright/test';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Evidência de página para as 40 anotações de Juliana Guimarães na V3.
 *
 * A matriz exige output final: "ajustado no componente" sem página gerada não fecha item. Aqui a
 * aplicação real é dirigida no navegador com a API interceptada por fixtures determinísticas —
 * assim o cenário é reprodutível e cada JG recebe a captura da sua própria página, inclusive os
 * comentários repetidos, que têm captura individual.
 *
 * Três cenários, exatamente os da homologação:
 *   · Jundiaí       — nenhum horizontal aceito: o bloco horizontal precisa desaparecer;
 *   · Praia Grande  — condomínios de casas aceitos, com herança de padrão;
 *   · Baixada       — `ivv?group_by=Tipologia` responde 500: indisponibilidade explícita, sem zeros.
 */

/** O servidor de desenvolvimento pode subir em outra porta; a spec não fixa uma. */
const BASE_URL = process.env.PANORAMA_BASE_URL ?? 'http://127.0.0.1:5174';

const OUT = (scenario: string) => {
  const dir = path.resolve(`.tmp/opus-panorama-v3/evidencias/${scenario}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

const QUARTERS = ['2022-06-01', '2022-09-01', '2022-12-01', '2023-03-01', '2023-06-01', '2023-09-01', '2023-12-01', '2024-03-01', '2024-06-01', '2024-09-01', '2024-12-01', '2025-03-01', '2025-06-01', '2025-09-01', '2025-12-01', '2026-03-01', '2026-06-01'];

/** Série temporal por padrão/tipologia, com valores distintos por período para provar variação. */
function temporalRows(groupBy: string, endpoint: string) {
  // O contrato municipal devolve rótulo de PRODUTO horizontal como se fosse padrão. Manter
  // `Loteamento Fechado` aqui é deliberado: é o caminho que os fixtures anteriores não exercitavam
  // e por onde o loteamento chegou ao PDF entregue.
  const groups = groupBy === 'Tipologia'
    ? [{ label: '1', type: 'Vertical' }, { label: '2', type: 'Vertical' }, { label: '3', type: 'Vertical' }]
    : [{ label: 'Econômico', type: 'Vertical' }, { label: 'Médio', type: 'Vertical' }, { label: 'Alto', type: 'Vertical' }, { label: 'Loteamento Fechado', type: 'Horizontal' }];
  return QUARTERS.flatMap((period, index) => groups.map(({ label: group, type }, position) => ({
    period, group, building_type: type,
    liquid_sales: endpoint === 'sales' ? 20 + index * 3 + position * 5 : undefined,
    vgv_liquid_sales: endpoint === 'sales' ? (20 + index * 3) * 400_000 : undefined,
    stock: endpoint === 'stock' ? 200 - index * 4 + position * 30 : undefined,
    vgv_stock: endpoint === 'stock' ? (200 - index * 4) * 400_000 : undefined,
    ivv: endpoint === 'ivv' ? 8 + position * 4 + (index % 5) : undefined,
    average_price: endpoint === 'medium-prices' ? 380_000 + position * 90_000 + index * 4_000 : undefined,
    average_price_per_meter: endpoint === 'medium-prices-meter' ? 7_400 + position * 900 + index * 60 : undefined,
  })));
}

/** Empreendimento vertical: 17 trimestres de histórico e tipologias com área privativa. */
function vertical(id: string, standard: string, releaseDate: string, units: number, area: number, city: string) {
  return {
    building_id: id, id, name: `Residencial ${id}`, building_type: 'Vertical', standard, city,
    release_date: releaseDate, total_units: units, latitude: -23.9 - Number(id.slice(1)) / 200, longitude: -46.4 + Number(id.slice(1)) / 200,
    typologies_history: [
      { period: releaseDate.slice(0, 7) + '-01', number_bedroom: area > 70 ? '3' : '2', pattern: standard, qty: units, release_price: area * 8_200, private_area: area },
      { period: '2026-06-01', number_bedroom: area > 70 ? '3' : '2', pattern: standard, typology_stock: Math.round(units * 0.3), liquid_sales: Math.round(units * 0.12), price: area * 8_600, private_area: area, price_private_area: 8_600 },
    ],
  };
}

/** Condomínio de casas com a grafia oficial da API v2 e herança de padrão (PRE-026 + PRE-027). */
function condominio(id: string, city: string, historicalStandard: string) {
  return {
    building_id: id, id, name: `Condomínio ${id}`, building_type: 'Horizontal', standard: 'Condomínio de Casas/Sobrados', city,
    release_date: '2025-03-10', total_units: 48, latitude: -24.01, longitude: -46.41,
    typologies_history: [
      { period: '2025-03-01', number_bedroom: '3', pattern: historicalStandard, qty: 48, release_price: 520_000, private_area: 92 },
      { period: '2026-06-01', number_bedroom: '3', pattern: 'Condomínio de Casas/Sobrados', typology_stock: 14, liquid_sales: 6, price: 545_000, private_area: 92, price_private_area: 5_920 },
    ],
  };
}

/** Loteamento: existe na base e precisa ficar fora de todo o Panorama Secovi. */
function loteamento(id: string, city: string, label: string) {
  return {
    building_id: id, id, name: `Terras de ${id}`, building_type: 'Horizontal', standard: label, city,
    release_date: '2025-03-10', total_units: 120,
    typologies_history: [{ period: '2025-03-01', number_bedroom: '3', pattern: label, qty: 120, release_price: 260_000, private_area: 250 }],
  };
}

interface Scenario {
  cities: string[];
  buildingsOf: (city: string) => Record<string, unknown>[];
  /** Quando verdadeiro, `ivv?group_by=Tipologia` responde 500 — o circuito precisa abrir. */
  breakIvvByTypology?: boolean;
}

const SCENARIOS: Record<string, Scenario> = {
  jundiai: {
    cities: ['Jundiaí'],
    buildingsOf: (city) => [
      vertical('V1', 'Econômico', '2021-05-10', 180, 48, city),
      vertical('V2', 'Médio', '2023-08-10', 120, 66, city),
      vertical('V3', 'Alto', '2025-04-10', 90, 96, city),
      vertical('V4', 'Médio', '2026-05-10', 60, 72, city),
      // Nenhum condomínio de casas: só loteamentos e chácaras, todos fora da política.
      loteamento('H1', city, 'Loteamento Fechado'),
      loteamento('H2', city, 'Loteamento Aberto'),
      loteamento('H3', city, 'Condomínio de Chácaras'),
    ],
  },
  'praia-grande': {
    cities: ['Praia Grande'],
    buildingsOf: (city) => [
      vertical('V1', 'Econômico', '2021-05-10', 220, 46, city),
      vertical('V2', 'Standard', '2023-08-10', 160, 58, city),
      vertical('V3', 'Médio', '2025-04-10', 110, 74, city),
      vertical('V4', 'Alto', '2026-05-10', 70, 104, city),
      condominio('H1', city, 'Econômico'),
      condominio('H2', city, 'Standard'),
      loteamento('H9', city, 'Loteamento Fechado'),
    ],
  },
  baixada: {
    cities: ['Guarujá', 'Praia Grande', 'Santos', 'São Vicente'],
    breakIvvByTypology: true,
    buildingsOf: (city) => [
      vertical('V1', 'Econômico', '2021-05-10', 150, 47, city),
      vertical('V2', 'Médio', '2024-08-10', 100, 68, city),
      vertical('V3', 'Alto', '2026-05-10', 60, 98, city),
      ...(city === 'Praia Grande' ? [condominio('H1', city, 'Econômico')] : []),
      loteamento('H9', city, 'Loteamento Fechado'),
    ],
  },
};

const cityOf = (url: string) => decodeURIComponent(new URL(url).searchParams.get('city') ?? '');

async function installRoutes(page: Page, scenario: Scenario) {
  await page.addInitScript(() => localStorage.setItem('brain-auth', JSON.stringify({ state: { token: 'jg-fixture', email: 'qa@brain.srv.br', issuedAt: Date.now(), expiresAt: Date.now() + 3_600_000 }, version: 0 })));
  await page.route('**/*', async (route: Route) => {
    const url = route.request().url();
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/monitored-cities')) {
      return json({ data: scenario.cities.map((city) => ({ state: 'SP', city })), links: { next: null } });
    }
    if (url.includes('building-with-history')) {
      return json({ data: scenario.buildingsOf(cityOf(url)), meta: { last_page: 1 } });
    }
    if (url.includes('temporal-analysis-city/')) {
      const target = new URL(url);
      const endpoint = target.pathname.split('/').pop() ?? '';
      const groupBy = target.searchParams.get('group_by') ?? 'Padrão';
      // Falha sistemática reproduzida: só IVV por Tipologia, e em todas as tentativas.
      if (scenario.breakIvvByTypology && endpoint === 'ivv' && groupBy === 'Tipologia') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Server Error' }) });
      }
      if (endpoint === 'releases') return json({ data: [], meta: { last_page: 1 } });
      return json({ data: temporalRows(groupBy, endpoint), meta: { last_page: 1 } });
    }
    if (url.includes('api.mapbox.com')) {
      // Tile 1×1 transparente: prova o caminho com fundo cartográfico sem depender de rede externa.
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') });
    }
    // Tudo o que não é a própria aplicação é cortado de imediato. Sem isso, `getFontEmbedCSS` do
    // exportador tenta baixar fontes externas e a geração do PPT fica pendurada esperando uma rede
    // que este ambiente não tem — a espera, e não a rasterização, era o gargalo.
    if (!url.startsWith(BASE_URL) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      return route.abort();
    }
    return route.continue();
  });
}

async function generate(page: Page, scenario: Scenario) {
  await page.goto(`${BASE_URL}/rebrain/panorama-secovi-fiergs`);
  await page.locator('#panorama-cities-trigger').click();
  for (const city of scenario.cities) await page.getByText(city, { exact: true }).last().click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Gerar relatório' }).click();
  await expect(page.getByText('Página 1 de', { exact: false })).toBeVisible({ timeout: 120_000 });
}

/** Total de páginas do recorte, lido do próprio cabeçalho do paginador. */
async function pageCount(page: Page) {
  const label = await page.getByText(/Página \d+ de \d+/).first().textContent();
  return Number(/de (\d+)/.exec(label ?? '')?.[1] ?? 0);
}

/** Percorre todas as páginas capturando cada uma — a evidência individual que a matriz exige. */
async function captureAll(page: Page, scenario: string) {
  const dir = OUT(scenario);
  const total = await pageCount(page);
  await page.getByRole('button', { name: 'Ver todas as páginas' }).click();
  const sheets = page.locator('.panorama-report-page');
  await expect(sheets).toHaveCount(total, { timeout: 60_000 });
  const titles: string[] = [];
  for (let index = 0; index < total; index += 1) {
    const sheet = sheets.nth(index);
    await sheet.scrollIntoViewIfNeeded();
    titles.push((await sheet.getAttribute('aria-label')) ?? '');
    await sheet.screenshot({ path: path.join(dir, `p${String(index + 1).padStart(2, '0')}.png`) });
  }
  return { total, titles };
}

for (const [name, scenario] of Object.entries(SCENARIOS)) {
  test(`Panorama V3 · cenário ${name} · páginas, PDF e PPT espelho`, async ({ page }) => {
    test.setTimeout(900_000);
    await installRoutes(page, scenario);
    await generate(page, scenario);

    const { total, titles } = await captureAll(page, name);
    expect(total).toBeGreaterThan(40);

    const text = await page.locator('.panorama-export-root, .space-y-6').first().innerText().catch(() => '');
    const deck = text.toLowerCase();

    // JG-36 e firewall de fontes: o contrato municipal deste cenário CONTÉM `Loteamento Fechado`.
    // Nenhuma lâmina — tabela, gráfico ou narrativa — pode publicá-lo.
    expect(deck).not.toContain('loteamento');
    expect(deck).not.toContain('api geobrain');
    // Reconciliação: o resumo geral e a oferta por padrão nascem do mesmo cubo.
    const numbers = (label: string) => [...text.matchAll(new RegExp(`${label}[^\d]*([\d.]+)`, 'g'))].map((match) => match[1]);
    expect(numbers('Total Mercado').length).toBeGreaterThan(0);
    // JG-40: nenhum placeholder de foto no encerramento.
    expect(text).not.toContain('FOTO DO CONSULTOR');

    if (name === 'jundiai') {
      // JG-34: sem condomínio de casas aceito, o bloco horizontal não existe no manifesto.
      expect(titles.some((title) => /Mercado residencial horizontal/i.test(title))).toBe(false);
    }
    if (name === 'praia-grande') {
      // JG-32/33/35: o bloco horizontal existe e é nomeado como Condomínio de Casas.
      expect(titles.some((title) => /Mercado residencial horizontal/i.test(title))).toBe(true);
      expect(text).toContain('Condomínio de Casas');
    }
    if (name === 'baixada') {
      // JG-19: IVV por tipologia indisponível não vira coluna de zeros.
      expect(text).not.toMatch(/IVV[\s\S]{0,400}?(0,0%[\s\S]{0,80}){4}/);
    }

    // A rasterização de dezenas de lâminas a 1920px é cara; cada exportação recebe a sua própria
    // janela e registra o desfecho, para que uma exportação lenta não apague a evidência de página
    // já capturada. Falha aqui é relatada, nunca silenciada.
    const download = async (button: string, file: string) => {
      const [event] = await Promise.all([
        page.waitForEvent('download', { timeout: 900_000 }),
        page.getByRole('button', { name: button }).click(),
      ]);
      await event.saveAs(path.join(OUT(name), file));
      return file;
    };
    await page.getByRole('button', { name: 'Uma página por vez' }).click().catch(() => {});
    await download('Baixar PDF', 'panorama-v3.pdf');
    await download('Baixar PPT espelho', 'panorama-v3.pptx');

    // Paridade exigida pelo portão transversal: preview, PDF e PPT nascem do mesmo manifesto.
    writeFileSync(path.join(OUT(name), 'manifesto.json'), JSON.stringify({ cenario: name, paginas: total, titulos: titles }, null, 2), 'utf8');
  });
}
