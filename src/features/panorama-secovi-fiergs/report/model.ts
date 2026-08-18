import { buildLaunchModel, periodToQuarter, quarterKey, safeNumber } from '../lib/launches';
import type { LaunchRecord, MarketCohortRow, MethodStatus, PanoramaReportModel, PanoramaScope, Quarter, ReportMarketBlock, ReportSeries, Segment } from '../types';

type SourceResult = { rows: Record<string, unknown>[]; available: boolean; source: string };
type AggregateMode = 'sum' | 'average';
type Accumulator = { sum: number; count: number };

function segment(value: unknown): Segment | null {
  const raw = String(value ?? '').toLowerCase();
  return raw.includes('vertical') ? 'Vertical' : raw.includes('horizontal') || raw.includes('casa') ? 'Horizontal' : null;
}

function canonical(scope: PanoramaScope): Quarter[] {
  const end = quarterKey(scope.endQuarter);
  return Array.from({ length: 17 }, (_, index) => {
    const value = end - 16 + index;
    return `${((value - 1) % 4) + 1}T${Math.floor((value - 1) / 4)}` as Quarter;
  });
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
  const status = source.available ? (source.rows.length ? 'ready' : 'partial') : 'unavailable';
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
  const status = rows.length ? 'ready' : 'unavailable';
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

export function buildPanoramaReportModel(
  scope: PanoramaScope,
  records: LaunchRecord[],
  sources: {
    sales: SourceResult; salesTypology: SourceResult; stock: SourceResult; stockTypology: SourceResult;
    ivv: SourceResult; ivvTypology: SourceResult; ticket: SourceResult; ticketTypology: SourceResult;
    meter: SourceResult; meterTypology: SourceResult;
  },
  cohorts: MarketCohortRow[] = [],
): PanoramaReportModel {
  const launches = buildLaunchModel(records);
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
    locations: records.filter((row) => row.latitude != null && row.longitude != null).map((row) => ({ name: row.name ?? 'Empreendimento', segment: row.segment, latitude: row.latitude!, longitude: row.longitude! })),
    source: 'GeoBrain API',
    dataState: records.length ? (launches.warnings.length ? 'partial' : 'ready') : 'unavailable',
    openMethodologies: ['Contratos e fórmulas em homologação são mantidos na matriz metodológica; o relatório exibe os valores disponíveis nas APIs.'],
  };
}
