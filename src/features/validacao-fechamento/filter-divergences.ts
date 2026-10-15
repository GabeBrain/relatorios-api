import type { ClosureRow } from './aggregate';
import type { Divergence } from './validation-rules';

/** Filtra a saída da validação sem recalcular as médias dos grupos. */
export function filterDivergences(divergences: Divergence[], filteredRows: ClosureRow[]): Divergence[] {
  const buildingPeriods = new Set(filteredRows.map((row) => JSON.stringify([row.city, row.building_id, row.period])));
  const typologyPeriods = new Set(filteredRows.map((row) => JSON.stringify([row.city, row.building_id, row.typology_id, row.period])));
  return divergences.filter((row) => row.isBuildingRule
    ? buildingPeriods.has(JSON.stringify([row.city, row.building_id, row.period]))
    : typologyPeriods.has(JSON.stringify([row.city, row.building_id, row.typology_id, row.period])));
}
