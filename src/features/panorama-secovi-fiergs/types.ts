import type { EntityId } from './domain/entity-policy';
import type { CohortMatrix, MaturityRow, OfferRow, PriceRow, VgvRow } from './domain/aggregations';
import type { MarketCube } from './domain/cube';

export type { EntityId };

export type Quarter = `${1 | 2 | 3 | 4}T${number}`;
export type Segment = 'Vertical' | 'Horizontal';
export type MethodStatus = 'reconciled' | 'assumed' | 'open_method' | 'approved';
export type ComparisonResult = 'match' | 'different' | 'missing_reference' | 'missing_api' | 'not_comparable';

/**
 * Recorte canônico do Panorama. `cities` é sempre um array — uma cidade é um array de um item —
 * para que multi-cidade (G-01) não exija um segundo contrato. Não há mais `scope.city`.
 */
export interface PanoramaScope { uf: string; cities: string[]; endQuarter: Quarter; entity?: EntityId; }

/** Rótulo determinístico do recorte para capa, título e nome de arquivo, com uma ou várias cidades. */
export function scopeCityLabel(scope: Pick<PanoramaScope, 'cities'>): string {
  const cities = scope.cities.filter(Boolean);
  if (!cities.length) return '—';
  if (cities.length === 1) return cities[0];
  if (cities.length === 2) return `${cities[0]} e ${cities[1]}`;
  return `${cities.slice(0, -1).join(', ')} e ${cities[cities.length - 1]}`;
}

/** Slug estável para nome de arquivo; várias cidades viram uma lista curta e ordenada. */
export function scopeCitySlug(scope: Pick<PanoramaScope, 'cities'>): string {
  const slug = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const cities = scope.cities.filter(Boolean).map(slug).sort();
  if (!cities.length) return 'sem-cidade';
  return cities.length <= 3 ? cities.join('-') : `${cities.slice(0, 3).join('-')}-e-mais-${cities.length - 3}`;
}

/** Proveniência do consolidado multi-cidade: o que foi pedido, o que fechou e o que falhou. */
export interface PanoramaProvenance {
  requestedCities: string[];
  completedCities: string[];
  failedCities: { city: string; error: string }[];
  entity: EntityId;
  /** Empreendimentos recusados pela política de universo, agrupados por motivo. */
  rejectedByPolicy: { reason: string; count: number }[];
}

export interface LaunchRecord {
  quarter: Quarter;
  segment: Segment;
  projects: number;
  units: number;
  vgvMillions: number | null;
  economicProjects?: number;
  otherProjects?: number;
  economicUnits?: number;
  otherUnits?: number;
  economicVgvMillions?: number | null;
  otherVgvMillions?: number | null;
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LaunchSeries { quarter: Quarter; vertical: number; horizontal: number; total: number; }

export interface LaunchModel {
  quarters: Quarter[];
  projects: LaunchSeries[];
  units: LaunchSeries[];
  vgv: LaunchSeries[];
  projectStandards: { quarter: Quarter; economic: number; other: number }[];
  unitStandards: { quarter: Quarter; economic: number; other: number }[];
  vgvStandards: { quarter: Quarter; economic: number | null; other: number | null }[];
  annual: { year: number; projects: LaunchSeries; units: LaunchSeries; vgv: LaunchSeries }[];
  warnings: string[];
}

export interface MetricContract {
  id: string;
  title: string;
  unit: 'count' | 'currency_millions' | 'percent';
  dimensions: string[];
  source: string;
  formula: string;
  status: MethodStatus;
  tolerance: { absolute?: number; relative?: number };
  consumers: number[];
}

export interface ComparisonCell {
  metricId: string;
  label: string;
  coordinates: Record<string, string>;
  expected: number | null;
  actual: number | null;
  absoluteDifference: number | null;
  relativeDifference: number | null;
  result: ComparisonResult;
  status: MethodStatus;
  formula: string;
  source: string;
}

export interface PanoramaReference {
  id: string;
  label: string;
  scope: PanoramaScope;
  model: LaunchModel;
}

/** Fonte única do livro editorial; páginas sem contrato homologado não recebem números de referência. */
export type ReportDataState = 'ready' | 'partial' | 'unavailable' | 'not_applicable';
export interface ReportSeries extends LaunchSeries { methodStatus: MethodStatus; dataStatus: ReportDataState; source: string; }
export interface ReportGroupSeries { label: string; series: ReportSeries[]; }
export interface ReportMarketBlock {
  series: ReportSeries[];
  byGroup: { label: string; vertical: number; horizontal: number; total: number }[];
  groupSeries: ReportGroupSeries[];
  unit: 'count' | 'brl_millions' | 'percent' | 'brl_sqm';
  methodStatus: MethodStatus;
  dataStatus: ReportDataState;
  source: string;
  formula: string;
}
export interface MarketCohortRow { segment: Segment; releaseYear: string; standard: string; stock: number; }
export interface PanoramaReportModel {
  scope: PanoramaScope;
  generatedAt: string;
  launches: LaunchModel;
  sales: { units: ReportMarketBlock; vgv: ReportMarketBlock; unitsByTypology: ReportMarketBlock; vgvByTypology: ReportMarketBlock };
  stock: { units: ReportMarketBlock; vgv: ReportMarketBlock; unitsByTypology: ReportMarketBlock; vgvByTypology: ReportMarketBlock };
  ivv: ReportMarketBlock;
  ivvByTypology: ReportMarketBlock;
  prices: { ticket: ReportMarketBlock; meter: ReportMarketBlock; ticketByTypology: ReportMarketBlock; meterByTypology: ReportMarketBlock };
  market: { cohorts: ReportMarketBlock; cohortMatrix: { year: string; standard: string; vertical: number; horizontal: number; total: number }[] };
  locations: { name: string; segment: Segment; latitude: number; longitude: number }[];
  source: 'GeoBrain API';
  dataState: ReportDataState;
  openMethodologies: string[];
  /** Proveniência do consolidado multi-cidade (G-01). */
  provenance: PanoramaProvenance;
  /** Base granular por empreendimento; fonte única das agregações abaixo. */
  cube: MarketCube;
  /** Linhas prontas para os slides 31–51, já canonizadas, ordenadas e reconciliadas. */
  granular: PanoramaGranularBlocks;
}

/**
 * Linhas prontas para consumo direto pelos componentes. Nenhuma delas deve ser recalculada no JSX:
 * todas derivam do mesmo `cube` e por isso fecham entre si.
 */
export interface PanoramaGranularBlocks {
  /** Slide 31 — oferta lançada/final por padrão, vertical. */
  offerByStandard: OfferRow[];
  /** Slides 34/35 — oferta por tipologia canônica, vertical. */
  offerByTypology: OfferRow[];
  /** Slide 33 — coortes verticais com `Subtotal até 2024` e `Total geral`. */
  cohortsVertical: OfferRow[];
  /** Slide 48 — coortes do horizontal permitido pela política. */
  cohortsHorizontal: OfferRow[];
  /** Slide 41 — matriz ano × padrão com oferta lançada e final. */
  cohortMatrix: CohortMatrix;
  /** Slide 42 — participação derivada exclusivamente da matriz do slide 41. */
  cohortMatrixParticipation: CohortMatrix;
  /** Slides 43/44 — maturidade × padrão, somente vertical. */
  maturityByStandard: MaturityRow[];
  /** Slides 45/46 — maturidade × tipologia, somente vertical. */
  maturityByTypology: MaturityRow[];
  /** Slides 38/39 — ticket, área e R$/m² por padrão vertical. */
  pricesByStandard: PriceRow[];
  /** Slides 36/37 — ticket, área e R$/m² por tipologia vertical. */
  pricesByTypology: PriceRow[];
  /** Slide 49 — preços horizontais abertos por padrão. */
  horizontalPricesByStandard: PriceRow[];
  /** Slide 51 — VGV com subtotal vertical, horizontais e total geral. */
  vgv: VgvRow[];
  /**
   * Slide 31: `false` enquanto não houver campo/regra autoritativa de Faixa de Valor. O Luna deve
   * remover a coluna na V1 em vez de exibir travessões.
   */
  valueRangeAvailable: boolean;
}

export interface CalibrationCell {
  method: string;
  metric: 'Empreendimentos' | 'Unidades lançadas';
  source: string;
  quarter: Quarter;
  segment: 'vertical' | 'horizontal' | 'total';
  expected: number;
  actual: number | null;
  difference: number | null;
  status: 'match' | 'different' | 'missing_api';
}

export interface LaunchAuditBuilding {
  buildingId: string;
  name: string;
  segment: Segment;
  releaseQuarter: Quarter;
  totalUnits: number;
  releaseMonthQty: number;
}

export interface PanoramaExclusion {
  id: string;
  scope: 'global' | 'release_only' | 'period' | 'metric';
  buildingIds: string[];
  periods?: Quarter[];
  metricIds?: string[];
  reason: string;
  author: string;
  createdAt: string;
  status: 'approved' | 'revoked';
}

export type MarketMetric = 'Unidades vendidas' | 'VGV vendido (R$ mi)' | 'Estoque final' | 'VGV estoque (R$ mi)' | 'IVV';

/** A cell from a competing-method bench. It is intentionally independent from report contracts. */
export interface MarketCalibrationCell {
  block: 'Vendas' | 'Estoque' | 'IVV';
  method: string;
  metric: MarketMetric;
  source: string;
  period: Quarter;
  segment: 'vertical' | 'horizontal' | 'total';
  expected: number | null;
  actual: number | null;
  difference: number | null;
  status: 'match' | 'different' | 'missing_api' | 'not_comparable';
}
