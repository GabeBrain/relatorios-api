import { HORIZONTAL_PARAMETERS, type HorizontalPattern } from './parameters';

export interface HorizontalInput {
  pattern: HorizontalPattern;
  launchedUnits: number;
  netSoldUnits: number;
  marketMonth: number;
}

export interface HorizontalShape {
  parameterVersion: string;
  observedFraction: number;
  k: number;
  /** Primeiro mês inteiro no qual a curva bruta alcança 95%. Não define a série da cauda. */
  firstMonthAt95: number;
  /** Contagem do exemplo do slide: cruzamento + 5/6 meses. Regra mensal ainda não confirmada. */
  illustrativeExhaustionMonth: number;
}

function assertInput(input: HorizontalInput): void {
  if (input.pattern !== 'aberto' && input.pattern !== 'fechado') {
    throw new RangeError('Padrão horizontal inválido.');
  }
  if (!Number.isSafeInteger(input.launchedUnits) || input.launchedUnits <= 0) {
    throw new RangeError('Unidades lançadas devem ser um inteiro positivo.');
  }
  if (!Number.isSafeInteger(input.netSoldUnits) || input.netSoldUnits <= 0 || input.netSoldUnits >= input.launchedUnits) {
    throw new RangeError('Vendas líquidas acumuladas devem estar estritamente entre zero e unidades lançadas.');
  }
  if (!Number.isInteger(input.marketMonth) || input.marketMonth < 1 || input.marketMonth > 48) {
    throw new RangeError('A origem deve estar entre os meses inteiros 1 e 48 do ajuste publicado.');
  }
  if (input.netSoldUnits / input.launchedUnits >= 0.95) {
    throw new RangeError('Origem em 95% ou mais depende da regra de cauda ainda não confirmada.');
  }
}

/** Motor puro: reproduz apenas a curva horizontal anterior à regra mensal da cauda. */
export function calculateHorizontalShape(input: HorizontalInput): HorizontalShape {
  assertInput(input);
  const p = HORIZONTAL_PARAMETERS[input.pattern];
  const observedFraction = input.netSoldUnits / input.launchedUnits;
  const logMonth = Math.log(input.marketMonth);
  const k = (p.c0 + p.c1 * logMonth)
    + (p.c2 + p.c3 * logMonth) * Math.log(-Math.log(1 - observedFraction));
  if (!Number.isFinite(k) || k <= 0) {
    throw new RangeError('k não positivo ou não finito; a curva crescente não está definida para esta origem.');
  }

  const thresholdTime = input.marketMonth
    * Math.pow(Math.log(0.05) / Math.log(1 - observedFraction), 1 / k);
  if (!Number.isFinite(thresholdTime) || thresholdTime > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Cruzamento de 95% fora do domínio numérico seguro.');
  }
  const firstMonthAt95 = Math.ceil(thresholdTime);
  return {
    parameterVersion: HORIZONTAL_PARAMETERS.version,
    observedFraction,
    k,
    firstMonthAt95,
    illustrativeExhaustionMonth: firstMonthAt95 + p.tailMonths,
  };
}

export interface CurvePoint {
  month: number;
  fraction: number;
  projectedNetSoldUnits: number;
  outsideCalibrationHorizon: boolean;
  reachesTailThreshold: boolean;
}

export function evaluateHorizontalCurve(input: HorizontalInput, month: number): CurvePoint {
  const shape = calculateHorizontalShape(input);
  if (!Number.isSafeInteger(month) || month < input.marketMonth) {
    throw new RangeError('Mês de avaliação deve ser inteiro e não anterior à origem.');
  }
  const fraction = month === input.marketMonth
    ? shape.observedFraction
    : -Math.expm1(Math.log(1 - shape.observedFraction)
      * Math.pow(month / input.marketMonth, shape.k));
  return {
    month,
    fraction,
    projectedNetSoldUnits: fraction * input.launchedUnits,
    outsideCalibrationHorizon: month > input.marketMonth + 36,
    reachesTailThreshold: month >= shape.firstMonthAt95,
  };
}
