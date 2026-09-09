import { describe, expect, it } from 'vitest';
import { bucketMonthFromStr, bucketQuarterFromStr, computeResumoEmail, varPct, type ClosureRow } from './aggregate';

function row(periodKey: string, sold: number, status = 'Ativo'): ClosureRow {
  const period = `${periodKey}-01`;
  const year = periodKey.slice(0, 4);
  return {
    building_id: '1', building_name: 'Empreendimento', building_type: 'Vertical', standard: 'Médio', city: 'Cidade', status,
    release_date: period, release_period_key: periodKey, release_period_bucket_year: year,
    release_period_bucket_quarter: bucketQuarterFromStr(period), release_period_bucket_month: bucketMonthFromStr(period),
    typology_id: `t-${periodKey}`, type_of_typology: 'Padrão', number_bedroom: 2, garage: 1, qty: 1, private_area: 50,
    period, periodDate: new Date(`${period}T00:00:00`), periodKey, bucketYear: year,
    bucketQuarter: bucketQuarterFromStr(period), bucketMonth: bucketMonthFromStr(period), price: 100000,
    sold_in_period: sold, typology_stock: 10, vgv_period: 100000,
  };
}

describe('computeResumoEmail', () => {
  it('usa o último período selecionado e limita os acumulados de janeiro até ele', () => {
    const dimensionRows = [row('2025-01', 50), row('2025-07', 80), row('2026-01', 60), row('2026-06', 100), row('2026-07', 120), row('2026-03', 10, 'Esgotado')];
    const result = computeResumoEmail([dimensionRows[4]], dimensionRows);

    expect(result?.previousYearKey).toBe('2025-07');
    expect(result?.previousMonthKey).toBe('2026-06');
    expect(result?.selected.unidades_vendidas).toBe(120);
    expect(result?.previousYearAccum.unidades_vendidas).toBe(130);
    expect(result?.selectedAccum.unidades_vendidas).toBe(290);
    expect(varPct(result?.selectedAccum.unidades_vendidas ?? null, result?.previousYearAccum.unidades_vendidas ?? null)).toBeCloseTo(290 / 130 - 1);
    expect(result?.selected.oferta_ativa).toBe(5);
  });
});
