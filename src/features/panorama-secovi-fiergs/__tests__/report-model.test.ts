import { describe, expect, it } from 'vitest';
import { buildPanoramaReportModel } from '../report/model';
import type { PanoramaScope } from '../types';

const scope: PanoramaScope = { uf: 'SP', city: 'Piracicaba', endQuarter: '1T2026' };
const source = (rows: Record<string, unknown>[]) => ({ rows, available: true, source: 'fixture' });

describe('Panorama Secovi/FIERGS — modelo editorial por grupo', () => {
  it('preserva séries trimestrais e usa o trimestre atual no resumo por grupo', () => {
    const stock = source([
      { period: '2025-12-01', building_type: 'Vertical', group: 'Econômico', stock: 40, vgv_stock: 4 },
      { period: '2026-03-01', building_type: 'Vertical', group: 'Econômico', stock: 12, vgv_stock: 2 },
    ]);
    const empty = source([]);
    const model = buildPanoramaReportModel(scope, [], {
      sales: empty, salesTypology: empty, stock, stockTypology: empty,
      ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty,
      meter: empty, meterTypology: empty,
    });

    expect(model.stock.units.byGroup).toEqual([{ label: 'Econômico', vertical: 12, horizontal: 0, total: 12 }]);
    expect(model.stock.units.groupSeries[0].series.find((row) => row.quarter === '4T2025')?.vertical).toBe(40);
    expect(model.stock.units.groupSeries[0].series.find((row) => row.quarter === '1T2026')?.vertical).toBe(12);
  });

  it('calcula indicadores não aditivos por média simples e lê os campos oficiais de preço', () => {
    const empty = source([]);
    const ivv = source([
      { period: '2026-03-01', building_type: 'Vertical', group: 'Econômico', ivv: 10 },
      { period: '2026-03-01', building_type: 'Vertical', group: 'Standard', ivv: 30 },
    ]);
    const ticket = source([{ period: '2026-03-01', building_type: 'Vertical', group: 'Standard', average_price: 650000 }]);
    const meter = source([{ period: '2026-03-01', building_type: 'Vertical', group: 'Standard', average_price_per_meter: 8125 }]);
    const model = buildPanoramaReportModel(scope, [], {
      sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
      ivv, ivvTypology: empty, ticket, ticketTypology: empty, meter, meterTypology: empty,
    });

    expect(model.ivv.series.at(-1)?.vertical).toBe(20);
    expect(model.prices.ticket.series.at(-1)?.vertical).toBe(650000);
    expect(model.prices.meter.series.at(-1)?.vertical).toBe(8125);
  });
});
