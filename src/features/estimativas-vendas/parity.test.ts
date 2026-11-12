import { describe, expect, it } from 'vitest';
import { compareExcel } from './parity';
import type { Building } from './source';

describe('conferência de valores', () => {
  const buildings: Building[] = [{ building_id: 1, typologies_history: [{ period: '2026-09-01', typology_id: 2, pattern: 'Loteamento Aberto', qty: 10, typology_stock: 0, sold_in_period: 3 }] }];
  it('preserva zero e distingue traço de número', () => { const x = { rows: new Map([['1|2|2026-09', { stock: null, sales: 3 }]]), duplicates: [], cities: ['Curitiba'], periods: ['2026-09'] }; const rows = compareExcel(buildings, x, 'Curitiba'); expect(rows.map(r => r.status)).toEqual(['api-only', 'equal']); });
  it('recusa cidade divergente', () => { expect(() => compareExcel(buildings, { rows: new Map(), duplicates: [], cities: ['Maringá'], periods: [] }, 'Curitiba')).toThrow(/cidade diferente/); });
});
