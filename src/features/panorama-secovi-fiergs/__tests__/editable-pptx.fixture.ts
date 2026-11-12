import { buildCityCube } from '../domain/cube';
import { buildPanoramaReportModel } from '../report/model';
import type { PanoramaScope } from '../types';

/** Synthetic export fixture: honors each entity policy; never a commercial baseline. */
export function editableScopeReport(scope: PanoramaScope, options: { horizontal?: boolean; sold?: number; final?: number } = {}) {
  const date = `${scope.endQuarter.slice(2)}-${String(Number(scope.endQuarter[0]) * 3).padStart(2, '0')}-01`;
  const release = `${Number(scope.endQuarter.slice(2)) - 1}-01-01`;
  const building = (id: string, type: string, standard: string, units: number) => ({
    building_id: id, name: `Empreendimento sintético ${id}`, building_type: type, standard,
    release_date: release, total_units: units,
    typologies_history: [
      { period: release, number_bedroom: '2', qty: units, release_price: 300000, private_area: 50 },
      { period: date, number_bedroom: '2', qty: units, typology_stock: options.final ?? 30, liquid_sales: options.sold ?? 5, price: 350000, private_area: 50 },
    ],
  });
  const cubes = scope.cities.map((city) => buildCityCube([
    building('V', 'Vertical', 'Médio', 100),
    ...(options.horizontal ? [building('H', 'Horizontal', 'Condomínio de Casas/Sobrados', 50)] : []),
  ], { city, uf: scope.uf, endQuarter: scope.endQuarter, entity: scope.entity, engineVersion: 'v4' }));
  const empty = { rows: [], available: true, source: 'Fixture sintética de exportação' };
  return buildPanoramaReportModel(scope, [], { sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
    ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty }, [], {
    cubes, provenance: { requestedCities: scope.cities, completedCities: scope.cities, failedCities: [] },
  });
}
