import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBuildings } from './api';

const response = (data: unknown[], lastPage = 1) => ({
  ok: true,
  json: async () => ({ data, meta: { last_page: lastPage } }),
});

describe('Relatorio API Excel - contrato copiado do Dashboard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('consulta cidades e tipos em sequência, pagina em blocos de cinco e preserva registros repetidos', async () => {
    const requests: URL[] = [];
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input);
      requests.push(url);
      const city = url.searchParams.get('city');
      const type = url.searchParams.get('type');
      const page = Number(url.searchParams.get('page'));
      const lastPage = city === 'Cidade A' && type === 'Comercial' && page === 1 ? 7 : 1;
      const buildingId = city === 'Cidade A' && type === 'Comercial' && (page === 1 || page === 2)
        ? 'repetido'
        : `${city}-${type}-${page}`;
      return response([{ building_id: buildingId, typologies_history: [] }], lastPage);
    });
    vi.stubGlobal('fetch', fetchMock);

    const buildings = await fetchBuildings({
      uf: 'SP', city: ['Cidade A', 'Cidade B'], token: 'token', signal: new AbortController().signal,
    });

    expect(buildings).toHaveLength(14);
    expect(buildings.filter((building) => building.building_id === 'repetido')).toHaveLength(2);
    expect(requests.map((url) => url.pathname)).toEqual(
      Array.from({ length: 14 }, () => '/public-api/v2/building-with-history-internal'),
    );
    expect(requests[0].searchParams.get('city')).toBe('Cidade A');
    expect(requests[0].searchParams.get('type')).toBe('Comercial');
    expect(requests[0].searchParams.get('page')).toBe('1');
    expect(requests.slice(1, 6).map((url) => url.searchParams.get('page'))).toEqual(['2', '3', '4', '5', '6']);
    expect(requests[6].searchParams.get('page')).toBe('7');
    expect(requests.filter((url) => url.searchParams.get('city') === 'Cidade A' && url.searchParams.get('page') === '1')
      .map((url) => url.searchParams.get('type'))).toEqual(['Comercial', 'Horizontal', 'Vertical', 'Hotel']);
    expect(requests.every((url) => url.searchParams.get('per_page') === '100')).toBe(true);
    expect(requests.every((url) => !url.searchParams.has('uf'))).toBe(true);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    });
  });

  it('consulta cada UF sequencialmente sem enviar city quando o escopo é uma região ou UF', async () => {
    const requests: URL[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      requests.push(url);
      return response([{ building_id: `${url.searchParams.get('uf')}-${url.searchParams.get('type')}`, typologies_history: [] }]);
    }));

    await fetchBuildings({
      ufs: ['MG', 'SP'], token: 'token', signal: new AbortController().signal,
    });

    expect(requests).toHaveLength(8);
    expect(requests.slice(0, 4).every((url) => url.searchParams.get('uf') === 'MG')).toBe(true);
    expect(requests.slice(4).every((url) => url.searchParams.get('uf') === 'SP')).toBe(true);
    expect(requests.every((url) => !url.searchParams.has('city'))).toBe(true);
  });

  it('não libera dados quando uma página posterior falha e não envia filtros de relatório', async () => {
    const requests: URL[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input); requests.push(url);
      if (url.searchParams.get('page') === '3') return { ok: false, status: 503 };
      return response([{ building_id: 1 }], 3);
    }));
    await expect(fetchBuildings({ uf: 'MT', token: 'token', signal: new AbortController().signal })).rejects.toThrow('503');
    expect(requests).toHaveLength(3);
    expect([...requests[0].searchParams.keys()].sort()).toEqual(['page', 'per_page', 'type', 'uf']);
  });

  it('espera a última resposta antes de resolver a coleta', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    let complete = false;
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      if (new URL(input).searchParams.get('type') === 'Hotel') await pending;
      return response([{ building_id: 1 }]);
    }));
    const result = fetchBuildings({ uf: 'MT', token: 'token', signal: new AbortController().signal }).then((data) => { complete = true; return data; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(complete).toBe(false);
    finish();
    expect(await result).toHaveLength(4);
  });

  it('não resolve uma coleta cancelada nem aceita lista de dados inválida', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(fetchBuildings({ uf: 'MT', token: 'token', signal: controller.signal })).rejects.toThrow('cancelada');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: {} }) })));
    await expect(fetchBuildings({ uf: 'MT', token: 'token', signal: new AbortController().signal })).rejects.toThrow('sem lista');
  });
});
