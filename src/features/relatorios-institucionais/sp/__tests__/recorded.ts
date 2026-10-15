import data from './fixtures/sp-municipal-2026.json';
import type { SpTemporalInput, SpTemporalRow } from '../temporal';

export function recordedInput(): SpTemporalInput {
  const rows = (values: Record<string, number[]>, field: string): SpTemporalRow[] => Object.entries(values).flatMap(([month, counts]) => counts.map((value, index) => ({ period: `${month}-01`, group: data.groups[index], building_type: 'Vertical', [field]: value })));
  return {
    origin: 'recorded-api', city: data.scope.city, uf: data.scope.uf,
    rootPeriod: data.sample.root_period, sampledBuildings: data.sample.sampled_buildings, totalBuildings: data.sample.total_buildings,
    sales: rows(data.sales, 'liquid_sales'), releases: rows(data.releases, 'releases_in_period'), stock: rows(data.stock, 'stock'), complete: { sales: true, releases: true, stock: true },
  };
}
