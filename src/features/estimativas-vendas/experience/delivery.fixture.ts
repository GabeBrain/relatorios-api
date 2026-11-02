import type { Building } from '../source';
import type { Universe } from './domain';
export function deliveryFixture(): Universe {
  const buildings: Building[] = ['001', '002'].map(id => ({ building_id: id, name: `Projeto ${id}`, sourceType: 'Horizontal', release_date: '2025-01-01', typologies_history: ['2026-06', '2026-07', '2026-08', '2026-09'].slice(0, id === '001' ? 4 : 3).map((period, i) => ({ period, typology_id: `${id}0`, pattern: 'Loteamento Fechado', qty: 300, typology_stock: 150 - i * 2, sold_in_period: 2 })) }));
  return { schema: 'forecast-universe-v1', complete: true, hash: 'delivery-fixture', fetchedAt: '2026-11-02', city: 'Cidade', uf: 'PR', areas: [{ city: 'Cidade', uf: 'PR' }, { city: 'Cidade', uf: 'SC' }], locations: { '001': { city: 'Cidade', uf: 'PR' }, '002': { city: 'Cidade', uf: 'SC' } }, requests: [], missingIds: [], buildings };
}
