import { describe, expect, it } from 'vitest';
import { valuesInMillions } from '../api';
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
  it('converte VGV municipal de reais para milhões antes da normalização multicidade', () => {
    const sourceInReais = source([{ period: '2026-06-01', vgv_liquid_sales: 1_124_444_223.7 }]);
    const converted = valuesInMillions(sourceInReais, 'vgv_liquid_sales');
    expect(converted.rows[0]?.vgv_liquid_sales).toBeCloseTo(1124.4442237);
  });

  it('mantém VGV em milhões quando a fonte municipal alimenta o normalizador', () => {
    const empty = source([]);
    const salesInReais = source([{ period: '2026-03-01', building_type: 'Vertical', group: 'Standard', liquid_sales: 10, vgv_liquid_sales: 1_124_444_223.7 }]);
    const sales = valuesInMillions(salesInReais, 'vgv_liquid_sales');
    const model = buildPanoramaReportModel(scope, [], {
      sales, salesTypology: empty, stock: empty, stockTypology: empty,
      ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty,
    }, [], {
      cityTemporalSources: [{ city: 'Piracicaba', sources: { sales, salesTypology: empty, stock: empty, stockTypology: empty, ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty } }],
    });
    expect(model.sales.vgv.series.at(-1)?.vertical).toBeCloseTo(1124.4442237);
  });

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
    expect(model.cityComparisons.market.filter((row) => row.segment === 'Vertical').map((row) => row.availability)).toEqual([30, 50]);
    expect(model.cityComparisons.market.filter((row) => row.segment === 'Horizontal').map((row) => row.projects)).toEqual([0, 0]);
  });

  it('suprime o comparativo em coleta parcial', () => {
    const model = buildPanoramaReportModel({ uf: 'SP', cities: ['Jundiaí', 'Piracicaba'], endQuarter: '1T2026' }, [], allEmpty, [], { cubes: [buildCityCube([sampleBuilding], { city: 'Jundiaí', uf: 'SP', endQuarter: '1T2026' })], provenance: { requestedCities: ['Jundiaí', 'Piracicaba'], completedCities: ['Jundiaí'], failedCities: [{ city: 'Piracicaba', error: 'HTTP 500' }] } });
    expect(model.cityComparisons.enabled).toBe(false);
    expect(model.cityComparisons.sales).toEqual([]);
    expect(model.notices).toContainEqual(expect.objectContaining({ code: 'CITY_COLLECTION_PARTIAL', severity: 'warning' }));
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

describe('Panorama FIERGS — fechamento canônico de vendas 2T2026', () => {
  const empty = source([]);
  const sources = (salesRows: Record<string, unknown>[], stockRows: Record<string, unknown>[] = []) => ({
    sales: source(salesRows), salesTypology: source(salesRows),
    stock: source(stockRows), stockTypology: source(stockRows), ivv: empty, ivvTypology: empty,
    ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty,
  });
  const building = (id: string, city: string, observations: Record<string, unknown>[]) => ({
    building_id: id, name: id, building_type: 'Vertical', standard: 'Econômico',
    release_date: '2025-01-01', total_units: 100,
    typologies_history: [
      { period: '2025-01-01', number_bedroom: '2', qty: 100, release_price: 300000, private_area: 50 },
      ...observations.map((row) => ({ number_bedroom: '2', typology_stock: 50, private_area: 50, ...row })),
    ],
    city,
  });

  it('substitui fotografias temporais repetidas pelo último fato granular e fecha cidade, padrão, tipologia e área', () => {
    const scope: PanoramaScope = { uf: 'RS', cities: ['Canoas', 'Novo Hamburgo'], endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' };
    const canoas = buildCityCube([building('Ora', 'Canoas', [
      { period: '2026-04-01', sold_in_period: 41 },
      { period: '2026-06-01', sold_in_period: 41 },
    ])], { city: 'Canoas', uf: 'RS', endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' });
    const novoHamburgo = buildCityCube([building('Unicco', 'Novo Hamburgo', [
      { period: '2026-05-01', sold_in_period: 5 },
      { period: '2026-06-01', sold_in_period: 4 },
    ])], { city: 'Novo Hamburgo', uf: 'RS', endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' });
    const temporal = [
      { city: 'Canoas', period: '2026-04-01', building_type: 'Vertical', group: 'Econômico', liquid_sales: 41 },
      { city: 'Canoas', period: '2026-06-01', building_type: 'Vertical', group: 'Econômico', liquid_sales: 41 },
      { city: 'Novo Hamburgo', period: '2026-05-01', building_type: 'Vertical', group: 'Econômico', liquid_sales: 5 },
      { city: 'Novo Hamburgo', period: '2026-06-01', building_type: 'Vertical', group: 'Econômico', liquid_sales: 4 },
    ];
    const model = buildPanoramaReportModel(scope, [], sources(temporal), [], {
      cubes: [canoas, novoHamburgo],
      provenance: { requestedCities: scope.cities, completedCities: scope.cities, failedCities: [] },
      citySalesSources: [
        { city: 'Canoas', rows: temporal.filter((row) => row.city === 'Canoas') },
        { city: 'Novo Hamburgo', rows: temporal.filter((row) => row.city === 'Novo Hamburgo') },
      ],
    });

    expect(model.sales.units.series.at(-1)?.vertical).toBe(45);
    expect(model.sales.unitsByTypology.series.at(-1)?.vertical).toBe(45);
    expect(model.cityComparisons.sales).toEqual([
      { city: 'Canoas', liquidSales: 41 },
      { city: 'Novo Hamburgo', liquidSales: 4 },
    ]);
    expect(model.granular.areaBands.find((row) => row.kind === 'total')?.soldUnits).toBe(45);
    expect(model.sales.units.source).toContain('fechamento vertical reconciliado pelo cubo granular');
  });

  it('no 4T2025 mantém no fechamento projetos lançados antes do início da série', () => {
    const scope: PanoramaScope = { uf: 'RS', cities: ['Canoas', 'Esteio'], startQuarter: '1T2021', endQuarter: '4T2025', entity: 'fiergs-rs', engineVersion: 'v4' };
    const beforeWindow = {
      building_id: 'Anterior', name: 'Anterior', building_type: 'Vertical', standard: 'Standard',
      release_date: '2020-01-01', total_units: 20, city: 'Canoas',
      typologies_history: [
        { period: '2020-01-01', number_bedroom: '2', qty: 20, release_price: 300000, private_area: 50 },
        { period: '2025-12-01', number_bedroom: '2', typology_stock: 4, sold_in_period: -1, private_area: 50 },
      ],
    };
    const insideWindow = {
      building_id: 'Janela', name: 'Janela', building_type: 'Vertical', standard: 'Econômico',
      release_date: '2024-01-01', total_units: 30, city: 'Canoas',
      typologies_history: [
        { period: '2024-01-01', number_bedroom: '2', qty: 30, release_price: 250000, private_area: 45 },
        { period: '2025-12-01', number_bedroom: '2', typology_stock: 6, sold_in_period: 7, private_area: 45 },
      ],
    };
    const cube = buildCityCube([beforeWindow, insideWindow], { city: 'Canoas', uf: 'RS', endQuarter: '4T2025', entity: 'fiergs-rs', engineVersion: 'v4' });
    const esteioCube = buildCityCube([{ ...insideWindow, building_id: 'Zero', name: 'Zero', city: 'Esteio', typologies_history: [
      { period: '2024-01-01', number_bedroom: '2', qty: 30, release_price: 250000, private_area: 45 },
      { period: '2025-12-01', number_bedroom: '2', typology_stock: 0, sold_in_period: 0, private_area: 45 },
    ] }], { city: 'Esteio', uf: 'RS', endQuarter: '4T2025', entity: 'fiergs-rs', engineVersion: 'v4' });
    const model = buildPanoramaReportModel(scope, [], sources([]), [], {
      cubes: [cube, esteioCube],
      provenance: { requestedCities: scope.cities, completedCities: scope.cities, failedCities: [] },
      citySalesSources: scope.cities.map((city) => ({ city, rows: [] })),
    });

    const standardTotal = model.granular.offerByStandard.find((row) => row.kind === 'total');
    const typologyTotal = model.granular.offerByTypology.find((row) => row.kind === 'total');
    const areaTotal = model.granular.areaBands.find((row) => row.kind === 'total');
    const cohortTotal = model.granular.cohortsVertical.find((row) => row.kind === 'total');
    const maturityStandardTotal = model.granular.maturityByStandard.find((row) => row.kind === 'total');
    const maturityTypologyTotal = model.granular.maturityByTypology.find((row) => row.kind === 'total');
    const priceStandardTotal = model.granular.pricesByStandard.find((row) => row.kind === 'total');
    const priceTypologyTotal = model.granular.pricesByTypology.find((row) => row.kind === 'total');
    expect(standardTotal).toMatchObject({ soldUnits: 6, finalUnits: 10 });
    expect(typologyTotal).toMatchObject({ soldUnits: 6, finalUnits: 10 });
    expect(areaTotal).toMatchObject({ soldUnits: 6, finalUnits: 10 });
    expect(cohortTotal).toMatchObject({ soldUnits: 6, finalUnits: 10 });
    expect(maturityStandardTotal?.final.total).toBe(10);
    expect(maturityTypologyTotal?.final.total).toBe(10);
    expect(priceStandardTotal?.projects).toBe(3);
    expect(priceTypologyTotal?.projects).toBe(3);
    expect(model.sales.units.series.at(-1)?.vertical).toBe(6);
    expect(model.sales.unitsByTypology.series.at(-1)?.vertical).toBe(6);
    expect(model.cityComparisons.sales).toEqual([{ city: 'Canoas', liquidSales: 6 }, { city: 'Esteio', liquidSales: 0 }]);
    expect(model.reconciliation.rows.filter((row) => row.metricId.startsWith('stock.vertical.') || row.metricId.startsWith('projects.vertical.')).every((row) => row.status === 'match')).toBe(true);
  });

  it('substitui o snapshot temporal divergente de estoque pelo mesmo fechamento granular nas dimensões', () => {
    const scope: PanoramaScope = { uf: 'RS', cities: ['Canoas'], endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' };
    const cube = buildCityCube([building('Estoque', 'Canoas', [
      { period: '2026-06-01', typology_stock: 50, sold_in_period: 2 },
    ])], { city: 'Canoas', uf: 'RS', endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' });
    const temporalStock = [
      { city: 'Canoas', period: '2026-06-01', building_type: 'Vertical', group: 'Econômico', stock: 57 },
    ];
    const model = buildPanoramaReportModel(scope, [], sources([], temporalStock), [], { cubes: [cube] });

    expect(model.stock.units.series.at(-1)?.vertical).toBe(50);
    expect(model.stock.unitsByTypology.series.at(-1)?.vertical).toBe(50);
    expect(model.granular.areaBands.find((row) => row.kind === 'total')?.finalUnits).toBe(50);
    expect(model.stock.units.source).toContain('fechamento vertical reconciliado pelo cubo granular');
  });

  it('mantém a coorte horizontal Até 2022 fora da janela temporal e reconcilia com o produto', () => {
    const scope: PanoramaScope = { uf: 'RS', cities: ['Canoas'], startQuarter: '1T2023', endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' };
    const horizontal = (id: string, releaseDate: string, units: number, stock: number) => ({
      building_id: id, name: id, building_type: 'Horizontal', standard: 'Loteamento Fechado',
      release_date: releaseDate, total_units: units, city: 'Canoas',
      typologies_history: [
        { period: releaseDate.slice(0, 7) + '-01', pattern: 'Loteamento Fechado', qty: units, release_price: 200000, private_area: 200 },
        { period: '2026-06-01', pattern: 'Loteamento Fechado', typology_stock: stock, price: 220000, private_area: 200 },
      ],
    });
    const cube = buildCityCube([
      horizontal('Anterior', '2021-04-01', 100, 40),
      horizontal('Janela', '2024-04-01', 80, 20),
    ], { city: 'Canoas', uf: 'RS', endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' });
    const model = buildPanoramaReportModel(scope, [], sources([]), [], { cubes: [cube] });
    const cohortTotal = model.granular.cohortsHorizontal.find((row) => row.kind === 'total');
    const consolidatedHorizontal = model.granular.vgv.find((row) => row.kind === 'subtotal' && row.segment === 'Horizontal');

    expect(model.granular.cohortsHorizontal.some((row) => row.label === 'Até 2022')).toBe(true);
    expect(cohortTotal).toMatchObject({ projects: 2, launchedUnits: 180, finalUnits: 60 });
    expect(consolidatedHorizontal).toMatchObject({ projects: 2, launchedUnits: 180, finalUnits: 60 });
    expect(model.reconciliation.rows.filter((row) => row.metricId.startsWith('horizontal.') && row.metricId !== 'horizontal.chacaras.runtime').every((row) => row.status === 'match')).toBe(true);
  });

  it('renderiza uma única localização por chave canônica mesmo se o cubo for repetido', () => {
    const mapScope: PanoramaScope = { uf: 'RS', cities: ['Canoas'], startQuarter: '1T2023', endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4' };
    const cube = buildCityCube([{ ...sampleBuilding, latitude: -29.92, longitude: -51.18 }], {
      city: 'Canoas', uf: 'RS', endQuarter: '2T2026', entity: 'fiergs-rs', engineVersion: 'v4',
    });
    const model = buildPanoramaReportModel(mapScope, [], sources([]), [], { cubes: [cube, cube] });

    expect(model.locations).toHaveLength(1);
    expect(model.locations[0]?.projectKey).toBe('RS/Canoas#B1');
    expect(model.reconciliation.rows.find((row) => row.metricId === 'map.projects.unique')).toMatchObject({
      canonicalTotal: 1, dimensionalTotal: 2, delta: 1, status: 'different', critical: true,
    });
  });
});
