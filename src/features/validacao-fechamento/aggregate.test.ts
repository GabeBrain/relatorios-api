import { describe, expect, it } from 'vitest';
import { bucketMonthFromStr, bucketQuarterFromStr, computeResumoEmail, varPct, type ClosureRow } from './aggregate';

function row(periodKey: string, sold: number, status = 'Ativo', releaseQty = 1): ClosureRow {
  const period = `${periodKey}-01`;
  const year = periodKey.slice(0, 4);
  return {
    building_id: '1', building_name: 'Empreendimento', building_type: 'Vertical', standard: 'Médio', city: 'Cidade', status,
    release_date: period, release_period_key: periodKey, release_period_bucket_year: year,
    release_period_bucket_quarter: bucketQuarterFromStr(period), release_period_bucket_month: bucketMonthFromStr(period),
    typology_id: `t-${periodKey}`, type_of_typology: 'Padrão', number_bedroom: 2, garage: 1, qty: 1, release_qty: releaseQty, private_area: 50,
    period, periodDate: new Date(`${period}T00:00:00`), periodKey, bucketYear: year,
    bucketQuarter: bucketQuarterFromStr(period), bucketMonth: bucketMonthFromStr(period), price: 100000,
    sold_in_period: sold, typology_stock: 10, vgv_period: 100000,
  };
}

describe('computeResumoEmail', () => {
  it('agrupa as três colunas conforme ano/trimestre e preserva as referências mensais dos acumulados', () => {
    const data = [row('2025-01', 20), row('2025-07', 30), row('2025-08', 40), row('2026-01', 50), row('2026-04', 60), row('2026-07', 70), row('2026-08', 80)];
    const selected = [data[6]];
    const monthly = computeResumoEmail(selected, data)!;
    const yearly = computeResumoEmail(selected, data, 'year')!;
    const quarterly = computeResumoEmail(selected, data, 'quarter')!;
    expect(monthly.displayPeriods.selectedLabel).toBe('ago/26');
    expect(monthly.displayPeriods.selected).toEqual(monthly.selected);
    expect(yearly.displayPeriods.selectedLabel).toBe('2026');
    expect(yearly.displayPeriods.previousLabel).toBe('2025');
    expect(yearly.displayPeriods.previousYearLabel).toBe('2025');
    expect(yearly.displayPeriods.selected.unidades_vendidas).toBe(260);
    expect(yearly.displayPeriods.previous.unidades_vendidas).toBe(90);
    expect(quarterly.displayPeriods.selectedLabel).toBe('03T/26');
    expect(quarterly.displayPeriods.previousLabel).toBe('02T/26');
    expect(quarterly.displayPeriods.previousYearLabel).toBe('03T/25');
    expect(quarterly.displayPeriods.selected.unidades_vendidas).toBe(150);
    expect(quarterly.displayPeriods.previous.unidades_vendidas).toBe(60);
    expect(quarterly.displayPeriods.previousYear.unidades_vendidas).toBe(70);
    const { displayPeriods: _monthlyDisplay, ...unchanged } = monthly;
    for (const result of [yearly, quarterly]) {
      const { displayPeriods: _display, ...rest } = result;
      expect(rest).toEqual(unchanged);
    }
  });

  it('o trimestre anterior ao primeiro trimestre pertence ao ano anterior', () => {
    const data = [row('2025-01', 20), row('2025-10', 30), row('2026-01', 40)];
    const result = computeResumoEmail([data[2]], data, 'quarter')!;
    expect(result.displayPeriods.previousLabel).toBe('04T/25');
    expect(result.displayPeriods.previous.unidades_vendidas).toBe(30);
    expect(result.displayPeriods.previousYearLabel).toBe('01T/25');
    expect(result.displayPeriods.previousYear.unidades_vendidas).toBe(20);
  });

  it('usa o último período selecionado e limita os acumulados de janeiro até ele', () => {
    const dimensionRows = [row('2025-01', 50), row('2025-07', 80), row('2026-01', 60), row('2026-06', 100), row('2026-07', 120, 'Ativo', 100), row('2026-03', 10, 'Esgotado', 200)];
    const result = computeResumoEmail([dimensionRows[4]], dimensionRows);

    expect(result?.previousYearKey).toBe('2025-07');
    expect(result?.previousMonthKey).toBe('2026-06');
    expect(result?.selected.unidades_vendidas).toBe(120);
    expect(result?.previousYearAccum.unidades_vendidas).toBe(130);
    expect(result?.selectedAccum.unidades_vendidas).toBe(290);
    expect(result?.selectedAccum.unidades_lancadas).toBe(4);
    expect(varPct(result?.selectedAccum.unidades_vendidas ?? null, result?.previousYearAccum.unidades_vendidas ?? null)).toBeCloseTo(290 / 130 - 1);
    expect(result?.selected.oferta_ativa).toBe(104);
  });
});
