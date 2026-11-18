import { describe, expect, it } from 'vitest';
import { auditMaceioSource } from './source-audit';
import type { SlideSource } from './market-slides-data';
import { buildMaceioDiagnostic } from './diagnostic';
describe('evidência agregada de bloqueios das fontes', () => {
  it('expõe os rótulos reais de tipo, padrão e produto sem exportar cadastros individuais', () => {
    const source: SlideSource = { city: 'Maceió', metric: 'details', group: 'Empreendimento', complete: true, issue: null, requests: 1, rows: [{
      building_id: 'private-project', name: 'private-name', address: 'private-address', standard: 'Categoria recebida', work: 'Produto recebido', release_date: '2026-04-01',
      typologies: [{ id: 'private-typology', type_of_typology: 'Tipo recebido' }],
      typologies_history: [{ typology_id: 'private-typology', period: '2026-05-01', type_of_typology: 'Tipo recebido', qty: 10, typology_stock: 3, sold_in_period: -1, price: null, private_area: 50 }],
    }] };
    const audit = auditMaceioSource(source, ['2026-04', '2026-05']);
    expect(audit.historyTypologyKinds).toEqual([{ value: 'Tipo recebido', count: 1 }]);
    expect(audit.productLabels?.work).toEqual([{ value: 'Produto recebido', count: 1 }]);
    expect(audit.coverage.missingMonths).toEqual(['2026-04']);
    expect(audit.monthly[0].stock.value).toBeNull();
    expect(audit.monthly[1].stock.value).toBe(3);
    expect(audit.monthly[1].sales.value).toBe(-1);
    expect(audit.monthly[1].missingPrice).toBe(1);
    expect(JSON.stringify(audit)).not.toMatch(/private-|building_id|typology_id|address/);
  });
  it('distingue fonte vazia, grupo ausente e observação explícita de zero', () => {
    const source: SlideSource = { city: 'Pilar', metric: 'stock', group: 'Padrão', complete: true, issue: null, requests: 1, rows: [] };
    expect(auditMaceioSource(source, ['2026-05']).monthly[0].stock.value).toBeNull();
    source.rows = [{ period: '2026-05-01', group: null, stock: 0 }];
    const audit = auditMaceioSource(source, ['2026-05']);
    expect(audit.monthly[0].stock.value).toBe(0);
    expect(audit.observedGroups).toEqual([{ value: '(não informado)', count: 1 }]);
  });
  it('separa transporte completo vazio de bloqueio de validação', () => {
    const source: SlideSource = { city: 'Pilar', metric: 'stock', group: 'Padrão', complete: true, issue: null, requests: 1, rows: [] };
    const diagnostic = buildMaceioDiagnostic({ uf: 'AL', city: 'Maceió', territory: 'capital-rm', periodicity: 'monthly', year: 2026, position: 5 }, {
      phase: 'done', startedAt: 0, report: null, blueprint: null, intro: { cities: [], collectedAt: '', slides: { sources: [source], start: '2021-01', end: '2026-05', finishedAt: '' } },
    });
    expect(diagnostic.collection.vertical).toEqual({ requested: 1, completed: 1, failed: 0, emptyCompleted: 1 });
    expect(diagnostic.summary['source-pending']).toBeGreaterThan(0);
    expect(diagnostic.auditVersion).toBe('maceio-source-audit-v1');
  });
});
