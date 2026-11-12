import { describe, expect, it } from 'vitest';
import { buildSpTable } from './tables';
import { buildSpTemporalPreview } from './temporal';
import { buildSpTypologies } from './typologies';
import { recordedInput } from './__tests__/recorded';
import { syntheticTypologyInput } from './__tests__/typology';

describe('quadros reconciliados SP', () => {
  it('preenche os seis quadros só com totais conferidos', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    report.typologies = buildSpTypologies(syntheticTypologyInput(), report);
    for (const dimension of ['patterns', 'typologies'] as const) for (const metric of ['launches', 'sales', 'stock'] as const) {
      const table = buildSpTable(report, dimension, metric)!;
      expect(table.rows.reduce((sum, row) => sum + row.value, 0)).toBe(report.metrics[metric]);
      expect(table.rows.reduce((sum, row) => sum + row.share!, 0)).toBeCloseTo(100);
    }
    expect(buildSpTable(report, 'patterns', 'stock')!.total).toBe(124706);
  });
  it('bloqueia ausência, divergência e valores inválidos', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    expect(buildSpTable(report, 'typologies', 'sales')).toBeNull();
    report.patterns!.rows[0].stock++;
    expect(buildSpTable(report, 'patterns', 'stock')).toBeNull();
    report.patterns!.rows[0].launches = -1;
    expect(buildSpTable(report, 'patterns', 'launches')).toBeNull();
  });
  it('preserva vendas negativas e omite participação com total não positivo', () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    report.patterns!.rows.forEach(row => { row.sales = -10; }); report.metrics.sales = -70;
    const table = buildSpTable(report, 'patterns', 'sales')!;
    expect(table.rows.every(row => row.value === -10 && row.share === null)).toBe(true);
  });
});
