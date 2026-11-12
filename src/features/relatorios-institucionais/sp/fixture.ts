import type { SpInput } from './model';

/** Entirely synthetic. No totals, IDs or individual records from the user's API samples. */
export function spFixture(): SpInput {
  const building = (id: string, release: string, units: number, observations: [string, number][]) => ({
    building_id: id, name: `Empreendimento fictício ${id}`, city: 'São Paulo', state: 'SP', building_type: 'Vertical',
    release_date: release, total_units: units, period: '2026-08-01',
    typologies_history: observations.map(([month, stock]) => ({ period: `${month}-01`, number_bedroom: '2', qty: units, typology_stock: stock })),
  });
  const temporal = (field: string, observations: [string, number][]) => observations.map(([month, value]) => ({ period: `${month}-01`, group: 'Standard', building_type: 'Vertical', [field]: value }));
  return {
    origin: 'fixture', uf: 'SP', city: 'São Paulo', coverage: { buildings: true, sales: true, stock: true },
    buildings: [
      building('A', '2025-01-01', 100, [['2026-03', 100], ['2026-04', 95], ['2026-05', 90], ['2026-06', 85], ['2026-07', 80], ['2026-08', 75], ['2026-09', 70]]),
      building('B', '2026-04-01', 20, [['2026-04', 20], ['2026-05', 17], ['2026-06', 15], ['2026-07', 13], ['2026-08', 11], ['2026-09', 9]]),
      building('C', '2026-07-01', 30, [['2026-07', 30], ['2026-08', 27], ['2026-09', 25]]),
    ],
    sales: temporal('liquid_sales', [['2026-04', 5], ['2026-05', 8], ['2026-06', 7], ['2026-07', 7], ['2026-08', 10], ['2026-09', 9]]),
    stock: temporal('stock', [['2026-03', 100], ['2026-04', 115], ['2026-05', 107], ['2026-06', 100], ['2026-07', 123], ['2026-08', 113], ['2026-09', 104]]),
  };
}
