import { beforeEach, describe, expect, it } from 'vitest';
import { reconcilePanoramaReport } from '../domain/reconciliation';
import { buildFiergsAuditCsv } from '../lib/fiergs-audit';
import { usePanoramaExportStore } from '../export-store';

const block = (value: number) => ({ series: [{ quarter: '2T2026', vertical: value }] });
const base = () => ({
  scope: { uf: 'RS', cities: ['Canoas', 'Viamão'], endQuarter: '2T2026', entity: 'fiergs-rs' },
  cube: {
    projects: [
      { key: 'Canoas::V1', segment: 'Vertical', soldUnits: 30, finalUnits: 70 },
      { key: 'Viamão::V2', segment: 'Vertical', soldUnits: 20, finalUnits: 80 },
      { key: 'Viamão::H1', segment: 'Horizontal', horizontalSubtype: 'loteamento_aberto', launchedUnits: 100, finalUnits: 40 },
    ],
  },
  sales: { units: { ...block(50), source: 'padrão' }, unitsByTypology: { ...block(50), source: 'tipologia' } },
  stock: { units: { ...block(150), source: 'padrão' }, unitsByTypology: { ...block(150), source: 'tipologia' } },
  granular: {
    areaBands: [{ kind: 'total', soldUnits: 50, finalUnits: 150 }],
    offerByStandard: [{ kind: 'total', finalUnits: 150 }],
    offerByTypology: [{ kind: 'total', finalUnits: 150 }],
    cohortsVertical: [{ kind: 'total', finalUnits: 150 }],
    maturityByStandard: [{ kind: 'total', final: { total: 150 } }],
    maturityByTypology: [{ kind: 'total', final: { total: 150 } }],
    pricesByStandard: [{ kind: 'total', projects: 2 }],
    pricesByTypology: [{ kind: 'total', projects: 2 }],
    cohortsHorizontal: [{ kind: 'total', projects: 1, launchedUnits: 100, finalUnits: 40 }],
    vgv: [{ kind: 'subtotal', segment: 'Horizontal', projects: 1, launchedUnits: 100, finalUnits: 40 }],
  },
  cityComparisons: { enabled: true, sales: [{ city: 'Canoas', liquidSales: 30 }, { city: 'Viamão', liquidSales: 20 }] },
});

describe('FIERGS · guardas canônicas de reconciliação', () => {
  beforeEach(() => usePanoramaExportStore.setState({ status: 'idle', error: '', report: null }));

  it('homologa quando vendas, estoque, coorte e política fecham com tolerância zero', () => {
    const reconciliation = reconcilePanoramaReport(base() as never);
    expect(reconciliation.homologable).toBe(true);
    expect(reconciliation.rows).toHaveLength(21);
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

  it('bloqueia quando o consolidado horizontal usa uma janela diferente da coorte', () => {
    const input = base();
    input.granular.vgv[0].projects = 0;
    const reconciliation = reconcilePanoramaReport(input as never);
    expect(reconciliation.homologable).toBe(false);
    expect(reconciliation.rows.find((row) => row.metricId === 'horizontal.projects.consolidated')).toMatchObject({
      canonicalTotal: 1, dimensionalTotal: 0, delta: -1, status: 'different', critical: true,
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
    usePanoramaExportStore.getState().start({ scope: input.scope, reconciliation } as never, 'pdf');
    expect(usePanoramaExportStore.getState()).toMatchObject({ status: 'error', report: null });
  });

  it('leva fonte, fórmula, universo, período e delta para o CSV de auditoria', () => {
    const reconciliation = reconcilePanoramaReport(base() as never);
    const csv = buildFiergsAuditCsv({ cube: { projects: [], rejections: [] }, reconciliation } as never);
    expect(csv).toContain('metrica;fonte;formula;universo;periodo_observado;total_canonico;total_dimensional;delta');
    expect(csv).toContain('reconciliacao');
    expect(csv).toContain('sales.vertical.pattern');
    expect(csv).toContain('2T2026;50;50;0;0;match;true');
  });
});
