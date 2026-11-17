import { describe, expect, it } from 'vitest';
import { buildMaceioDiagnostic } from './diagnostic';
import type { MaceioGenerationState } from './useMaceioMarket';
import type { MaceioSelection } from './model';
import { remainingFixture } from './__tests__/remaining-fixture';
import { cagedFixture } from './__tests__/caged-fixture';
import { buildOfferPriceSlide } from './offer-price-data';

const selection: MaceioSelection = { uf: 'AL', city: 'Maceió', territory: 'capital-rm', periodicity: 'monthly', year: 2026, position: 5 };
const state: MaceioGenerationState = { key: 'confidential-token', phase: 'done', startedAt: 0, message: '', report: null, blueprint: null, steps: [], hasFailedCities: false };
describe('diagnóstico Maceió', () => {
  it.each(['monthly', 'quarterly'] as const)('conta cada slide uma vez e identifica falta de fonte em %s', periodicity => {
    const diagnostic = buildMaceioDiagnostic({ ...selection, periodicity, position: periodicity === 'monthly' ? 5 : 2 }, state);
    expect(diagnostic.slides).toHaveLength(periodicity === 'monthly' ? 82 : 87);
    expect(Object.values(diagnostic.summary).reduce((a, b) => a + b, 0)).toBe(diagnostic.slides.length);
    expect(diagnostic.summary['source-pending']).toBeGreaterThan(0);
    expect(diagnostic.slides.filter(s => s.number >= 9 && s.number <= 14).every(s => s.status === 'source-pending')).toBe(true);
    expect(JSON.stringify(diagnostic)).not.toContain('confidential-token');
  });
  it('exporta agregados calculados, mantém o critério da prévia e não inclui projetos brutos', () => {
    const slides = remainingFixture(selection);
    const diagnostic = buildMaceioDiagnostic(selection, { ...state, intro: { collectedAt: '2026-11-17T17:00:00Z', cities: [], slides, caged: { report: cagedFixture('2026-05', '2017-01', true), issue: null } } });
    const price = diagnostic.slides.find(s => s.number === 58)!;
    expect(price.status).toBe('available');
    expect(price.values).toEqual(buildOfferPriceSlide(58, selection, slides, 'stock-weighted'));
    expect(diagnostic.slides.filter(s => s.number >= 9 && s.number <= 14).every(s => s.status === 'available')).toBe(true);
    expect(diagnostic.summary['source-pending']).toBeLessThan(buildMaceioDiagnostic(selection, state).summary['source-pending']);
    expect(JSON.stringify(diagnostic)).not.toContain('building_id');
    expect(JSON.stringify(diagnostic)).not.toContain('typologies_history');
    expect(diagnostic.criteria).toEqual({ prices: 'stock-weighted', monetaryIndex: 'unconfirmed' });
  });
});
