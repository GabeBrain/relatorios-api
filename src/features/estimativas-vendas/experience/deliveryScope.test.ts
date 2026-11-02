import { deliveryFixture } from './delivery.fixture';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { analyzeCase, buildingSpec, summarizeInventory } from './domain';
import { buildDeliveryPlan, deliveryScope, deliverySpec, exportRequestKey, locationKey } from './deliveryScope';
import { forecastWorkbook } from './export';

describe('contrato de entrega principal', () => {
  it('filtra o universo completo por cidade/UF, tipo e busca, separando esgotados e comparadores', () => {
    const u = deliveryFixture(), inventory = summarizeInventory(u.buildings, 'latest');
    const rows = [...inventory, { ...inventory[0], id: '003', stock: 0 }, { ...inventory[0], id: '004', type: 'Vertical' }];
    u.locations['003'] = u.locations['001']; u.locations['004'] = u.locations['001'];
    const available = { '001': ['finotti-reference' as const], '002': ['finotti-reference' as const], '003': ['finotti-reference' as const], '004': ['constant' as const] };
    const filters = { city: 'all', type: 'all', search: '', duration: 12 };
    const all = deliveryScope(u, rows, available, filters);
    expect(all.ids).toEqual(['001', '002']); expect(all.sold.map(r => r.id)).toEqual(['003']); expect(all.others.map(r => r.id)).toEqual(['004']);
    expect(deliveryScope(u, rows, available, { ...filters, city: locationKey(u.locations['002']) }).ids).toEqual(['002']);
    expect(deliveryScope(u, rows, available, { ...filters, search: '001' }).ids).toEqual(['001']);
    expect(deliveryScope(u, rows, available, { ...filters, type: 'Vertical' }).ids).toEqual([]);
  });
  it('exporta todas as linhas com datas próprias e nenhuma liberação operacional; rejeita fallback e resultado divergente', async () => {
    const u = deliveryFixture(), spec = deliverySpec(36);
    // Keep the second member within the documented reference training window.
    u.buildings[1].typologies_history.push({ ...u.buildings[1].typologies_history[0], period: '2026-10', typology_stock: 142 });
    const analyses = await Promise.all(['001', '002'].map(id => analyzeCase(u, id, buildingSpec(u, id, spec))));
    const plan = buildDeliveryPlan(u, ['001', '002'], analyses, spec);
    expect(plan.forecasts).toHaveLength(72);
    expect(plan.forecasts.find(r => r.id_empreendimento === '001')?.inicio).toBe('2026-09');
    expect(plan.forecasts.find(r => r.id_empreendimento === '002')?.inicio).toBe('2026-10');
    expect(plan.forecasts.every(r => r.metodo === 'finotti-reference' && r.importavel === false)).toBe(true);
    const workbook = XLSX.read(await forecastWorkbook(plan), { type: 'array' });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.previsoes)).toHaveLength(72);
    expect(() => buildDeliveryPlan(u, ['001'], analyses, { ...spec, methods: ['constant'] })).toThrow(/somente/);
    expect(() => buildDeliveryPlan(u, ['001'], [{ ...analyses[0], hash: 'other' }], spec)).toThrow(/desatualizados/);
    expect(exportRequestKey(u, ['001'], spec)).not.toBe(exportRequestKey(u, ['001'], deliverySpec(12)));
    expect(() => buildDeliveryPlan(u, ['002'], [{ ...analyses[1], stock: { ...analyses[1].stock, cases: [{ ...analyses[1].stock.cases[0], methods: { ...analyses[1].stock.cases[0].methods, 'finotti-reference': { ...analyses[1].stock.cases[0].methods['finotti-reference'], forecast: null } } }] } }], spec)).toThrow(/nenhum arquivo parcial/);
  });
});
