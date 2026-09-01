#!/usr/bin/env node
/**
 * Consistência da taxonomia horizontal da GeoBrain — evidência para a política de universo
 * Secovi (`domain/entity-policy.ts`).
 *
 * Origem: o Edgar indicou `data[].typologies_history[].pattern` como o padrão histórico do
 * período (e `data[].standard` como o padrão atual), com a descrição `Condomínio de Casas/Sobrados`.
 * Este script mede se a regra é consistente entre municípios e quanto ela muda em relação à
 * heurística de nome que a política usa hoje.
 *
 * O que ele apura, por município:
 *   1. `pattern` só existe no contrato **v2**; o legado não traz o campo — logo a regra exige v2;
 *   2. inventário completo dos valores de `standard` e de `pattern`;
 *   3. quantos empreendimentos entram no universo Secovi pela regra do campo real;
 *   4. quantos entrariam pela heurística de nome atual — a diferença é o tamanho do bug;
 *   5. divergência entre `standard` e o histórico, e empreendimentos cujo `pattern` alterna entre
 *      rótulo de produto e rótulo socioeconômico (a taxonomia mistura dois eixos num campo só).
 *
 * O v2 apresenta 500 transitório em `Ativo` e `Esgotado`; o `withRetry` abaixo conta as
 * recuperações porque elas são evidência do portão de resiliência da V3.
 *
 * Credencial: `.secrets/geobrain.env`. Saída: `.tmp/horizontal-taxonomia.{json,md}`.
 *
 * Uso:
 *   node scripts/panorama-horizontal-taxonomy.mjs --cities "SP:Jundiaí,SP:Piracicaba,RS:Porto Alegre"
 *   node scripts/panorama-horizontal-taxonomy.mjs --preset secovi-fiergs
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://geobrain.com.br/public-api';
const V2_URL = 'https://api.geobrain.com.br/public-api/v2';
const PER_PAGE = 100;
const CONDO_PATTERN_LABEL = 'Condomínio de Casas/Sobrados';

/** Recorte de referência: praças SP do Secovi e praças RS da FIERGS. */
const PRESETS = {
  'secovi-fiergs': [
    'SP:Jundiaí', 'SP:Piracicaba', 'SP:Barretos', 'SP:Campinas', 'SP:Sorocaba', 'SP:Ribeirão Preto',
    'SP:São José dos Campos', 'SP:Bauru', 'SP:Indaiatuba', 'SP:Itu', 'SP:Guarujá', 'SP:Praia Grande',
    'SP:Santos', 'SP:São Vicente', 'SP:Bertioga', 'SP:Caraguatatuba',
    'RS:Porto Alegre', 'RS:Canoas', 'RS:Gravataí', 'RS:Caxias do Sul', 'RS:Novo Hamburgo',
    'RS:Pelotas', 'RS:Tramandaí', 'RS:Capão da Canoa',
  ],
};

// --- credencial e requisição ------------------------------------------------

async function token() {
  const path = resolve(ROOT, '.secrets/geobrain.env');
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new Error(`Credencial ausente: ${path}. Copie \`.secrets/geobrain.env.example\` e preencha.`);
  }
  const env = Object.fromEntries(
    raw.split(/\r?\n/).map((line) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)).filter(Boolean)
      .map((match) => [match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2')])
  );
  if (env.GEOBRAIN_TOKEN) return env.GEOBRAIN_TOKEN;
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: env.GEOBRAIN_EMAIL, password: env.GEOBRAIN_PASSWORD }),
  });
  const body = await response.json();
  if (!response.ok || typeof body?.token !== 'string') throw new Error(`Login falhou (HTTP ${response.status}).`);
  return body.token;
}

const retries = { total: 0, byStatus: {} };

async function withRetry(url, bearer, method, label, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' } });
    if (response.ok) {
      if (attempt > 1) {
        retries.total += 1;
        retries.byStatus[label] = (retries.byStatus[label] ?? 0) + 1;
      }
      return response.json();
    }
    if (attempt === tries) return { __error: `HTTP ${response.status} após ${tries} tentativas` };
  }
}

async function fetchHorizontals(bearer, uf, city, { v2 }) {
  const rows = [];
  const statuses = v2 ? ['Ativo', 'Esgotado'] : [null];
  for (const status of statuses) {
    let page = 1;
    let lastPage = 1;
    do {
      const url = new URL(`${v2 ? V2_URL : BASE_URL}/building-with-history`);
      url.searchParams.set('type', 'Horizontal');
      if (status) url.searchParams.set('status', status);
      url.searchParams.set('city', city);
      url.searchParams.set('uf', uf);
      url.searchParams.set('per_page', String(PER_PAGE));
      url.searchParams.set('page', String(page));
      const body = await withRetry(url, bearer, v2 ? 'POST' : 'GET', `${v2 ? 'v2' : 'legado'}·${status ?? '—'}`);
      if (body.__error) return { error: body.__error, rows };
      rows.push(...(body.data ?? []));
      lastPage = Number(body.meta?.last_page ?? 1);
      page += 1;
    } while (page <= lastPage);
  }
  return { error: null, rows };
}

async function probeV2ProductFilters(bearer) {
  const scope = { uf: 'SP', city: 'Praia Grande', type: 'Horizontal', status: 'Ativo', per_page: 100, page: 1 };
  const variants = {
    baseline: {},
    standard: { standard: CONDO_PATTERN_LABEL },
    pattern: { pattern: CONDO_PATTERN_LABEL },
    product_type: { product_type: CONDO_PATTERN_LABEL },
  };
  const result = {};
  for (const [name, extra] of Object.entries(variants)) {
    const url = new URL(`${V2_URL}/building-with-history`);
    for (const [key, value] of Object.entries({ ...scope, ...extra })) url.searchParams.set(key, String(value));
    const body = await withRetry(url, bearer, 'POST', `probe·${name}`);
    const rows = body.__error ? [] : (body.data ?? []);
    result[name] = {
      error: body.__error ?? null,
      total: body.__error ? null : Number(body.meta?.total ?? rows.length),
      ids: rows.map((building) => building.building_id ?? building.id ?? null),
      returnedCondoLabel: rows.filter((building) => acceptedByField(building).accepted).length,
    };
  }
  return result;
}

// --- taxonomia --------------------------------------------------------------

const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Rótulos que descrevem **produto horizontal**, não padrão socioeconômico. */
const PRODUCT_LABELS = new Map([
  ['condominio de casas/sobrados', 'condominio_casas'],
  ['loteamento fechado', 'loteamento'],
  ['loteamento aberto', 'loteamento'],
  ['condominio de chacaras', 'chacaras'],
  // Descobertos na varredura de 24 municipios; nao apareciam no recorte inicial.
  ['loteamento comercial', 'loteamento'],
  ['terreno', 'terreno'],
]);

/** Rótulos socioeconômicos: dizem o padrão, não o produto. `Futuro` é marcador de período. */
const SOCIOECONOMIC_LABELS = new Set(['economico', 'standard', 'medio', 'medio-alto', 'alto', 'luxo', 'futuro']);
const PRODUCT_CANDIDATE_FIELDS = [
  'building_subtype', 'subtype', 'sub_type', 'horizontal_type', 'product_type',
  'building_type', 'type', 'standard',
];

function classifyLabel(value) {
  const key = normalize(value);
  if (!key) return 'ausente';
  if (PRODUCT_LABELS.has(key)) return PRODUCT_LABELS.get(key);
  if (SOCIOECONOMIC_LABELS.has(key)) return 'socioeconomico';
  return 'desconhecido';
}

/** Regra proposta: pertinência decidida uma vez, por `standard` **ou** qualquer `pattern` histórico. */
function acceptedByField(building) {
  const patterns = (building.typologies_history ?? []).map((entry) => entry.pattern);
  const labels = [building.standard, ...patterns].map(classifyLabel);
  if (labels.includes('condominio_casas')) return { accepted: true, reason: 'condominio_casas' };
  if (labels.some((label) => label === 'loteamento' || label === 'chacaras' || label === 'terreno')) return { accepted: false, reason: 'produto_fora_da_politica' };
  if (labels.every((label) => label === 'ausente')) return { accepted: false, reason: 'sem_padrao' };
  return { accepted: false, reason: 'apenas_socioeconomico' };
}

// --- espelho da heurística vigente (entity-policy.ts) ----------------------

const CONDO_HEURISTIC = /(condominio|cond\.?\s|casas em condominio|cond de casas|casa em condominio|horizontal fechado|condominio fechado)/;
const LOT_HEURISTIC = /(loteamento|lote|gleba|desmembramento|chacara|sitio)/;
const SEGMENT_ONLY = /^(horizontal|residencial horizontal|vertical|residencial vertical)$/;

/** Reproduz `classifyHorizontalSubtype` para medir a diferença, não para usar em produção. */
function acceptedByNameHeuristic(building) {
  const fields = [
    building.building_subtype ?? building.subtype ?? building.sub_type ?? building.horizontal_type ?? building.product_type,
    building.building_type ?? building.type,
    building.name ?? building.building_name,
  ].map(normalize).filter((field) => field && !SEGMENT_ONLY.test(field));
  if (!fields.length) return { accepted: false, reason: 'indefinido' };
  for (const field of fields) {
    if (LOT_HEURISTIC.test(field)) return { accepted: false, reason: 'loteamento' };
    if (CONDO_HEURISTIC.test(field)) return { accepted: true, reason: 'condominio_casas' };
  }
  return { accepted: false, reason: 'outro' };
}

// --- execução ---------------------------------------------------------------

function tally(rows, get) {
  const map = new Map();
  for (const row of rows) {
    const key = String(get(row) ?? '(ausente)');
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1]));
}

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
  const list = args.cities ? String(args.cities).split(',') : PRESETS[String(args.preset ?? 'secovi-fiergs')];
  if (!list?.length) throw new Error('Informe --cities "UF:Cidade,..." ou --preset secovi-fiergs.');
  const targets = list.map((entry) => {
    const [uf, ...rest] = entry.split(':');
    return { uf: uf.trim().toUpperCase(), city: rest.join(':').trim() };
  });

  const bearer = await token();
  const report = { startedAt: new Date().toISOString(), condoLabel: CONDO_PATTERN_LABEL, cities: [], legacyFieldCheck: null, filterProbe: null, retries: null };

  report.filterProbe = await probeV2ProductFilters(bearer);

  // Checagem de contrato: o legado tem `pattern` em `typologies_history`?
  const legacy = await fetchHorizontals(bearer, targets[0].uf, targets[0].city, { v2: false });
  const legacyEntries = legacy.rows.flatMap((building) => building.typologies_history ?? []);
  report.legacyFieldCheck = {
    city: `${targets[0].uf}:${targets[0].city}`,
    buildings: legacy.rows.length,
    historyRows: legacyEntries.length,
    withPattern: legacyEntries.filter((entry) => entry.pattern != null && entry.pattern !== '').length,
    fields: Object.keys(legacyEntries[0] ?? {}),
  };
  console.log(
    `Contrato legado (${report.legacyFieldCheck.city}): ${report.legacyFieldCheck.historyRows} linhas de histórico, ` +
      `${report.legacyFieldCheck.withPattern} com \`pattern\`.`
  );

  for (const { uf, city } of targets) {
    process.stdout.write(`\n${uf}:${city} … `);
    const { error, rows } = await fetchHorizontals(bearer, uf, city, { v2: true });
    if (error) {
      console.log(`falhou (${error})`);
      report.cities.push({ uf, city, error, horizontals: 0 });
      continue;
    }
    const history = rows.flatMap((building) => building.typologies_history ?? []);
    const byField = rows.map((building) => ({ building, decision: acceptedByField(building) }));
    const byName = rows.map((building) => ({ building, decision: acceptedByNameHeuristic(building) }));
    const accepted = byField.filter((entry) => entry.decision.accepted);
    const ambiguous = byField.filter((entry) => entry.decision.reason === 'apenas_socioeconomico');

    // Divergência entre padrão atual e histórico, e mistura de eixos no mesmo empreendimento.
    const standardOnly = rows.filter(
      (building) => classifyLabel(building.standard) === 'condominio_casas'
        && !(building.typologies_history ?? []).some((entry) => classifyLabel(entry.pattern) === 'condominio_casas')
    ).length;
    const historyOnly = rows.filter(
      (building) => classifyLabel(building.standard) !== 'condominio_casas'
        && (building.typologies_history ?? []).some((entry) => classifyLabel(entry.pattern) === 'condominio_casas')
    ).length;
    const mixedAxes = accepted.filter((entry) =>
      (entry.building.typologies_history ?? []).some((row) => classifyLabel(row.pattern) === 'socioeconomico')
    ).length;

    report.cities.push({
      uf,
      city,
      error: null,
      horizontals: rows.length,
      historyRows: history.length,
      standardTally: tally(rows, (building) => building.standard),
      patternTally: tally(history, (entry) => entry.pattern),
      acceptedByField: accepted.length,
      rejectionsByField: tally(byField.filter((entry) => !entry.decision.accepted), (entry) => entry.decision.reason),
      acceptedByNameHeuristic: byName.filter((entry) => entry.decision.accepted).length,
      // Onde as duas regras discordam: é o bug, por município.
      disagreements: {
        fieldYesNameNo: byField.filter((entry, index) => entry.decision.accepted && !byName[index].decision.accepted).length,
        fieldNoNameYes: byField.filter((entry, index) => !entry.decision.accepted && byName[index].decision.accepted).length,
      },
      standardOnly,
      historyOnly,
      mixedAxes,
      acceptedNames: accepted.map((entry) => String(entry.building.name ?? entry.building.building_name ?? '?')),
      ambiguousAudit: {
        count: ambiguous.length,
        candidateFieldCoverage: Object.fromEntries(PRODUCT_CANDIDATE_FIELDS.map((field) => [
          field,
          ambiguous.filter(({ building }) => building[field] != null && String(building[field]).trim() !== '').length,
        ])),
        candidateFieldValues: Object.fromEntries(PRODUCT_CANDIDATE_FIELDS.map((field) => [
          field,
          tally(ambiguous, ({ building }) => building[field]),
        ])),
        historyTypeOfTypology: tally(
          ambiguous.flatMap(({ building }) => building.typologies_history ?? []),
          (entry) => entry.type_of_typology,
        ),
        samples: ambiguous.slice(0, 5).map(({ building }) => ({
          id: building.building_id ?? building.id ?? null,
          name: building.name ?? building.building_name ?? null,
          building_type: building.building_type ?? null,
          type: building.type ?? null,
          standard: building.standard ?? null,
          candidateFields: Object.fromEntries(PRODUCT_CANDIDATE_FIELDS.map((field) => [field, building[field] ?? null])),
          historyPatterns: [...new Set((building.typologies_history ?? []).map((entry) => entry.pattern ?? null))],
          historyTypeOfTypology: [...new Set((building.typologies_history ?? []).map((entry) => entry.type_of_typology ?? null))],
        })),
      },
    });
    process.stdout.write(
      `${rows.length} horizontais · ${accepted.length} aceitos pelo campo · ${byName.filter((entry) => entry.decision.accepted).length} pela heurística de nome`
    );
  }

  report.retries = { ...retries };
  const outDir = resolve(ROOT, '.tmp');
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'horizontal-taxonomia.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(resolve(outDir, 'horizontal-taxonomia.md'), renderMarkdown(report), 'utf8');
  console.log(`\n\nRelatório em .tmp/horizontal-taxonomia.json e .md`);
  console.log(`Retries que salvaram uma chamada 500: ${retries.total} — ${JSON.stringify(retries.byStatus)}`);
}

function renderMarkdown(report) {
  const ok = report.cities.filter((city) => !city.error);
  const ambiguousTotal = ok.reduce((sum, city) => sum + (city.ambiguousAudit?.count ?? 0), 0);
  const allPatterns = new Map();
  for (const city of ok) for (const [label, count] of Object.entries(city.patternTally)) allPatterns.set(label, (allPatterns.get(label) ?? 0) + count);

  const lines = [
    '# Taxonomia horizontal da GeoBrain — consistência entre municípios',
    '',
    `**Executado em:** ${report.startedAt}`,
    `**Rótulo de aceite:** \`${report.condoLabel}\``,
    `**Municípios consultados:** ${report.cities.length} (${ok.length} responderam)`,
    '',
    '## Contrato: `pattern` existe só no v2',
    '',
    `Legado em ${report.legacyFieldCheck.city}: ${report.legacyFieldCheck.historyRows} linhas de \`typologies_history\`, ` +
      `**${report.legacyFieldCheck.withPattern}** com \`pattern\`.`,
    '',
    `Campos do legado: \`${report.legacyFieldCheck.fields.join('`, `')}\``,
    '',
    `Retries que converteram um 500 em 200: **${report.retries.total}** — ${JSON.stringify(report.retries.byStatus)}`,
    '',
    '## Filtros de produto no v2',
    '',
    '| Variante | Total | IDs iguais à consulta-base | Condomínios rotulados retornados |',
    '|---|---:|---|---:|',
    ...Object.entries(report.filterProbe ?? {}).map(([name, probe]) => {
      const baselineIds = JSON.stringify(report.filterProbe?.baseline?.ids ?? []);
      return `| ${name} | ${probe.total ?? '—'} | ${JSON.stringify(probe.ids ?? []) === baselineIds ? 'sim' : 'não'} | ${probe.returnedCondoLabel ?? '—'} |`;
    }),
    '',
    'Parâmetros experimentais que devolvem os mesmos IDs da base foram ignorados pelo endpoint; não filtram produto.',
    '',
    '## Universo horizontal por município',
    '',
    '| UF | Município | Horizontais | Aceitos pelo campo | Aceitos pela heurística de nome | Campo sim / nome não | Campo não / nome sim |',
    '|---|---|---:|---:|---:|---:|---:|',
  ];
  for (const city of report.cities) {
    if (city.error) {
      lines.push(`| ${city.uf} | ${city.city} | — | — | — | — | — |`);
      continue;
    }
    lines.push(
      `| ${city.uf} | ${city.city} | ${city.horizontals} | ${city.acceptedByField} | ${city.acceptedByNameHeuristic} | ` +
        `${city.disagreements.fieldYesNameNo} | ${city.disagreements.fieldNoNameYes} |`
    );
  }

  lines.push('', '## Inventário de `pattern` (todos os municípios)', '', '| Rótulo | Eixo | Linhas |', '|---|---|---:|');
  for (const [label, count] of [...allPatterns.entries()].sort((a, b) => b[1] - a[1])) {
    const axis = { condominio_casas: 'produto (aceito)', loteamento: 'produto (excluído)', chacaras: 'produto (excluído)', terreno: 'produto (excluído)', socioeconomico: 'socioeconômico', ausente: '—', desconhecido: '**não mapeado**' }[classifyLabel(label)];
    lines.push(`| ${label} | ${axis} | ${count} |`);
  }

  lines.push('', '## Divergências e mistura de eixos', '', '| UF | Município | Só no `standard` | Só no histórico | Aceitos que também têm rótulo socioeconômico | Aceitos |', '|---|---|---:|---:|---:|---|');
  for (const city of ok) {
    lines.push(
      `| ${city.uf} | ${city.city} | ${city.standardOnly} | ${city.historyOnly} | ${city.mixedAxes} | ${city.acceptedNames.join(', ') || '—'} |`
    );
  }

  lines.push(
    '',
    '## Auditoria dos produtos não informados',
    '',
    `Registros com apenas eixo socioeconômico: **${ambiguousTotal}**.`,
    '',
    '| Campo candidato | Preenchidos nos ambíguos |',
    '|---|---:|',
  );
  for (const field of PRODUCT_CANDIDATE_FIELDS) {
    const count = ok.reduce((sum, city) => sum + Number(city.ambiguousAudit?.candidateFieldCoverage?.[field] ?? 0), 0);
    lines.push(`| ${field} | ${count} |`);
  }

  const notMapped = [...allPatterns.keys()].filter((label) => classifyLabel(label) === 'desconhecido');
  lines.push(
    '',
    '## Leitura',
    '',
    `- Rótulos de \`pattern\` não mapeados pela política: ${notMapped.length ? notMapped.join(', ') : 'nenhum'}`,
    `- Municípios sem nenhum condomínio de casas: ${ok.filter((city) => city.acceptedByField === 0).map((city) => `${city.uf}:${city.city}`).join(', ') || 'nenhum'}`,
    `- Municípios onde as duas regras discordam: ${ok.filter((city) => city.disagreements.fieldYesNameNo + city.disagreements.fieldNoNameYes > 0).map((city) => `${city.uf}:${city.city}`).join(', ') || 'nenhum'}`,
    ''
  );
  return lines.join('\n');
}

main().catch((error) => {
  console.error(`\nFalhou: ${error.message}`);
  process.exit(1);
});
