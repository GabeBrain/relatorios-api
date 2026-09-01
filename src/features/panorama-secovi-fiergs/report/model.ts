import { buildLaunchModel, periodToQuarter, safeNumber } from '../lib/launches';
import type { HorizontalSeriesPolicy, LaunchRecord, MarketCohortRow, MethodStatus, PanoramaCityComparisons, PanoramaGranularBlocks, PanoramaPresentationCredits, PanoramaProvenance, PanoramaReportModel, PanoramaScope, Quarter, ReportDataState, ReportMarketBlock, ReportSeries, Segment } from '../types';
import { editorialWindow, quarterRange } from '../domain/quarters';
import { horizontalProjects, mergeCubes, type MarketCube } from '../domain/cube';
import { classifyHorizontalLabel } from '../domain/entity-policy';
import {
  cohortMatrix as buildCohortMatrix,
  cohortMatrixParticipation,
  horizontalPricesByStandard,
  maturityByStandard,
  maturityByTypology,
  offerByCohort,
  offerByAreaBand,
  offerByStandard,
  offerByTypology,
  pricesByStandard,
  pricesByTypology,
  vgvSummary,
} from '../domain/aggregations';
import { STANDARD_ORDER, TYPOLOGY_ORDER, normalizeText } from '../domain/taxonomy';
import { normalizeCityTemporalRows, type TemporalMetricKind } from '../domain/temporal-normalization';

type SourceResult = { rows: Record<string, unknown>[]; available: boolean; source: string };
type TemporalKey = 'sales' | 'salesTypology' | 'stock' | 'stockTypology' | 'ivv' | 'ivvTypology' | 'ticket' | 'ticketTypology' | 'meter' | 'meterTypology';
type CityTemporalSources = { city: string; sources: Record<TemporalKey, SourceResult> };
type AggregateMode = 'sum' | 'average' | 'weighted_average';
type Accumulator = { sum: number; count: number; weight: number };

function semanticGroupOrder(a: string, b: string): number {
  const numberOf = (value: string) => Number((value.match(/\d+/) ?? [])[0]);
  const aNumber = numberOf(a); const bNumber = numberOf(b);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber || a.localeCompare(b, 'pt-BR');
  const standardIndex = (value: string) => {
    const normalized = normalizeText(value);
    return STANDARD_ORDER.findIndex((label) => normalizeText(label) === normalized);
  };
  const aStandard = standardIndex(a); const bStandard = standardIndex(b);
  if (aStandard >= 0 || bStandard >= 0) return (aStandard < 0 ? STANDARD_ORDER.length : aStandard) - (bStandard < 0 ? STANDARD_ORDER.length : bStandard);
  const typologyIndex = (value: string) => TYPOLOGY_ORDER.findIndex((label) => normalizeText(label) === normalizeText(value));
  const aTypology = typologyIndex(a); const bTypology = typologyIndex(b);
  if (aTypology >= 0 || bTypology >= 0) return (aTypology < 0 ? TYPOLOGY_ORDER.length : aTypology) - (bTypology < 0 ? TYPOLOGY_ORDER.length : bTypology);
  return a.localeCompare(b, 'pt-BR', { numeric: true });
}

function cohortOrder(a: string, b: string): number {
  const rank = (label: string) => {
    if (/total geral/i.test(label)) return 10_000;
    if (/subtotal/i.test(label)) return 9_000;
    const year = Number(label.match(/\d{4}/)?.[0]);
    return Number.isFinite(year) ? year : 0;
  };
  return rank(a) - rank(b) || a.localeCompare(b, 'pt-BR');
}

function segment(value: unknown): Segment | null {
  const raw = String(value ?? '').toLowerCase();
  return raw.includes('vertical') ? 'Vertical' : raw.includes('horizontal') || raw.includes('casa') ? 'Horizontal' : null;
}

/** Janela editorial gerada dinamicamente; não há mais limite fixo em 1T2026 (G-02). */
function canonical(scope: PanoramaScope): Quarter[] {
  return scope.startQuarter ? quarterRange(scope.startQuarter, scope.endQuarter) : editorialWindow(scope.endQuarter);
}

function add(target: Map<string, Accumulator>, key: string, value: number, mode: AggregateMode, weight?: number | null) {
  const current = target.get(key) ?? { sum: 0, count: 0, weight: 0 };
  const validWeight = typeof weight === 'number' && Number.isFinite(weight) && weight > 0 ? weight : null;
  current.sum += mode === 'weighted_average' && validWeight !== null ? value * validWeight : value;
  current.count += 1;
  if (mode === 'weighted_average' && validWeight !== null) current.weight += validWeight;
  target.set(key, current);
}

function result(target: Map<string, Accumulator>, key: string, mode: AggregateMode) {
  const value = target.get(key);
  if (!value) return 0;
  if (mode === 'average') return value.sum / Math.max(value.count, 1);
  // Sem estoque correspondente, preserva o dado retornado com mÃ©dia simples em vez de fabricar peso zero.
  return mode === 'weighted_average' ? value.sum / (value.weight || Math.max(value.count, 1)) : value.sum;
}

function reportSeries(periods: Quarter[], target: Map<string, Accumulator>, mode: AggregateMode, status: ReportMarketBlock['dataStatus'], source: string): ReportSeries[] {
  return periods.map((quarter) => {
    const vertical = result(target, `${quarter}:Vertical`, mode);
    const horizontal = result(target, `${quarter}:Horizontal`, mode);
    const total = mode === 'average' || mode === 'weighted_average' ? result(target, `${quarter}:Total`, mode) : vertical + horizontal;
    return { quarter, vertical, horizontal, total, methodStatus: 'open_method' as MethodStatus, dataStatus: status, source };
  });
}

function marketBlock(scope: PanoramaScope, source: SourceResult, field: string, unit: ReportMarketBlock['unit'], formula: string, mode: AggregateMode = 'sum'): ReportMarketBlock {
  const periods = canonical(scope);
  const values = new Map<string, Accumulator>();
  const grouped = new Map<string, Map<string, Accumulator>>();
  for (const row of source.rows) {
    const quarter = periodToQuarter(row.period);
    const type = segment(row.building_type ?? row.type);
    if (!quarter || !type || !periods.includes(quarter)) continue;
    const parsed = safeNumber(row[field]);
    if (parsed === null) continue;
    const label = String(row.group ?? row.pattern ?? row.standard ?? row.typology ?? row.typology_name ?? 'Total').trim() || 'Total';
    const weight = safeNumber(row.temporal_weight);
    add(values, `${quarter}:${type}`, parsed, mode, weight);
    add(values, `${quarter}:Total`, parsed, mode, weight);
    const group = grouped.get(label) ?? new Map<string, Accumulator>();
    add(group, `${quarter}:${type}`, parsed, mode, weight);
    add(group, `${quarter}:Total`, parsed, mode, weight);
    grouped.set(label, group);
  }
  const status: ReportDataState = source.available ? (source.rows.length ? 'ready' : 'partial') : 'unavailable';
  const groupSeries = [...grouped].sort(([a], [b]) => semanticGroupOrder(a, b)).map(([label, group]) => ({ label, series: reportSeries(periods, group, mode, status, source.source) }));
  const byGroup = groupSeries.map(({ label, series }) => {
    const current = series.find((item) => item.quarter === scope.endQuarter) ?? series.at(-1)!;
    return { label, vertical: current.vertical, horizontal: current.horizontal, total: current.total };
  });
  return { series: reportSeries(periods, values, mode, status, source.source), byGroup, groupSeries, unit, methodStatus: 'open_method', dataStatus: status, source: source.source, formula };
}

function temporalDimension(row: Record<string, unknown>) {
  const city = normalizeText(String(row.city ?? ''));
  const period = periodToQuarter(row.period) ?? '';
  const group = normalizeText(String(row.group ?? row.pattern ?? row.standard ?? row.typology ?? row.typology_name ?? ''));
  const type = normalizeText(String(row.building_type ?? row.type ?? ''));
  return `${city}\u0000${period}\u0000${group}\u0000${type}`;
}

/**
 * IVV e preÃ§os sÃ£o taxas/mÃ©dias municipais. No agregado, o peso aberto Ã© o estoque de unidades
 * no mesmo fechamento, cidade, segmento e recorte (padrÃ£o ou tipologia). Nunca usamos VGV como
 * peso, para nÃ£o transformar o indicador de mercado em indicador de valor financeiro.
 */
function withClosingStockWeight(metric: SourceResult, stock: SourceResult): SourceResult {
  const weights = new Map<string, number>();
  for (const row of stock.rows) {
    const weight = safeNumber(row.stock);
    if (weight === null || weight <= 0) continue;
    const key = temporalDimension(row);
    weights.set(key, (weights.get(key) ?? 0) + weight);
  }
  return {
    ...metric,
    rows: metric.rows.map((row) => ({ ...row, temporal_weight: weights.get(temporalDimension(row)) ?? null })),
  };
}

function cohortBlock(scope: PanoramaScope, rows: MarketCohortRow[]): ReportMarketBlock {
  const periods = canonical(scope);
  const groups = new Map<string, { vertical: number; horizontal: number }>();
  for (const row of rows) {
    const group = groups.get(row.releaseYear) ?? { vertical: 0, horizontal: 0 };
    group[row.segment.toLowerCase() as 'vertical' | 'horizontal'] += row.stock;
    groups.set(row.releaseYear, group);
  }
  const status: ReportDataState = rows.length ? 'ready' : 'unavailable';
  const emptySeries = () => periods.map((quarter) => ({ quarter, vertical: 0, horizontal: 0, total: 0, methodStatus: 'assumed' as MethodStatus, dataStatus: status, source: 'building-with-history' }));
  const groupSeries = [...groups].sort(([a], [b]) => cohortOrder(a, b)).map(([label, value]) => ({
    label,
    series: emptySeries().map((item) => item.quarter === scope.endQuarter ? { ...item, ...value, total: value.vertical + value.horizontal } : item),
  }));
  return {
    series: emptySeries(),
    byGroup: [...groups].sort(([a], [b]) => cohortOrder(a, b)).map(([label, value]) => ({ label, ...value, total: value.vertical + value.horizontal })),
    groupSeries,
    unit: 'count',
    methodStatus: 'assumed',
    dataStatus: status,
    source: 'building-with-history / typologies_history',
    formula: 'Último snapshot até o fechamento, agrupado pelo ano de release_date.',
  };
}

/** Cubo vazio usado quando nenhuma cidade concluiu; mantém o contrato sem fabricar dados. */
function emptyCube(scope: PanoramaScope): MarketCube {
  return { projects: [], rejections: [], cities: [], endQuarter: scope.endQuarter, entity: scope.entity ?? 'secovi-sp' };
}

/* -------------------------------------------------------------------------- */
/* Firewall de fontes — contratos municipais nunca falam pelo universo Secovi  */
/* -------------------------------------------------------------------------- */

/**
 * Os contratos `temporal-analysis-city/*` são **municipais**: agregam o horizontal inteiro em
 * `building_type` e devolvem rótulos de produto (`Loteamento Fechado`, `Condomínio de Chácaras`)
 * como se fossem padrão socioeconômico. Nenhum deles sabe da política PRE-026.
 *
 * Sem este firewall, o número de loteamento atravessa o relatório e — desde que o rótulo editorial
 * passou a ser `Condomínio de Casas` — se apresenta com o nome do universo aceito. Foi exatamente o
 * que apareceu no Jundiaí pós-correções: 0 empreendimentos com 6.055 unidades, e a narrativa
 * imprimindo "o padrão com maior oferta final é Loteamento Fechado".
 *
 * A regra é simples e vale para todo bloco temporal: **na V3 eles são lidos como Vertical.** O
 * horizontal do Panorama Secovi vem do cubo, e só dele.
 */
/**
 * `attributable` é `true` quando a série horizontal impressa corresponde de fato ao universo
 * aceito — o que acontece quando o universo é vazio, caso em que zero é o valor verdadeiro e não um
 * zero fabricado. Com condomínios aceitos, o contrato municipal não sabe separá-los dos loteamentos
 * e a série deixa de ser atribuível.
 */
function horizontalSeriesPolicyOf(cube: MarketCube, engineVersion: 'v2' | 'v3'): HorizontalSeriesPolicy {
  const accepted = horizontalProjects(cube).length;
  if (engineVersion !== 'v3') return { attributable: true, reason: 'Motor V2: série municipal usada como está.', acceptedProjects: accepted };
  if (!accepted) {
    return {
      attributable: true,
      acceptedProjects: 0,
      reason: 'Nenhum Condomínio de Casas elegível no recorte: a série horizontal é zero por definição do universo, não por ausência de resposta.',
    };
  }
  return {
    attributable: false,
    acceptedProjects: accepted,
    reason: `Há ${accepted} Condomínio(s) de Casas no recorte, mas o contrato municipal agrega todo o horizontal e não permite separá-los dos demais produtos. A série horizontal fica indisponível em vez de publicar número de outro universo.`,
  };
}

/**
 * Aplica o firewall a um bloco temporal: remove os grupos cujo rótulo é produto horizontal fora da
 * política — é o que impedia `Loteamento Fechado` de virar "padrão" em tabela e em narrativa — e
 * zera a componente horizontal das séries, deixando o total igual ao vertical.
 */
function firewallTemporalBlock(block: ReportMarketBlock, policy: HorizontalSeriesPolicy): ReportMarketBlock {
  const isExcludedProduct = (label: string) => classifyHorizontalLabel(label) === 'produto_excluido';
  const verticalOnly = <T extends { vertical: number; horizontal: number; total: number }>(row: T): T => ({ ...row, horizontal: 0, total: row.vertical });
  return {
    ...block,
    series: block.series.map(verticalOnly),
    byGroup: block.byGroup.filter((row) => !isExcludedProduct(row.label)).map(verticalOnly),
    groupSeries: block.groupSeries.filter((group) => !isExcludedProduct(group.label)).map((group) => ({ ...group, series: group.series.map(verticalOnly) })),
    formula: `${block.formula} Contrato municipal lido como Vertical (política PRE-026); o horizontal do relatório vem do cubo.`,
  };
}

/** Agrega as linhas prontas dos slides 31–51 a partir do cubo granular. */
export function buildGranularBlocks(cube: MarketCube): PanoramaGranularBlocks {
  const matrix = buildCohortMatrix(cube, 'Vertical');
  return {
    offerByStandard: offerByStandard(cube, 'Vertical'),
    areaBands: offerByAreaBand(cube),
    offerByTypology: offerByTypology(cube, 'Vertical'),
    cohortsVertical: offerByCohort(cube, 'Vertical'),
    cohortsHorizontal: offerByCohort(cube, 'Horizontal'),
    cohortMatrix: matrix,
    cohortMatrixParticipation: cohortMatrixParticipation(matrix),
    maturityByStandard: maturityByStandard(cube),
    maturityByTypology: maturityByTypology(cube),
    pricesByStandard: pricesByStandard(cube, 'Vertical'),
    pricesByTypology: pricesByTypology(cube),
    horizontalPricesByStandard: horizontalPricesByStandard(cube),
    vgv: vgvSummary(cube),
    // Nenhum campo de Faixa de Valor foi identificado no payload nem existe regra autoritativa.
    valueRangeAvailable: false,
  };
}

function provenanceOf(scope: PanoramaScope, cube: MarketCube, partial?: Partial<PanoramaProvenance>): PanoramaProvenance {
  const rejections = new Map<string, number>();
  for (const rejection of cube.rejections) rejections.set(rejection.reason, (rejections.get(rejection.reason) ?? 0) + 1);
  return {
    requestedCities: partial?.requestedCities ?? [...scope.cities],
    completedCities: partial?.completedCities ?? cube.cities,
    failedCities: partial?.failedCities ?? [],
    entity: scope.entity ?? 'secovi-sp',
    engineVersion: scope.engineVersion ?? 'v2',
    rejectedByPolicy: [...rejections].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  };
}

function normalizeTemporalSource(scope: PanoramaScope, harvests: CityTemporalSources[] | undefined, key: TemporalKey, metric: TemporalMetricKind, fallback: SourceResult): SourceResult {
  if (!harvests?.length) return fallback;
  const sourceRows = harvests.flatMap((harvest) => normalizeCityTemporalRows(harvest.city, harvest.sources[key].rows, metric, metric === 'snapshot' ? canonical(scope) : undefined));
  const available = harvests.some((harvest) => harvest.sources[key].available);
  return {
    rows: sourceRows,
    available,
    source: `${fallback.source} · normalizado por município (${metric === 'flow' ? 'fluxo' : 'fechamento'})`,
  };
}

type CitySalesSource = { city: string; rows: Record<string, unknown>[] };

function nullableSum(values: (number | null)[]): number | null {
  return values.reduce<number | null>((sum, value) => value === null ? sum : (sum ?? 0) + value, null);
}

function availability(launched: number | null, final: number | null): number | null {
  return launched === null || final === null || launched === 0 ? null : final / launched * 100;
}

/**
 * Comparação municipal baseada nos mesmos numeradores do consolidado. Não há média de percentuais:
 * disponibilidade é sempre oferta final ÷ oferta lançada dentro de cada município/padrão.
 */
function buildCityComparisons(scope: PanoramaScope, cube: MarketCube, provenance: PanoramaProvenance, salesSources: CitySalesSource[]): PanoramaCityComparisons {
  const selected = scope.cities.filter(Boolean);
  const completed = new Set(provenance.completedCities);
  const completeScope = selected.length >= 2 && provenance.failedCities.length === 0 && selected.every((city) => completed.has(city));
  if (!completeScope) {
    return {
      enabled: false,
      suppressionReason: selected.length < 2 ? 'O comparativo é exibido somente para recortes com duas ou mais cidades.' : 'O comparativo foi suprimido porque nem todas as cidades do recorte concluíram a coleta.',
      sales: [], market: [], availabilityByStandard: [],
    };
  }

  const sales = selected.map((city) => {
    const source = salesSources.find((item) => item.city === city);
    const values = normalizeCityTemporalRows(city, source?.rows ?? [], 'flow')
      .filter((row) => periodToQuarter(row.period) === scope.endQuarter)
      .map((row) => safeNumber(row.liquid_sales));
    return { city, liquidSales: nullableSum(values) };
  });
  const market = selected.flatMap((city) => (['Vertical', 'Horizontal'] as const).map((segment) => {
    const projects = cube.projects.filter((project) => project.city === city && project.segment === segment);
    const launchedUnits = nullableSum(projects.map((project) => project.launchedUnits));
    const finalUnits = nullableSum(projects.map((project) => project.finalUnits));
    return { city, segment, projects: new Set(projects.map((project) => project.key)).size, launchedUnits, finalUnits, availability: availability(launchedUnits, finalUnits) };
  }));
  const standards = [...new Set(cube.projects.filter((project) => project.segment === 'Vertical').map((project) => project.standard))]
    .sort((a, b) => semanticGroupOrder(a, b));
  const availabilityByStandard = standards.map((standard) => ({
    standard,
    values: selected.map((city) => {
      const projects = cube.projects.filter((project) => project.city === city && project.segment === 'Vertical' && project.standard === standard);
      const launchedUnits = nullableSum(projects.map((project) => project.launchedUnits));
      const finalUnits = nullableSum(projects.map((project) => project.finalUnits));
      return { city, availability: availability(launchedUnits, finalUnits) };
    }),
  }));
  return { enabled: true, sales, market, availabilityByStandard };
}

export function buildPanoramaReportModel(
  scope: PanoramaScope,
  records: LaunchRecord[],
  sources: {
    sales: SourceResult; salesTypology: SourceResult; stock: SourceResult; stockTypology: SourceResult;
    ivv: SourceResult; ivvTypology: SourceResult; ticket: SourceResult; ticketTypology: SourceResult;
    meter: SourceResult; meterTypology: SourceResult;
  },
  cohorts: MarketCohortRow[] = [],
  options: { cubes?: MarketCube[]; provenance?: Partial<PanoramaProvenance>; citySalesSources?: CitySalesSource[]; cityTemporalSources?: CityTemporalSources[]; presentation?: PanoramaPresentationCredits } = {},
): PanoramaReportModel {
  const launches = buildLaunchModel(records, canonical(scope));
  const cube = options.cubes?.length
    ? mergeCubes(options.cubes, scope.endQuarter, scope.entity ?? 'secovi-sp')
    : emptyCube(scope);
  const provenance = provenanceOf(scope, cube, options.provenance);
  const failedCities = provenance.failedCities.length > 0;
  const granular = buildGranularBlocks(cube);
  const cityComparisons = buildCityComparisons(scope, cube, provenance, options.citySalesSources ?? []);
  const temporal = {
    sales: normalizeTemporalSource(scope, options.cityTemporalSources, 'sales', 'flow', sources.sales),
    salesTypology: normalizeTemporalSource(scope, options.cityTemporalSources, 'salesTypology', 'flow', sources.salesTypology),
    stock: normalizeTemporalSource(scope, options.cityTemporalSources, 'stock', 'snapshot', sources.stock),
    stockTypology: normalizeTemporalSource(scope, options.cityTemporalSources, 'stockTypology', 'snapshot', sources.stockTypology),
    ivv: normalizeTemporalSource(scope, options.cityTemporalSources, 'ivv', 'snapshot', sources.ivv),
    ivvTypology: normalizeTemporalSource(scope, options.cityTemporalSources, 'ivvTypology', 'snapshot', sources.ivvTypology),
    ticket: normalizeTemporalSource(scope, options.cityTemporalSources, 'ticket', 'snapshot', sources.ticket),
    ticketTypology: normalizeTemporalSource(scope, options.cityTemporalSources, 'ticketTypology', 'snapshot', sources.ticketTypology),
    meter: normalizeTemporalSource(scope, options.cityTemporalSources, 'meter', 'snapshot', sources.meter),
    meterTypology: normalizeTemporalSource(scope, options.cityTemporalSources, 'meterTypology', 'snapshot', sources.meterTypology),
  };
  // Firewall de fontes: na V3 nenhum contrato municipal fala pelo horizontal do Panorama Secovi.
  const horizontalSeries = horizontalSeriesPolicyOf(cube, scope.engineVersion ?? 'v3');
  const guard = (block: ReportMarketBlock) => (scope.engineVersion ?? 'v3') === 'v3' ? firewallTemporalBlock(block, horizontalSeries) : block;

  return {
    scope, generatedAt: new Date().toISOString(), launches, horizontalSeries,
    sales: {
      units: guard(marketBlock(scope, temporal.sales, 'liquid_sales', 'count', 'Soma de vendas líquidas por período, segmento e padrão.')),
      vgv: guard(marketBlock(scope, temporal.sales, 'vgv_liquid_sales', 'brl_millions', 'Soma de VGV vendido da API.')),
      unitsByTypology: guard(marketBlock(scope, temporal.salesTypology, 'liquid_sales', 'count', 'Soma de vendas líquidas por período e tipologia.')),
      vgvByTypology: guard(marketBlock(scope, temporal.salesTypology, 'vgv_liquid_sales', 'brl_millions', 'Soma de VGV vendido por tipologia.')),
    },
    stock: {
      units: guard(marketBlock(scope, temporal.stock, 'stock', 'count', 'Estoque no fechamento por segmento e padrão.')),
      vgv: guard(marketBlock(scope, temporal.stock, 'vgv_stock', 'brl_millions', 'VGV de estoque no fechamento por padrão.')),
      unitsByTypology: guard(marketBlock(scope, temporal.stockTypology, 'stock', 'count', 'Estoque no fechamento por tipologia.')),
      vgvByTypology: guard(marketBlock(scope, temporal.stockTypology, 'vgv_stock', 'brl_millions', 'VGV de estoque no fechamento por tipologia.')),
    },
    ivv: guard(marketBlock(scope, withClosingStockWeight(temporal.ivv, temporal.stock), 'ivv', 'percent', 'Média ponderada do IVV municipal pelo estoque final de unidades na mesma cidade, segmento e padrão.', 'weighted_average')),
    ivvByTypology: guard(marketBlock(scope, withClosingStockWeight(temporal.ivvTypology, temporal.stockTypology), 'ivv', 'percent', 'Média ponderada do IVV municipal pelo estoque final de unidades na mesma cidade, segmento e tipologia.', 'weighted_average')),
    prices: {
      ticket: guard(marketBlock(scope, withClosingStockWeight(temporal.ticket, temporal.stock), 'average_price', 'brl_millions', 'Média ponderada do preço municipal pelo estoque final de unidades na mesma cidade, segmento e padrão.', 'weighted_average')),
      meter: guard(marketBlock(scope, withClosingStockWeight(temporal.meter, temporal.stock), 'average_price_per_meter', 'brl_sqm', 'Média ponderada do preço por m² municipal pelo estoque final de unidades na mesma cidade, segmento e padrão.', 'weighted_average')),
      ticketByTypology: guard(marketBlock(scope, withClosingStockWeight(temporal.ticketTypology, temporal.stockTypology), 'average_price', 'brl_millions', 'Média ponderada do preço municipal pelo estoque final de unidades na mesma cidade, segmento e tipologia.', 'weighted_average')),
      meterByTypology: guard(marketBlock(scope, withClosingStockWeight(temporal.meterTypology, temporal.stockTypology), 'average_price_per_meter', 'brl_sqm', 'Média ponderada do preço por m² municipal pelo estoque final de unidades na mesma cidade, segmento e tipologia.', 'weighted_average')),
    },
    market: {
      cohorts: cohortBlock(scope, cohorts),
      cohortMatrix: [...cohorts.reduce((matrix, row) => {
        const key = `${row.releaseYear}::${row.standard}`;
        const value = matrix.get(key) ?? { year: row.releaseYear, standard: row.standard, vertical: 0, horizontal: 0, total: 0 };
        value[row.segment.toLowerCase() as 'vertical' | 'horizontal'] += row.stock;
        value.total += row.stock;
        matrix.set(key, value);
        return matrix;
      }, new Map<string, { year: string; standard: string; vertical: number; horizontal: number; total: number }>()).values()],
    },
    // O mapa passa a usar o cubo já filtrado pela política de universo quando ele existe.
    locations: (cube.projects.length
      ? cube.projects.filter((project) => project.latitude !== null && project.longitude !== null)
        .map((project) => ({ name: project.name, segment: project.segment, latitude: project.latitude!, longitude: project.longitude! }))
      : records.filter((row) => row.latitude != null && row.longitude != null)
        .map((row) => ({ name: row.name ?? 'Empreendimento', segment: row.segment, latitude: row.latitude!, longitude: row.longitude! }))),
    source: 'GeoBrain API',
    // Falha parcial de cidade nunca vira consolidado silencioso: o estado cai para `partial`.
    dataState: !records.length && !cube.projects.length ? 'unavailable'
      : failedCities || launches.warnings.length ? 'partial'
        : 'ready',
    openMethodologies: [
      'Contratos e fórmulas em homologação são mantidos na matriz metodológica; o relatório exibe os valores disponíveis nas APIs.',
      ...(granular.valueRangeAvailable ? [] : ['Faixa de Valor não possui campo nem regra autoritativa na API: a coluna deve ser removida da V1 em vez de exibir travessões.']),
    ],
    provenance,
    cube,
    granular,
    cityComparisons,
    presentation: options.presentation ?? {},
  };
}
