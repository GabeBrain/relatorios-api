import { httpRequest } from '@/lib/http-client';
import { periodToQuarter, quarterKey, safeNumber } from './lib/launches';
import type { CalibrationCell, LaunchAuditBuilding, LaunchRecord, MarketCalibrationCell, MarketCohortRow, PanoramaReference, PanoramaReportModel, PanoramaScope, Quarter, Segment } from './types';
import { buildPanoramaReportModel } from './report/model';
import { aggregateTemporal, buildMarketCells } from './lib/market-calibration';
import { PIRACICABA_1T26_MARKET_REFERENCE } from './reference/piracicaba-1t26-market';
import { editorialWindow, quarterEndDate, quarterStartDate } from './domain/quarters';
import { buildCityCube, type MarketCube } from './domain/cube';
import { collectByCity, completedValues, type CollectionResult } from './domain/collection';
import { createPanoramaGenerationProgress, type PanoramaProgressListener } from './domain/generation-progress';
import { requestWithRetry } from './lib/request-with-retry';

const BASE_URL = 'https://geobrain.com.br/public-api';
const BUILDINGS_V2_BASE_URL = 'https://api.geobrain.com.br/public-api/v2';
const PER_PAGE = 100;
// Uma cidade abre consultas de prédios e dez séries temporais. Processar três ao mesmo tempo
// disparava mais de trinta conexões e fazia o navegador abortar inclusive o fallback legado.
const CITY_CONCURRENCY = 1;
const REQUEST_CONCURRENCY_PER_CITY = 4;
const BUILDING_STATUSES = ['Ativo', 'Esgotado'];

/** Recorte de uma única cidade; o escopo público continua sendo multi-cidade. */
type CityScope = { uf: string; city: string; startQuarter?: Quarter; endQuarter: Quarter };

const cityScopes = (scope: PanoramaScope): CityScope[] =>
  scope.cities.filter(Boolean).map((city) => ({ uf: scope.uf, city, startQuarter: scope.startQuarter, endQuarter: scope.endQuarter }));

/** Primeira cidade do recorte; usado só por bancadas de calibração, que são mono-cidade. */
function primaryCity(scope: PanoramaScope): string {
  const city = scope.cities.find(Boolean);
  if (!city) throw new Error('Recorte sem cidade: selecione ao menos um município autorizado.');
  return city;
}

/**
 * Janela temporal derivada do fechamento escolhido (G-02): o `start_period` acompanha os 17
 * trimestres editoriais em vez de um `2022-01-01` fixo, e o `end_period` acompanha `endQuarter`.
 */
function temporalWindow(scope: Pick<CityScope, 'startQuarter' | 'endQuarter'>): { start: string; end: string } {
  const window = scope.startQuarter ? [scope.startQuarter] : editorialWindow(scope.endQuarter);
  return { start: quarterStartDate(window[0]), end: quarterEndDate(scope.endQuarter) };
}

/** Limita a rajada por município sem alterar a ordem nem a semântica das fontes. */
function createRequestGate(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  const release = () => {
    active -= 1;
    waiting.shift()?.();
  };
  return async <T>(request: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await request();
    } finally {
      release();
    }
  };
}

async function fetchBuildingsV2(scope: CityScope, signal?: AbortSignal): Promise<Record<string, unknown>[]> {
  const byId = new Map<string, Record<string, unknown>>();
  for (const type of ['Vertical', 'Horizontal']) for (const status of BUILDING_STATUSES) {
    let page = 1; let lastPage = 1;
    do {
      const response = await requestWithRetry(() => httpRequest<Record<string, unknown>>({ method: 'POST', url: `${BUILDINGS_V2_BASE_URL}/building-with-history`, query: { type, status, city: scope.city, uf: scope.uf, per_page: PER_PAGE, page }, signal }), { signal });
      if (!response.ok || !response.data) throw new Error(response.error ?? `Falha da API GeoBrain v2 em ${scope.city} (${response.status ?? 'rede'}).`);
      const entries = Array.isArray(response.data.data) ? response.data.data as Record<string, unknown>[] : [];
      for (const building of entries) {
        const id = String(building.building_id ?? building.id ?? '');
        if (id && !byId.has(id)) byId.set(id, building);
      }
      lastPage = Number((response.data.meta as Record<string, unknown> | undefined)?.last_page ?? 1);
      page += 1;
    } while (page <= lastPage);
  }
  return [...byId.values()];
}

/** Contrato legado que já sustenta o Panorama em produção. */
async function fetchBuildingsLegacy(scope: CityScope, signal?: AbortSignal): Promise<Record<string, unknown>[]> {
  const raw: Record<string, unknown>[] = [];
  for (const type of ['Vertical', 'Horizontal']) {
    let page = 1; let lastPage = 1;
    do {
      const response = await httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/building-with-history`, query: { type, city: scope.city, uf: scope.uf, per_page: PER_PAGE, page }, signal });
      if (!response.ok || !response.data) throw new Error(response.error ?? `Falha da API GeoBrain legada em ${scope.city} (${response.status ?? 'rede'}).`);
      raw.push(...(Array.isArray(response.data.data) ? response.data.data as Record<string, unknown>[] : []));
      lastPage = Number((response.data.meta as Record<string, unknown> | undefined)?.last_page ?? 1);
      page += 1;
    } while (page <= lastPage);
  }
  return raw;
}

/**
 * O endpoint v2 é preferido, mas a transição não pode transformar indisponibilidade do contrato
 * em um relatório zerado. Enquanto a paridade autenticada não estiver confirmada, preservamos o
 * contrato legado como fallback explícito.
 */
async function fetchBuildings(scope: CityScope, signal?: AbortSignal, engineVersion: 'v2' | 'v3' | 'v4' = 'v4'): Promise<Record<string, unknown>[]> {
  try {
    return await fetchBuildingsV2(scope, signal);
  } catch (v2Error) {
    if (engineVersion !== 'v2') throw v2Error;
    try {
      return await fetchBuildingsLegacy(scope, signal);
    } catch (legacyError) {
      const v2Message = v2Error instanceof Error ? v2Error.message : String(v2Error);
      const legacyMessage = legacyError instanceof Error ? legacyError.message : String(legacyError);
      throw new Error(`Coleta de empreendimentos falhou em ${scope.city}. v2: ${v2Message}. Legado: ${legacyMessage}.`);
    }
  }
}

function segmentOf(value: unknown): Segment | null {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('vertical')) return 'Vertical';
  if (raw.includes('horizontal') || raw.includes('casa')) return 'Horizontal';
  return null;
}
function standardOf(value: unknown): string { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

/** Firewall V3: números horizontais só atravessam se o cubo oficial os aceitou. */
function launchRecordsFromCube(cube: MarketCube): LaunchRecord[] {
  return cube.projects.map((project) => {
    const economic = standardOf(project.standard).includes('econom');
    return { quarter: project.releaseQuarter, segment: project.segment, projects: 1, units: project.launchedUnits ?? 0, vgvMillions: project.launchedVgvMillions,
      economicProjects: economic ? 1 : 0, otherProjects: economic ? 0 : 1, economicUnits: economic ? (project.launchedUnits ?? 0) : 0, otherUnits: economic ? 0 : (project.launchedUnits ?? 0),
      economicVgvMillions: economic ? project.launchedVgvMillions : 0, otherVgvMillions: economic ? 0 : project.launchedVgvMillions, name: project.name, latitude: project.latitude, longitude: project.longitude };
  });
}

/** Promoted launch contract: a release is one building on its release_date, never every history snapshot. */
export function launchRecordsFrom(data: Record<string, unknown>[], scope: CityScope): LaunchRecord[] {
  const records: LaunchRecord[] = [];
  for (const building of data) {
        const segment = segmentOf(building.building_type ?? building.type); const quarter = periodToQuarter(building.release_date); if (!segment || !quarter || quarterKey(quarter) > quarterKey(scope.endQuarter)) continue;
        const buildingUnits = safeNumber(building.total_units ?? building.qty) ?? 0;
        const history = Array.isArray(building.typologies_history) ? building.typologies_history as Record<string, unknown>[] : [];
        const releaseMonth = String(building.release_date).slice(0, 7);
        const vgvMillions = history.filter((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth).reduce<number | null>((sum, entry) => {
          const qty = safeNumber(entry.qty); const price = safeNumber(entry.release_price ?? entry.price);
          return sum === null || qty === null || price === null ? null : sum + qty * price / 1_000_000;
        }, 0);
        const standard = standardOf(building.standard ?? history.find((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth)?.pattern);
        const economic = standard.includes('econom');
        records.push({ quarter, segment, projects: 1, units: buildingUnits, vgvMillions, economicProjects: economic ? 1 : 0, otherProjects: economic ? 0 : 1, economicUnits: economic ? buildingUnits : 0, otherUnits: economic ? 0 : buildingUnits, economicVgvMillions: economic ? vgvMillions : 0, otherVgvMillions: economic ? 0 : vgvMillions, name: String(building.name ?? building.building_name ?? 'Empreendimento'), latitude: safeNumber(building.latitude ?? building.lat), longitude: safeNumber(building.longitude ?? building.lng ?? building.lon) });
  }
  return records;
}

/** Tudo o que uma cidade contribui para o consolidado. */
interface CityHarvest {
  city: string;
  records: LaunchRecord[];
  cube: MarketCube;
  cohorts: MarketCohortRow[];
  sources: Record<TemporalKey, SourceResult>;
}

type TemporalKey = 'sales' | 'salesTypology' | 'stock' | 'stockTypology' | 'ivv' | 'ivvTypology' | 'ticket' | 'ticketTypology' | 'meter' | 'meterTypology';
type TemporalEndpoint = 'sales' | 'stock' | 'ivv' | 'medium-prices' | 'medium-prices-meter';
export type TemporalIssue = { endpoint: TemporalEndpoint; status: number | null; empty: boolean };
type SourceResult = { rows: Record<string, unknown>[]; available: boolean; source: string; issue?: TemporalIssue };

/** Circuito por geração, exclusivo para a falha 500 confirmada de IVV por Tipologia. */
export class PanoramaTemporalCircuit {
  private failure: { city: string; status: number | null } | null = null;
  avoided = 0;
  isOpen(endpoint: TemporalEndpoint, groupBy: 'Padrão' | 'Tipologia') { return endpoint === 'ivv' && groupBy === 'Tipologia' && this.failure !== null; }
  open(city: string, status: number | null) { if (!this.failure) this.failure = { city, status }; }
  source() { return this.failure ? `temporal-analysis-city/ivv · Tipologia · circuito aberto após HTTP ${this.failure.status ?? 'rede'} em ${this.failure.city}; ${this.avoided} chamada(s) evitada(s)` : ''; }
}

/** Os endpoints monetários respondem em reais; o relatório editorial consome R$ milhões. */
export function valuesInMillions(source: SourceResult, field: string): SourceResult {
  return { ...source, rows: source.rows.map((row) => ({ ...row, [field]: (safeNumber(row[field]) ?? 0) / 1_000_000 })) };
}

const temporalMetricLabel: Record<TemporalEndpoint, string> = {
  sales: 'vendas', stock: 'oferta disponível', ivv: 'velocidade de vendas',
  'medium-prices': 'preço médio', 'medium-prices-meter': 'preço por m²',
};

export function describeTemporalFailure(city: string, issues: TemporalIssue[]): string {
  const metrics = [...new Set(issues.map((issue) => temporalMetricLabel[issue.endpoint]))].join(', ');
  const statuses = issues.map((issue) => issue.status);
  if (statuses.every((status) => status === 401 || status === 403)) {
    return `Não foi possível consultar ${metrics} em ${city} porque a sessão de acesso à GeoBrain expirou ou não tem permissão. É uma questão de acesso ao provedor de dados, não do seu filtro nem dos números do relatório. Entre novamente e tente gerar o relatório.`;
  }
  if (statuses.every((status) => status === null || status === 408 || status === 429 || (status !== null && status >= 500))) {
    return `A GeoBrain está indisponível para consultar ${metrics} em ${city}. É uma instabilidade do provedor de dados; o relatório não foi gerado para evitar exibir zeros como se fossem dados reais. Tente novamente em alguns minutos.`;
  }
  if (statuses.every((status) => status === 400 || status === 404 || status === 405 || status === 422)) {
    return `A GeoBrain recusou a consulta de ${metrics} em ${city}. Isso indica um ajuste necessário na integração do nosso relatório com a API; você não precisa mudar o filtro. O time técnico deve corrigir a consulta antes de gerar este panorama.`;
  }
  if (issues.every((issue) => issue.empty)) {
    return `A GeoBrain respondeu à consulta, mas não disponibilizou dados de ${metrics} para ${city} no período selecionado. Não é falha do seu computador nem do layout; o relatório foi interrompido para não apresentar zeros como se fossem informações observadas.`;
  }
  return `Não foi possível consultar ${metrics} em ${city}: a GeoBrain respondeu de formas diferentes entre os indicadores. O relatório foi interrompido para não misturar dados reais com zeros; o time técnico precisa revisar a integração com o provedor.`;
}

async function harvestCity(scope: CityScope, entity: PanoramaScope['entity'], engineVersion: 'v2' | 'v3' | 'v4', circuit: PanoramaTemporalCircuit, signal?: AbortSignal, onUnit?: (city: string, operation: string) => void): Promise<CityHarvest> {
  const gate = createRequestGate(REQUEST_CONCURRENCY_PER_CITY);
  const track = <T,>(operation: string, request: () => Promise<T>) => gate(request).finally(() => onUnit?.(scope.city, operation));
  const [buildings, sales, salesTypology, stock, stockTypology, ivv, ticket, ticketTypology, meter, meterTypology] = await Promise.all([
    track('empreendimentos', () => fetchBuildings(scope, signal, engineVersion)),
    track('vendas por padrão', () => temporalRows(scope, 'sales', 'Padrão', signal)), track('vendas por tipologia', () => temporalRows(scope, 'sales', 'Tipologia', signal)),
    track('oferta por padrão', () => temporalRows(scope, 'stock', 'Padrão', signal)), track('oferta por tipologia', () => temporalRows(scope, 'stock', 'Tipologia', signal)),
    track('IVV por padrão', () => temporalRows(scope, 'ivv', 'Padrão', signal, circuit)),
    track('preços por padrão', () => temporalRows(scope, 'medium-prices', 'Padrão', signal)), track('preços por tipologia', () => temporalRows(scope, 'medium-prices', 'Tipologia', signal)),
    track('R$/m² por padrão', () => temporalRows(scope, 'medium-prices-meter', 'Padrão', signal)), track('R$/m² por tipologia', () => temporalRows(scope, 'medium-prices-meter', 'Tipologia', signal)),
  ]);
  // A API falha sistematicamente em IVV por Tipologia; a lâmina correspondente calcula a métrica
  // pelo cubo granular, que contém estoque, vendas e lançamentos por tipologia.
  const ivvTypology: SourceResult = { rows: [], available: false, source: 'IVV por tipologia calculado pelo histórico granular do recorte' };
  const sources = { sales, salesTypology, stock, stockTypology, ivv, ivvTypology, ticket, ticketTypology, meter, meterTypology };
  if (Object.values(sources).every((source) => !source.available)) {
    const issues = Object.values(sources).flatMap((source) => source.issue ? [source.issue] : []);
    throw new Error(describeTemporalFailure(scope.city, issues));
  }
  const cube = buildCityCube(buildings, { city: scope.city, uf: scope.uf, endQuarter: scope.endQuarter, entity, engineVersion });
  return {
    city: scope.city,
    records: engineVersion !== 'v2' ? launchRecordsFromCube(cube) : launchRecordsFrom(buildings, scope),
    cube,
    cohorts: engineVersion !== 'v2' ? cube.projects.map((project) => ({ segment: project.segment, releaseYear: String(project.releaseYear), standard: project.standard, stock: project.finalUnits ?? 0 })).filter((row) => row.stock > 0) : cohortRowsFrom(buildings, scope),
    sources,
  };
}

/**
 * Coleta multi-cidade (G-01). Cada município é consultado isoladamente, com concorrência limitada;
 * uma cidade que falha aparece nomeada na proveniência e o relatório fica `partial`. Só o
 * cancelamento propaga exceção — falha total devolve modelo `unavailable` com as cidades listadas.
 */
export async function fetchPanoramaReportModel(scope: PanoramaScope, signal?: AbortSignal, onProgress?: PanoramaProgressListener): Promise<PanoramaReportModel> {
  const scopes = cityScopes(scope);
  if (!scopes.length) throw new Error('Recorte sem cidade: selecione ao menos um município autorizado.');
  const progress = createPanoramaGenerationProgress(scopes.length, onProgress);
  progress.start();
  const circuit = new PanoramaTemporalCircuit();

  const collection: CollectionResult<CityHarvest> = await collectByCity(
    scopes.map((item) => item.city),
    async (city, citySignal) => {
      const harvest = await harvestCity({ uf: scope.uf, city, startQuarter: scope.startQuarter, endQuarter: scope.endQuarter }, scope.entity, scope.engineVersion ?? 'v4', circuit, citySignal, progress.unit);
      progress.cityComplete(city);
      return harvest;
    },
    { concurrency: CITY_CONCURRENCY, signal },
  );

  collection.failedCities.forEach(({ city }) => progress.cityFailed(city));

  const harvests = completedValues(collection);
  if (collection.state === 'unavailable') {
    const details = collection.failedCities.map(({ city, error }) => `${city}: ${error}`).join(' | ');
    throw new Error(`Nenhuma cidade do recorte foi carregada pela API GeoBrain. ${details}`);
  }
  // Numeradores e denominadores municipais somam ANTES de qualquer percentual ou média.
  const merge = (key: TemporalKey): SourceResult => ({
    rows: harvests.flatMap((harvest) => harvest.sources[key].rows),
    available: harvests.some((harvest) => harvest.sources[key].available),
    source: harvests.length ? harvests[0].sources[key].source : `temporal-analysis-city/${key} · sem cidade concluída`,
  });
  const cityTemporalSources = harvests.map(({ city, sources }) => ({
    city,
    // `normalizeTemporalSource` prioriza as fontes municipais. Elas precisam estar na mesma
    // unidade do consolidado; antes, apenas este último era convertido e o VGV multicidade
    // acabava sendo desenhado em reais sob o rótulo "R$ milhões".
    sources: {
      ...sources,
      sales: valuesInMillions(sources.sales, 'vgv_liquid_sales'),
      salesTypology: valuesInMillions(sources.salesTypology, 'vgv_liquid_sales'),
      stock: valuesInMillions(sources.stock, 'vgv_stock'),
      stockTypology: valuesInMillions(sources.stockTypology, 'vgv_stock'),
    },
  }));

  progress.consolidate();
  const model = buildPanoramaReportModel(
    scope,
    harvests.flatMap((harvest) => harvest.records),
    {
      sales: valuesInMillions(merge('sales'), 'vgv_liquid_sales'), salesTypology: valuesInMillions(merge('salesTypology'), 'vgv_liquid_sales'),
      stock: valuesInMillions(merge('stock'), 'vgv_stock'), stockTypology: valuesInMillions(merge('stockTypology'), 'vgv_stock'),
      ivv: merge('ivv'), ivvTypology: merge('ivvTypology'),
      ticket: merge('ticket'), ticketTypology: merge('ticketTypology'),
      meter: merge('meter'), meterTypology: merge('meterTypology'),
    },
    harvests.flatMap((harvest) => harvest.cohorts),
    {
      cubes: harvests.map((harvest) => harvest.cube),
      provenance: {
        requestedCities: collection.requestedCities,
        completedCities: collection.completedCities,
        failedCities: collection.failedCities,
      },
      citySalesSources: harvests.map((harvest) => ({ city: harvest.city, rows: harvest.sources.sales.rows })),
      cityTemporalSources,
    },
  );
  progress.prepare();
  return model;
}

function cohortRowsFrom(data: Record<string, unknown>[], scope: CityScope): MarketCohortRow[] {
  const rows: MarketCohortRow[] = [];
  const endMonth = quarterEndDate(scope.endQuarter).slice(0, 7);
  for (const building of data) {
    const segment = segmentOf(building.building_type ?? building.type);
    const release = String(building.release_date ?? '');
    if (!segment || !/^\d{4}/.test(release)) continue;
    const history = (Array.isArray(building.typologies_history) ? building.typologies_history : []) as Record<string, unknown>[];
    const latest = history.filter((entry) => String(entry.period ?? '').slice(0, 7) <= endMonth).sort((a, b) => String(b.period ?? '').localeCompare(String(a.period ?? '')))[0];
    const stock = safeNumber(latest?.typology_stock ?? latest?.stock ?? latest?.qty);
    if (stock === null) continue;
    rows.push({ segment, releaseYear: release.slice(0, 4), standard: standardOf(latest?.pattern ?? building.standard) || 'não classificado', stock });
  }
  return rows;
}

function releaseQuarter(value: unknown): Quarter | null { return periodToQuarter(value); }
function rawSegment(value: unknown): Segment | null { return segmentOf(value); }
function expected(reference: PanoramaReference, metric: 'projects' | 'units', quarter: Quarter, segment: 'vertical' | 'horizontal' | 'total') {
  return reference.model[metric].find((row) => row.quarter === quarter)?.[segment] ?? 0;
}
function cells(method: string, metric: CalibrationCell['metric'], source: string, reference: PanoramaReference, values: Map<string, number>, complete: boolean): CalibrationCell[] {
  const rows: CalibrationCell[] = [];
  for (const quarter of reference.model.quarters) for (const segment of ['vertical', 'horizontal', 'total'] as const) {
    const actual = complete ? (values.get(`${quarter}:${segment}`) ?? 0) : null; const exp = expected(reference, metric === 'Empreendimentos' ? 'projects' : 'units', quarter, segment);
    rows.push({ method, metric, source, quarter, segment, expected: exp, actual, difference: actual === null ? null : actual - exp, status: actual === null ? 'missing_api' : actual === exp ? 'match' : 'different' });
  }
  return rows;
}
function add(map: Map<string, number>, quarter: Quarter, segment: Segment, value: number) { for (const key of [segment.toLowerCase(), 'total']) { const id = `${quarter}:${key}`; map.set(id, (map.get(id) ?? 0) + value); } }

/** Explicit calibration suite. It never changes the report contracts. */
export async function fetchLaunchCalibration(scope: PanoramaScope, reference: PanoramaReference, signal?: AbortSignal): Promise<CalibrationCell[]> {
  // Bancada de calibração é mono-cidade por construção: compara contra um gabarito municipal.
  const city = primaryCity(scope);
  const cityScope: CityScope = { uf: scope.uf, city, startQuarter: scope.startQuarter, endQuarter: scope.endQuarter };
  const raw = await fetchBuildings(cityScope, signal);
  const projectValues = new Map<string, number>(); const unitTotalValues = new Map<string, number>(); const unitHistoryValues = new Map<string, number>();
  const seen = new Set<string>();
  for (const building of raw) {
    const quarter = releaseQuarter(building.release_date); const segment = rawSegment(building.building_type ?? building.type); const id = String(building.building_id ?? building.id ?? '');
    if (!quarter || !segment || !id || quarterKey(quarter) > quarterKey(scope.endQuarter) || seen.has(`${id}:${segment}`)) continue;
    seen.add(`${id}:${segment}`); add(projectValues, quarter, segment, 1); add(unitTotalValues, quarter, segment, safeNumber(building.total_units ?? building.qty) ?? 0);
    const releaseMonth = String(building.release_date).slice(0, 7);
    const qty = (Array.isArray(building.typologies_history) ? building.typologies_history as Record<string, unknown>[] : []).filter((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth).reduce((sum, entry) => sum + (safeNumber(entry.qty) ?? 0), 0);
    add(unitHistoryValues, quarter, segment, qty);
  }
  const temporalValues = new Map<string, number>();
  const releasesWindow = temporalWindow(scope);
  const response = await httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/temporal-analysis-city/releases`, query: { city, uf: scope.uf, start_period: releasesWindow.start, end_period: releasesWindow.end, per_page: 100, group_by: 'Padrão', 'type[]': ['Vertical', 'Horizontal'] }, signal });
  if (response.ok && response.data) for (const row of (Array.isArray(response.data.data) ? response.data.data as Record<string, unknown>[] : [])) { const quarter = periodToQuarter(row.period); const segment = rawSegment(row.building_type); if (quarter && segment) add(temporalValues, quarter, segment, safeNumber(row.releases_in_period) ?? 0); }
  return [
    ...cells('A · release_date + building_id distinto', 'Empreendimentos', 'building-with-history · sem status', reference, projectValues, true),
    ...cells('B · release_date + total_units', 'Unidades lançadas', 'building-with-history · total_units', reference, unitTotalValues, true),
    ...cells('C · release_date + qty no mês', 'Unidades lançadas', 'building-with-history · typologies_history', reference, unitHistoryValues, true),
    ...cells('D · endpoint releases', 'Unidades lançadas', response.ok ? 'temporal-analysis-city/releases' : `temporal-analysis-city/releases · HTTP ${response.status ?? 'rede'}`, reference, temporalValues, response.ok && response.data !== null),
  ];
}

async function temporalRows(scope: CityScope, endpoint: TemporalEndpoint, groupBy: 'Padrão' | 'Tipologia' = 'Padrão', signal?: AbortSignal, circuit?: PanoramaTemporalCircuit): Promise<SourceResult> {
  if (circuit?.isOpen(endpoint, groupBy)) { circuit.avoided += 1; return { rows: [], available: false, source: circuit.source(), issue: { endpoint, status: 500, empty: false } }; }
  const rows: Record<string, unknown>[] = []; let page = 1; let lastPage = 1;
  const window = temporalWindow(scope);
  do {
    const response = await requestWithRetry(() => httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/temporal-analysis-city/${endpoint}`, query: { city: scope.city, uf: scope.uf, start_period: window.start, end_period: window.end, per_page: PER_PAGE, page, group_by: groupBy, 'type[]': ['Vertical', 'Horizontal'] }, signal }), { signal, attempts: endpoint === 'ivv' && groupBy === 'Tipologia' ? 2 : 1 });
    if (!response.ok && endpoint === 'ivv' && groupBy === 'Tipologia' && response.status !== null && response.status >= 500) circuit?.open(scope.city, response.status);
    if (!response.ok || !response.data) return { rows: [], available: false, source: `temporal-analysis-city/${endpoint} · HTTP ${response.status ?? 'rede'}`, issue: { endpoint, status: response.status, empty: false } };
    const pageRows = Array.isArray(response.data.data) ? response.data.data as Record<string, unknown>[] : [];
    rows.push(...pageRows);
    lastPage = Number((response.data.meta as Record<string, unknown> | undefined)?.last_page ?? 1); page += 1;
  } while (page <= lastPage);
  return rows.length
    ? { rows, available: true, source: `temporal-analysis-city/${endpoint} · ${groupBy}` }
    : { rows, available: false, source: `temporal-analysis-city/${endpoint} · HTTP 200 · sem linhas`, issue: { endpoint, status: 200, empty: true } };
}

/** Initial T3/T4 bench: direct temporal endpoints only; it cannot silently promote a report contract. */
export async function fetchMarketCalibration(scope: PanoramaScope, signal?: AbortSignal): Promise<MarketCalibrationCell[]> {
  const reference = PIRACICABA_1T26_MARKET_REFERENCE;
  // Bancada mono-cidade: compara contra o gabarito municipal congelado.
  const cityScope: CityScope = { uf: scope.uf, city: primaryCity(scope), startQuarter: scope.startQuarter, endQuarter: scope.endQuarter };
  const [sales, stock, ivv] = await Promise.all([temporalRows(cityScope, 'sales', 'Padrão', signal), temporalRows(cityScope, 'stock', 'Padrão', signal), temporalRows(cityScope, 'ivv', 'Padrão', signal)]);
  const stockPeriod = [scope.endQuarter];
  return [
    ...buildMarketCells('Vendas', 'A · endpoint sales', 'Unidades vendidas', sales.source, reference, aggregateTemporal(sales.rows, 'liquid_sales'), sales.available),
    ...buildMarketCells('Vendas', 'A · endpoint sales', 'VGV vendido (R$ mi)', sales.source, reference, aggregateTemporal(sales.rows.map((row) => ({ ...row, vgv_liquid_sales: Number(row.vgv_liquid_sales ?? 0) / 1_000_000 })), 'vgv_liquid_sales'), sales.available),
    ...buildMarketCells('Estoque', 'A · endpoint stock', 'Estoque final', stock.source, reference, aggregateTemporal(stock.rows, 'stock'), stock.available, stockPeriod),
    ...buildMarketCells('Estoque', 'A · endpoint stock', 'VGV estoque (R$ mi)', stock.source, reference, aggregateTemporal(stock.rows.map((row) => ({ ...row, vgv_stock: Number(row.vgv_stock ?? 0) / 1_000_000 })), 'vgv_stock'), stock.available, stockPeriod),
    ...buildMarketCells('IVV', 'A · endpoint ivv', 'IVV', ivv.source, reference, aggregateTemporal(ivv.rows, 'ivv'), ivv.available, stockPeriod),
  ];
}

/** Raw, audited universe used only by analyst curation; it never changes contracts by itself. */
export async function fetchLaunchAuditBuildings(scope: PanoramaScope, signal?: AbortSignal): Promise<LaunchAuditBuilding[]> {
  // A curadoria cobre todas as cidades do recorte; a chave de dedupe é por cidade + building_id.
  const collection = await collectByCity(
    cityScopes(scope).map((item) => item.city),
    (city, citySignal) => fetchBuildings({ uf: scope.uf, city, startQuarter: scope.startQuarter, endQuarter: scope.endQuarter }, citySignal).then((buildings) => ({ city, buildings })),
    { concurrency: CITY_CONCURRENCY, signal },
  );
  const harvested = completedValues(collection);
  const seen = new Set<string>(); const rows: LaunchAuditBuilding[] = [];
  for (const { city, buildings } of harvested) for (const building of buildings) {
    const quarter = releaseQuarter(building.release_date); const segment = rawSegment(building.building_type ?? building.type); const buildingId = String(building.building_id ?? building.id ?? '');
    const key = `${city}#${buildingId}`;
    if (!quarter || !segment || !buildingId || quarterKey(quarter) > quarterKey(scope.endQuarter) || seen.has(key)) continue;
    seen.add(key); const releaseMonth = String(building.release_date).slice(0, 7);
    const releaseMonthQty = (Array.isArray(building.typologies_history) ? building.typologies_history as Record<string, unknown>[] : []).filter((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth).reduce((sum, entry) => sum + (safeNumber(entry.qty) ?? 0), 0);
    rows.push({ buildingId, name: String(building.name ?? 'Sem nome'), segment, releaseQuarter: quarter, totalUnits: safeNumber(building.total_units ?? building.qty) ?? 0, releaseMonthQty });
  }
  return rows.sort((a, b) => quarterKey(a.releaseQuarter) - quarterKey(b.releaseQuarter) || a.name.localeCompare(b.name));
}
