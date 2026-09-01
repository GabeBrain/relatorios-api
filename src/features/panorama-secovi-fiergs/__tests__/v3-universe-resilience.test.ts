import { describe, expect, it } from 'vitest';
import { SECOVI_SP_V3_POLICY } from '../domain/entity-policy';
import { requestWithRetry } from '../lib/request-with-retry';
import { buildCityCube, resolveHistoricalStandard } from '../domain/cube';
import { PanoramaTemporalCircuit } from '../api';

describe('V3 · universo oficial e resiliência', () => {
  it('exige rótulo oficial e nunca deduz condomínio a partir do nome', () => {
    expect(SECOVI_SP_V3_POLICY.classify({ segment: 'Horizontal', rawName: 'Condomínio de Casas Jardins' }).accepted).toBe(false);
    expect(SECOVI_SP_V3_POLICY.classify({ segment: 'Horizontal', rawSubtype: 'Condomínio de Casas e Sobrados' }).accepted).toBe(true);
  });

  it('repete somente falha transitória 500', async () => {
    let calls = 0;
    const transient = await requestWithRetry(async () => ({ ok: ++calls === 3, status: calls === 3 ? 200 : 500 }), { sleep: async () => {}, random: () => 0 });
    expect(transient.ok).toBe(true); expect(calls).toBe(3);
    calls = 0;
    await requestWithRetry(async () => { calls += 1; return { ok: false, status: 422 }; }, { sleep: async () => {}, random: () => 0 });
    expect(calls).toBe(1);
  });

  it('herda apenas padrão socioeconômico anterior e ignora Futuro', () => {
    expect(resolveHistoricalStandard([{ period: '2026-03-01', pattern: 'Produto Casas' }, { period: '2025-01-01', pattern: 'Médio' }, { period: '2026-02-01', pattern: 'Futuro' }])).toEqual({ standard: 'Médio', origin: 'inherited' });
    expect(resolveHistoricalStandard([{ period: '2025-01-01', pattern: 'Produto Casas' }]).origin).toBe('unclassified');
    const cube = buildCityCube([{ building_id: '1', building_type: 'Vertical', release_date: '2025-01-01', typologies_history: [{ period: '2025-01-01', pattern: 'Econômico', qty: 10 }, { period: '2026-03-01', pattern: 'Produto Casas', stock: 4 }] }], { city: 'Jundiaí', uf: 'SP', endQuarter: '1T2026', engineVersion: 'v3' });
    expect(cube.projects[0].standard).toBe('Econômico'); expect(cube.projects[0].standardOrigin).toBe('inherited');
  });

  it('abre circuito somente para IVV por Tipologia', () => {
    const circuit = new PanoramaTemporalCircuit();
    circuit.open('Praia Grande', 500);
    expect(circuit.isOpen('ivv', 'Tipologia')).toBe(true);
    expect(circuit.isOpen('ivv', 'Padrão')).toBe(false);
  });
});
