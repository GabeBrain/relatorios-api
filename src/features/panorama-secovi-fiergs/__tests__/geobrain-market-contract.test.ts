import { describe, expect, it } from 'vitest';
import { buildCityCube, mergeCubes } from '../domain/cube';
import { buildGranularBlocks } from '../report/model';
import { activeMarketCube, closingPlants, priceContributions } from '../domain/market-observations';
import { offerByAreaBand, offerByTypology, pricesByStandard } from '../domain/aggregations';
import type { PanoramaScope } from '../types';
import type { ReportMarketBlock } from '../types';
import { marketPriceSeries } from '../report/market-price-series';

const scope: PanoramaScope = { entity: 'fiergs-rs', uf: 'RS', cities: ['Cidade'], startQuarter: '1T2020', endQuarter: '3T2026', engineVersion: 'v4' };
const row = (extra = {}) => ({ typology_id: 'a', period: '2026-09-01', qty: 100, number_bedroom: 2,
  private_area: 40, price: 200000, typology_stock: 15, sold_in_period: 3, pattern: 'Standard', type_of_typology: 'Padrão', building_status: 'Ativo', ...extra });
const building = (rows = [row()], extra = {}) => ({ building_id: 'p', building_type: 'Vertical', release_date: '2019-01-01', period: '2026-09-01',
  standard: 'Standard', name: 'Projeto', total_units: 100, typologies_history: rows, ...extra });
const cubeOf = (rows = [row()], extra = {}) => buildCityCube([building(rows, extra)], { city: 'Cidade', uf: 'RS', endQuarter: '3T2026', entity: 'fiergs-rs', engineVersion: 'v4' });

describe('geobrain-market-v1: plant identity, active offer, flows and price denominators', () => {
  it('keeps old active launches in the current market and preserves historical capacity separately', () => {
    const cube = cubeOf([row(), row({ typology_id: 'b', qty: 20, typology_stock: 0, building_status: 'Esgotado' })]);
    const g = buildGranularBlocks(cube, scope);
    expect(cube.projects[0].launchedUnits).toBe(120);
    expect(g.offerByStandard.at(-1)?.launchedUnits).toBe(100);
    expect(g.launchWindow?.offerByStandard.at(-1)?.launchedUnits).toBeNull();
    expect(g.marketContract).toBe('geobrain-market-v1');
  });
  it('includes an active plant with zero stock, without treating it as sold out', () => {
    const cube = cubeOf([row({ typology_stock: 0 })]);
    expect(activeMarketCube(cube).projects[0].launchedUnits).toBe(100);
    expect(priceContributions(cube.projects).averageTicket).toBeNull();
  });
  it('sums monthly sales but uses previous and current snapshots independently', () => {
    const cube = cubeOf([row({ period: '2026-06-01', typology_stock: 22, sold_in_period: 100 }), row({ period: '2026-08-01', typology_stock: 18, sold_in_period: 4 }), row()]);
    const area = offerByAreaBand(cube).at(-1)!;
    expect(cube.projects[0].soldUnits).toBe(7);
    expect(area).toMatchObject({ previousUnits: 22, finalUnits: 15, soldUnits: 7, launchedUnits: 0 });
    expect(area.ivv).toBeCloseTo(7 / 22 * 100);
  });
  it('does not count pre-launch future reservations again when the plant becomes active', () => {
    const cube = cubeOf([row({period:'2026-08-01',building_status:'Futuro',sold_in_period:4,typology_stock:100,qty:104}), row({sold_in_period:5,typology_stock:99,qty:104})], {release_date:'2026-09-01'});
    expect(cube.projects[0].soldUnits).toBe(5);
    expect(offerByAreaBand(cube).at(-1)).toMatchObject({ previousUnits:0, launchedUnits:104, finalUnits:99, soldUnits:5 });
    expect(cube.projects[0].marketObservations?.find((r)=>r.status==='futuro')?.sold).toBe(4);
  });
  it('keeps same-bedroom plants in their own area bands and does not average price ratios', () => {
    const cube = cubeOf([row(), row({ typology_id: 'b', qty: 20, private_area: 70, price: 700000, sold_in_period: -1, typology_stock: 16 })]);
    const areas = offerByAreaBand(cube);
    expect(areas.find((r) => r.label === 'Até 44m²')?.finalUnits).toBe(15);
    expect(areas.find((r) => r.label === '70–84m²')?.finalUnits).toBe(16);
    const price = pricesByStandard(cube).at(-1)!;
    expect(price.averageTicket).toBeCloseTo(34000000 / 120);
    expect(price.averagePricePerMeter).toBeCloseTo(34000000 / 5400);
    expect(offerByTypology(activeMarketCube(cube)).at(-1)?.launchedUnits).toBe(120);
  });
  it('preserves net cancellations and negative IVV on a positive observed base', () => {
    const cube = cubeOf([row({ period: '2026-06-01', typology_stock: 15, sold_in_period: 0 }), row({ typology_stock: 16, sold_in_period: -1 })]);
    expect(offerByAreaBand(cube).at(-1)?.ivv).toBeCloseTo(-1 / 15 * 100);
  });
  it('never turns a missing previous observation or unknown status into measured zero', () => {
    const cube = cubeOf([row({ building_status: null, price: null })]);
    expect(offerByAreaBand(cube).at(-1)?.previousUnits).toBeNull();
    expect(activeMarketCube(cube).projects[0].launchedUnits).toBeNull();
    expect(priceContributions(cube.projects).averageTicket).toBeNull();
  });
  it('does not hide a missing previous plant behind another plant with an observed previous stock', () => {
    const cube = cubeOf([row({period:'2026-06-01'}), row(), row({typology_id:'new', qty:20})]);
    expect(offerByAreaBand(cube).at(-1)?.previousUnits).toBeNull();
    expect(offerByAreaBand(cube).at(-1)?.ivv).toBeNull();
  });
  it('does not manufacture a previous observation when an older plant first appears at the close', () => {
    expect(offerByAreaBand(cubeOf()).at(-1)?.ivv).toBeNull();
  });
  it('deduplicates identical history without losing different plant IDs, and excludes future values', () => {
    const cube = cubeOf([row(), row(), row({ typology_id: 'b', qty: 20 }), row({ period: '2026-12-01', qty: 9999 })]);
    expect(cube.projects[0].historyAudit?.duplicates[0].removed).toBe(1);
    expect(closingPlants(cube.projects[0])).toHaveLength(2);
    expect(activeMarketCube(cube).projects[0].launchedUnits).toBe(120);
  });
  it('retains conflicting identity evidence instead of choosing a new price', () => {
    const cube = cubeOf([row(), row({ price: 900000 })]);
    expect(cube.projects[0].historyAudit?.issues.some((r) => r.code === 'conflicting_identity')).toBe(true);
  });
  it('recomputes combined territories from contributions, not an average of city averages', () => {
    const a = cubeOf(), b = buildCityCube([building([row({ qty: 10, price: 800000, private_area: 80 })], { building_id: 'b' })], {city:'Outra',uf:'RS',endQuarter:'3T2026',entity:'fiergs-rs',engineVersion:'v4'});
    const all = mergeCubes([a,b], '3T2026', 'fiergs-rs');
    expect(priceContributions(all.projects).averagePricePerMeter).toBeCloseTo(28000000 / 4800);
  });
  it('reads explicit work product labels without guessing unknown product names', () => {
    expect(cubeOf([row()], {building_type:'Horizontal',work:'Condomínio de Casas/Sobrados'}).projects[0].horizontalSubtype).toBe('condominio_casas');
    expect(cubeOf([row()], {building_type:'Horizontal',work:'Standard',name:'Condomínio no nome'}).rejections[0].reason).toBe('subtipo_horizontal_indefinido');
  });
  it('uses the same primitive price in the closing table and the historical series', () => {
    const cube = cubeOf([row(), row({ typology_id:'b', qty:20, private_area:70, price:700000 })]);
    const block = { series:[], groupSeries:[], byGroup:[], unit:'brl_sqm', methodStatus:'open_method', dataStatus:'unavailable', source:'not collected', formula:'' } as ReportMarketBlock;
    const series = marketPriceSeries(block, cube, scope, 'averagePricePerMeter', 'standard');
    expect(series.series.at(-1)?.vertical).toBeCloseTo(34000000 / 5400);
    expect(series.series.at(-1)?.vertical).toBeCloseTo(pricesByStandard(cube).at(-1)!.averagePricePerMeter!);
    expect(series.series[0].observed?.vertical).toBe(false);
    expect(series.byGroup.find((r) => r.label==='Standard')?.vertical).toBeCloseTo(34000000 / 5400);
  });
});
