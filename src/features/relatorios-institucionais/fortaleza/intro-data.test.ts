import { describe, expect, it, vi } from 'vitest';
import { buildIntroProject, fetchFortalezaIntro, introBins, introLaunchLists } from './intro-data';
import { buildIntroView } from './intro-view';
import { monthlySelection } from './__tests__/market-fixture';
import type { HttpResponse, RequestOptions } from '@/lib/http-client';
const selection = { ...monthlySelection, territory: 'capital-rm' as const };
const cities = ['Fortaleza', 'Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú'];
const raw = (city = 'Fortaleza', type = 'Vertical') => ({ building_id: `${city}-${type}`, name: 'Empreendimento sintético', city, state: 'CE', building_type: type, release_date: '2026-06-01', neighborhood: 'Centro', standard: type === 'Horizontal' ? 'Condomínio de Casas' : 'Standard', incorporators: [{ id: 1, name: 'Incorporadora sintética' }] });
const response = (data: Record<string, unknown>[], total = data.length): HttpResponse<Record<string, unknown>> => ({ ok: true, status: 200, data: { data, meta: { current_page: 1, last_page: 1, total } }, text: null, contentType: 'application/json', latencyMs: 1, bytes: 1, error: null, requestHeaders: {}, requestQuery: {}, requestBody: null, url: '', method: 'GET' });
describe('Fortaleza — fontes dos slides iniciais', () => {
  it('cancelamento do cadastro interrompe a sequência sem publicar parcial', async () => {
    const controller = new AbortController();
    const request = vi.fn(async () => { controller.abort(); return response([raw()]); });
    await expect(fetchFortalezaIntro(monthlySelection, ['Fortaleza'], { token: 'synthetic', signal: controller.signal, request })).rejects.toMatchObject({ name: 'AbortError' });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('lê os três segmentos por município e mantém apenas IDs completos', async () => {
    const request = vi.fn(async (options: RequestOptions) => response([raw(String(options.query.city), String(options.query.type))]));
    const data = await fetchFortalezaIntro(selection, cities, { token: 'synthetic', request });
    expect(data.status).toBe('ready'); expect(data.projects).toHaveLength(15); expect(data.requests).toBe(15);
    expect(request.mock.calls.every(([options]) => options.includeAuth === false && options.query.uf === 'CE')).toBe(true);
    expect(introLaunchLists(data, selection).capital).toHaveLength(3);
    expect(introLaunchLists(data, selection).rm).toHaveLength(12);
    expect(buildIntroView(selection, cities, data).sample).toEqual({ projects: null, capital: null, rm: null, companies: null });
  });
  it('horizontal desconhecido bloqueia o gráfico em vez de virar casa por inferência', () => {
    const project = buildIntroProject({ ...raw('Fortaleza', 'Horizontal'), standard: 'Econômico' });
    expect(project.chartEligible).toBeNull();
    expect(introBins({ status: 'ready', projects: [project], requests: 0, issues: [], startedAt: '', finishedAt: '' }, selection)).toBeNull();
    expect(buildIntroProject({ ...raw('Aquiraz', 'Horizontal'), standard: 'Loteamento Fechado' }).chartEligible).toBe(false);
  });
  it('histórico não confunde empreendimentos, unidades ou meses/trimestres', () => {
    const project = buildIntroProject(raw());
    const data = { status: 'ready' as const, projects: [project], requests: 0, issues: [], startedAt: '', finishedAt: '' };
    expect(introBins(data, selection).history).toHaveLength(25);
    const quarter = { ...selection, periodicity: 'quarterly' as const, position: 2 };
    expect(introBins(data, quarter).history).toHaveLength(9);
    expect(introBins(data, quarter).history.at(-1)).toMatchObject({ total: 1, capital: 1, rm: 0 });
    expect(introBins(data, monthlySelection)).toBeNull();
    expect(introBins(data, { ...quarter, year: 2021 }).history).toHaveLength(9);
  });
  it.each(['foreign', 'segment', 'total', 'date', 'limit'])('não libera lista parcial com %s', async mode => {
    const request = vi.fn(async (options: RequestOptions) => {
      const building = raw(String(options.query.city), String(options.query.type));
      if (mode === 'foreign') building.city = 'Recife';
      if (mode === 'segment') building.building_type = 'Hotel';
      if (mode === 'date') building.release_date = '';
      const value = response([building], mode === 'total' ? 2 : 1);
      if (mode === 'limit') (value.data.meta as Record<string, unknown>).last_page = 6;
      return value;
    });
    const data = await fetchFortalezaIntro(monthlySelection, ['Fortaleza'], { token: 'synthetic', request });
    expect(data.status).toBe('blocked'); expect(data.projects).toHaveLength(0);
  });
  it('falha sanitizada e ausência de acesso não exibem valores da referência', async () => {
    const request = vi.fn(async () => { throw new Error('private-token https://private.invalid'); });
    const failed = await fetchFortalezaIntro(monthlySelection, ['Fortaleza'], { token: 'synthetic', request });
    expect(JSON.stringify(failed)).not.toMatch(/private-token|private.invalid/);
    expect(failed.status).toBe('blocked');
    request.mockClear();
    await fetchFortalezaIntro(selection, ['Fortaleza'], { token: 'synthetic', request });
    expect(request).not.toHaveBeenCalled();
  });
});
