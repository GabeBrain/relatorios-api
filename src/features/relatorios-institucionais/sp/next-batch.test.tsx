import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { recordedInput } from './__tests__/recorded';
import { syntheticSalesSeries } from './__tests__/launch-series';
import { syntheticTypologyInput, syntheticPreviousTypology } from './__tests__/typology';
import { buildSpTemporalPreview } from './temporal';
import { buildSpProjects } from './projects';
import { buildSpSalesSeries } from './launch-series';
import { compareSpGroups } from './comparisons';
import { buildSpTypologyHistory, resolveSpTypologyComparison } from './typology-history';
import { SpTrendSlide } from './SpTrendSlide';

const baseline = () => buildSpTemporalPreview(recordedInput(), '3T2026');
const building = (id: number, units: unknown = id, neighborhood: unknown = `Bairro ${id}`) => ({ building_id: id, release_date: '2026-07-01', total_units: units, neighborhood, city: 'São Paulo', state: 'SP', building_type: 'Vertical', standard: 'Standard' });
describe('SP — lote sem INCC: bairros, comparativos e vendas', () => {
  it('ranking usa denominador da cidade inteira, IDs distintos e Top 10 apenas no numerador', () => {
    const report = baseline(); report.metrics.launches = 78;
    const buildings = Array.from({ length: 12 }, (_, i) => building(i + 1));
    const result = buildSpProjects([...buildings, buildings[0]], report);
    expect(result.total).toBe(12);
    expect(result.neighborhoods).toMatchObject({ status: 'ready', cityTotal: 78, topTotal: 75 });
    expect(result.neighborhoods!.rows).toHaveLength(10);
    expect(result.neighborhoods!.topShare).toBeCloseTo(75 / 78 * 100);
  });
  it('normaliza acentos/espaços sem inventar equivalência entre nomes diferentes', () => {
    const report = baseline(); report.metrics.launches = 3;
    const result = buildSpProjects([building(1, 1, 'Vila São Luís'), building(2, 2, ' vila   sao luis ')], report);
    expect(result.neighborhoods!.rows).toHaveLength(1);
    expect(result.neighborhoods!.rows[0]).toMatchObject({ units: 3, share: 100 });
  });
  it('divergência cadastral bloqueia somente bairros, preservando contagem de empreendimentos', () => {
    const result = buildSpProjects([building(1)], baseline());
    expect(result.status).toBe('ready'); expect(result.total).toBe(1);
    expect(result.neighborhoods!.status).toBe('blocked');
    expect(result.neighborhoods!.rows).toEqual([]);
  });
  it.each([null, '', false, -1, .5])('não ignora lançamento com unidades inválidas: %s', value => {
    expect(buildSpProjects([building(1, value)], baseline()).neighborhoods!.status).toBe('blocked');
  });
  it('não ignora bairro ausente nem lançamentos fora da janela parcial', () => {
    const report = baseline(); report.metrics.launches = 1;
    expect(buildSpProjects([building(1, 1, '')], report).neighborhoods!.status).toBe('blocked');
    expect(buildSpProjects([building(1), { ...building(2, 999), release_date: '2026-09-01' }], report).neighborhoods!.cityTotal).toBe(1);
  });
  it('preserva vendas negativas e usa quadro anual quando área percentual não é adequada', () => {
    const input = recordedInput(); input.sales[0].liquid_sales = -10000;
    const report = buildSpTemporalPreview(input, '3T2026');
    const result = buildSpSalesSeries(syntheticSalesSeries(input), report);
    expect(result.status).toBe('ready');
    expect(result.trends!.quarterly.at(-1)!.value).toBe(report.metrics.sales);
    expect(result.comparison!.rows.some(row => row.current < 0)).toBe(true);
    expect(result.comparison!.rows.every(row => row.currentShare === null)).toBe(true);
    expect(result.breakdown!.annual!.at(-1)!.segments.every(row => row.share === null)).toBe(true);
    const html = renderToStaticMarkup(<SpTrendSlide report={{ ...report, salesSeries: result }} number={36} />);
    expect(html).toContain('Quadro anual de vendas líquidas com valores negativos');
    expect(html).toContain('negativas preservadas');
  });
  it('compara tipologias em meses equivalentes, validando também denominador anterior quando disponível', () => {
    const report = baseline();
    const history = buildSpTypologyHistory(syntheticTypologyInput(), syntheticPreviousTypology(), report);
    expect(history.launches.status).toBe('ready');
    expect(history.sales.status).toBe('ready');
    expect(history.launches.currentTotal).toBe(report.metrics.launches);
    expect(resolveSpTypologyComparison({ ...report, typologyHistory: history, salesSeries: { status: 'ready', issues: [], comparison: { ...history.sales, previousTotal: history.sales.previousTotal + 1 } } }, 'sales')!.status).toBe('blocked');
    const missing = syntheticPreviousTypology(); missing.releases = missing.releases.filter(row => row.period !== '2025-08-01');
    expect(buildSpTypologyHistory(syntheticTypologyInput(), missing, report).launches.status).toBe('blocked');
  });
  it('comparação não supõe grupo ausente igual a zero e preserva bases negativas', () => {
    expect(compareSpGroups([{ group: 'A', value: 2 }], []).status).toBe('blocked');
    const result = compareSpGroups([{ group: 'A', value: -2 }], [{ group: 'A', value: 0 }]);
    expect(result.rows[0]).toMatchObject({ current: -2, previous: 0, variation: null, currentShare: null, previousShare: null });
  });
});
