import { describe, expect, it } from 'vitest';
import { calculateHorizontalShape, evaluateHorizontalCurve } from './horizontal';
import { evaluateRetrospectiveCase } from './retrospective';

const closedExample = { pattern: 'fechado' as const, launchedUnits: 300, netSoldUnits: 150, marketMonth: 6 };

describe('modelo horizontal Finotti do PPT', () => {
  it('reproduz os números publicados do caso 300/150/6 sem ajustar coeficientes', () => {
    const shape = calculateHorizontalShape(closedExample);
    expect(shape.k).toBeCloseTo(0.632035346, 8);
    expect(evaluateHorizontalCurve(closedExample, 6).fraction).toBe(0.5);
    expect(evaluateHorizontalCurve(closedExample, 12).fraction).toBeCloseTo(0.6584307113, 8);
    expect(evaluateHorizontalCurve(closedExample, 18).fraction).toBeCloseTo(0.7504208555, 8);
    expect(shape.firstMonthAt95).toBe(61);
    expect(shape.illustrativeExhaustionMonth).toBe(67);
    expect(evaluateHorizontalCurve(closedExample, 18).projectedNetSoldUnits - 150).toBeCloseTo(75.1262566, 6);
  });

  it('expõe extrapolação e limiar da cauda sem arredondar unidades', () => {
    expect(evaluateHorizontalCurve(closedExample, 43).outsideCalibrationHorizon).toBe(true);
    expect(evaluateHorizontalCurve(closedExample, 61).reachesTailThreshold).toBe(true);
    expect(evaluateHorizontalCurve(closedExample, 60).reachesTailThreshold).toBe(false);
  });

  it('rejeita origens sem domínio e percentuais já na cauda', () => {
    expect(() => calculateHorizontalShape({ ...closedExample, marketMonth: 0 })).toThrow(RangeError);
    expect(() => calculateHorizontalShape({ ...closedExample, netSoldUnits: 0 })).toThrow(RangeError);
    expect(() => calculateHorizontalShape({ ...closedExample, netSoldUnits: 285 })).toThrow(RangeError);
    expect(() => calculateHorizontalShape({ ...closedExample, netSoldUnits: 301 })).toThrow(RangeError);
  });
});

describe('ensaio retrospectivo', () => {
  const base = {
    caseId: 'exemplo-sintetico',
    pattern: 'fechado' as const,
    launchedUnits: 300,
    observedMonthlyNetSales: [20, 25, 30, 25, 25, 25, 10, 12, 14],
    cutoffMonth: 6,
  };

  it('congela a origem: mudar o futuro altera erros, não previsões', () => {
    const first = evaluateRetrospectiveCase(base);
    const changed = evaluateRetrospectiveCase({ ...base, observedMonthlyNetSales: [...base.observedMonthlyNetSales.slice(0, 6), 2, 3, 4] });
    expect(first.rows.map(row => row.curveCumulative)).toEqual(changed.rows.map(row => row.curveCumulative));
    expect(first.rows.map(row => row.last3Cumulative)).toEqual(changed.rows.map(row => row.last3Cumulative));
    expect(first.rows[0].curveAbsolutePp).not.toBe(changed.rows[0].curveAbsolutePp);
    expect(first.rows[0].actualCumulative).toBe(160);
  });

  it('recusa série impossível antes de calcular comparações', () => {
    expect(() => evaluateRetrospectiveCase({ ...base, observedMonthlyNetSales: [...base.observedMonthlyNetSales, -1] })).toThrow(RangeError);
  });
});
