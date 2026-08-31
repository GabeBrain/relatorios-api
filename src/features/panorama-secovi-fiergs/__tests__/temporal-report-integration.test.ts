import { describe, expect, it } from 'vitest';
import { buildPanoramaReportModel } from '../report/model';
import type { PanoramaScope } from '../types';

const scope: PanoramaScope = { uf: 'SP', cities: ['Guarujá'], startQuarter: '2T2026', endQuarter: '2T2026' };
const source = (rows: Record<string, unknown>[]) => ({ rows, available: true, source: 'fixture' });

describe('Panorama Secovi/FIERGS — integração de frequência temporal', () => {
  it('normaliza séries municipais antes de montar vendas e estoque', () => {
    const sales = source([
      { period: '2026-04-01', group: 'Standard', building_type: 'Vertical', liquid_sales: 10, vgv_liquid_sales: 1 },
      { period: '2026-05-01', group: 'Standard', building_type: 'Vertical', liquid_sales: 11, vgv_liquid_sales: 1 },
      { period: '2026-06-01', group: 'Standard', building_type: 'Vertical', liquid_sales: 12, vgv_liquid_sales: 1 },
      { period: '2T2026', group: 'Standard', building_type: 'Vertical', liquid_sales: 33, vgv_liquid_sales: 3 },
    ]);
    const stock = source([
      { period: '2026-04-01', group: 'Standard', building_type: 'Vertical', stock: 100, vgv_stock: 10 },
      { period: '2026-05-01', group: 'Standard', building_type: 'Vertical', stock: 90, vgv_stock: 9 },
    ]);
    const empty = source([]);
    const sources = { sales, salesTypology: empty, stock, stockTypology: empty, ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty };
    const model = buildPanoramaReportModel(scope, [], sources, [], { cityTemporalSources: [{ city: 'Guarujá', sources }] });

    expect(model.sales.units.series[0]).toMatchObject({ vertical: 33, total: 33 });
    expect(model.stock.units.series[0]).toMatchObject({ vertical: 90, total: 90 });
  });

  it('pondera IVV e preço pelo estoque de fechamento de cada município', () => {
    const empty = source([]);
    const citySources = (city: string, ivv: number, price: number, stock: number) => ({
      city,
      sources: {
        sales: empty, salesTypology: empty, stock: source([{ period: '2026-06-01', group: 'Standard', building_type: 'Vertical', stock }]), stockTypology: empty,
        ivv: source([{ period: '2026-06-01', group: 'Standard', building_type: 'Vertical', ivv }]), ivvTypology: empty,
        ticket: source([{ period: '2026-06-01', group: 'Standard', building_type: 'Vertical', average_price: price }]), ticketTypology: empty,
        meter: empty, meterTypology: empty,
      },
    });
    const sources = citySources('Guarujá', 10, 100_000, 100).sources;
    const model = buildPanoramaReportModel(
      { ...scope, cities: ['Guarujá', 'Santos'] },
      [],
      sources,
      [],
      { cityTemporalSources: [citySources('Guarujá', 10, 100_000, 100), citySources('Santos', 30, 300_000, 300)] },
    );

    expect(model.ivv.series[0]?.vertical).toBe(25);
    expect(model.prices.ticket.series[0]?.vertical).toBe(250_000);
  });
});
