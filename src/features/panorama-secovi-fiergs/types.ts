export type Quarter = `${1 | 2 | 3 | 4}T${number}`;
export type Segment = 'Vertical' | 'Horizontal';
export type MethodStatus = 'reconciled' | 'assumed' | 'open_method' | 'approved';
export type ComparisonResult = 'match' | 'different' | 'missing_reference' | 'missing_api' | 'not_comparable';

export interface PanoramaScope { uf: string; city: string; endQuarter: Quarter; }

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
