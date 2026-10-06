import { beforeEach, describe, expect, it } from 'vitest';
import { reconcilePanoramaReport } from '../domain/reconciliation';
import { buildFiergsAuditCsv } from '../lib/fiergs-audit';
import { panoramaExportBlockReason, usePanoramaExportStore } from '../export-store';

const block = (value: number, quarter: '2T2026' | '4T2025' = '2T2026') => ({ series: [{ quarter, vertical: value }] });
const base = (endQuarter: '2T2026' | '4T2025' = '2T2026') => ({
  scope: { uf: 'RS', cities: ['Canoas', 'Viamão'], endQuarter, entity: 'fiergs-rs' },
  cube: {
    projects: [
      { key: 'Canoas::V1', segment: 'Vertical', launchedUnits: 100, soldUnits: 30, finalUnits: 70, typologies: [], latitude: -29.9, longitude: -51.1 },
      { key: 'Viamão::V2', segment: 'Vertical', launchedUnits: 100, soldUnits: 20, finalUnits: 80, typologies: [], latitude: -30.0, longitude: -51.0 },
      { key: 'Viamão::H1', segment: 'Horizontal', horizontalSubtype: 'loteamento_aberto', launchedUnits: 100, finalUnits: 40, typologies: [], latitude: -30.1, longitude: -50.9 },
    ],
  },
  sales: { units: { ...block(50, endQuarter), source: 'padrão' }, unitsByTypology: { ...block(50, endQuarter), source: 'tipologia' } },
  stock: { units: { ...block(150, endQuarter), source: 'padrão' }, unitsByTypology: { ...block(150, endQuarter), source: 'tipologia' } },
  granular: {
    areaBands: [{ kind: 'total', soldUnits: 50, finalUnits: 150 }],
    offerByStandard: [{ kind: 'row', launchedUnits: 200, soldUnits: 50, finalUnits: 150 }, { kind: 'total', launchedUnits: 200, soldUnits: 50, finalUnits: 150 }],
    offerByTypology: [{ kind: 'row', launchedUnits: 200, soldUnits: 50, finalUnits: 150 }, { kind: 'total', launchedUnits: 200, soldUnits: 50, finalUnits: 150 }],
    cohortsVertical: [{ kind: 'total', finalUnits: 150 }],
    maturityByStandard: [{ kind: 'row', launched: { total: 200 }, final: { total: 150 } }, { kind: 'total', launched: { total: 200 }, final: { total: 150 } }],
    maturityByTypology: [{ kind: 'row', launched: { total: 200 }, final: { total: 150 } }, { kind: 'total', launched: { total: 200 }, final: { total: 150 } }],
    pricesByStandard: [{ kind: 'total', projects: 2 }],
    pricesByTypology: [{ kind: 'total', projects: 2 }],
    cohortsHorizontal: [{ kind: 'total', projects: 1, launchedUnits: 100, finalUnits: 40 }],
    vgv: [{ kind: 'subtotal', segment: 'Horizontal', projects: 1, launchedUnits: 100, finalUnits: 40 }],
  },
  cityComparisons: { enabled: true, sales: [{ city: 'Canoas', liquidSales: 30 }, { city: 'Viamão', liquidSales: 20 }] },
  locations: [
    { projectKey: 'Canoas::V1', latitude: -29.9, longitude: -51.1 },
    { projectKey: 'Viamão::V2', latitude: -30.0, longitude: -51.0 },
    { projectKey: 'Viamão::H1', latitude: -30.1, longitude: -50.9 },
  ],
});

describe('FIERGS · guardas canônicas de reconciliação', () => {
  beforeEach(() => usePanoramaExportStore.setState({ status: 'idle', error: '', report: null }));

  it('homologa quando vendas, estoque, coorte e política fecham com tolerância zero', () => {
    const reconciliation = reconcilePanoramaReport(base() as never);
    expect(reconciliation.homologable).toBe(true);
    expect(reconciliation.rows.every((row) => row.status === 'match' && row.delta === 0)).toBe(true);
  });

  it('bloqueia quando uma tabela granular de estoque usa universo diferente', () => {
    const input = base();
    input.granular.maturityByTypology[0].final.total = 143;
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.homologable).toBe(false);
    expect(reconciliation.rows.find((row) => row.metricId === 'stock.vertical.maturity_typology')).toMatchObject({
      canonicalTotal: 150, dimensionalTotal: 143, delta: -7, status: 'different', critical: true,
    });
  });

  it('bloqueia quando a linha total fecha, mas as linhas tipológicas visíveis omitem cobertura', () => {
    const input = base();
    input.granular.offerByTypology[0].launchedUnits = 137;
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.homologable).toBe(false);
    expect(reconciliation.rows.find((row) => row.metricId === 'launch.vertical.typology_table')).toMatchObject({
      canonicalTotal: 200, dimensionalTotal: 137, delta: -63, status: 'different', critical: true,
    });
  });

  it('libera a completude quando o residual derivado aparece em Não classificado', () => {
    const input = base();
    input.granular.offerByTypology = [
      { kind: 'row', launchedUnits: 137, soldUnits: 50, finalUnits: 150 },
      { kind: 'row', launchedUnits: 63, soldUnits: null, finalUnits: null },
      { kind: 'total', launchedUnits: 200, soldUnits: 50, finalUnits: 150 },
    ];
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.rows.find((row) => row.metricId === 'launch.vertical.typology_table')).toMatchObject({
      canonicalTotal: 200, dimensionalTotal: 200, delta: 0, status: 'match', critical: true,
    });
    expect(reconciliation.homologable).toBe(true);
  });

  it('bloqueia sobrecobertura tipológica mesmo quando a compensação fecha o total', () => {
    const input = base();
    input.cube.projects[0].typologies = [{ launchedUnits: 107, soldUnits: 30, finalUnits: 70 }];
    input.cube.projects[1].typologies = [{ launchedUnits: 100, soldUnits: 20, finalUnits: 80 }];
    input.granular.offerByTypology = [
      { kind: 'row', launchedUnits: 207, soldUnits: 50, finalUnits: 150 },
      { kind: 'row', launchedUnits: -7, soldUnits: null, finalUnits: null },
      { kind: 'total', launchedUnits: 200, soldUnits: 50, finalUnits: 150 },
    ];
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.rows.find((row) => row.metricId === 'launch.vertical.typology_table')?.status).toBe('match');
    expect(reconciliation.rows.find((row) => row.metricId === 'residual.vertical.typology.launched.negative')).toMatchObject({
      canonicalTotal: 0, dimensionalTotal: 7, delta: 7, status: 'different', critical: true,
    });
    expect(reconciliation.homologable).toBe(false);
  });

  it('não confunde distrato tipológico negativo com residual negativo', () => {
    const input = base();
    input.cube.projects[0].soldUnits = -1;
    input.cube.projects[0].typologies = [{ launchedUnits: 100, soldUnits: -1, finalUnits: 70 }];
    input.cube.projects[1].typologies = [{ launchedUnits: 100, soldUnits: 20, finalUnits: 80 }];
    input.sales.units.series[0].vertical = 19;
    input.sales.unitsByTypology.series[0].vertical = 19;
    input.granular.areaBands[0].soldUnits = 19;
    input.granular.offerByStandard[0].soldUnits = 19;
    input.granular.offerByTypology[0].soldUnits = 19;
    input.cityComparisons.sales[0].liquidSales = -1;
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.rows.find((row) => row.metricId === 'residual.vertical.typology.sold.negative')).toMatchObject({
      canonicalTotal: 0, dimensionalTotal: 0, delta: 0, status: 'match', critical: true,
    });
    expect(reconciliation.homologable).toBe(true);
  });

  it('bloqueia quando o consolidado horizontal usa uma janela diferente da coorte', () => {
    const input = base();
    input.granular.vgv[0].projects = 0;
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.homologable).toBe(false);
    expect(reconciliation.rows.find((row) => row.metricId === 'horizontal.projects.consolidated')).toMatchObject({
      canonicalTotal: 1, dimensionalTotal: 0, delta: -1, status: 'different', critical: true,
    });
  });

  it('bloqueia quando um empreendimento georreferenciado não chega aos mapas', () => {
    const input = base();
    input.locations.pop();
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.homologable).toBe(false);
    expect(reconciliation.rows.find((row) => row.metricId === 'map.projects.rendered')).toMatchObject({
      canonicalTotal: 3, dimensionalTotal: 2, delta: -1, status: 'different', critical: true,
    });
  });

  it('marca o delta e bloqueia a exportação quando uma dimensão diverge', () => {
    const input = base();
    input.sales.unitsByTypology.series[0].vertical = 49;
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.homologable).toBe(false);
    expect(reconciliation.rows.find((row) => row.metricId === 'sales.vertical.typology')).toMatchObject({
      canonicalTotal: 50, dimensionalTotal: 49, delta: -1, status: 'different', critical: true,
    });
    usePanoramaExportStore.getState().start({ scope: input.scope, reconciliation, provenance: { requestedCities: input.scope.cities, completedCities: input.scope.cities, failedCities: [] } } as never, 'pdf');
    expect(usePanoramaExportStore.getState()).toMatchObject({ status: 'error', report: null });
  });

  it.each(['2T2026', '4T2025'] as const)('libera PDF e PPT quando todas as invariantes fecham em %s', (period) => {
    const input = base(period);
    const reconciliation = reconcilePanoramaReport(input as never);
    const report = { scope: input.scope, reconciliation, provenance: { requestedCities: input.scope.cities, completedCities: input.scope.cities, failedCities: [] } } as never;
    for (const format of ['pdf', 'pptx'] as const) {
      usePanoramaExportStore.setState({ status: 'idle', error: '', report: null });
      usePanoramaExportStore.getState().start(report, format);
      expect(usePanoramaExportStore.getState()).toMatchObject({ status: 'preparing', format, report });
      usePanoramaExportStore.getState().cancel();
    }
  });

  it.each(['2T2026', '4T2025'] as const)('bloqueia PDF e PPT diante de divergência crítica em %s', (period) => {
    const input = base(period);
    input.granular.cohortsHorizontal[0].finalUnits = 39;
    const reconciliation = reconcilePanoramaReport(input as never);
    const report = { scope: input.scope, reconciliation, provenance: { requestedCities: input.scope.cities, completedCities: input.scope.cities, failedCities: [] } } as never;
    for (const format of ['pdf', 'pptx'] as const) {
      usePanoramaExportStore.setState({ status: 'idle', error: '', report: null });
      usePanoramaExportStore.getState().start(report, format);
      expect(usePanoramaExportStore.getState()).toMatchObject({ status: 'error', format, report: null });
      expect(usePanoramaExportStore.getState().error).toContain('horizontal.final.cohort');
    }
  });

  it('recalcula as linhas críticas mesmo se homologable vier indevidamente verdadeiro', () => {
    const input = base('4T2025');
    const reconciliation = reconcilePanoramaReport(input as never);
    reconciliation.rows[0] = { ...reconciliation.rows[0], status: 'different', delta: 1 };
    const forged = { ...reconciliation, homologable: true };
    expect(panoramaExportBlockReason({ scope: input.scope, reconciliation: forged, provenance: { requestedCities: input.scope.cities, completedCities: input.scope.cities, failedCities: [] } } as never)).toContain('sales.vertical.pattern');
  });

  it('bloqueia uma dimensão crítica indisponível em vez de tratá-la como exceção editorial', () => {
    const input = base('4T2025');
    input.granular.offerByTypology = [];
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.rows.find((row) => row.metricId === 'stock.vertical.typology_table')).toMatchObject({ status: 'unavailable', critical: true });
    expect(panoramaExportBlockReason({ scope: input.scope, reconciliation, provenance: { requestedCities: input.scope.cities, completedCities: input.scope.cities, failedCities: [] } } as never)).toContain('stock.vertical.typology_table');
  });

  it('bloqueia exportação Secovi se qualquer cidade do escopo estiver incompleta', () => {
    const input = base();
    const scope = { ...input.scope, entity: 'secovi-sp' as const };
    const completeReconciliation = reconcilePanoramaReport(input as never);
    const reason = panoramaExportBlockReason({ scope, reconciliation: completeReconciliation, provenance: { requestedCities: scope.cities, completedCities: ['Canoas'], failedCities: [{ city: 'Viamão', error: 'HTTP 503' }] } } as never);
    expect(reason).toContain('coleta incompleta');
    expect(reason).toContain('Viamão');
  });

  it('leva fonte, fórmula, universo, período e delta para o CSV de auditoria', () => {
    const reconciliation = reconcilePanoramaReport(base() as never);
    const csv = buildFiergsAuditCsv({ cube: { projects: [], rejections: [] }, reconciliation, provenance: { cityCollectionAttempts: [{ city: 'Canoas', attempts: 2, recovered: true }], cityCollectionMetrics: [{ city: 'Canoas', operation: 'sales', requests: 4, durationMs: 80 }] } } as never);
    expect(csv).toContain('metrica;fonte;formula;universo;periodo_observado;total_canonico;total_dimensional;delta');
    expect(csv).toContain('reconciliacao');
    expect(csv).toContain('sales.vertical.pattern');
    expect(csv).toContain('2T2026;50;50;0;0;match;true');
    expect(csv).toContain('coleta_cidade;Canoas');
    expect(csv.split('\r\n').some((line) => line.startsWith('coleta_operacao;Canoas;') && line.includes(';sales;') && line.endsWith(';4;80'))).toBe(true);
  });
});
