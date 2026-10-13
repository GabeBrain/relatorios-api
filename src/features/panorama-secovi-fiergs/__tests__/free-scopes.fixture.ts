import { buildCityCube } from '../domain/cube';
import { buildPanoramaReportModel } from '../report/model';
import type { PanoramaScope } from '../types';

/** Fixture sintética: não representa os totais históricos do estudo da Juliana. */
export function freeScopeReport(scope: PanoramaScope, options: { horizontal?: boolean; vertical?: boolean; failedCity?: string; releaseDate?: string; sold?: number; final?: number; unknownProduct?: boolean; coordinates?: boolean } = {}) {
  const date = scope.endQuarter === '4T2025' ? '2025-12-01' : '2026-06-01';
  const building = (id: string, type: string, standard: string, units: number) => ({
    building_id: id, name: id, building_type: type, standard,
    release_date: options.releaseDate ?? '2025-10-01', total_units: units,
    latitude: options.coordinates === false ? null : -29.9, longitude: options.coordinates === false ? null : -51.1, neighborhood: 'Centro',
    typologies_history: [
      { period: options.releaseDate ?? '2025-10-01', number_bedroom: '2', qty: units, release_price: 300000, private_area: 50 },
      { period: date, number_bedroom: '2', typology_stock: options.final ?? 30, liquid_sales: options.sold ?? 5, price: 350000, private_area: 50 },
    ],
  });
  const cubes = scope.cities.filter((city) => city !== options.failedCity).map((city) => buildCityCube([
    ...(options.vertical !== false ? [building('V', 'Vertical', 'Médio', 100)] : []),
    ...(options.horizontal ? [building('H', 'Horizontal', 'Condomínio de Casas/Sobrados', 50)] : []),
    ...(options.unknownProduct ? [building('UNKNOWN', 'Horizontal', 'Produto desconhecido', 20)] : []),
  ], { city, uf: scope.uf, endQuarter: scope.endQuarter, entity: 'fiergs-rs', engineVersion: 'v4' }));
  const empty = { rows: [], available: true, source: 'fixture sintética local' };
  return buildPanoramaReportModel(scope, [], { sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
    ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty }, [], {
    cubes, provenance: { requestedCities: scope.cities, completedCities: cubes.map((cube) => cube.cities[0]),
      failedCities: options.failedCity ? [{ city: options.failedCity, error: 'HTTP 503 simulado' }] : [] },
  });
}
