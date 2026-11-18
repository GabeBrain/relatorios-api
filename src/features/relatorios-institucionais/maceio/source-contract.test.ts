import { describe, expect, it, vi } from 'vitest';
import { checkMaceioNext, scopeMaceioRow, MACEIO_HISTORY_URL } from './source-contract';
import { collectMaceioIntro } from './intro-data';
import { collectMaceioMarketSlides, buildMaceioMarketSlide } from './market-slides-data';
import { remainingFixture } from './__tests__/remaining-fixture';
import type { MaceioRequest } from './api';
import type { MaceioSelection } from './model';
import { maceioMonetaryPolicy } from './criteria';

const selection: MaceioSelection = { uf: 'AL', city: 'Maceió', territory: 'city', periodicity: 'monthly', year: 2026, position: 5 };
const response = (data: unknown, status = 200) => ({ ok: status === 200, status, data }) as Awaited<ReturnType<MaceioRequest>>;
describe('contratos reais das fontes Maceió', () => {
  it('aceita recurso temporal sem cidade/UF, preservando métrica e período e rejeitando identidade contraditória', () => {
    const row = { period: '2026-05', building_type: 'Vertical', group: 'Luxo', liquid_sales: -2 };
    expect(scopeMaceioRow(row, 'Maceió', 'Vertical', true)).toEqual({ ...row, city: 'Maceió', state: 'AL', period: '2026-05-01' });
    expect(row).not.toHaveProperty('city');
    for (const extra of [{ city: 'Recife' }, { state: 'PE' }, { uf: 'PE' }, { building_type: 'Horizontal' }, { period: '2026-13' }]) {
      expect(() => scopeMaceioRow({ ...row, ...extra }, 'Maceió', 'Vertical', true)).toThrow();
    }
    expect(() => scopeMaceioRow(row, 'Maceió', 'Vertical', false)).toThrow();
  });
  it('aceita cursor sem repetir filtros e bloqueia troca de escopo/host/página e término prematuro', () => {
    const url = 'https://geobrain.com.br/public-api/building';
    const query = { city: 'Maceió', uf: 'AL', type: 'Vertical', page: 1, per_page: 100 };
    expect(() => checkMaceioNext('?page=2', url, query, 1, 2)).not.toThrow();
    for (const link of ['https://foreign.invalid/?page=2', '?page=2&city=Recife', '?page=2&type=Horizontal', '?page=3', null, '']) {
      expect(() => checkMaceioNext(link, url, query, 1, 2)).toThrow();
    }
    expect(() => checkMaceioNext('?page=3', url, query, 2, 2)).toThrow();
  });
  it('coleta catálogo paginado sem city no link e histórico municipal sem identidade na linha', async () => {
    const request = vi.fn<MaceioRequest>(async options => {
      const units = options.url.includes('temporal-analysis-city');
      const page = Number(options.query?.page);
      return response({ data: units ? [{ period: '2026-05', building_type: 'Vertical', group: 'Luxo', releases_in_period: 2 }] : [{ city: 'Maceió', state: 'AL', building_type: 'Vertical', building_id: String(page), release_date: '2026-05-01', standard: 'Luxo' }],
        meta: { current_page: page, total: units ? 1 : 2, last_page: units ? 1 : 2 }, links: { next: !units && page === 1 ? '?page=2' : null } });
    });
    const data = await collectMaceioIntro(selection, ['Maceió'], { token: 'private-test', request });
    expect(data.cities[0].unitsComplete).toBe(true);
    expect(data.cities[0].buildingsComplete).toBe(true);
    expect(data.cities[0].buildings).toHaveLength(2);
    expect(request.mock.calls.every(([options]) => options.query?.city === 'Maceió' && options.query?.uf === 'AL')).toBe(true);
    expect(JSON.stringify(data)).not.toContain('private-test');
  });
  it('usa POST v2 no detalhe e normaliza recursos municipais antes dos cálculos', async () => {
    const fixture = remainingFixture(selection);
    const request = vi.fn<MaceioRequest>(async options => {
      const detailed = options.url === MACEIO_HISTORY_URL;
      if (detailed && options.method !== 'POST') return response(null, 405);
      const metric = detailed ? 'details' : options.url.split('/').at(-1);
      const source = fixture.sources.find(s => s.city === 'Maceió' && s.metric === metric && s.group === (detailed ? 'Empreendimento' : options.query?.group_by))!;
      const page = Number(options.query?.page), last = Math.max(1, Math.ceil(source.rows.length / 100));
      const rows = source.rows.slice((page - 1) * 100, page * 100).map(row => {
        if (detailed) return row;
        const { city: _city, state: _state, ...fields } = row;
        return fields;
      });
      return response({ data: rows, meta: { ...(detailed ? {} : { current_page: page }), total: source.rows.length, last_page: last }, links: { next: page === last ? null : `?page=${page + 1}` } });
    });
    const data = await collectMaceioMarketSlides(selection, ['Maceió'], { cities: [], collectedAt: '' }, { token: 'private-test', request });
    expect(data.sources.every(source => source.complete)).toBe(true);
    expect(request.mock.calls.some(([options]) => options.url === MACEIO_HISTORY_URL && options.method === 'POST')).toBe(true);
    for (const [options] of request.mock.calls.filter(([options]) => options.url === MACEIO_HISTORY_URL)) {
      expect(options.query).not.toHaveProperty('start_period');
      expect(options.query).not.toHaveProperty('end_period');
    }
    expect(buildMaceioMarketSlide(26, selection, data, maceioMonetaryPolicy(selection)).issue).toBeNull();
    expect(maceioMonetaryPolicy(selection)).toBe('INCC-DI');
    expect(maceioMonetaryPolicy({ ...selection, periodicity: 'quarterly', position: 2 })).toBe('INCC-DI');
  });
  it('registra erro HTTP sanitizado no diagnóstico sem transformar falha em zero', async () => {
    const request: MaceioRequest = async () => ({ ...response({ message: 'private-provider' }, 403), text: 'private-provider' });
    const data = await collectMaceioMarketSlides(selection, ['Maceió'], { cities: [], collectedAt: '' }, { token: 'private-token', request });
    expect(data.sources.every(source => !source.complete && source.rows.length === 0 && source.failure?.httpStatus === 403)).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(/private-/);
  });
});
