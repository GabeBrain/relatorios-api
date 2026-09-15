import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBuildings } from './api';

const response = (data: unknown[], lastPage = 1) => ({
  ok: true,
  json: async () => ({ data, meta: { last_page: lastPage } }),
});

describe('fetchBuildings', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('consulta cidades e tipos em sequência, pagina em blocos de cinco e preserva registros repetidos', async () => {
    const requests: URL[] = [];
    const fetchMock = vi.fn(async (input: string) => {
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

    expect(buildings).toHaveLength(12);
    expect(buildings.filter((building) => building.building_id === 'repetido')).toHaveLength(2);
    expect(requests.map((url) => url.pathname)).toEqual(
      Array.from({ length: 12 }, () => '/public-api/v2/building-with-history-internal'),
    );
    expect(requests[0].searchParams.get('city')).toBe('Cidade A');
    expect(requests[0].searchParams.get('type')).toBe('Comercial');
    expect(requests[0].searchParams.get('page')).toBe('1');
    expect(requests.slice(1, 6).map((url) => url.searchParams.get('page'))).toEqual(['2', '3', '4', '5', '6']);
    expect(requests[6].searchParams.get('page')).toBe('7');
    expect(requests.every((url) => url.searchParams.get('per_page') === '100')).toBe(true);
    expect(requests.every((url) => !url.searchParams.has('uf'))).toBe(true);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    });
  });
});
