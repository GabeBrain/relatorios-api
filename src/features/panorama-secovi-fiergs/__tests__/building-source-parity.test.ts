import { beforeEach, describe, expect, it, vi } from 'vitest';

const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));
vi.mock('@/lib/http-client', () => ({ httpRequest }));

import { createRequestGate, fetchPanoramaBuildings, normalizeInternalBuilding, panoramaConcurrencyPolicy } from '../api';

const response = (data: Record<string, unknown>[], ok = true, status = 200) => ({
  ok, status, data: ok ? { data, meta: { last_page: 1 } } : null, error: ok ? null : `HTTP ${status}`,
});

describe('fonte granular do Panorama', () => {
  beforeEach(() => httpRequest.mockReset());

  it('normaliza o sentinel e o tipo de dormitórios da rota interna', () => {
    const normalized = normalizeInternalBuilding({
      building_id: 1,
      typologies_history: [{ number_bedroom: 0 }, { number_bedroom: 2 }, { number_bedroom: null }],
    });
    expect(normalized.typologies_history).toEqual([
      { number_bedroom: null }, { number_bedroom: '2' }, { number_bedroom: null },
    ]);
  });

  it('acelera apenas o FIERGS e preserva a política operacional do Secovi', () => {
    expect(panoramaConcurrencyPolicy('fiergs-rs')).toEqual({ cities: 2, requests: 6 });
    expect(panoramaConcurrencyPolicy('secovi-sp')).toEqual({ cities: 1, requests: 4 });
  });

  it('o limitador global nunca excede o teto configurado', async () => {
    const gate = createRequestGate(3);
    let active = 0; let peak = 0;
    await Promise.all(Array.from({ length: 12 }, (_, index) => gate(async () => {
      active += 1; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return index;
    })));
    expect(peak).toBe(3);
  });

  it('usa a rota interna como padrão e filtra o mesmo universo Ativo/Esgotado', async () => {
    let lane = 0;
    httpRequest.mockImplementation(() => {
      lane += 1;
      return Promise.resolve(response([
        { building_id: `${lane}-ativo`, status: 'Ativo', typologies_history: [{ number_bedroom: 2 }] },
        { building_id: `${lane}-futuro`, status: 'Futuro', typologies_history: [] },
      ]));
    });

    const rows = await fetchPanoramaBuildings({ uf: 'RS', city: 'Porto Alegre', endQuarter: '4T2025' }, undefined, 'v4');

    expect(rows.map((row) => row.building_id)).toEqual(['1-ativo', '2-ativo']);
    expect(httpRequest).toHaveBeenCalledTimes(2);
    expect(httpRequest.mock.calls.every(([request]) => request.url.endsWith('/building-with-history-internal'))).toBe(true);
  });

  it('cai para a pública v2 com retry quando a interna recusa a coleta', async () => {
    let publicLane = 0;
    httpRequest.mockImplementation((request?: { url?: string }) => {
      if (request?.url?.endsWith('/building-with-history-internal')) return Promise.resolve(response([], false, 422));
      publicLane += 1;
      return Promise.resolve(response([{ building_id: `public-${publicLane}`, status: 'Ativo', typologies_history: [] }]));
    });

    const rows = await fetchPanoramaBuildings({ uf: 'RS', city: 'Porto Alegre', endQuarter: '4T2025' }, undefined, 'v4');

    expect(rows).toHaveLength(4);
    expect(httpRequest.mock.calls.some(([request]) => request.url.endsWith('/building-with-history'))).toBe(true);
  });
});
