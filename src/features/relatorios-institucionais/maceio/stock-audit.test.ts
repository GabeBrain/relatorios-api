import { describe, expect, it } from 'vitest';
import { auditMaceioStock } from './stock-audit';
import { auditMaceioSource } from './source-audit';
import { remainingFixture } from './__tests__/remaining-fixture';
import { buildRemainingSlide } from './remaining-data';
import { buildOfferPriceSlide } from './offer-price-data';
import type { MaceioSelection } from './model';
import type { MarketRow } from './market';

const selection: MaceioSelection = { uf: 'AL', city: 'Maceió', territory: 'capital-rm', periodicity: 'monthly', year: 2026, position: 5 };
describe('diagnóstico agregado de estoque, sem alterar dados', () => {
  it('identifica a diferença 283 contra 192 e sua categoria, sem nomes nem IDs', () => {
    const data = remainingFixture(selection), city = 'Marechal Deodoro', source = data.sources.find(item => item.city === city && item.metric === 'details')!;
    source.rows = [{ city, state: 'AL', building_type: 'Vertical', building_id: 'private-id', name: 'private-name', standard: 'Econômico', release_date: '2020-01-01', token: 'private-token',
      typologies_history: [{ period: '2026-05-01', typology_id: 'private-typology', type_of_typology: 'Padrão', number_bedroom: 2, typology_stock: 192, building_status: 'Ativo' },
        { period: '2026-05-01', typology_id: 'private-second', type_of_typology: 'Garden', number_bedroom: 3, typology_stock: 91, building_status: 'Ativo' }] }];
    data.sources.find(item => item.city === city && item.metric === 'stock' && item.group === 'Padrão')!.rows = [{ period: '2026-05-01', group: 'Econômico', stock: 192 }];
    const result = auditMaceioStock(data.sources, [city], '2026-05')[0];
    expect(result).toMatchObject({ comparison: 'mismatch', granularEligible: { value: 283 }, municipal: { value: 192 }, delta: 91 });
    expect(result.byTypologyKind).toContainEqual({ category: 'Garden', observations: 1, missing: 0, value: 91 });
    expect(JSON.stringify(result)).not.toMatch(/private-|building_id|typology_id|token/);
    // The synthetic category does not claim the real difference is Garden.
  });
  it('não compara como concluído quando falta fonte, quantidade ou fotografia', () => {
    expect(auditMaceioStock(undefined, ['Maceió'], '2026-05')[0]).toMatchObject({ comparison: 'unavailable', delta: null, granularRaw: { value: null }, municipal: { value: null } });
    const data = remainingFixture(selection), source = data.sources.find(item => item.city === 'Maceió' && item.metric === 'details')!;
    source.complete = false;
    expect(auditMaceioStock(data.sources, ['Maceió'], '2026-05')[0].comparison).toBe('unavailable');
    source.complete = true;
    (source.rows[0].typologies_history as MarketRow[]).at(-1)!.typology_stock = null;
    expect(auditMaceioStock(data.sources, ['Maceió'], '2026-05')[0].delta).toBeNull();
    (source.rows[0].typologies_history as MarketRow[]).pop();
    expect(auditMaceioStock(data.sources, ['Maceió'], '2026-05')[0].invalid.missingSnapshotProjects).toBe(1);
  });
  it('separa fotografias anteriores ao lançamento sem esconder o estoque bruto', () => {
    const data = remainingFixture(selection), source = data.sources.find(item => item.city === 'Maceió' && item.metric === 'details')!;
    source.rows[0].release_date = '2027-01-01';
    const result = auditMaceioStock(data.sources, ['Maceió'], '2026-05')[0];
    expect(result.granularRaw.value).toBe(1000); expect(result.granularEligible.value).toBe(900); expect(result.delta).toBe(-100);
    expect(result.byLaunchScope.find(item => item.category === 'posterior ao fechamento')?.value).toBe(100);
  });
  it('exibe ausência de propriedade, nulo, inválido e zero distintamente', () => {
    const data = remainingFixture(selection), source = data.sources.find(item => item.metric === 'details')!;
    source.rows = [{ typologies_history: [{ period: '2026-05-01' }, { period: '2026-05-01', sold_in_period: null }, { period: '2026-05-01', sold_in_period: 'inválido' }, { period: '2026-05-01', sold_in_period: 0 }] }];
    const audit = auditMaceioSource(source, ['2026-05']);
    expect(audit.monthly[0].fieldAvailability?.sold_in_period).toEqual({ absent: 1, nullOrBlank: 1, invalid: 1, zero: 1 });
    expect(audit.monthly[0].fieldAvailability?.releases_in_period.absent).toBe(4);
  });
  for (const periodicity of ['monthly', 'quarterly'] as const) it(`decisão de Marechal preserva totais e delta como aviso / ${periodicity}`, () => {
    const selected = { ...selection, periodicity, position: periodicity === 'monthly' ? 5 : 2 }, data = remainingFixture(selected);
    const source = data.sources.find(item => item.city === 'Marechal Deodoro' && item.metric === 'details')!;
    (source.rows[0].typologies_history as MarketRow[]).at(-1)!.typology_stock = 391;
    expect(buildRemainingSlide(periodicity === 'monthly' ? 62 : 61, selected, data).warnings.join(' ')).toContain('diferença 91');
    expect(buildOfferPriceSlide(periodicity === 'monthly' ? 56 : 55, selected, data, 'stock-weighted').warnings.join(' ')).toContain('diferença 91');
  });
});
