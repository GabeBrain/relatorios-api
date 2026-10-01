import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildCityCube, mergeCubes } from '../src/features/panorama-secovi-fiergs/domain/cube';
import { normalizeInternalBuilding } from '../src/features/panorama-secovi-fiergs/api';
import { offerByAreaBand, offerByStandard, offerByTypology } from '../src/features/panorama-secovi-fiergs/domain/aggregations';
import { normalizeCityTemporalRows } from '../src/features/panorama-secovi-fiergs/domain/temporal-normalization';
import { FIERGS_RM_PORTO_ALEGRE_STUDY_CITIES } from '../src/features/panorama-secovi-fiergs/presets';
import { buildPanoramaReportModel } from '../src/features/panorama-secovi-fiergs/report/model';
import { normalizeText } from '../src/features/panorama-secovi-fiergs/domain/taxonomy';

type Row = Record<string, unknown>;
type Segment = 'Vertical' | 'Horizontal' | 'Unknown';

const BASE = 'https://geobrain.com.br/public-api';
const INTERNAL_V2 = 'https://app.geobrain.com.br/public-api/v2';
const requestedCities = process.argv.slice(3);
const CITIES = requestedCities.length ? requestedCities : [...FIERGS_RM_PORTO_ALEGRE_STUDY_CITIES];
const END_QUARTER = '2T2026' as const;
const START_PERIOD = '2022-04-01';
const END_PERIOD = '2026-06-30';
const OUTPUT = resolve(process.argv[2] ?? '.tmp/fiergs-sales-reconciliation-2T2026.json');

function parseEnv(text: string): Record<string, string> {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) return [];
    return [[match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2')]];
  }));
}

async function bearerToken(): Promise<string> {
  const env = parseEnv(await readFile('.secrets/geobrain.env', 'utf8'));
  if (env.GEOBRAIN_TOKEN) {
    const probe = await fetch(`${BASE}/monitored-cities`, { headers: { Authorization: `Bearer ${env.GEOBRAIN_TOKEN}`, Accept: 'application/json' } });
    if (probe.ok) return env.GEOBRAIN_TOKEN;
  }
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email: env.GEOBRAIN_EMAIL, password: env.GEOBRAIN_PASSWORD }),
  });
  const payload = await response.json() as { token?: string; message?: string };
  if (!response.ok || !payload.token) throw new Error(`GeoBrain login HTTP ${response.status}: ${payload.message ?? 'token ausente'}`);
  return payload.token;
}

async function request(token: string, url: string, query: Record<string, string | number | string[]>, method: 'GET' | 'POST' = 'GET'): Promise<Row> {
  const target = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => target.searchParams.append(key, item));
    else target.searchParams.set(key, String(value));
  }
  let lastError = '';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(target, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: controller.signal });
      const text = await response.text();
      if (response.ok) return JSON.parse(text) as Row;
      lastError = `HTTP ${response.status}: ${text.slice(0, 240)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((done) => setTimeout(done, attempt * 500));
  }
  throw new Error(`${target.pathname} falhou: ${lastError}`);
}

async function paginate(token: string, url: string, query: Record<string, string | number | string[]>, method: 'GET' | 'POST' = 'GET'): Promise<Row[]> {
  const rows: Row[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const payload = await request(token, url, { ...query, per_page: 100, page }, method);
    rows.push(...(Array.isArray(payload.data) ? payload.data as Row[] : []));
    const meta = payload.meta as Row | undefined;
    lastPage = Number(meta?.last_page ?? 1);
    page += 1;
  } while (page <= lastPage);
  return rows;
}

async function salesRows(token: string, city: string, groupBy: 'Padrão' | 'Tipologia'): Promise<Row[]> {
  return paginate(token, `${BASE}/temporal-analysis-city/sales`, {
    city,
    uf: 'RS',
    start_period: START_PERIOD,
    end_period: END_PERIOD,
    group_by: groupBy,
    'type[]': ['Vertical', 'Horizontal'],
  });
}

async function stockRows(token: string, city: string, groupBy: 'Padrão' | 'Tipologia'): Promise<Row[]> {
  return paginate(token, `${BASE}/temporal-analysis-city/stock`, {
    city,
    uf: 'RS',
    start_period: START_PERIOD,
    end_period: END_PERIOD,
    group_by: groupBy,
    'type[]': ['Vertical', 'Horizontal'],
  });
}

async function buildingRows(token: string, city: string): Promise<Row[]> {
  const rows = (await Promise.all(['Vertical', 'Horizontal'].map((type) => paginate(token, `${INTERNAL_V2}/building-with-history-internal`, {
    city,
    uf: 'RS',
    type,
  }, 'POST')))).flat();
  return rows.filter((row) => ['Ativo', 'Esgotado'].includes(String(row.status ?? ''))).map(normalizeInternalBuilding);
}

function segmentOf(row: Row): Segment {
  const value = String(row.building_type ?? row.type ?? '').toLowerCase();
  if (value.includes('vertical')) return 'Vertical';
  if (value.includes('horizontal') || value.includes('casa') || value.includes('loteamento')) return 'Horizontal';
  return 'Unknown';
}

function valueOf(row: Row): number {
  const parsed = Number(row.liquid_sales ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function granularValueOf(row: Row): number {
  const parsed = Number(row.sold_in_period ?? row.liquid_sales ?? row.sold ?? row.sales ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function summarizeTemporal(city: string, rows: Row[]) {
  const normalized = normalizeCityTemporalRows(city, rows, 'flow').filter((row) => row.period === END_QUARTER);
  const rawClosingRows = rows.filter((row) => {
    const period = String(row.period ?? '').slice(0, 7);
    return period >= '2026-04' && period <= '2026-06';
  });
  const totals = { Vertical: 0, Horizontal: 0, Unknown: 0 };
  const groups = new Map<string, { vertical: number; horizontal: number; unknown: number }>();
  for (const row of normalized) {
    const segment = segmentOf(row);
    totals[segment] += valueOf(row);
    const label = String(row.group ?? row.pattern ?? row.standard ?? row.typology ?? '(sem grupo)');
    const current = groups.get(label) ?? { vertical: 0, horizontal: 0, unknown: 0 };
    if (segment === 'Vertical') current.vertical += valueOf(row);
    else if (segment === 'Horizontal') current.horizontal += valueOf(row);
    else current.unknown += valueOf(row);
    groups.set(label, current);
  }
  return {
    rawRows: rows.length,
    normalizedClosingRows: normalized.length,
    rawPeriodKinds: [...new Set(rows.map((row) => String(row.period ?? '')))].filter((period) => period.includes('2026')).sort(),
    rawClosingRows: rawClosingRows.map((row) => ({
      period: String(row.period ?? ''),
      segment: segmentOf(row),
      group: String(row.group ?? row.pattern ?? row.standard ?? row.typology ?? '(sem grupo)'),
      liquidSales: valueOf(row),
    })),
    closingRows: normalized.map((row) => ({
      period: String(row.period ?? ''),
      observedPeriod: String(row.temporal_observed_period ?? row.period ?? ''),
      segment: segmentOf(row),
      group: String(row.group ?? row.pattern ?? row.standard ?? row.typology ?? '(sem grupo)'),
      liquidSales: valueOf(row),
    })),
    totals: { ...totals, allSegments: totals.Vertical + totals.Horizontal + totals.Unknown },
    groups: [...groups].map(([label, values]) => ({ label, ...values })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  };
}

function stockValueOf(row: Row): number {
  const parsed = Number(row.stock ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function summarizeStock(city: string, rows: Row[]) {
  const normalized = normalizeCityTemporalRows(city, rows, 'snapshot').filter((row) => row.period === END_QUARTER);
  const totals = { Vertical: 0, Horizontal: 0, Unknown: 0 };
  const groups = new Map<string, { vertical: number; horizontal: number; unknown: number }>();
  for (const row of normalized) {
    const segment = segmentOf(row);
    totals[segment] += stockValueOf(row);
    const label = String(row.group ?? row.pattern ?? row.standard ?? row.typology ?? '(sem grupo)');
    const current = groups.get(label) ?? { vertical: 0, horizontal: 0, unknown: 0 };
    if (segment === 'Vertical') current.vertical += stockValueOf(row);
    else if (segment === 'Horizontal') current.horizontal += stockValueOf(row);
    else current.unknown += stockValueOf(row);
    groups.set(label, current);
  }
  return {
    rawRows: rows.length,
    closingRows: normalized.map((row) => ({
      period: String(row.period ?? ''),
      observedPeriod: String(row.temporal_observed_period ?? row.period ?? ''),
      segment: segmentOf(row),
      group: String(row.group ?? row.pattern ?? row.standard ?? row.typology ?? '(sem grupo)'),
      stock: stockValueOf(row),
    })),
    totals: { ...totals, allSegments: totals.Vertical + totals.Horizontal + totals.Unknown },
    groups: [...groups].map(([label, values]) => ({ label, ...values })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  };
}

function granularProjectEvidence(buildings: Row[], cube: ReturnType<typeof buildCityCube>) {
  const rawById = new Map(buildings.map((row) => [String(row.building_id ?? row.id ?? ''), row]));
  return cube.projects.filter((project) => project.segment === 'Vertical').flatMap((project) => {
    const raw = rawById.get(project.buildingId);
    const history = Array.isArray(raw?.typologies_history) ? raw.typologies_history as Row[] : [];
    const closing = history.filter((entry) => String(entry.period ?? '').slice(0, 7) <= '2026-06');
    const quarter = closing.filter((entry) => {
      const month = String(entry.period ?? '').slice(0, 7);
      return month >= '2026-04' && month <= '2026-06';
    });
    const months = Object.fromEntries(['2026-04', '2026-05', '2026-06'].map((month) => [month, quarter
      .filter((entry) => String(entry.period ?? '').slice(0, 7) === month)
      .reduce((sum, entry) => sum + granularValueOf(entry), 0)]));
    const quarterSum = Object.values(months).reduce((sum, value) => sum + value, 0);
    const latestMonth = closing.map((entry) => String(entry.period ?? '').slice(0, 7)).sort().at(-1) ?? null;
    const latestMonthSold = latestMonth === null ? 0 : closing
      .filter((entry) => String(entry.period ?? '').slice(0, 7) === latestMonth)
      .reduce((sum, entry) => sum + granularValueOf(entry), 0);
    const cubeSold = project.soldUnits ?? 0;
    if (quarterSum === cubeSold) return [];
    return [{
      buildingId: project.buildingId,
      name: project.name,
      releaseQuarter: project.releaseQuarter,
      months,
      quarterHistorySum: quarterSum,
      latestObservedMonth: latestMonth,
      latestObservedMonthSold: latestMonthSold,
      cubeSold,
      historySumMinusCube: quarterSum - cubeSold,
    }];
  });
}

function chacaraEvidence(buildings: Row[]) {
  return buildings.flatMap((building) => {
    if (!String(building.building_type ?? building.type ?? '').toLowerCase().includes('horizontal')) return [];
    const history = Array.isArray(building.typologies_history) ? building.typologies_history as Row[] : [];
    const labels = [building.standard, building.pattern, ...history.map((row) => row.pattern ?? row.standard)].map(normalizeText);
    if (!labels.includes('condominio de chacaras')) return [];
    const withinWindow = history.filter((row) => String(row.period ?? '').slice(0, 7) <= '2026-06');
    const latestMonth = withinWindow.map((row) => String(row.period ?? '').slice(0, 7)).sort().at(-1) ?? null;
    const latest = latestMonth ? withinWindow.filter((row) => String(row.period ?? '').slice(0, 7) === latestMonth) : [];
    const finalUnits = latest.reduce((total, row) => total + Number(row.typology_stock ?? row.stock ?? 0), 0);
    return [{ buildingId: String(building.building_id ?? building.id ?? ''), name: String(building.name ?? ''), latestMonth, finalUnits }];
  });
}

const token = await bearerToken();
const cities = [];
const cubes = [];
const patternSources: { city: string; rows: Row[] }[] = [];
const typologySources: { city: string; rows: Row[] }[] = [];
const stockPatternSources: { city: string; rows: Row[] }[] = [];
const stockTypologySources: { city: string; rows: Row[] }[] = [];

for (const city of CITIES) {
  process.stdout.write(`${city}… `);
  const [patternRows, typologyRows, stockPatternRows, stockTypologyRows, buildings] = await Promise.all([
    salesRows(token, city, 'Padrão'),
    salesRows(token, city, 'Tipologia'),
    stockRows(token, city, 'Padrão'),
    stockRows(token, city, 'Tipologia'),
    buildingRows(token, city),
  ]);
  const pattern = summarizeTemporal(city, patternRows);
  const typology = summarizeTemporal(city, typologyRows);
  const stockPattern = summarizeStock(city, stockPatternRows);
  const stockTypology = summarizeStock(city, stockTypologyRows);
  patternSources.push({ city, rows: patternRows });
  typologySources.push({ city, rows: typologyRows });
  stockPatternSources.push({ city, rows: stockPatternRows });
  stockTypologySources.push({ city, rows: stockTypologyRows });
  const cube = buildCityCube(buildings, { city, uf: 'RS', endQuarter: END_QUARTER, entity: 'fiergs-rs', engineVersion: 'v4' });
  cubes.push(cube);
  const areaTotal = offerByAreaBand(cube).find((row) => row.kind === 'total');
  const verticalProjects = cube.projects.filter((project) => project.segment === 'Vertical');
  const granularAllSold = verticalProjects.reduce((sum, project) => sum + (project.soldUnits ?? 0), 0);
  const granularWithAreaSold = areaTotal?.soldUnits ?? 0;
  const granularAllStock = verticalProjects.reduce((sum, project) => sum + (project.finalUnits ?? 0), 0);
  const granularWithAreaStock = areaTotal?.finalUnits ?? 0;
  const projectStockDifferences = verticalProjects.flatMap((project) => {
    const typologyStock = project.typologies.reduce((total, row) => total + (row.finalUnits ?? 0), 0);
    const projectStock = project.finalUnits ?? 0;
    return projectStock === typologyStock ? [] : [{
      buildingId: project.buildingId,
      name: project.name,
      projectStock,
      typologyStock,
      difference: projectStock - typologyStock,
    }];
  });
  const projectEvidence = granularProjectEvidence(buildings, cube);
  const chacaras = chacaraEvidence(buildings);
  cities.push({
    city,
    pattern,
    typology,
    stockPattern,
    stockTypology,
    currentCitySlide: pattern.totals.allSegments,
    granular: {
      acceptedProjects: cube.projects.length,
      acceptedVerticalProjects: verticalProjects.length,
      rejectedProjects: cube.rejections.length,
      allVerticalSold: granularAllSold,
      areaBandSold: granularWithAreaSold,
      withoutAreaSold: granularAllSold - granularWithAreaSold,
      projectsWhereQuarterHistoryDiffersFromCube: projectEvidence,
    },
    stock: {
      granularAllVertical: granularAllStock,
      granularAreaBand: granularWithAreaStock,
      granularWithoutArea: granularAllStock - granularWithAreaStock,
      byStandard: offerByStandard(cube).map((row) => ({ label: row.label, kind: row.kind, finalUnits: row.finalUnits })),
      byTypology: offerByTypology(cube).map((row) => ({ label: row.label, kind: row.kind, finalUnits: row.finalUnits })),
      projects: verticalProjects.map((project) => ({
        buildingId: project.buildingId,
        name: project.name,
        standard: project.standard,
        finalUnits: project.finalUnits,
        typologies: project.typologies.map((row) => ({ typology: row.typology, finalUnits: row.finalUnits })),
      })),
      projectStockDifferences,
    },
    horizontalPolicy: {
      rejectedChacaras: chacaras,
      rejectedChacaraProjects: chacaras.length,
      rejectedChacaraFinalUnits: chacaras.reduce((total, row) => total + row.finalUnits, 0),
    },
    deltas: {
      typologyMinusPatternVertical: typology.totals.Vertical - pattern.totals.Vertical,
      citySlideMinusPatternVertical: pattern.totals.allSegments - pattern.totals.Vertical,
      areaMinusPatternVertical: granularWithAreaSold - pattern.totals.Vertical,
    },
  });
  console.log(`vendas P=${pattern.totals.Vertical} T=${typology.totals.Vertical} A=${granularWithAreaSold}; estoque P=${stockPattern.totals.Vertical} T=${stockTypology.totals.Vertical} G=${granularAllStock} A=${granularWithAreaStock}`);
}

const mergedCube = mergeCubes(cubes, END_QUARTER, 'fiergs-rs');
const mergedAreaTotal = offerByAreaBand(mergedCube).find((row) => row.kind === 'total');
const sum = (pick: (row: typeof cities[number]) => number) => cities.reduce((total, row) => total + pick(row), 0);
const totals = {
  patternVertical: sum((row) => row.pattern.totals.Vertical),
  patternHorizontal: sum((row) => row.pattern.totals.Horizontal),
  patternUnknown: sum((row) => row.pattern.totals.Unknown),
  patternAllSegments: sum((row) => row.pattern.totals.allSegments),
  typologyVertical: sum((row) => row.typology.totals.Vertical),
  typologyHorizontal: sum((row) => row.typology.totals.Horizontal),
  typologyUnknown: sum((row) => row.typology.totals.Unknown),
  currentCitySlide: sum((row) => row.currentCitySlide),
  granularAllVerticalSold: sum((row) => row.granular.allVerticalSold),
  granularAreaBandSold: mergedAreaTotal?.soldUnits ?? 0,
  granularWithoutAreaSold: sum((row) => row.granular.withoutAreaSold),
};
const stockTotals = {
  patternVertical: sum((row) => row.stockPattern.totals.Vertical),
  patternHorizontal: sum((row) => row.stockPattern.totals.Horizontal),
  typologyVertical: sum((row) => row.stockTypology.totals.Vertical),
  typologyHorizontal: sum((row) => row.stockTypology.totals.Horizontal),
  granularAllVertical: sum((row) => row.stock.granularAllVertical),
  granularAreaBand: sum((row) => row.stock.granularAreaBand),
  granularWithoutArea: sum((row) => row.stock.granularWithoutArea),
};
const horizontalPolicyTotals = {
  rejectedChacaraProjects: sum((row) => row.horizontalPolicy.rejectedChacaraProjects),
  rejectedChacaraFinalUnits: sum((row) => row.horizontalPolicy.rejectedChacaraFinalUnits),
};
const source = (rows: Row[], available = true) => ({ rows, available, source: 'bancada autenticada FIERGS 2T2026' });
const empty = source([], false);
const runtimeModel = buildPanoramaReportModel({ uf: 'RS', cities: CITIES, startQuarter: '1T2023', endQuarter: END_QUARTER, entity: 'fiergs-rs', engineVersion: 'v4' }, [], {
  sales: source(patternSources.flatMap((item) => item.rows)),
  salesTypology: source(typologySources.flatMap((item) => item.rows)),
  stock: source(stockPatternSources.flatMap((item) => item.rows)),
  stockTypology: source(stockTypologySources.flatMap((item) => item.rows)),
  ivv: empty, ivvTypology: empty,
  ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty,
}, [], {
  cubes,
  provenance: { requestedCities: CITIES, completedCities: CITIES, failedCities: [] },
  citySalesSources: patternSources,
});
const runtime = {
  patternVertical: runtimeModel.sales.units.series.at(-1)?.vertical ?? null,
  typologyVertical: runtimeModel.sales.unitsByTypology.series.at(-1)?.vertical ?? null,
  cityVertical: runtimeModel.cityComparisons.sales.reduce((total, row) => total + (row.liquidSales ?? 0), 0),
  areaVertical: runtimeModel.granular.areaBands.find((row) => row.kind === 'total')?.soldUnits ?? null,
  patternSource: runtimeModel.sales.units.source,
  typologyGroups: runtimeModel.sales.unitsByTypology.byGroup.map((row) => ({ label: row.label, vertical: row.vertical })),
  stockPatternVertical: runtimeModel.stock.units.series.at(-1)?.vertical ?? null,
  stockTypologyVertical: runtimeModel.stock.unitsByTypology.series.at(-1)?.vertical ?? null,
  stockAreaVertical: runtimeModel.granular.areaBands.find((row) => row.kind === 'total')?.finalUnits ?? null,
  stockByStandard: offerByStandard(mergedCube).map((row) => ({ label: row.label, kind: row.kind, finalUnits: row.finalUnits })),
  stockByTypology: offerByTypology(mergedCube).map((row) => ({ label: row.label, kind: row.kind, finalUnits: row.finalUnits })),
  acceptedHorizontalProjects: runtimeModel.cube.projects.filter((project) => project.segment === 'Horizontal').length,
  acceptedHorizontalFinalUnits: runtimeModel.cube.projects.filter((project) => project.segment === 'Horizontal').reduce((total, project) => total + (project.finalUnits ?? 0), 0),
  horizontalLabels: [...new Set(runtimeModel.cube.projects.filter((project) => project.segment === 'Horizontal').map((project) => project.horizontalSubtype))],
  reconciliation: runtimeModel.reconciliation,
};

const output = {
  generatedAt: new Date().toISOString(),
  scope: { uf: 'RS', cities: CITIES, startPeriod: START_PERIOD, endPeriod: END_PERIOD, endQuarter: END_QUARTER, entity: 'fiergs-rs', engineVersion: 'v4' },
  contracts: {
    pattern: 'temporal-analysis-city/sales?group_by=Padrão; fluxo normalizado por cidade',
    typology: 'temporal-analysis-city/sales?group_by=Tipologia; fluxo normalizado por cidade',
    citySlide: 'fonte Padrão somando todos os segmentos, apesar do título vertical',
    area: 'building-with-history-internal; último mês disponível por empreendimento/tipologia com área',
  },
  totals,
  stockTotals,
  horizontalPolicyTotals,
  runtime,
  deltas: {
    typologyMinusPatternVertical: totals.typologyVertical - totals.patternVertical,
    citySlideMinusPatternVertical: totals.currentCitySlide - totals.patternVertical,
    areaMinusPatternVertical: totals.granularAreaBandSold - totals.patternVertical,
  },
  cities,
};

await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`\nEvidência salva em ${OUTPUT}`);
console.log(JSON.stringify({ totals, stockTotals, horizontalPolicyTotals, runtime, deltas: output.deltas }, null, 2));
