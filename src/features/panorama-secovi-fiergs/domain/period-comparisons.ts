import type { LaunchSeries, Quarter } from '../types';

export type FiergsComparisonKind = 'quarter' | 'first_semester' | 'rolling_12_months';
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

function firstSemester(data: LaunchSeries[], year: number, snapshot: boolean): number | null {
  if (snapshot) return observed(data, `2T${year}`);
  const first = observed(data, `1T${year}`);
  const second = observed(data, `2T${year}`);
  return first === null || second === null ? null : first + second;
}

/** Comparações editoriais FIERGS sem transformar período ausente em zero. */
export function fiergsPeriodComparisons(data: LaunchSeries[], endQuarter: Quarter, options: {
  quarter?: boolean;
  firstSemester?: boolean;
  firstSemesterSnapshot?: boolean;
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
  if (options.firstSemester) rows.push(pair(
    'first_semester', 'COMPARATIVO 1º SEMESTRE', `1S${previousYear}`, `1S${currentYear}`,
    firstSemester(data, previousYear, Boolean(options.firstSemesterSnapshot)), firstSemester(data, currentYear, Boolean(options.firstSemesterSnapshot)),
  ));
  if (options.rolling12Months) rows.push(pair(
    'rolling_12_months', 'COMPARATIVO ACUMULADO 12 MESES', `12M até ${quarterNumber}T${previousYear}`, `12M até ${quarterNumber}T${currentYear}`,
    observed(data, `${quarterNumber}T${previousYear}` as Quarter), observed(data, `${quarterNumber}T${currentYear}` as Quarter),
  ));
  return rows;
}
