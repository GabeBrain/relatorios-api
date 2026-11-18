import { describe, expect, it } from 'vitest';
import {
  MACEIO_CITIES_MONTHLY,
  MACEIO_CITIES_QUARTERLY,
  MACEIO_REFERENCES,
  maceioCities,
  maceioPeriod,
  maceioReference,
  maceioScope,
  prepareMaceioBlueprint,
  type MaceioSelection,
} from './model';

const base: MaceioSelection = { uf: 'AL', city: 'Maceió', territory: 'capital-rm', periodicity: 'monthly', year: 2026, position: 5 };

describe('maceioReference', () => {
  it('keeps the original positions without renumbering', () => {
    const monthly = maceioReference('monthly');
    const quarterly = maceioReference('quarterly');
    expect(monthly.slideCount).toBe(82);
    expect(quarterly.slideCount).toBe(87);
    expect(monthly.slides.map(slide => slide.number)).toEqual(Array.from({ length: 82 }, (_, index) => index + 1));
    expect(quarterly.slides.map(slide => slide.number)).toEqual(Array.from({ length: 87 }, (_, index) => index + 1));
  });
  it('exposes both references with verified hashes', () => {
    expect(MACEIO_REFERENCES).toHaveLength(2);
    for (const reference of MACEIO_REFERENCES) expect(reference.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('maceioCities', () => {
  it('includes Coqueiro Seco only in the monthly edition, as proven in slide 7 of each original', () => {
    expect(MACEIO_CITIES_MONTHLY).toHaveLength(7);
    expect(MACEIO_CITIES_QUARTERLY).toHaveLength(6);
    expect(maceioCities('monthly')).toContain('Coqueiro Seco');
    expect(maceioCities('quarterly')).not.toContain('Coqueiro Seco');
  });
});

describe('maceioScope', () => {
  const authorizedMonthly = [...MACEIO_CITIES_MONTHLY];
  it('validates the full monthly set when every city is authorized', () => {
    const scope = maceioScope(base, authorizedMonthly);
    expect(scope.valid).toBe(true);
    expect(scope.missing).toEqual([]);
    expect(scope.cities).toHaveLength(7);
  });
  it('reports missing cities instead of shrinking the set silently', () => {
    const scope = maceioScope(base, authorizedMonthly.filter(city => city !== 'Coqueiro Seco'));
    expect(scope.valid).toBe(false);
    expect(scope.missing).toEqual(['Coqueiro Seco']);
  });
  it('does not require Coqueiro Seco for the quarterly edition', () => {
    const scope = maceioScope({ ...base, periodicity: 'quarterly' }, [...MACEIO_CITIES_QUARTERLY]);
    expect(scope.valid).toBe(true);
  });
  it('keeps the provider spelling of authorized cities', () => {
    const provider = authorizedMonthly.map(city => city.toUpperCase());
    const scope = maceioScope(base, provider);
    expect(scope.cities).toContain('MACEIÓ');
  });
  it('rejects a different UF', () => {
    expect(maceioScope({ ...base, uf: 'CE' }, authorizedMonthly).valid).toBe(false);
  });
});

describe('maceioPeriod', () => {
  it('builds the monthly window', () => {
    const period = maceioPeriod({ periodicity: 'monthly', year: 2026, position: 5 });
    expect(period.label).toBe('05/2026');
    expect(period.start).toBe('2026-05-01');
    expect(period.end).toBe('2026-05-31');
    expect(period.opening).toBe('2026-04');
    expect(period.months).toEqual(['2026-05']);
  });
  it('builds the quarterly window', () => {
    const period = maceioPeriod({ periodicity: 'quarterly', year: 2026, position: 2 });
    expect(period.label).toBe('2º trimestre de 2026');
    expect(period.start).toBe('2026-04-01');
    expect(period.end).toBe('2026-06-30');
    expect(period.months).toEqual(['2026-04', '2026-05', '2026-06']);
  });
  it('rejects invalid positions', () => {
    expect(() => maceioPeriod({ periodicity: 'monthly', year: 2026, position: 13 })).toThrow();
    expect(() => maceioPeriod({ periodicity: 'quarterly', year: 2026, position: 5 })).toThrow();
    expect(() => maceioPeriod({ periodicity: 'monthly', year: 2020, position: 1 })).toThrow();
  });
});

describe('prepareMaceioBlueprint', () => {
  it('organizes all 82 monthly pages in the original order', async () => {
    const blueprint = await prepareMaceioBlueprint(base, [...MACEIO_CITIES_MONTHLY], { yieldControl: async () => {} });
    expect(blueprint.status).toBe('structure-only');
    expect(blueprint.pages).toHaveLength(82);
    expect(blueprint.pages.map(page => page.number)).toEqual(Array.from({ length: 82 }, (_, index) => index + 1));
    expect(blueprint.pages.some(page => page.status === 'source-pending')).toBe(true);
    expect(blueprint.pages.some(page => page.status === 'editorial-pending')).toBe(true);
  });
  it('organizes all 87 quarterly pages', async () => {
    const blueprint = await prepareMaceioBlueprint({ ...base, periodicity: 'quarterly', position: 2 }, [...MACEIO_CITIES_QUARTERLY], { yieldControl: async () => {} });
    expect(blueprint.pages).toHaveLength(87);
    expect(blueprint.reference.id).toBe('junho-2t2026-trimestral');
  });
  it('refuses an unauthorized scope', async () => {
    await expect(prepareMaceioBlueprint(base, ['Maceió'], { yieldControl: async () => {} })).rejects.toThrow(/7 municípios/);
  });
  it('honors cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(prepareMaceioBlueprint(base, [...MACEIO_CITIES_MONTHLY], { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('reports progress', async () => {
    const steps: number[] = [];
    await prepareMaceioBlueprint(base, [...MACEIO_CITIES_MONTHLY], { yieldControl: async () => {}, onProgress: completed => steps.push(completed) });
    expect(steps.at(-1)).toBe(82);
  });
});
