import { describe, expect, it } from 'vitest';
import { buildFiergsAuditCsv } from '../lib/fiergs-audit';

describe('auditoria FIERGS por empreendimento', () => {
  it('preserva IDs, cidade, métricas e rejeições em CSV rastreável', () => {
    const report = {
      cube: {
        projects: [{ city: 'Canoas', buildingId: '10', name: 'Edifício; Centro', segment: 'Vertical', horizontalSubtype: null, standard: 'Médio', releaseQuarter: '4T2025', launchedUnits: 120, soldUnits: 20, finalUnits: 100, launchedVgvMillions: 50, averageTicket: 400000, averageArea: 60, averagePricePerMeter: 6667, coverage: 'complete' }],
        rejections: [{ city: 'Guaíba', buildingId: '20', reason: 'segmento_invalido' }],
      },
    } as never;
    const csv = buildFiergsAuditCsv(report);
    expect(csv).toContain('Canoas;10;"Edifício; Centro"');
    expect(csv).toContain('rejeicao;Guaíba;20');
    expect(csv).toContain('segmento_invalido');
  });
});
