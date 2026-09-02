import { describe, expect, it } from 'vitest';
import { annualizeSeries } from '../components/ReportPaginator';

describe('Panorama V4 - vendas anuais', () => {
  it('agrega a serie trimestral de vendas sem reutilizar lancamentos', () => {
    expect(annualizeSeries([
      { quarter: '1T2023', vertical: 10, horizontal: 28, total: 38 },
      { quarter: '2T2023', vertical: 5, horizontal: 31, total: 36 },
      { quarter: '1T2024', vertical: 3, horizontal: 1, total: 4 },
      { quarter: '2T2024', vertical: 2, horizontal: 6, total: 8 },
      { quarter: '1T2025', vertical: 7, horizontal: 122, total: 129 },
      { quarter: '2T2026', vertical: 4, horizontal: 16, total: 20 },
    ]).map(({ year, horizontal }) => ({ year, horizontal }))).toEqual([
      { year: 2023, horizontal: 59 },
      { year: 2024, horizontal: 7 },
      { year: 2025, horizontal: 122 },
      { year: 2026, horizontal: 16 },
    ]);
  });
});
