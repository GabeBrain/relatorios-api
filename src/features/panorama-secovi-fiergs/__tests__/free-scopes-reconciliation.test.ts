import { describe, expect, it } from 'vitest';
import { panoramaExportBlockReason } from '../export-store';
import { FIERGS_RM_PORTO_ALEGRE_PRESET } from '../presets';
import { freeScopeReport } from './free-scopes.fixture';
import { reconcilePanoramaReport } from '../domain/reconciliation';

describe('FIERGS — cidade única e universos vazios confirmados', () => {
  const scope = { uf: 'RS', cities: ['Canoas'], entity: 'fiergs-rs' as const, startQuarter: '1T2023' as const, endQuarter: '2T2026' as const, engineVersion: 'v4' as const };
  it.each(['2T2026', '4T2025'] as const)('fecha cidade única sem horizontal em %s sem depender do gráfico municipal', (endQuarter) => {
    const report = freeScopeReport({ ...scope, endQuarter });
    expect(report.cityComparisons.enabled).toBe(false);
    expect(report.cityComparisons.sales).toEqual([{ city: 'Canoas', liquidSales: 5 }]);
    expect(report.reconciliation.rows.filter((row) => row.status !== 'match')).toEqual([]);
    expect(panoramaExportBlockReason(report)).toBeNull();
    expect(report.reconciliation.rows.find((row) => row.metricId === 'horizontal.projects.consolidated')).toMatchObject({ canonicalTotal: 0, dimensionalTotal: 0 });
  });
  it.each(['2T2026', '4T2025'] as const)('preserva fechamento do preset completo em fixture sintética %s', (endQuarter) => {
    const report = freeScopeReport({ ...scope, ...FIERGS_RM_PORTO_ALEGRE_PRESET.scope, endQuarter }, { horizontal: true });
    expect(report.cityComparisons.enabled).toBe(true);
    expect(report.cube.projects).toHaveLength(20);
    expect(report.granular.offerByStandard.at(-1)?.launchedUnits).toBe(1000);
    expect(report.granular.cohortsHorizontal.at(-1)?.launchedUnits).toBe(500);
    expect(report.reconciliation.rows.filter((row) => row.status !== 'match')).toEqual([]);
    expect(panoramaExportBlockReason(report)).toBeNull();
  });
  it('fecha janela vazia sem eliminar estoque histórico', () => {
    const report = freeScopeReport(scope, { releaseDate: '2022-10-01', horizontal: true });
    expect(report.granular.launchWindow?.offerByStandard.at(-1)?.projects).toBe(0);
    expect(report.granular.offerByStandard.at(-1)?.finalUnits).toBe(30);
    expect(report.reconciliation.rows.filter((row) => row.status !== 'match')).toEqual([]);
  });
  it('conserva venda negativa e zero observado', () => {
    const report = freeScopeReport(scope, { sold: -2, final: 0 });
    expect(report.cityComparisons.sales[0].liquidSales).toBe(-2);
    expect(report.granular.offerByStandard.at(-1)?.finalUnits).toBe(0);
    expect(report.reconciliation.rows.filter((row) => row.status !== 'match')).toEqual([]);
  });
  it('mantém bloqueio diante de cidade faltante', () => {
    const report = freeScopeReport({ ...scope, cities: ['Canoas', 'Esteio'] }, { failedCity: 'Esteio' });
    expect(panoramaExportBlockReason(report)).toContain('coleta incompleta');
    expect(report.reconciliation.rows.find((row) => row.metricId === 'sales.vertical.city')?.status).toBe('unavailable');
  });
  it('um projeto presente sem dimensão não recebe zero de universo vazio', () => {
    const report = freeScopeReport(scope);
    report.granular.offerByTypology = [];
    report.reconciliation = reconcilePanoramaReport(report);
    expect(report.reconciliation.rows.find((row) => row.metricId === 'stock.vertical.typology_table')?.status).toBe('unavailable');
    expect(panoramaExportBlockReason(report)).toContain('stock.vertical.typology_table');
  });
});
