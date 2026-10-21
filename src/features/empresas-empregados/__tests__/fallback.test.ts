import { describe, expect, it } from 'vitest';
import { empresasMonths, proxyMonthUnavailable } from '../../../../supabase/functions/_shared/empresas-fallback';

describe('seleção de competência de Empresas', () => {
  it('tenta cada mês em ordem e conserva a competência real, inclusive na virada de ano', () => {
    expect(empresasMonths('2026-07-01', 4).map((month) => month.competencia)).toEqual([
      '2026-07-01', '2026-06-01', '2026-05-01', '2026-04-01',
    ]);
    expect(empresasMonths('2026-01-01', 2)[1]).toEqual({
      competencia: '2025-12-01', establishmentsPartition: '2025-12-12', companiesPartition: '2025-12-12',
    });
  });

  it('recua somente quando o proxy informa fonte indisponível', () => {
    expect(proxyMonthUnavailable({ available: false, rows: [], unavailableReason: 'establishments_empty' })).toBe(true);
    expect(proxyMonthUnavailable({ available: true, rows: [{ quantity: 10 }], source: { establishmentsRows: 10, companiesMatched: 10 } })).toBe(false);
    expect(() => proxyMonthUnavailable({ rows: [] })).toThrow('INVALID_PROXY_AVAILABILITY');
    expect(() => proxyMonthUnavailable({ available: true, rows: [{ quantity: 10 }], source: { establishmentsRows: 10, companiesMatched: 0 } })).toThrow('INCOMPLETE_PROXY_SOURCE');
    expect(() => proxyMonthUnavailable({ available: true, rows: {} })).toThrow('INVALID_PROXY_ROWS');
  });
});
