import { describe, expect, it } from 'vitest';
import { defaultTerritorialPresentation, panoramaCollectionKey, territorialPresentationErrors, territorialPresentationKey } from '../domain/territorial-presentation';
import { freeScopeReport } from './free-scopes.fixture';
import { buildPanoramaReportModel, reprojectPanoramaReport } from '../report/model';
import { launchRecordsFromCube } from '../lib/launches';
import { territorialReportView } from '../report/territorial-projections';
import type { PanoramaScope } from '../types';

const scope: PanoramaScope = { entity: 'fiergs-rs', uf: 'RS', cities: ['Canela', 'Gramado', 'Canoas'], startQuarter: '1T2023', endQuarter: '2T2026', engineVersion: 'v4',
  presentation: { mode: 'comparison', units: [{ id: 'a', label: 'Canela', cities: ['Canela'] }, { id: 'b', label: 'Região', cities: ['Gramado', 'Canoas'] }] } };
function fixture(selected: PanoramaScope, sold = -3) {
  const base = freeScopeReport({ ...selected, presentation: undefined }, { horizontal: true, sold });
  const empty = { rows: [], available: true, source: 'fixture sintética' };
  return buildPanoramaReportModel(selected, launchRecordsFromCube(base.cube), { sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
    ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty }, [], { cubes: [base.cube], provenance: base.provenance });
}
describe('contrato territorial', () => {
  it('separa a assinatura física dos nomes e agrupamentos', () => {
    const changed = { ...scope, presentation: defaultTerritorialPresentation(scope.cities) };
    expect(panoramaCollectionKey(changed)).toBe(panoramaCollectionKey(scope));
    expect(territorialPresentationKey(changed.presentation)).not.toBe(territorialPresentationKey(scope.presentation));
    expect(defaultTerritorialPresentation(['A']).mode).toBe('consolidated');
    expect(defaultTerritorialPresentation(['A', 'B', 'C', 'D']).mode).toBe('consolidated');
  });
  it.each([
    [{ id: 'a', label: 'A', cities: ['Canela'] }],
    [{ id: 'a', label: 'A', cities: ['Canela'] }, { id: 'a', label: 'Á', cities: ['Canela', 'Gramado'] }],
    [{ id: 'a', label: 'A', cities: [] }, { id: 'b', label: 'B', cities: ['Outra cidade'] }],
  ])('rejeita partições incompletas, sobrepostas ou sem identidade (%j)', (...units) => {
    expect(territorialPresentationErrors({ ...scope, presentation: { mode: 'comparison', units } }).length).toBeGreaterThan(0);
  });
  it.each(['2T2026', '4T2025'] as const)('reconcilia cada grupo com seus municípios, mantendo IDs coincidentes em cidades diferentes — %s', (endQuarter) => {
    const report = fixture({ ...scope, endQuarter });
    expect(report.territorial?.checks.filter((r) => r.status === 'different')).toEqual([]);
    expect(report.territorial?.units[1].data.closingFacts.vertical.projects).toBe(2);
    const view = territorialReportView(report, 'b');
    expect(view.cube.projects).toHaveLength(4);
    expect(view.cube.projects.some((p) => p.city === 'Canela')).toBe(false);
    expect(report.territorial?.units[1].data.closingFacts.vertical.finalUnits).toBe(60);
    expect(report.territorial?.units[1].data.sales.units.series.at(-1)?.vertical).toBe(-6);
  });
  it('recompõe sem rede e preserva o consolidado após voltar de uma comparação', () => {
    const report = fixture(scope);
    const consolidated = reprojectPanoramaReport(report, { ...scope, presentation: { mode: 'consolidated' } });
    expect(consolidated.territorial).toBeUndefined();
    expect(consolidated.closingFacts).toEqual(report.closingFacts);
    expect(consolidated.launches).toEqual(report.launches);
    expect(() => reprojectPanoramaReport(report, { ...scope, endQuarter: '4T2025' })).toThrow('Recorte');
  });
  it('recalcula preço pelo estoque em vez de tirar média de médias municipais', () => {
    const base = freeScopeReport({ ...scope, presentation: undefined });
    const cube = { ...base.cube, projects: base.cube.projects.map((p) => {
      const finalUnits = p.city === 'Canela' ? 1 : 9; const price = p.city === 'Canela' ? 100 : 1000;
      return { ...p, finalUnits, averagePricePerMeter: price,
        typologies: p.typologies.map((t) => ({ ...t, finalUnits, averagePricePerMeter: price })) };
    }) };
    const empty = { rows: [], available: true, source: 'fixture sintética' };
    const report = buildPanoramaReportModel(scope, launchRecordsFromCube(cube), { sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
      ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty }, [], { cubes: [cube], provenance: base.provenance });
    expect(report.closingFacts.verticalPricePerMeter).toBeCloseTo(18100 / 19);
    expect(report.territorial?.units[1].data.closingFacts.verticalPricePerMeter).toBe(1000);
    expect(report.closingFacts.verticalPricePerMeter).not.toBe(700);
  });
});
