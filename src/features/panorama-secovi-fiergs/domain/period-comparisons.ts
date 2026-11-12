import type { LaunchSeries, Quarter } from '../types';

export type FiergsComparisonKind = 'quarter' | 'first_semester' | 'nine_months' | 'year_to_date' | 'rolling_12_months';
export interface FiergsComparisonPair {
  kind: FiergsComparisonKind;
  title: string;
  leftLabel: string;
  rightLabel: string;
  left: number | null;
  right: number | null;
  variation: number | null;
  complete: boolean;
}

const change = (current: number | null, previous: number | null) =>
  current === null || previous === null || previous === 0 ? null : (current / previous - 1) * 100;

const pair = (kind: FiergsComparisonKind, title: string, leftLabel: string, rightLabel: string, left: number | null, right: number | null): FiergsComparisonPair => ({
  kind, title, leftLabel, rightLabel, left, right, variation: change(right, left), complete: left !== null && right !== null,
});

const observed = (data: LaunchSeries[], quarter: Quarter): number | null => {
  const row = data.find((item) => item.quarter === quarter);
  return row ? row.vertical : null;
};

function throughQuarter(data: LaunchSeries[], year: number, quarterNumber: number, snapshot: boolean): number | null {
  if (snapshot) return observed(data, `${quarterNumber}T${year}` as Quarter);
  const values = Array.from({ length: quarterNumber }, (_, index) => observed(data, `${index + 1}T${year}` as Quarter));
  return values.some((value) => value === null) ? null : values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

const contextualDefinition = (quarterNumber: number, previousYear: number, currentYear: number) => {
  if (quarterNumber === 2) return { kind: 'first_semester' as const, title: 'COMPARATIVO 1º SEMESTRE', leftLabel: `1S${previousYear}`, rightLabel: `1S${currentYear}` };
  if (quarterNumber === 3) return { kind: 'nine_months' as const, title: 'COMPARATIVO 9 MESES', leftLabel: `9M${previousYear}`, rightLabel: `9M${currentYear}` };
  if (quarterNumber === 4) return { kind: 'year_to_date' as const, title: 'COMPARATIVO ANUAL', leftLabel: String(previousYear), rightLabel: String(currentYear) };
  return null;
};

/** Comparações editoriais FIERGS sem transformar período ausente em zero. */
export function fiergsPeriodComparisons(data: LaunchSeries[], endQuarter: Quarter, options: {
  quarter?: boolean;
  contextual?: boolean;
  snapshot?: boolean;
  rolling12Months?: boolean;
} = {}): FiergsComparisonPair[] {
  const quarterNumber = Number(endQuarter[0]);
  const currentYear = Number(endQuarter.slice(2));
  const previousYear = currentYear - 1;
  const rows: FiergsComparisonPair[] = [];
  if (options.quarter) rows.push(pair(
    'quarter', `COMPARATIVO ${quarterNumber}º TRIMESTRE`, `${quarterNumber}T${previousYear}`, `${quarterNumber}T${currentYear}`,
    observed(data, `${quarterNumber}T${previousYear}` as Quarter), observed(data, `${quarterNumber}T${currentYear}` as Quarter),
  ));
  const contextual = options.contextual ? contextualDefinition(quarterNumber, previousYear, currentYear) : null;
  if (contextual) rows.push(pair(
    contextual.kind, contextual.title, contextual.leftLabel, contextual.rightLabel,
    throughQuarter(data, previousYear, quarterNumber, Boolean(options.snapshot)), throughQuarter(data, currentYear, quarterNumber, Boolean(options.snapshot)),
  ));
  if (options.rolling12Months) rows.push(pair(
    'rolling_12_months', 'COMPARATIVO ACUMULADO 12 MESES', `12M até ${quarterNumber}T${previousYear}`, `12M até ${quarterNumber}T${currentYear}`,
    observed(data, `${quarterNumber}T${previousYear}` as Quarter), observed(data, `${quarterNumber}T${currentYear}` as Quarter),
  ));
  return rows;
}
