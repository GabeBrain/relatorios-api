#!/usr/bin/env node
/**
 * Evidência autenticada do Panorama V2 — portões 4 e 5 de
 * `docs/features/Relatorios Secovi_FIERGS/MAPEAMENTO_V2_MULTICIDADES_2026-08-31.md`.
 *
 * O que ele responde, por município do recorte:
 *   1. qual contrato de prédios respondeu — `v2/building-with-history` ou o fallback legado
 *      (o mapeamento registra 401 no v2 com token de sessão; isto passa a ser medido, não suposto);
 *   2. cobertura real de cada uma das dez séries temporais: status HTTP, nº de linhas, períodos
 *      distintos e se cada período veio mensal ou trimestral — a mistura que o normalizador trata;
 *   3. quais séries responderam 200 sem linhas, que é a origem do `0` impresso em tabela/gráfico
 *      (incidente 3 do mapeamento) e nunca deve ser lido como agregado trimestral válido.
 *
 * Credencial: `.secrets/geobrain.env` (ignorado pelo Git). Nada é impresso além de nomes de chave.
 * Saída: `.tmp/panorama-evidencia-<trimestre>.{json,md}` (pasta ignorada pelo Git).
 *
 * Uso:
 *   node scripts/panorama-evidence.mjs --uf SP --cities "Guarujá,Praia Grande,Santos,São Vicente" --quarter 2T2026
 *
 * As janelas e parâmetros espelham `src/features/panorama-secovi-fiergs/api.ts` e
 * `domain/quarters.ts`. Ao mudar a coleta do produto, mude aqui também — a evidência só vale
 * enquanto reproduzir a requisição real.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://geobrain.com.br/public-api';
const BUILDINGS_V2_BASE_URL = 'https://api.geobrain.com.br/public-api/v2';
const PER_PAGE = 100;
const BUILDING_TYPES = ['Vertical', 'Horizontal'];
const BUILDING_STATUSES = ['Ativo', 'Esgotado'];
const EDITORIAL_WINDOW = 17;
const TEMPORAL_ENDPOINTS = ['sales', 'stock', 'ivv', 'medium-prices', 'medium-prices-meter'];
const GROUPINGS = ['Padrão', 'Tipologia'];

// --- trimestres (espelho de domain/quarters.ts) ------------------------------

const QUARTER_PATTERN = /^([1-4])T(\d{4})$/;

function quarterIndex(quarter) {
  const match = QUARTER_PATTERN.exec(quarter);
  if (!match) throw new Error(`Trimestre inválido: ${quarter}. Use o formato 2T2026.`);
  return Number(match[2]) * 4 + Number(match[1]) - 1;
}

const quarterFromIndex = (index) => `${(index % 4) + 1}T${Math.floor(index / 4)}`;

function quarterStartDate(quarter) {
  const match = QUARTER_PATTERN.exec(quarter);
  return `${match[2]}-${String(Number(match[1]) * 3 - 2).padStart(2, '0')}-01`;
}

function quarterEndDate(quarter) {
  const match = QUARTER_PATTERN.exec(quarter);
  const month = Number(match[1]) * 3;
  const lastDay = new Date(Date.UTC(Number(match[2]), month, 0)).getUTCDate();
  return `${match[2]}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/** Janela editorial: 17 trimestres terminando no fechamento escolhido. */
function temporalWindow(endQuarter) {
  const first = quarterFromIndex(quarterIndex(endQuarter) - (EDITORIAL_WINDOW - 1));
  return { start: quarterStartDate(first), end: quarterEndDate(endQuarter), firstQuarter: first };
}

// --- credencial -------------------------------------------------------------

function parseEnvFile(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

async function loadCredentials() {
  const path = resolve(ROOT, '.secrets/geobrain.env');
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new Error(
      `Credencial ausente: ${path}\n` +
        'Copie `.secrets/geobrain.env.example` para `.secrets/geobrain.env` e preencha ' +
        'GEOBRAIN_EMAIL + GEOBRAIN_PASSWORD (ou apenas GEOBRAIN_TOKEN).'
    );
  }
  const env = parseEnvFile(raw);
  const present = Object.keys(env).filter((key) => env[key]);
  console.log(`Credencial lida de .secrets/geobrain.env — chaves preenchidas: ${present.join(', ') || 'nenhuma'}`);
  return env;
}

/** Mesmo fluxo do AuthBlock: POST /auth/login e uso do campo `token` como Bearer. */
async function resolveToken(env) {
  if (env.GEOBRAIN_TOKEN) return { token: env.GEOBRAIN_TOKEN, origin: 'GEOBRAIN_TOKEN (Bearer fornecido)' };
  if (!env.GEOBRAIN_EMAIL || !env.GEOBRAIN_PASSWORD) {
    throw new Error('Preencha GEOBRAIN_EMAIL e GEOBRAIN_PASSWORD, ou GEOBRAIN_TOKEN.');
  }
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: env.GEOBRAIN_EMAIL, password: env.GEOBRAIN_PASSWORD }),
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    throw new Error(
      `/auth/login respondeu ${response.status} com ${contentType || 'tipo desconhecido'} em vez de JSON. ` +
        'É o sintoma de host/rota errados ou de bloqueio antes da API.'
    );
  }
  const body = await response.json();
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!response.ok || !token) throw new Error(`Login falhou (HTTP ${response.status}): resposta sem campo \`token\`.`);
  return { token, origin: `login de ${env.GEOBRAIN_EMAIL}` };
}

// --- requisição -------------------------------------------------------------

function buildUrl(url, query) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) for (const item of value) target.searchParams.append(key, String(item));
    else target.searchParams.set(key, String(value));
  }
  return target;
}

async function request(token, { url, query, method = 'GET' }) {
  const started = Date.now();
  try {
    const response = await fetch(buildUrl(url, query), {
      method,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      return { ok: false, status: response.status, ms: Date.now() - started, error: `resposta ${contentType || 'sem content-type'}, não JSON` };
    }
    const data = await response.json();
    return { ok: response.ok, status: response.status, ms: Date.now() - started, data };
  } catch (error) {
    return { ok: false, status: null, ms: Date.now() - started, error: String(error?.message ?? error) };
  }
}

async function paginate(token, spec) {
  const rows = [];
  let page = 1;
  let lastPage = 1;
  let pages = 0;
  do {
    const response = await request(token, { ...spec, query: { ...spec.query, per_page: PER_PAGE, page } });
    if (!response.ok || !response.data) return { ok: false, status: response.status, error: response.error, rows, pages };
    rows.push(...(Array.isArray(response.data.data) ? response.data.data : []));
    lastPage = Number(response.data.meta?.last_page ?? 1);
    pages += 1;
    page += 1;
  } while (page <= lastPage);
  return { ok: true, status: 200, rows, pages };
}

// --- classificação de período ----------------------------------------------

/**
 * Espelha `periodToQuarter` (ISO, MM/YYYY, trimestre explícito) e vai um passo além: para datas,
 * separa **fechamento de trimestre** (mês 3, 6, 9 ou 12) de **mês intermediário**. É essa a
 * distinção que o normalizador temporal precisa — o formato ISO por si só não a revela, e tratar
 * todo ISO como "mensal" esconderia justamente a mistura que o portão 4 quer medir.
 * `unknown` nunca vira zero: vira aviso rastreável.
 */
function classifyPeriod(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { kind: 'unknown', label: '(vazio)' };
  if (/^([1-4])[ºo]?T[/-]?\d{4}$/i.test(raw)) return { kind: 'explicitQuarter', label: raw };
  const iso = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(raw);
  const brazil = /^(\d{1,2})\/(\d{4})$/.exec(raw);
  const month = Number(iso?.[2] ?? brazil?.[1]);
  if (Number.isInteger(month) && month >= 1 && month <= 12) {
    return { kind: month % 3 === 0 ? 'quarterAligned' : 'intermediateMonth', label: raw };
  }
  return { kind: 'unknown', label: raw };
}

const PERIOD_FIELDS = ['period', 'periodo', 'período', 'date', 'data', 'reference_period', 'quarter'];

function periodOf(row) {
  for (const field of PERIOD_FIELDS) if (row?.[field] != null && row[field] !== '') return row[field];
  return null;
}

// --- coleta por cidade ------------------------------------------------------

async function probeBuildingsV2(token, { uf, city }) {
  // Sonda de paridade: uma página basta para registrar o status do contrato v2.
  const response = await request(token, {
    method: 'POST',
    url: `${BUILDINGS_V2_BASE_URL}/building-with-history`,
    query: { type: BUILDING_TYPES[0], status: BUILDING_STATUSES[0], city, uf, per_page: PER_PAGE, page: 1 },
  });
  return { ok: response.ok, status: response.status, error: response.error ?? null, ms: response.ms };
}

async function collectBuildingsLegacy(token, { uf, city }) {
  const byType = {};
  let total = 0;
  for (const type of BUILDING_TYPES) {
    const result = await paginate(token, { url: `${BASE_URL}/building-with-history`, query: { type, city, uf } });
    byType[type] = { ok: result.ok, status: result.status, error: result.error ?? null, buildings: result.rows.length, pages: result.pages };
    total += result.rows.length;
  }
  return { total, byType, ok: Object.values(byType).every((entry) => entry.ok) };
}

async function collectTemporal(token, { uf, city }, window) {
  const series = [];
  for (const endpoint of TEMPORAL_ENDPOINTS) {
    for (const groupBy of GROUPINGS) {
      const result = await paginate(token, {
        url: `${BASE_URL}/temporal-analysis-city/${endpoint}`,
        query: { city, uf, start_period: window.start, end_period: window.end, group_by: groupBy, 'type[]': BUILDING_TYPES },
      });
      const periods = new Map();
      for (const row of result.rows) {
        const classified = classifyPeriod(periodOf(row));
        periods.set(classified.label, classified.kind);
      }
      const kinds = [...periods.values()];
      series.push({
        endpoint,
        groupBy,
        ok: result.ok,
        status: result.status,
        error: result.error ?? null,
        rows: result.rows.length,
        emptyOk: result.ok && result.rows.length === 0,
        distinctPeriods: periods.size,
        explicitQuarter: kinds.filter((kind) => kind === 'explicitQuarter').length,
        quarterAligned: kinds.filter((kind) => kind === 'quarterAligned').length,
        intermediateMonth: kinds.filter((kind) => kind === 'intermediateMonth').length,
        unknown: kinds.filter((kind) => kind === 'unknown').length,
        // Lista completa e ordenada: é a evidência de cobertura, não uma amostra.
        periods: [...periods.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, kind]) => ({ label, kind })),
      });
    }
  }
  return series;
}

// --- relatório --------------------------------------------------------------

function renderMarkdown(report) {
  const lines = [
    `# Evidência autenticada do Panorama V2 — ${report.scope.quarter}`,
    '',
    `**Executado em:** ${report.startedAt}`,
    `**Recorte:** ${report.scope.uf} · ${report.scope.cities.join(', ')}`,
    `**Janela temporal:** ${report.window.firstQuarter} → ${report.scope.quarter} (${report.window.start} a ${report.window.end})`,
    `**Origem do token:** ${report.tokenOrigin}`,
    '',
    '## Portão 5 — qual contrato de prédios respondeu',
    '',
    '| Cidade | v2/building-with-history | Legado | Empreendimentos (legado) |',
    '|---|---|---|---:|',
  ];
  for (const city of report.cities) {
    const v2 = city.buildingsV2.ok ? 'respondeu 200' : `HTTP ${city.buildingsV2.status ?? 'rede'}${city.buildingsV2.error ? ` · ${city.buildingsV2.error}` : ''}`;
    const legacyFailure = Object.entries(city.buildingsLegacy.byType)
      .filter(([, entry]) => !entry.ok)
      .map(([type, entry]) => `${type}: HTTP ${entry.status ?? 'rede'}`)
      .join(' · ');
    const legacy = city.buildingsLegacy.ok ? 'respondeu 200' : `falhou (${legacyFailure})`;
    lines.push(`| ${city.city} | ${v2} | ${legacy} | ${city.buildingsLegacy.total} |`);
  }
  lines.push(
    '',
    '## Portão 4 — cobertura das dez séries temporais',
    '',
    'Períodos distintos por classe. `200 sem linhas` é indisponibilidade explícita, não zero.',
    '',
    '| Cidade | Série | Grupo | Status | Linhas | Períodos | Fech. trimestre | Mês intermediário | Trim. explícito | Desconhecidos |',
    '|---|---|---|---|---:|---:|---:|---:|---:|---:|'
  );
  for (const city of report.cities) {
    for (const serie of city.temporal) {
      const status = serie.emptyOk ? '200 sem linhas' : serie.ok ? '200' : `HTTP ${serie.status ?? 'rede'}`;
      lines.push(
        `| ${city.city} | ${serie.endpoint} | ${serie.groupBy} | ${status} | ${serie.rows} | ` +
          `${serie.distinctPeriods} | ${serie.quarterAligned} | ${serie.intermediateMonth} | ${serie.explicitQuarter} | ${serie.unknown} |`
      );
    }
  }
  const empty = report.cities.flatMap((city) => city.temporal.filter((serie) => serie.emptyOk).map((serie) => `${city.city} · ${serie.endpoint} · ${serie.groupBy}`));
  const failed = report.cities.flatMap((city) => city.temporal.filter((serie) => !serie.ok).map((serie) => `${city.city} · ${serie.endpoint} · ${serie.groupBy} · HTTP ${serie.status ?? 'rede'}`));
  const mixed = report.cities.flatMap((city) =>
    city.temporal
      .filter((serie) => serie.intermediateMonth > 0 && serie.quarterAligned + serie.explicitQuarter > 0)
      .map((serie) => `${city.city} · ${serie.endpoint} · ${serie.groupBy} (${serie.intermediateMonth} meses intermediários + ${serie.quarterAligned + serie.explicitQuarter} fechamentos)`)
  );
  lines.push(
    '',
    '## Leitura',
    '',
    `- Frequência mista na mesma série (exige o normalizador temporal): ${mixed.length ? '\n  - ' + mixed.join('\n  - ') : 'nenhuma'}`,
    `- Séries com 200 e nenhuma linha (devem exibir indisponibilidade explícita): ${empty.length ? '\n  - ' + empty.join('\n  - ') : 'nenhuma'}`,
    `- Séries que falharam: ${failed.length ? '\n  - ' + failed.join('\n  - ') : 'nenhuma'}`,
    `- Períodos não reconhecidos pelo classificador: ${report.cities.reduce((total, city) => total + city.temporal.reduce((sum, serie) => sum + serie.unknown, 0), 0)}`,
    '',
    'Isto cobre os itens 4 e 5 do portão. A inspeção visual de preview/PDF continua sendo passo manual.',
    ''
  );
  return lines.join('\n');
}

// --- execução ---------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    args[argv[index].slice(2)] = argv[index + 1]?.startsWith('--') ? true : argv[index + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const uf = String(args.uf ?? 'SP').toUpperCase();
  const quarter = String(args.quarter ?? '2T2026').toUpperCase();
  const cities = String(args.cities ?? 'Guarujá,Praia Grande,Santos,São Vicente')
    .split(',')
    .map((city) => city.trim())
    .filter(Boolean);
  if (!cities.length) throw new Error('Informe ao menos um município em --cities.');

  const window = temporalWindow(quarter);
  const { token, origin } = await resolveToken(await loadCredentials());
  console.log(`Token obtido via ${origin}. Recorte: ${uf} · ${cities.join(', ')} · fechamento ${quarter}.`);

  const report = {
    startedAt: new Date().toISOString(),
    scope: { uf, cities, quarter },
    window,
    tokenOrigin: origin,
    cities: [],
  };

  // Uma cidade por vez, como CITY_CONCURRENCY = 1 no produto: a rajada maior fazia o
  // navegador abortar inclusive o fallback legado (incidente 2 do mapeamento).
  for (const city of cities) {
    const scope = { uf, city };
    process.stdout.write(`\n${city}: prédios v2… `);
    const buildingsV2 = await probeBuildingsV2(token, scope);
    process.stdout.write(`${buildingsV2.ok ? '200' : `HTTP ${buildingsV2.status ?? 'rede'}`} · legado… `);
    const buildingsLegacy = await collectBuildingsLegacy(token, scope);
    process.stdout.write(`${buildingsLegacy.total} empreendimentos · séries temporais… `);
    const temporal = await collectTemporal(token, scope, window);
    const usable = temporal.filter((serie) => serie.ok && serie.rows > 0).length;
    process.stdout.write(`${usable}/${temporal.length} com linhas`);
    report.cities.push({ city, buildingsV2, buildingsLegacy, temporal });
  }

  const outDir = resolve(ROOT, '.tmp');
  await mkdir(outDir, { recursive: true });
  const jsonPath = resolve(outDir, `panorama-evidencia-${quarter}.json`);
  const mdPath = resolve(outDir, `panorama-evidencia-${quarter}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, renderMarkdown(report), 'utf8');
  console.log(`\n\nRelatório gravado em:\n  ${jsonPath}\n  ${mdPath}`);
}

main().catch((error) => {
  console.error(`\nFalhou: ${error.message}`);
  process.exit(1);
});
