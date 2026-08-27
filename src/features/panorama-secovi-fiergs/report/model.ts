import { buildLaunchModel, periodToQuarter, safeNumber } from '../lib/launches';
import type { LaunchRecord, MarketCohortRow, MethodStatus, PanoramaGranularBlocks, PanoramaProvenance, PanoramaReportModel, PanoramaScope, Quarter, ReportDataState, ReportMarketBlock, ReportSeries, Segment } from '../types';
import { editorialWindow } from '../domain/quarters';
import { mergeCubes, type MarketCube } from '../domain/cube';
import {
  cohortMatrix as buildCohortMatrix,
  cohortMatrixParticipation,
  horizontalPricesByStandard,
  maturityByStandard,
  maturityByTypology,
  offerByCohort,
  offerByStandard,
  offerByTypology,
  pricesByStandard,
  pricesByTypology,
  vgvSummary,
} from '../domain/aggregations';

type SourceResult = { rows: Record<string, unknown>[]; available: boolean; source: string };
type AggregateMode = 'sum' | 'average';
type Accumulator = { sum: number; count: number };

function segment(value: unknown): Segment | null {
  const raw = String(value ?? '').toLowerCase();
  return raw.includes('vertical') ? 'Vertical' : raw.includes('horizontal') || raw.includes('casa') ? 'Horizontal' : null;
}

/** Janela editorial gerada dinamicamente; não há mais limite fixo em 1T2026 (G-02). */
function canonical(scope: PanoramaScope): Quarter[] {
  return editorialWindow(scope.endQuarter);
}

function add(target: Map<string, Accumulator>, key: string, value: number) {
  const current = target.get(key) ?? { sum: 0, count: 0 };
  current.sum += value;
  current.count += 1;
  target.set(key, current);
}

function result(target: Map<string, Accumulator>, key: string, mode: AggregateMode) {
  const value = target.get(key);
  if (!value) return 0;
  return mode === 'average' ? value.sum / Math.max(value.count, 1) : value.sum;
}

function reportSeries(periods: Quarter[], target: Map<string, Accumulator>, mode: AggregateMode, status: ReportMarketBlock['dataStatus'], source: string): ReportSeries[] {
  return periods.map((quarter) => {
    const vertical = result(target, `${quarter}:Vertical`, mode);
    const horizontal = result(target, `${quarter}:Horizontal`, mode);
    const total = mode === 'average' ? result(target, `${quarter}:Total`, mode) : vertical + horizontal;
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
    add(values, `${quarter}:${type}`, parsed);
    add(values, `${quarter}:Total`, parsed);
    const group = grouped.get(label) ?? new Map<string, Accumulator>();
    add(group, `${quarter}:${type}`, parsed);
    add(group, `${quarter}:Total`, parsed);
    grouped.set(label, group);
  }
  const status: ReportDataState = source.available ? (source.rows.length ? 'ready' : 'partial') : 'unavailable';
  const groupSeries = [...grouped].map(([label, group]) => ({ label, series: reportSeries(periods, group, mode, status, source.source) }));
  const byGroup = groupSeries.map(({ label, series }) => {
    const current = series.find((item) => item.quarter === scope.endQuarter) ?? series.at(-1)!;
    return { label, vertical: current.vertical, horizontal: current.horizontal, total: current.total };
  }).sort((a, b) => b.total - a.total);
  return { series: reportSeries(periods, values, mode, status, source.source), byGroup, groupSeries, unit, methodStatus: 'open_method', dataStatus: status, source: source.source, formula };
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
  const groupSeries = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({
    label,
    series: emptySeries().map((item) => item.quarter === scope.endQuarter ? { ...item, ...value, total: value.vertical + value.horizontal } : item),
  }));
  return {
    series: emptySeries(),
    byGroup: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, ...value, total: value.vertical + value.horizontal })),
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

/** Agrega as linhas prontas dos slides 31–51 a partir do cubo granular. */
export function buildGranularBlocks(cube: MarketCube): PanoramaGranularBlocks {
  const matrix = buildCohortMatrix(cube, 'Vertical');
  return {
    offerByStandard: offerByStandard(cube, 'Vertical'),
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
    rejectedByPolicy: [...rejections].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  };
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
  options: { cubes?: MarketCube[]; provenance?: Partial<PanoramaProvenance> } = {},
): PanoramaReportModel {
  const launches = buildLaunchModel(records);
  const cube = options.cubes?.length
    ? mergeCubes(options.cubes, scope.endQuarter, scope.entity ?? 'secovi-sp')
    : emptyCube(scope);
  const provenance = provenanceOf(scope, cube, options.provenance);
  const failedCities = provenance.failedCities.length > 0;
  const granular = buildGranularBlocks(cube);
  return {
    scope, generatedAt: new Date().toISOString(), launches,
    sales: {
      units: marketBlock(scope, sources.sales, 'liquid_sales', 'count', 'Soma de vendas líquidas por período, segmento e padrão.'),
      vgv: marketBlock(scope, sources.sales, 'vgv_liquid_sales', 'brl_millions', 'Soma de VGV vendido da API.'),
      unitsByTypology: marketBlock(scope, sources.salesTypology, 'liquid_sales', 'count', 'Soma de vendas líquidas por período e tipologia.'),
      vgvByTypology: marketBlock(scope, sources.salesTypology, 'vgv_liquid_sales', 'brl_millions', 'Soma de VGV vendido por tipologia.'),
    },
    stock: {
      units: marketBlock(scope, sources.stock, 'stock', 'count', 'Estoque no fechamento por segmento e padrão.'),
      vgv: marketBlock(scope, sources.stock, 'vgv_stock', 'brl_millions', 'VGV de estoque no fechamento por padrão.'),
      unitsByTypology: marketBlock(scope, sources.stockTypology, 'stock', 'count', 'Estoque no fechamento por tipologia.'),
      vgvByTypology: marketBlock(scope, sources.stockTypology, 'vgv_stock', 'brl_millions', 'VGV de estoque no fechamento por tipologia.'),
    },
    ivv: marketBlock(scope, sources.ivv, 'ivv', 'percent', 'IVV médio retornado por padrão e segmento.', 'average'),
    ivvByTypology: marketBlock(scope, sources.ivvTypology, 'ivv', 'percent', 'IVV médio retornado por tipologia.', 'average'),
    prices: {
      ticket: marketBlock(scope, sources.ticket, 'average_price', 'brl_millions', 'Preço médio retornado pela API.', 'average'),
      meter: marketBlock(scope, sources.meter, 'average_price_per_meter', 'brl_sqm', 'Preço médio por m² retornado pela API.', 'average'),
      ticketByTypology: marketBlock(scope, sources.ticketTypology, 'average_price', 'brl_millions', 'Preço médio por tipologia retornado pela API.', 'average'),
      meterByTypology: marketBlock(scope, sources.meterTypology, 'average_price_per_meter', 'brl_sqm', 'Preço médio por m² e tipologia retornado pela API.', 'average'),
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
  };
}
