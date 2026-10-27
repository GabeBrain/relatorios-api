import { describe, expect, it } from 'vitest';
import { buildFiergsAuditCsv } from '../lib/fiergs-audit';

describe('auditoria FIERGS por empreendimento', () => {
  it('separa original, capacidade derivada e cadastro e exporta linhagem de duplicatas/conflitos', () => {
    const report = { cube: { projects: [{ city: 'Cidade', buildingId: 'P', typologies: [],
      historyAudit: { identityVersion: 'history-identity-v1', capacityVersion: 'period-capacity-v1', identityMode: 'identified',
        source: { source: 'internal-v2' }, releaseObservedUnits: 127, capacityAtClosing: 70, registryTotalUnits: 90,
        registryComparable: false, closingMonth: '2026-06', registryMonth: '2026-08', received: 2, retained: 1,
        duplicates: [{ identity: 'P|T|2026-06', indices: [0, 1], removed: 1 }],
        issues: [{ code: 'conflicting_identity', identity: 'P|X|2026-06', indices: [2, 3] }] } }], rejections: [] },
      reconciliation: { rows: [{ metricId: 'external', checkKind: 'independent_comparison', status: 'unavailable', canonicalTotal: null, delta: null, critical: false }] },
    } as never;
    const csv = buildFiergsAuditCsv(report);
    expect(csv).toContain('unidades_lancamento_original;capacidade_derivada;total_cadastral');
    expect(csv).toContain(';127;70;90;false;');
    expect(csv).toContain('duplicata_historica;Cidade;P');
    expect(csv).toContain('P|T|2026-06;0,1');
    expect(csv).toContain('conflicting_identity');
    expect(csv).toContain('independent_comparison');
  });
  it('preserva IDs, cidade, métricas e rejeições em CSV rastreável', () => {
    const report = {
      cube: {
        projects: [{ city: 'Canoas', buildingId: '10', name: 'Edifício; Centro', segment: 'Vertical', horizontalSubtype: null, standard: 'Médio', releaseQuarter: '4T2025', launchedUnits: 120, soldUnits: 20, finalUnits: 100, launchedVgvMillions: 50, averageTicket: 400000, averageArea: 60, averagePricePerMeter: 6667, coverage: 'complete' }],
        rejections: [{ city: 'Guaíba', buildingId: '20', reason: 'segmento_invalido' }],
      },
      notices: [{ code: 'VGV_COVERAGE_PARTIAL', severity: 'warning', indicator: 'VGV', entity: 'fiergs-rs', period: '1T2023–2T2026', affectedPages: [56], affectedOfficialSlides: [61], reason: 'Cobertura parcial', source: 'Cubo GeoBrain', displayDecision: 'Sem imputação' }],
    } as never;
    const csv = buildFiergsAuditCsv(report);
    expect(csv).toContain('Canoas;10;"Edifício; Centro"');
    expect(csv).toContain('rejeicao;Guaíba;20');
    expect(csv).toContain('segmento_invalido');
    expect(csv).toContain('aviso_geracao');
    expect(csv).toContain('VGV_COVERAGE_PARTIAL;warning;56;61;Sem imputação');
  });
});
