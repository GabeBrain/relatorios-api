import { describe, expect, it } from 'vitest';
import { granularPriceChartRows } from '../report/price-chart';
import type { PanoramaReportModel } from '../types';

describe('gráfico de preços por padrão', () => {
  it('omite apenas categorias sem R$/m² e preserva zero observado', () => {
    const report = {
      scope: { entity: 'fiergs-rs', endQuarter: '2T2026' },
      granular: { pricesByStandard: [
        { kind: 'row', label: 'Médio', averagePricePerMeter: 6200 },
        { kind: 'row', label: 'Médio-Alto', averagePricePerMeter: null },
        { kind: 'row', label: 'Zero observado', averagePricePerMeter: 0 },
        { kind: 'total', label: 'Total', averagePricePerMeter: 5000 },
      ] },
    } as unknown as PanoramaReportModel;

    expect(granularPriceChartRows(report, 'pattern')).toEqual({
      rows: [{ label: 'Médio', value: 6200 }, { label: 'Zero observado', value: 0 }],
      omittedLabels: ['Médio-Alto'],
    });
  });
});
