import { describe, expect, it } from 'vitest';
import { buildPanoramaReportModel } from '../report/model';
import { buildCityCube } from '../domain/cube';
import type { PanoramaScope } from '../types';

const scope: PanoramaScope = { uf: 'SP', cities: ['Piracicaba'], endQuarter: '1T2026' };
const source = (rows: Record<string, unknown>[]) => ({ rows, available: true, source: 'fixture' });

/** Empreendimento vertical mínimo, reaproveitado pelos casos multi-cidade. */
const sampleBuilding: Record<string, unknown> = {
  building_id: 'B1',
  name: 'Residencial Alfa',
  building_type: 'Vertical',
  standard: 'Standard',
  release_date: '2025-02-10',
  total_units: 100,
  typologies_history: [
    { period: '2025-02-01', typology: '2 dorm', qty: 100, release_price: 400000, private_area: 50 },
    { period: '2026-03-01', typology: '2 dorm', typology_stock: 30, liquid_sales: 70, price: 420000, private_area: 50 },
  ],
};

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

describe('Panorama Secovi/FIERGS — comparativos municipais V2', () => {
  const empty = source([]);
  const allEmpty = { sales: empty, salesTypology: empty, stock: empty, stockTypology: empty, ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty };

  it('habilita comparativo apenas com cobertura completa e calcula disponibilidade por cidade', () => {
    const multiScope: PanoramaScope = { uf: 'SP', cities: ['Jundiaí', 'Piracicaba'], endQuarter: '1T2026' };
    const jundiai = buildCityCube([sampleBuilding], { city: 'Jundiaí', uf: 'SP', endQuarter: '1T2026' });
    const piracicaba = buildCityCube([{ ...sampleBuilding, total_units: 200, typologies_history: [{ period: '2025-02-01', typology: '2 dorm', qty: 200, release_price: 400000 }, { period: '2026-03-01', typology: '2 dorm', typology_stock: 100, liquid_sales: 100, price: 420000, private_area: 50 }] }], { city: 'Piracicaba', uf: 'SP', endQuarter: '1T2026' });
    const model = buildPanoramaReportModel(multiScope, [], allEmpty, [], { cubes: [jundiai, piracicaba], provenance: { requestedCities: multiScope.cities, completedCities: multiScope.cities, failedCities: [] }, citySalesSources: [{ city: 'Jundiaí', rows: [{ period: '2026-03-01', liquid_sales: 70 }] }, { city: 'Piracicaba', rows: [{ period: '2026-03-01', liquid_sales: 100 }] }] });
    expect(model.cityComparisons.enabled).toBe(true);
    expect(model.cityComparisons.sales).toEqual([{ city: 'Jundiaí', liquidSales: 70 }, { city: 'Piracicaba', liquidSales: 100 }]);
    expect(model.cityComparisons.market.map((row) => row.availability)).toEqual([30, 50]);
  });

  it('suprime o comparativo em coleta parcial', () => {
    const model = buildPanoramaReportModel({ uf: 'SP', cities: ['Jundiaí', 'Piracicaba'], endQuarter: '1T2026' }, [], allEmpty, [], { cubes: [buildCityCube([sampleBuilding], { city: 'Jundiaí', uf: 'SP', endQuarter: '1T2026' })], provenance: { requestedCities: ['Jundiaí', 'Piracicaba'], completedCities: ['Jundiaí'], failedCities: [{ city: 'Piracicaba', error: 'HTTP 500' }] } });
    expect(model.cityComparisons.enabled).toBe(false);
    expect(model.cityComparisons.sales).toEqual([]);
  });
});

describe('Panorama Secovi/FIERGS — consolidado multi-cidade e proveniência (G-01)', () => {
  const empty = source([]);
  const allEmpty = {
    sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
    ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty,
    meter: empty, meterTypology: empty,
  };

  it('expõe cidades solicitadas, concluídas e falhas, e cai para partial na falha parcial', () => {
    const multiScope: PanoramaScope = { uf: 'SP', cities: ['Jundiaí', 'Piracicaba'], endQuarter: '1T2026' };
    const model = buildPanoramaReportModel(multiScope, [], allEmpty, [], {
      cubes: [buildCityCube([sampleBuilding], { city: 'Jundiaí', uf: 'SP', endQuarter: '1T2026' })],
      provenance: {
        requestedCities: ['Jundiaí', 'Piracicaba'],
        completedCities: ['Jundiaí'],
        failedCities: [{ city: 'Piracicaba', error: 'HTTP 500' }],
      },
    });

    expect(model.provenance.requestedCities).toEqual(['Jundiaí', 'Piracicaba']);
    expect(model.provenance.completedCities).toEqual(['Jundiaí']);
    expect(model.provenance.failedCities).toEqual([{ city: 'Piracicaba', error: 'HTTP 500' }]);
    // Falha parcial nunca vira consolidado silencioso.
    expect(model.dataState).toBe('partial');
  });

  it('reporta unavailable quando nenhuma cidade conclui, sem fabricar zero', () => {
    const model = buildPanoramaReportModel({ uf: 'SP', cities: ['Jundiaí'], endQuarter: '1T2026' }, [], allEmpty, [], {
      cubes: [],
      provenance: { requestedCities: ['Jundiaí'], completedCities: [], failedCities: [{ city: 'Jundiaí', error: 'token sem acesso' }] },
    });
    expect(model.dataState).toBe('unavailable');
    expect(model.cube.projects).toEqual([]);
    expect(model.granular.offerByStandard.at(-1)?.launchedUnits).toBeNull();
  });

  it('soma numeradores municipais antes das agregações, sem colisão de IDs entre cidades', () => {
    const model = buildPanoramaReportModel({ uf: 'SP', cities: ['Jundiaí', 'Piracicaba'], endQuarter: '1T2026' }, [], allEmpty, [], {
      cubes: [
        buildCityCube([sampleBuilding], { city: 'Jundiaí', uf: 'SP', endQuarter: '1T2026' }),
        buildCityCube([sampleBuilding], { city: 'Piracicaba', uf: 'SP', endQuarter: '1T2026' }),
      ],
      provenance: { requestedCities: ['Jundiaí', 'Piracicaba'], completedCities: ['Jundiaí', 'Piracicaba'], failedCities: [] },
    });
    expect(model.dataState).toBe('ready');
    // Mesmo building_id nas duas cidades conta como dois empreendimentos distintos.
    expect(model.granular.offerByStandard.at(-1)?.projects).toBe(2);
    expect(model.granular.offerByStandard.at(-1)?.launchedUnits).toBe(200);
  });

  it('gera a janela editorial a partir de um fechamento posterior a 1T/26 (G-02)', () => {
    const model = buildPanoramaReportModel({ uf: 'SP', cities: ['Jundiaí'], endQuarter: '3T2026' }, [], allEmpty);
    expect(model.stock.units.series).toHaveLength(17);
    expect(model.stock.units.series.at(-1)?.quarter).toBe('3T2026');
    expect(model.stock.units.series[0].quarter).toBe('3T2022');
  });

  it('sinaliza Faixa de Valor como indisponível para o Luna remover a coluna na V1 (slide 31)', () => {
    const model = buildPanoramaReportModel(scope, [], allEmpty);
    expect(model.granular.valueRangeAvailable).toBe(false);
    expect(model.openMethodologies.some((item) => /Faixa de Valor/i.test(item))).toBe(true);
  });

  it('agrupa por motivo os empreendimentos recusados pela política de universo (G-03)', () => {
    const model = buildPanoramaReportModel(scope, [], allEmpty, [], {
      cubes: [buildCityCube([
        sampleBuilding,
        { ...sampleBuilding, building_id: 'H1', building_type: 'Horizontal', building_subtype: 'Loteamento' },
        { ...sampleBuilding, building_id: 'H2', building_type: 'Horizontal', building_subtype: 'Loteamento' },
      ], { city: 'Piracicaba', uf: 'SP', endQuarter: '1T2026' })],
    });
    expect(model.provenance.rejectedByPolicy).toEqual([{ reason: 'horizontal_fora_da_politica', count: 2 }]);
    expect(model.provenance.entity).toBe('secovi-sp');
  });
});
