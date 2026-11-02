import { describe, expect, it, vi } from 'vitest';
import { buildSpProjects, fetchSpProjects } from './projects';
import { buildSpTemporalPreview } from './temporal';
import { syntheticWindow } from './__tests__/synthetic-window';
import type { HttpResponse, RequestOptions } from '@/lib/http-client';

const report = (month: '07' | '08' | '09' = '09') => buildSpTemporalPreview(syntheticWindow(month), '3T2026');
const building = (id: number, release_date = '2026-09-01') => ({ building_id: id, city: 'São Paulo', state: 'SP', building_type: 'Vertical', release_date, period: '2026-08-01', status: 'Esgotado', total_units: 100, typologies_history: [{ period: '2026-09-01' }, { period: '2026-09-01' }] });
const reply = (data: unknown[], page = 1, total = data.length, last = 1) => ({ ok: true, status: 200, data: { data, meta: { current_page: page, total, last_page: last } } }) as unknown as HttpResponse<Record<string, unknown>>;

describe('SP — coleta granular adaptada do Panorama', () => {
  it('conta IDs distintos por lançamento, sem multiplicar tipologias/unidades nem limitar pela raiz', () => {
    const rows = [building(1, '2026-07-12'), building(2, '2026-08-31'), building(3), building(3), building(4, '2026-06-30'), building(5, '2026-10-01')];
    expect(buildSpProjects(rows, report())).toMatchObject({ status: 'ready', total: 3, distinct: 5, monthly: [{ month: '2026-07', value: 1 }, { month: '2026-08', value: 1 }, { month: '2026-09', value: 1 }] });
    expect(buildSpProjects(rows, report('08')).total).toBe(2);
    expect(buildSpProjects(rows, report('07')).total).toBe(1);
  });
  it('cobertura completa sem lançamentos no período pode resultar em zero', () => {
    expect(buildSpProjects([building(1, '2026-01-01')], report()).total).toBe(0);
  });
  it.each(['', '2026-02-30', '2026-13-01', 'inválida'])('não infere zero quando data é inválida: %s', date => {
    expect(() => buildSpProjects([building(1, date)], report())).toThrow(/data de lançamento/);
  });
  it('bloqueia conflito de ID e recorte inválido', () => {
    expect(() => buildSpProjects([building(1), building(1, '2026-08-01')], report())).toThrow(/conflitantes/);
    for (const patch of [{ city: 'Campinas' }, { state: 'RJ' }, { building_type: 'Horizontal' }]) expect(() => buildSpProjects([{ ...building(1), ...patch }], report())).toThrow(/fora/);
  });
  it('pagina o cadastro sem histórico nem filtro de status e mantém escopo, cancelamento e no-store', async () => {
    const signal = new AbortController().signal;
    const request = vi.fn(async (options: RequestOptions) => Number(options.query?.page) === 1 ? reply([building(1), building(2)], 1, 3, 2) : reply([building(3)], 2, 3, 2));
    const result = await fetchSpProjects(report(), { request, signal });
    expect(result).toMatchObject({ total: 3, distinct: 3, received: 3 });
    expect(request).toHaveBeenCalledTimes(2);
    for (const [options] of request.mock.calls) {
      expect(options).toMatchObject({ url: 'https://geobrain.com.br/public-api/building', method: 'GET', cache: 'no-store', signal, query: { city: 'São Paulo', uf: 'SP', type: 'Vertical', per_page: 100 } });
      expect(options.query).not.toHaveProperty('status');
    }
  });
  it('busca até três páginas em paralelo e reconcilia mesmo com respostas fora de ordem', async () => {
    let active = 0, maximum = 0;
    const request = vi.fn(async (options: RequestOptions) => {
      const page = Number(options.query?.page);
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, page === 2 ? 20 : 1));
      active--;
      return reply([building(page)], page, 8, 8);
    });
    expect((await fetchSpProjects(report(), { request })).total).toBe(8);
    expect(maximum).toBe(3);
    expect(request).toHaveBeenCalledTimes(8);
  });
  it.each(['missing', 'changed', 'repeated', 'empty'])('recusa cobertura incompleta ou instável: %s', mode => {
    const request = vi.fn(async (options: RequestOptions) => Number(options.query?.page) === 1 ? reply([building(1)], 1, 2, 2) : reply(mode === 'empty' || mode === 'missing' ? [] : [building(mode === 'repeated' ? 1 : 2)], 2, mode === 'changed' ? 3 : 2, 2));
    return expect(fetchSpProjects(report(), { request })).rejects.toThrow();
  });
  it('falha HTTP não vira zero e cancelamento impede novas páginas', async () => {
    await expect(fetchSpProjects(report(), { request: async () => reply([]) })).rejects.toThrow();
    const request = vi.fn(async () => ({ ok: false, status: 403, data: null }) as HttpResponse<Record<string, unknown>>);
    await expect(fetchSpProjects(report(), { request })).rejects.toThrow();
    const controller = new AbortController();
    const abortRequest = vi.fn(async () => { controller.abort(); return reply([building(1)], 1, 2, 2); });
    await expect(fetchSpProjects(report(), { request: abortRequest, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(abortRequest).toHaveBeenCalledTimes(1);
  });
});
