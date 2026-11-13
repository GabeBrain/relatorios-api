import { describe, expect, it } from 'vitest';
import { montar } from './ajuda.js';

describe('health endpoint on Cloud Run', () => {
  it.each([true, false])('uses the unreserved path and preserves readiness %s', async (ok) => {
    const t = await montar({
      saude: async () => ({ ok, isolamento: { aprovado: ok } }) });
    try {
      for (const url of ['/health', '/healthz']) {
        const response = await t.app.inject({ method: 'GET', url });
        expect(response.statusCode).toBe(ok ? 200 : 503);
        expect(response.json()).toMatchObject({ ok, isolamento: { aprovado: ok } });
      }
    } finally {
      await t.app.close();
    }
  });
});
