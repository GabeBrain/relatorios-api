import { describe, expect, it } from 'vitest';
import { projectBuilding } from './research';
import type { Building } from './source';

const base: Building = { building_id: 7, name: 'Teste', typologies_history: Array.from({ length: 6 }, (_, i) => ({ period: `2026-${String(i + 1).padStart(2, '0')}-01`, typology_id: 4, pattern: 'Loteamento Fechado', qty: 300, typology_stock: 275 - 25 * i, sold_in_period: 25 })) };
describe('pesquisa Finotti', () => {
  it('reproduz 300/150/6 e omite a cauda', () => { const p = projectBuilding(base, '2026-06').projection!; expect(p.input).toEqual({ pattern: 'fechado', launchedUnits: 300, netSoldUnits: 150, marketMonth: 6 }); expect(p.points[0].projected).toBe(150); expect(p.points[6].projected! / 300).toBeCloseTo(.6584, 3); });
  it('bloqueia duplicata e venda negativa', () => { expect(projectBuilding({ ...base, typologies_history: [...base.typologies_history, base.typologies_history[0]] }, '2026-06').reason).toMatch(/duplicada/); expect(projectBuilding({ ...base, typologies_history: base.typologies_history.map((r, i) => i === 2 ? { ...r, sold_in_period: -1 } : r) }, '2026-06').reason).toMatch(/negativa/); });
  it('não usa dados posteriores ao corte', () => { const extra = { ...base.typologies_history[0], period: '2026-07-01', sold_in_period: 999 }; expect(projectBuilding({ ...base, typologies_history: [...base.typologies_history, extra] }, '2026-06').projection?.input.netSoldUnits).toBe(150); });
});
