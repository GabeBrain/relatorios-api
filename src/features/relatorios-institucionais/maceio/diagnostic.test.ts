import { describe, expect, it } from 'vitest';
import { buildMaceioDiagnostic } from './diagnostic';
import type { MaceioGenerationState } from './useMaceioMarket';
import type { MaceioSelection } from './model';
import { remainingFixture } from './__tests__/remaining-fixture';
import { cagedFixture } from './__tests__/caged-fixture';
import { buildOfferPriceSlide } from './offer-price-data';
import { introFixture } from './__tests__/intro-fixture';

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
    expect(diagnostic.criteria.emptyPeriods).toContain('completed-scoped-scan-as-zero');
    expect(diagnostic.criteria.patternGrouping.Standard).toBe('Médio Padrão');
    expect(diagnostic.criteria).toMatchObject({ prices: 'stock-weighted', monetaryIndex: 'INCC-DI', monetaryBase: '2026-05' });
  });
  it('trimestral completo só mantém CAGED pendente, com vertical, horizontal, comercial e INCC-DI disponíveis', () => {
    const quarterly: MaceioSelection = { ...selection, periodicity: 'quarterly', position: 2 };
    const intro = { ...introFixture(quarterly), slides: remainingFixture(quarterly), caged: { report: null, issue: 'Fonte CAGED em carga.' } };
    const diagnostic = buildMaceioDiagnostic(quarterly, { ...state, intro });
    expect(diagnostic.slides).toHaveLength(87);
    expect(diagnostic.slides.filter(s => s.status === 'source-pending').map(s => s.number)).toEqual([9, 10, 11, 12, 13, 14]);
    expect(diagnostic.summary).toEqual({ available: 58, 'source-pending': 6, 'method-pending': 0, 'editorial-review': 23, 'not-implemented': 0 });
    expect(diagnostic.criteria.emptyPeriods).toContain('completed-scoped-scan-as-zero');
    expect(diagnostic.criteria.patternGrouping.Standard).toBe('Médio Padrão');
    expect(diagnostic.criteria).toMatchObject({ prices: 'stock-weighted', monetaryIndex: 'INCC-DI', monetaryBase: '2026-06' });
    expect(diagnostic.slides.filter(s => [26, 27, 28, 37, 38, 72, 73, 74, 76, 77, 78, 80, 81, 82].includes(s.number)).every(s => s.status === 'available')).toBe(true);
    expect(diagnostic.cities).toHaveLength(6);
    expect(diagnostic.cities).not.toContain('Coqueiro Seco');
  });
});
