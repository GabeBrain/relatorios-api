import { describe, expect, it } from 'vitest';
import { SECOVI_SP_V3_POLICY } from '../domain/entity-policy';
import { requestWithRetry } from '../lib/request-with-retry';

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
});
