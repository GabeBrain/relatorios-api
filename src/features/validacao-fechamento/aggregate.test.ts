import { describe, expect, it } from 'vitest';
import { applyVFFilters, bucketMonthFromStr, bucketQuarterFromStr, computeResumoEmail, EMPTY_VF_FILTERS, periodKeyFromStr, bucketYearFromStr, varPct, type ClosureRow } from './aggregate';
import type { Divergence } from './validation-rules';

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

function divergence(overrides: Partial<Divergence>): Divergence {
  const period = '2026-09-01';
  return {
    building_id: '1', typology_id: 't', building_name: 'Empreendimento', private_area: 200, city: 'São José do Rio Preto', status: 'Ativo', period,
    field: 'qty', error: 'erro', value: '', rule: 'REGRA', group: '', isBuildingRule: false,
    building_type: 'Vertical', standard: 'Médio', periodKey: periodKeyFromStr(period), bucketYear: bucketYearFromStr(period), bucketQuarter: bucketQuarterFromStr(period),
    ...overrides,
  };
}

describe('applyVFFilters em divergências', () => {
  const rows = [
    divergence({ building_id: '1', building_type: 'Vertical' }),
    divergence({ building_id: '2', building_type: 'Horizontal', standard: 'Loteamento Fechado' }),
    divergence({ building_id: '3', building_type: 'Vertical', city: 'Catanduva', period: '2025-03-01', periodKey: '2025-03', bucketYear: '2025', bucketQuarter: '01T/25' }),
  ];

  it('sem filtros mantém todas as divergências', () => {
    expect(applyVFFilters(rows, EMPTY_VF_FILTERS)).toHaveLength(3);
  });

  it('filtra por tipo, padrão, empreendimento, cidade, ano, trimestre e período', () => {
    const ids = (f: Partial<typeof EMPTY_VF_FILTERS>) => applyVFFilters(rows, { ...EMPTY_VF_FILTERS, ...f }).map((r) => r.building_id);
    expect(ids({ buildingTypes: ['Horizontal'] })).toEqual(['2']);
    expect(ids({ standards: ['Loteamento Fechado'] })).toEqual(['2']);
    expect(ids({ buildings: ['3'] })).toEqual(['3']);
    expect(ids({ cities: ['Catanduva'] })).toEqual(['3']);
    expect(ids({ years: ['2026'] })).toEqual(['1', '2']);
    expect(ids({ quarters: ['01T/25'] })).toEqual(['3']);
    expect(ids({ periods: ['2026-09'] })).toEqual(['1', '2']);
    expect(ids({ buildingTypes: ['Vertical'], years: ['2025'] })).toEqual(['3']);
  });
});

describe('computeResumoEmail', () => {
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
