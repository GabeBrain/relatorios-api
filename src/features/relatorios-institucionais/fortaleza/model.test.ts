import { describe, expect, it } from 'vitest';
import { FORTALEZA_CITIES, FORTALEZA_REFERENCES, fortalezaPeriod, fortalezaScope, prepareFortalezaBlueprint, type FortalezaSelection } from './model';

const selection: FortalezaSelection = { uf: 'CE', city: 'Fortaleza', territory: 'city', periodicity: 'quarterly', year: 2026, position: 2 };
describe('Contrato da base Fortaleza', () => {
  it('separa meses de trimestre e inclui estoque de abertura', () => {
    expect(fortalezaPeriod(selection)).toMatchObject({ start: '2026-04-01', end: '2026-06-30', opening: '2026-03', months: ['2026-04', '2026-05', '2026-06'] });
    expect(fortalezaPeriod({ periodicity: 'monthly', year: 2024, position: 2 })).toMatchObject({ start: '2024-02-01', end: '2024-02-29', opening: '2024-01', months: ['2024-02'] });
    expect(fortalezaPeriod({ periodicity: 'monthly', year: 2026, position: 1 }).opening).toBe('2025-12');
  });
  it.each([0, 5, 1.5, NaN])('rejeita trimestre inválido %s', position => {
    expect(() => fortalezaPeriod({ ...selection, position })).toThrow('período válido');
  });
  it('bloqueia cidade não autorizada, UF incompatível e cidade fora do estudo', () => {
    expect(fortalezaScope(selection, ['Aquiraz']).valid).toBe(false);
    expect(fortalezaScope({ ...selection, uf: 'SP' }, ['Fortaleza']).valid).toBe(false);
    expect(fortalezaScope({ ...selection, city: 'Sobral' }, ['Sobral']).valid).toBe(false);
    expect(fortalezaScope({ ...selection, city: '' }, ['Fortaleza']).valid).toBe(false);
  });
  it('conjunto completo não vira subconjunto silencioso e conserva grafia do catálogo', () => {
    const group = { ...selection, territory: 'capital-rm' as const };
    expect(fortalezaScope(group, ['Fortaleza']).missing).toEqual(['Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú']);
    expect(fortalezaScope(group, ['Fortaleza']).valid).toBe(false);
    expect(fortalezaScope(group, ['Fortaleza', 'Aquiraz', 'Caucaia', 'Eusebio', 'Maracanau'])).toMatchObject({ valid: true, cities: ['Fortaleza', 'Aquiraz', 'Caucaia', 'Eusebio', 'Maracanau'] });
  });
  it('composição local mantém páginas, proveniência e nenhuma métrica de mercado', async () => {
    const result = await prepareFortalezaBlueprint(selection, [...FORTALEZA_CITIES]);
    expect(result.status).toBe('structure-only');
    expect(result.pages).toHaveLength(89);
    expect(result.reference.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.pages.every(page => ['source-pending', 'editorial-pending'].includes(page.status))).toBe(true);
    expect(result).not.toHaveProperty('sales');
    expect(result).not.toHaveProperty('stock');
    const monthly = await prepareFortalezaBlueprint({ ...selection, periodicity: 'monthly', position: 7 }, [...FORTALEZA_CITIES]);
    expect(monthly.pages).toHaveLength(60);
    expect(monthly.period.months).toEqual(['2026-07']);
  });
  it('interrompe no cancelamento sem entregar estrutura parcial', async () => {
    const controller = new AbortController();
    await expect(prepareFortalezaBlueprint(selection, ['Fortaleza'], { signal: controller.signal, yieldControl: async () => { controller.abort(); } })).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('não prepara recorte sem cobertura completa', async () => {
    await expect(prepareFortalezaBlueprint({ ...selection, territory: 'capital-rm' }, ['Fortaleza'])).rejects.toThrow('cinco municípios');
  });
  it('inventário preserva ordem real e contagem dos originais', () => {
    for (const reference of FORTALEZA_REFERENCES) {
      expect(reference.slides.map(slide => slide.number)).toEqual(Array.from({ length: reference.slideCount }, (_, index) => index + 1));
      expect(reference.slides.reduce((sum, slide) => sum + slide.charts, 0)).toBe(reference.chartCount);
    }
  });
});
