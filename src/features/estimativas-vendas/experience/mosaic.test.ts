import { describe, expect, it } from 'vitest';
import { buildTiles, orderTiles, tilePath } from './mosaic';
import { ALL_METHODS, analyzeCase, type Universe } from './domain';
function fixture(): Universe {
  return { schema: 'forecast-universe-v1', complete: true, areas: [], locations: {}, requests: [], missingIds: [], hash: 'synthetic', fetchedAt: '', city: 'Curitiba', uf: 'PR', buildings: [{ building_id: '1', name: 'Synthetic', release_date: '2026-01-01', sourceType: 'Horizontal', typologies_history: ['2026-06', '2026-07', '2026-09'].map((period, i) => ({ period, typology_id: '1', pattern: 'Loteamento Fechado', qty: 300, typology_stock: 150 - i * 10, sold_in_period: 10 })) }] };
}
describe('resumos do mosaico', () => {
  it('reproduz a previsão completa sem executar retrospectivas no resumo', async () => {
    const data = fixture(), spec = { cutoff: '2026-09', duration: 12, methods: ALL_METHODS };
    const [tile] = await buildTiles(data, ['1'], spec), full = await analyzeCase(data, '1', spec);
    const forecast = full.stock.cases[0].methods['finotti-reference'].forecast!;
    expect(tile.finotti).toBe(true);
    expect(tile.finalStock).toBe(forecast.points.at(-1)!.stock);
    expect(tile.sales).toBe(130 - forecast.points.at(-1)!.stock!);
    expect(tile.forecast.at(-1)!.percent).toBe(100 * forecast.points.at(-1)!.predicted! / 300);
  });
  it('não transforma lacunas em linha observada ou inventa curva sem Finotti', async () => {
    expect(tilePath([{ offset: -3, percent: 20 }, { offset: -1, percent: 30 }, { offset: 0, percent: 35 }], -3, 12).match(/M/g)).toHaveLength(2);
    const data = fixture(); data.buildings[0].typologies_history.forEach(r => { r.pattern = 'Standard'; });
    const [tile] = await buildTiles(data, ['1'], { cutoff: 'latest', duration: 12, methods: ALL_METHODS });
    expect(tile.finotti).toBe(false); expect(tile.sales).toBeNull(); expect(tile.forecast).toEqual([]);
  });
  it('mantém datas próprias e bloqueia uso anterior à referência congelada', async () => {
    const data = fixture(); data.buildings[0].typologies_history.pop();
    const [tile] = await buildTiles(data, ['1'], { cutoff: 'latest', duration: 6, methods: ALL_METHODS });
    expect(tile.cutoff).toBe('2026-07'); expect(tile.finotti).toBe(false);
  });
  it('ordena sem alterar a entrada e deixa valores ausentes no final', () => {
    const rows = [{ id: '2', name: 'B' }, { id: '1', name: 'A' }, { id: '3', name: 'C' }];
    expect(orderTiles(rows, {}, 'sales').map(r => r.id)).toEqual(['1', '2', '3']);
    expect(rows[0].id).toBe('2');
  });
});
