import { calculateHorizontalShape, evaluateHorizontalCurve, type HorizontalInput } from './horizontal';
import type { HorizontalPattern } from './parameters';

/** Série de observações reais consecutivas, mês de lançamento = 1. Adapter de arquivo fica fora do motor. */
export interface RetrospectiveCase {
  caseId: string;
  pattern: HorizontalPattern;
  launchedUnits: number;
  observedMonthlyNetSales: number[];
  cutoffMonth: number;
}

export interface RetrospectiveRow {
  month: number;
  actualCumulative: number;
  curveCumulative: number | null;
  last3Cumulative: number;
  last12Cumulative: number;
  /** Erro absoluto do acumulado, em pontos percentuais das unidades lançadas. */
  curveAbsolutePp: number | null;
  last3AbsolutePp: number;
  last12AbsolutePp: number;
  curveOmission: 'tail-rule-pending' | 'outside-calibration-horizon' | null;
}

export interface RetrospectiveResult {
  caseId: string;
  cutoffMonth: number;
  parameterVersion: string;
  firstMonthAt95: number;
  rows: RetrospectiveRow[];
}

/** Compara o PPT com duas médias, sem alimentar previsão com observações posteriores ao corte. */
export function evaluateRetrospectiveCase(source: RetrospectiveCase): RetrospectiveResult {
  const { observedMonthlyNetSales: sales, cutoffMonth: n, launchedUnits } = source;
  if (!source.caseId || !Number.isSafeInteger(launchedUnits) || launchedUnits <= 0
    || !Number.isInteger(n) || n < 1 || n > 48 || sales.length <= n) {
    throw new RangeError('Caso retrospectivo requer ID, unidades positivas, origem 1–48 e futuro observado.');
  }
  if (sales.some(value => !Number.isSafeInteger(value) || value < 0)) {
    throw new RangeError('Série exige vendas líquidas mensais inteiras não negativas; distratos líquidos negativos exigem política.');
  }
  const observedAtCutoff = sales.slice(0, n).reduce((sum, value) => sum + value, 0);
  if (sales.reduce((sum, value) => sum + value, 0) > launchedUnits) {
    throw new RangeError('Acumulado observado excede unidades lançadas.');
  }
  const input: HorizontalInput = {
    pattern: source.pattern,
    launchedUnits,
    netSoldUnits: observedAtCutoff,
    marketMonth: n,
  };
  const shape = calculateHorizontalShape(input);
  const last3 = sales.slice(Math.max(0, n - 3), n);
  const last12 = sales.slice(Math.max(0, n - 12), n);
  const rate3 = last3.reduce((sum, value) => sum + value, 0) / last3.length;
  const rate12 = last12.reduce((sum, value) => sum + value, 0) / last12.length;
  let actualCumulative = observedAtCutoff;
  const rows: RetrospectiveRow[] = [];

  for (let month = n + 1; month <= sales.length; month += 1) {
    actualCumulative += sales[month - 1];
    const curveOmission = month >= shape.firstMonthAt95
      ? 'tail-rule-pending'
      : month > n + 36 ? 'outside-calibration-horizon' : null;
    const curveCumulative = curveOmission ? null : evaluateHorizontalCurve(input, month).projectedNetSoldUnits;
    const last3Cumulative = Math.min(launchedUnits, observedAtCutoff + rate3 * (month - n));
    const last12Cumulative = Math.min(launchedUnits, observedAtCutoff + rate12 * (month - n));
    const errorPp = (projected: number) => 100 * Math.abs(projected - actualCumulative) / launchedUnits;
    rows.push({
      month,
      actualCumulative,
      curveCumulative,
      last3Cumulative,
      last12Cumulative,
      curveAbsolutePp: curveCumulative === null ? null : errorPp(curveCumulative),
      last3AbsolutePp: errorPp(last3Cumulative),
      last12AbsolutePp: errorPp(last12Cumulative),
      curveOmission,
    });
  }
  return {
    caseId: source.caseId,
    cutoffMonth: n,
    parameterVersion: shape.parameterVersion,
    firstMonthAt95: shape.firstMonthAt95,
    rows,
  };
}
