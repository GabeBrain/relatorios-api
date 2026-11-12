import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMonitoredCitiesCatalog } from './fetch-monitored-cities';

describe('fetchMonitoredCitiesCatalog', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pagina cidades monitoradas e agrupa UFs pela região retornada pela API', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { city: 'Belo Horizonte', state: 'MG', region: 'Sudeste' },
            { city: 'São Paulo', state: 'SP', region: 'Sudeste' },
          ],
          links: { next: 'https://geobrain.com.br/public-api/monitored-cities?page=2' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ city: 'Uberlândia', state: 'MG', region: 'Sudeste' }],
          links: { next: null },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const catalog = await fetchMonitoredCitiesCatalog('token');

    expect(catalog.ufsByRegion).toEqual({ Sudeste: ['MG', 'SP'] });
    expect(catalog.citiesByUf.MG).toEqual(['Belo Horizonte', 'Uberlândia']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
