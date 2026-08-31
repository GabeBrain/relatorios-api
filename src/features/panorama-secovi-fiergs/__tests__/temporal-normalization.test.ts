import { describe, expect, it } from 'vitest';
import { periodToQuarter } from '../lib/launches';
import { normalizeCityTemporalRows } from '../domain/temporal-normalization';

describe('Panorama Secovi/FIERGS — normalização temporal municipal', () => {
  it('reconhece datas mensais e chaves trimestrais explícitas', () => {
    expect(periodToQuarter('2026-06-01')).toBe('2T2026');
    expect(periodToQuarter('06/2026')).toBe('2T2026');
    expect(periodToQuarter('2T2026')).toBe('2T2026');
    expect(periodToQuarter('2ºT/2026')).toBe('2T2026');
  });

  it('para fluxo usa o total trimestral uma única vez quando ele coexistir com meses', () => {
    const rows = [
      { period: '2026-04-01', group: 'Standard', building_type: 'Vertical', liquid_sales: 10 },
      { period: '2026-05-01', group: 'Standard', building_type: 'Vertical', liquid_sales: 11 },
      { period: '2026-06-01', group: 'Standard', building_type: 'Vertical', liquid_sales: 12 },
      { period: '2T2026', group: 'Standard', building_type: 'Vertical', liquid_sales: 33 },
    ];
    const normalized = normalizeCityTemporalRows('Guarujá', rows, 'flow');
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({ period: '2T2026', liquid_sales: 33, temporal_period_kind: 'quarter' });
  });

  it('para fluxo mensal mantém os três meses para a soma trimestral posterior', () => {
    const rows = [
      { period: '2026-04-01', group: 'Standard', building_type: 'Vertical', liquid_sales: 10 },
      { period: '2026-05-01', group: 'Standard', building_type: 'Vertical', liquid_sales: 11 },
      { period: '2026-06-01', group: 'Standard', building_type: 'Vertical', liquid_sales: 12 },
    ];
    const normalized = normalizeCityTemporalRows('Guarujá', rows, 'flow');
    expect(normalized.reduce((sum, row) => sum + Number(row.liquid_sales), 0)).toBe(33);
  });

  it('para snapshot carrega a última observação até cada fechamento sem somar meses', () => {
    const rows = [
      { period: '2026-04-01', group: 'Standard', building_type: 'Vertical', stock: 100 },
      { period: '2026-05-01', group: 'Standard', building_type: 'Vertical', stock: 90 },
    ];
    const normalized = normalizeCityTemporalRows('Guarujá', rows, 'snapshot', ['2T2026', '3T2026']);
    expect(normalized).toEqual([
      expect.objectContaining({ period: '2T2026', stock: 90, temporal_observed_period: '2026-05-01' }),
      expect.objectContaining({ period: '3T2026', stock: 90, temporal_observed_period: '2026-05-01' }),
    ]);
  });
});
