import type { InventoryRow, StudyMethod } from '../scientific/study';
import { buildingSpec, specKey, type AnalysisSpec, type CaseAnalysis, type Universe } from './domain';
import { buildExportPlan } from './export';

export type DeliveryFilters = { city: string; type: string; search: string; duration: number };
export const DEFAULT_DELIVERY_FILTERS: DeliveryFilters = { city: 'all', type: 'all', search: '', duration: 12 };
export const locationKey = (area: { city: string; uf: string }) => JSON.stringify([area.uf, area.city]);
export function deliveryScope(universe: Universe, inventory: InventoryRow[], capabilities: Record<string, StudyMethod[]>, filters: DeliveryFilters) {
  const search = filters.search.trim().toLocaleLowerCase('pt-BR');
  const matched = inventory.filter(row => (filters.city === 'all' || locationKey(universe.locations[row.id]) === filters.city)
    && (filters.type === 'all' || row.type === filters.type) && `${row.name} ${row.id}`.toLocaleLowerCase('pt-BR').includes(search));
  const sold = matched.filter(row => row.stock === 0);
  const others = matched.filter(row => row.stock !== 0 && !capabilities[row.id]?.includes('finotti-reference'));
  const ids = matched.filter(row => row.stock !== 0 && capabilities[row.id]?.includes('finotti-reference')).map(row => row.id).sort();
  return { ids, sold, others, matched: matched.length };
}
export const deliverySpec = (duration: number): AnalysisSpec => ({ cutoff: 'latest', duration, methods: ['finotti-reference'] });
export function exportRequestKey(universe: Universe, ids: string[], spec: AnalysisSpec) {
  return JSON.stringify([universe.hash, universe.fetchedAt, ids.map(id => [id, specKey(universe.hash, id, buildingSpec(universe, id, spec))])]);
}
export function buildDeliveryPlan(universe: Universe, ids: string[], analyses: CaseAnalysis[], spec: AnalysisSpec) {
  if (spec.cutoff !== 'latest' || spec.methods.length !== 1 || spec.methods[0] !== 'finotti-reference') throw new Error('O arquivo principal usa somente a referência aprovada e o último dado de cada empreendimento.');
  for (const id of ids) {
    const analysis = analyses.find(a => a.id === id);
    const item = analysis?.stock.cases[0];
    const forecast = item?.methods['finotti-reference'].forecast;
    if (!forecast || !forecast.version || item?.inventory.stock === 0) throw new Error(`Não foi possível concluir a referência do empreendimento ${id}. Tente novamente; nenhum arquivo parcial será gerado.`);
  }
  const plan = buildExportPlan(universe, ids, analyses, spec);
  if (plan.manifest.included !== ids.length || ids.some(id => plan.forecasts.filter(row => row.id_empreendimento === id).length !== spec.duration) || plan.forecasts.some(row => row.metodo !== 'finotti-reference') || plan.exclusions.some(row => row.arquivo === 'previsoes.csv')) throw new Error('Há previsões incompletas. Revise o conjunto antes de baixar.');
  return plan;
}
