import type { SpTemporalInput } from '../temporal';
import { recordedInput } from './recorded';
import { SP_API_PATTERNS } from '../segments';

/** Invented identified register for reconciliation tests, never a market baseline. */
export function syntheticSalesBuildings(input: SpTemporalInput = recordedInput()) {
  return SP_API_PATTERNS.map((standard, i) => ({ building_id: i + 1, city: 'São Paulo', state: 'SP', building_type: 'Vertical', release_date: '2020-01-01', standard, neighborhood: `Bairro ${i+1}`, typologies_history: input.sales.filter(row => row.group === standard).map(row => ({ typology_id: i + 100, period: row.period, sold_in_period: row.liquid_sales })) }));
}
