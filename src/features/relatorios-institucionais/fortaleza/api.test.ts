import { describe, expect, it, vi } from 'vitest';
import { collectFortalezaMarket } from './api';
import { FORTALEZA_CITIES } from './model';
import { fixtureRequest, marketFixture, monthlySelection, response } from './__tests__/market-fixture';
import type { MarketMetric } from './market';

const token = 'synthetic-private-token';
describe('Fortaleza — leitura curta autenticada', () => {
  it('consulta só o recorte e a janela escolhidos, com abertura de estoque, sem histórico granular', async () => {
    const request = vi.fn(fixtureRequest());
    const { report } = await collectFortalezaMarket(monthlySelection, [...FORTALEZA_CITIES], { token, request });
    expect(report.metrics).toEqual({ launches: 10, sales: 14, stock: 146 });
    expect(request).toHaveBeenCalledTimes(4);
    const options = request.mock.calls.map(call => call[0]);
    expect(options.every(value => value.query.city === 'Fortaleza' && value.query.uf === 'CE' && value.headers.Authorization === `Bearer ${token}`)).toBe(true);
    expect(options.find(value => value.url.endsWith('/stock')).query.start_period).toBe('2026-05-01');
    expect(options.find(value => value.url.endsWith('/sales')).query.start_period).toBe('2026-06-01');
    expect(options.filter(value => !value.url.endsWith('/building-with-history')).every(value => value.query.end_period === '2026-06-30')).toBe(true);
    expect(JSON.stringify(report)).not.toContain(token);
  });
  it('não faz requisição sem autenticação ou autorização de todas as cidades', async () => {
    const request = vi.fn(fixtureRequest());
    await expect(collectFortalezaMarket(monthlySelection, ['Fortaleza'], { token: '', request })).rejects.toThrow();
    await expect(collectFortalezaMarket({ ...monthlySelection, territory: 'capital-rm' }, ['Fortaleza'], { token, request })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it('pagina mantendo filtros e rejeita links que tentariam mudar host/escopo', async () => {
    const fallback = fixtureRequest();
    const request = vi.fn(async options => {
      if (options.url.endsWith('/building-with-history')) return fallback(options);
      const metric = options.url.split('/').at(-1) as MarketMetric;
      const data = marketFixture()[metric], page = Number(options.query.page), half = data.length / 2;
      return response({ data: data.slice((page - 1) * half, page * half), meta: { current_page: page, last_page: 2, total: data.length }, links: { next: page === 1 ? 'https://untrusted.invalid/?private=1' : null } });
    });
    const { report } = await collectFortalezaMarket(monthlySelection, ['Fortaleza'], { token, request });
    expect(report.status).toBe('complete');
    expect(request).toHaveBeenCalledTimes(7);
    expect(request.mock.calls.every(([options]) => options.url.startsWith('https://geobrain.com.br/public-api/') && options.query.city === 'Fortaleza')).toBe(true);
  });
  it.each(['too-many-pages', 'changed-total', 'wrong-month', 'bad-meta', 'foreign-sample'])('não publica cobertura com %s', async mode => {
    const fallback = fixtureRequest();
    const request = vi.fn(async options => {
      const payload = await fallback(options);
      if (options.url.endsWith('/building-with-history')) {
        if (mode === 'foreign-sample') payload.data.data[0].city = 'São Paulo';
        return payload;
      }
      if (mode === 'too-many-pages') payload.data.meta.last_page = 3;
      if (mode === 'changed-total') payload.data.meta.total += 1;
      if (mode === 'wrong-month') payload.data.data[0].period = '2026-07-01';
      if (mode === 'bad-meta') delete payload.data.links;
      return payload;
    });
    const { report } = await collectFortalezaMarket(monthlySelection, ['Fortaleza'], { token, request });
    expect(report.metrics).toBeNull();
    expect(report.status).toBe('incomplete');
    expect(request.mock.calls.length).toBeLessThanOrEqual(2);
  });
  it('401 não repete credenciais e não vaza corpo/erro da fonte', async () => {
    const request = vi.fn(async () => ({ ...response({}, 401), text: 'private-provider-body', error: 'private-provider-error' }));
    const { report } = await collectFortalezaMarket(monthlySelection, ['Fortaleza'], { token, request });
    expect(request).toHaveBeenCalledTimes(1);
    expect(report.issues.join(' ')).toContain('acesso');
    expect(JSON.stringify(report)).not.toMatch(/private-provider|synthetic-private/);
  });
  it('429 respeita Retry-After e faz apenas uma tentativa adicional', async () => {
    const fallback = fixtureRequest(), sleep = vi.fn<(ms: number, signal?: AbortSignal) => Promise<void>>().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValueOnce({ ...response({}, 429), retryAfterMs: 800 }).mockImplementation(fallback);
    const { report } = await collectFortalezaMarket(monthlySelection, ['Fortaleza'], { token, request, sleep });
    expect(report.status).toBe('complete');
    expect(request).toHaveBeenCalledTimes(5);
    expect(sleep.mock.calls[0][0]).toBe(800);
  });
  it('retry das cidades faltantes preserva sucessos no mesmo recorte', async () => {
    const selection = { ...monthlySelection, territory: 'capital-rm' as const }, fallback = fixtureRequest(selection);
    let fail = true;
    const request = vi.fn(async options => options.query.city === 'Aquiraz' && options.url.endsWith('/stock') && fail ? response({}, 422) : fallback(options));
    const first = await collectFortalezaMarket(selection, [...FORTALEZA_CITIES], { token, request });
    expect(first.report.metrics).toBeNull();
    expect(first.result.collection.completedCities).toHaveLength(4);
    fail = false;
    const second = await collectFortalezaMarket(selection, [...FORTALEZA_CITIES], { token, request }, first.result);
    expect(second.report.status).toBe('complete');
    expect(second.report.metrics).toEqual({ launches: 50, sales: 70, stock: 730 });
    expect(request.mock.calls.filter(([options]) => options.query.city === 'Fortaleza')).toHaveLength(4);
    expect(request.mock.calls.filter(([options]) => options.query.city === 'Aquiraz')).toHaveLength(8);
  });
  it.each(['monthly','quarterly'] as const)('retry %s consulta novamente fonte recebida mas reprovada na validação',async periodicity=>{
    const selection={...monthlySelection,periodicity,position:periodicity==='monthly'?6:2,territory:'capital-rm' as const},fallback=fixtureRequest(selection);
    let invalid=true;
    const request=vi.fn(async options=>{
      const result=await fallback(options);
      if(invalid&&options.query.city==='Aquiraz'&&options.url.endsWith('/sales'))result.data.data[0].liquid_sales=null;
      return result;
    });
    const first=await collectFortalezaMarket(selection,[...FORTALEZA_CITIES],{token,request});
    expect(first.result.collection.failedCities).toHaveLength(0);expect(first.report.metrics).toBeNull();
    invalid=false;
    const second=await collectFortalezaMarket(selection,[...FORTALEZA_CITIES],{token,request},first.result);
    expect(second.report.status).toBe('complete');
    expect(request.mock.calls.filter(([options])=>options.query.city==='Aquiraz')).toHaveLength(8);
    expect(request.mock.calls.filter(([options])=>options.query.city==='Fortaleza')).toHaveLength(4);
  });
  it('cancelamento interrompe antes das próximas fontes e não retorna resultado parcial', async () => {
    const controller = new AbortController();
    const request = vi.fn(async options => { controller.abort(); return fixtureRequest()(options); });
    await expect(collectFortalezaMarket(monthlySelection, ['Fortaleza'], { token, request, signal: controller.signal })).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
