import { describe, expect, it, vi } from 'vitest';
import type { RequestOptions } from '@/lib/http-client';
import { fetchSpTemporalInput, fetchSpLaunchHistory, fetchSpHistoryBatch, fetchSpLaunchSeriesRows, fetchSpSalesSeriesRows, type SpReadOptions } from './api';
import { syntheticLaunchSeries, syntheticSalesSeries } from './__tests__/launch-series';
import { buildSpTemporalPreview } from './temporal';
import { userSeptemberReplay } from './__tests__/user-september';
import { syntheticWindow } from './__tests__/synthetic-window';
import { recordedInput } from './__tests__/recorded';
import { syntheticLaunchHistory } from './__tests__/history';
import { syntheticHistoryBatch } from './__tests__/history-batch';

type Response = Awaited<ReturnType<NonNullable<SpReadOptions['request']>>>;
const reply = (data: unknown, status = 200): Response => ({ ok: status === 200, status, data } as Response);
const envelope = (data: unknown[], page = 1, total = data.length, last = 1, next: string | null = null) => ({ data, meta: { current_page: page, total, last_page: last }, links: { next } });
function recordedServer() {
  return vi.fn(async (options: RequestOptions): Promise<Response> => {
    const data = recordedInput();
    if (options.url.endsWith('/building-with-history')) return reply(envelope([{ city: 'São Paulo', state: 'SP', building_type: 'Vertical', period: data.rootPeriod }], 1, 5183, 5183, 'https://geobrain.com.br/public-api/building-with-history?page=2'));
    const name = options.url.split('/').at(-1) as 'sales' | 'releases' | 'stock';
    const first = String(options.query?.start_period), last = String(options.query?.end_period);
    return reply(envelope(data[name].filter(row => String(row.period) >= first && String(row.period) <= last)));
  });
}
const noSleep = async () => {};

describe('SP — transporte curto e paginado, sem provedor real', () => {
  it('delimita o histórico de lançamentos desde 2021 e pagina somente releases até o mês conferido', async () => {
    const rows = syntheticLaunchSeries();
    const request = vi.fn(async (options: RequestOptions) => {
      const page = Number(options.query?.page), last = Math.ceil(rows.length / 100);
      return reply(envelope(rows.slice((page - 1) * 100, page * 100), page, rows.length, last, page < last ? `?page=${page + 1}` : null));
    });
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    expect(await fetchSpLaunchSeriesRows(report, { request })).toEqual(rows);
    expect(request).toHaveBeenCalledTimes(5);
    for (const [options] of request.mock.calls) expect(options).toMatchObject({ url: 'https://geobrain.com.br/public-api/temporal-analysis-city/releases', cache: 'no-store', query: { start_period: '2021-01-01', end_period: '2026-08-31', city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: 'Padrão' } });
  });
  it('delimita o histórico de vendas desde 2021 e pagina somente sales até o mês conferido', async () => {
    const rows = syntheticSalesSeries();
    const request = vi.fn(async (options: RequestOptions) => {
      const page = Number(options.query?.page), last = Math.ceil(rows.length / 100);
      return reply(envelope(rows.slice((page - 1) * 100, page * 100), page, rows.length, last, page < last ? `?page=${page + 1}` : null));
    });
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    expect(await fetchSpSalesSeriesRows(report, { request })).toEqual(rows);
    expect(request).toHaveBeenCalledTimes(5);
    for (const [options] of request.mock.calls) expect(options).toMatchObject({ url: 'https://geobrain.com.br/public-api/temporal-analysis-city/sales', cache: 'no-store', query: { start_period: '2021-01-01', end_period: '2026-08-31', city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: 'Padrão' } });
  });
  it('histórico longo tem teto de seis páginas sem ampliar as consultas curtas', async () => {
    const request = vi.fn(async (options: RequestOptions) => reply(envelope(Array.from({ length: 100 }, () => ({})), Number(options.query?.page), 700, 7, '?next')));
    await expect(fetchSpLaunchSeriesRows(buildSpTemporalPreview(recordedInput(), '3T2026'), { request })).rejects.toThrow('janela paginada');
    expect(request).toHaveBeenCalledTimes(6);
  });
  it('consulta até setembro com raiz em agosto e preserva os números fornecidos pelo usuário', async () => {
    const observed = userSeptemberReplay();
    const request = vi.fn(async (options: RequestOptions): Promise<Response> => {
      if (options.url.endsWith('/building-with-history')) return reply(envelope([{ city: 'São Paulo', state: 'SP', building_type: 'Vertical', period: '2026-08-01' }], 1, 5195, 5195));
      const metric = options.url.split('/').at(-1) as 'sales' | 'releases' | 'stock';
      return reply(envelope(observed[metric].filter(row => String(row.period) >= String(options.query?.start_period) && String(row.period) <= String(options.query?.end_period))));
    });
    const input = await fetchSpTemporalInput('3T2026', { request });
    expect(input.rootPeriod).toBe('2026-08-01');
    const report = buildSpTemporalPreview(input, '3T2026');
    expect(report.status).toBe('quarter-closed');
    expect(report.monthly!.at(-1)).toMatchObject({ launches: 7825, sales: 8912, closingStock: 126307, delta: 22 });
    for (const [options] of request.mock.calls.slice(1)) expect(options.query?.end_period).toBe('2026-09-30');
    expect(request).toHaveBeenCalledTimes(4);
  });
  it('cada geração relê as séries e avança de um para dois e três meses sem cache de parcial', async () => {
    let closing: '07' | '08' | '09' = '07';
    const request = vi.fn(async (options: RequestOptions): Promise<Response> => {
      const input = syntheticWindow(closing);
      if (options.url.endsWith('/building-with-history')) return reply(envelope([{ city: 'São Paulo', state: 'SP', building_type: 'Vertical', period: '2026-08-01' }], 1, 5183, 5183));
      const metric = options.url.split('/').at(-1) as 'sales' | 'releases' | 'stock';
      return reply(envelope(input[metric].filter(row => String(row.period) >= String(options.query?.start_period) && String(row.period) <= String(options.query?.end_period))));
    });
    for (const month of ['07', '08', '09'] as const) {
      closing = month;
      const input = await fetchSpTemporalInput('3T2026', { request });
      const report = buildSpTemporalPreview(input, '3T2026');
      expect(report.status).toBe(month === '09' ? 'quarter-closed' : 'partial');
      expect(report.monthly).toHaveLength(Number(month) - 6);
      expect(request.mock.calls.at(-1)![0].query?.end_period).toBe('2026-09-30');
    }
    expect(request).toHaveBeenCalledTimes(12);
    expect(request.mock.calls.filter(([options]) => options.url.endsWith('/building-with-history'))).toHaveLength(3);
    for (const [options] of request.mock.calls) expect(options.cache).toBe('no-store');
  });
  it('lote usa oito requests curtos, duas janelas iguais e estoque inicial em cada ano', async () => {
    const fixture = syntheticHistoryBatch(), base = recordedServer();
    const request = vi.fn(async (options: RequestOptions) => {
      if (options.url.endsWith('/building-with-history')) return base(options);
      const name = options.url.split('/').at(-1) as 'sales' | 'releases' | 'stock';
      const source = String(options.query?.start_period).startsWith('2025') ? fixture.previous : fixture.current;
      return reply(envelope(source[name].filter(row => String(row.period) >= String(options.query?.start_period) && String(row.period) <= String(options.query?.end_period))));
    });
    const input = await fetchSpHistoryBatch(buildSpTemporalPreview(recordedInput(), '3T2026'), { request });
    expect(request).toHaveBeenCalledTimes(8);
    const series = request.mock.calls.map(([options]) => options).filter(options => !options.url.endsWith('/building-with-history'));
    expect(series).toHaveLength(6);
    for (const options of series) expect(options.query).toMatchObject({ city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: 'Padrão', per_page: 100, page: 1 });
    expect(series.filter(options => options.url.endsWith('/stock')).map(options => [options.query?.start_period, options.query?.end_period])).toEqual([['2026-06-01', '2026-08-31'], ['2025-06-01', '2025-08-31']]);
    expect(series.filter(options => !options.url.endsWith('/stock')).map(options => [options.query?.start_period, options.query?.end_period])).toEqual([['2026-07-01', '2026-08-31'], ['2026-07-01', '2026-08-31'], ['2025-07-01', '2025-08-31'], ['2025-07-01', '2025-08-31']]);
    expect(input.current.rootPeriod).toBe(input.previous?.rootPeriod);
    expect(input.previous?.windowEnd).toBe('2025-08');
  });
  it('lote interrompe a janela anterior quando as séries atuais perdem cobertura e valida limites antes da rede', async () => {
    const base = recordedServer();
    const request = vi.fn(async (options: RequestOptions) => options.url.endsWith('/sales') ? reply(envelope([])) : base(options));
    const result = await fetchSpHistoryBatch(buildSpTemporalPreview(recordedInput(), '3T2026'), { request });
    expect(request).toHaveBeenCalledTimes(4); expect(result.previous).toBeUndefined();
    await expect(fetchSpTemporalInput('3T2026', { request, windowEnd: '2026-12' })).rejects.toThrow('Limite');
    expect(request).toHaveBeenCalledTimes(4);
  });
  it('lote respeita cancelamento antes de buscar a janela do ano anterior', async () => {
    const controller = new AbortController(), base = recordedServer();
    const request = vi.fn(async (options: RequestOptions) => { const result = await base(options); if (options.url.endsWith('/stock')) controller.abort(); return result; });
    await expect(fetchSpHistoryBatch(buildSpTemporalPreview(recordedInput(), '3T2026'), { request, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(request).toHaveBeenCalledTimes(4);
  });
  it('histórico usa só amostra e dois intervalos de lançamentos, sem setembro ou vendas/estoque', async () => {
    const source = syntheticLaunchHistory(), base = recordedServer();
    const request = vi.fn(async (options: RequestOptions) => {
      if (options.url.endsWith('/building-with-history')) return base(options);
      return reply(envelope(String(options.query?.start_period).startsWith('2025') ? source.previous : source.current));
    });
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const result = await fetchSpLaunchHistory(report, { request });
    expect(request).toHaveBeenCalledTimes(3);
    const windows = request.mock.calls.slice(1).map(([options]) => options);
    expect(windows.map(options => [options.query?.start_period, options.query?.end_period])).toEqual([['2026-07-01', '2026-08-31'], ['2025-07-01', '2025-08-31']]);
    for (const options of windows) {
      expect(options.url).toMatch(/\/releases$/);
      expect(options.query).toMatchObject({ city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: 'Padrão', per_page: 100 });
    }
    expect(result.complete).toEqual({ current: true, previous: true });
  });
  it('histórico mantém meses equivalentes mesmo com raiz defasada e exige baseline válido', async () => {
    const request = recordedServer();
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    const input = await fetchSpLaunchHistory(report, { request });
    expect(request).toHaveBeenCalledTimes(3); expect(input.current).toHaveLength(14);
    await expect(fetchSpLaunchHistory({ ...report, source: 'fixture' }, { request })).rejects.toThrow('totais municipais');
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('usa Tipologia somente quando solicitada e preserva limites e recorte', async () => {
    const request = recordedServer();
    const input = await fetchSpTemporalInput('3T2026', { request, groupBy: 'Tipologia' });
    expect(input.groupBy).toBe('Tipologia');
    expect(request).toHaveBeenCalledTimes(4);
    for (const [options] of request.mock.calls.slice(1)) expect(options.query).toMatchObject({ group_by: 'Tipologia', city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], end_period: '2026-09-30', per_page: 100 });
  });
  it('consulta só uma amostra e três fontes municipais até agosto, sem coletar 5183 históricos', async () => {
    const request = recordedServer();
    const data = await fetchSpTemporalInput('3T2026', { request });
    expect(request).toHaveBeenCalledTimes(4);
    expect(request.mock.calls[0][0].query).toMatchObject({ city: 'São Paulo', uf: 'SP', type: 'Vertical', per_page: 1, page: 1 });
    for (const [options] of request.mock.calls.slice(1)) expect(options.query).toMatchObject({ city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: 'Padrão', end_period: '2026-09-30', per_page: 100 });
    expect(request.mock.calls.at(-1)![0].query?.start_period).toBe('2026-06-01');
    expect(buildSpTemporalPreview(data, '3T2026').metrics).toEqual({ projects: null, launches: 24351, sales: 26824, stock: 124706 });
  });
  it('preserva os filtros ao paginar, sem seguir URL arbitrária retornada pela fonte', async () => {
    const base = recordedServer();
    const request = vi.fn(async (options: RequestOptions) => {
      const response = await base(options);
      if (!options.url.endsWith('/sales')) return response;
      const rows = response.data!.data!;
      const page = Number(options.query?.page);
      return reply(envelope(page === 1 ? rows.slice(0, 7) : rows.slice(7), page, rows.length, 2, page === 1 ? 'https://untrusted.invalid/drop-filters' : null));
    });
    await fetchSpTemporalInput('3T2026', { request });
    const sales = request.mock.calls.map(([options]) => options).filter(options => options.url.endsWith('/sales'));
    expect(sales).toHaveLength(2); expect(sales[1].url).toBe(sales[0].url);
    expect(sales[1].query).toEqual({ ...sales[0].query, page: 2 });
  });
  it('limita coleta a duas páginas por fonte e interrompe antes de varredura longa', async () => {
    const base = recordedServer();
    const request = vi.fn(async (options: RequestOptions) => options.url.endsWith('/sales')
      ? reply(envelope([recordedInput().sales[0]], Number(options.query?.page), 300, 3, '?page=3'))
      : base(options));
    await expect(fetchSpTemporalInput('3T2026', { request })).rejects.toThrow('limite curto');
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('não tenta novamente em 403 nem expõe corpo de erro', async () => {
    const request = vi.fn(async () => reply({ private: 'sensitive-detail' }, 403));
    await expect(fetchSpTemporalInput('3T2026', { request, sleep: noSleep })).rejects.toThrow('autenticação');
    expect(request).toHaveBeenCalledOnce();
  });
  it('recupera uma falha transitória com retry limitado', async () => {
    const base = recordedServer(); let failed = false;
    const request = vi.fn(async (options: RequestOptions) => { if (!failed) { failed = true; return reply(null, 503); } return base(options); });
    await fetchSpTemporalInput('3T2026', { request, sleep: noSleep });
    expect(request).toHaveBeenCalledTimes(5);
  });
  it('cancelamento interrompe os próximos endpoints e não entrega fonte parcial', async () => {
    const controller = new AbortController(), base = recordedServer();
    const request = vi.fn(async (options: RequestOptions) => { const response = await base(options); if (options.url.endsWith('/sales')) controller.abort(); return response; });
    await expect(fetchSpTemporalInput('3T2026', { request, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('consulta as séries mesmo se o período da raiz for antigo ou ausente', async () => {
    for (const period of ['2026-06-01', null]) {
      const base = recordedServer();
      const request = vi.fn(async (options: RequestOptions) => options.url.endsWith('/building-with-history') ? reply(envelope([{ period, city: 'São Paulo', state: 'SP', building_type: 'Vertical' }], 1, 5183, 5183)) : base(options));
      const data = await fetchSpTemporalInput('3T2026', { request });
      expect(request).toHaveBeenCalledTimes(4); expect(buildSpTemporalPreview(data, '3T2026').throughMonth).toBe('2026-08');
    }
  });
  it('rejeita amostra de outra cidade, sem iniciar as séries', async () => {
    const request = vi.fn(async () => reply(envelope([{ city: 'Campinas', state: 'SP', building_type: 'Vertical' }])));
    await expect(fetchSpTemporalInput('3T2026', { request })).rejects.toThrow('amostra'); expect(request).toHaveBeenCalledOnce();
  });
  it('rejeita página incompleta ou total que muda no meio da coleta', async () => {
    const base = recordedServer();
    const request = vi.fn(async (options: RequestOptions) => options.url.endsWith('/sales') ? reply(envelope([], 1, 14)) : base(options));
    await expect(fetchSpTemporalInput('3T2026', { request })).rejects.toThrow('página incompleta');
    const changing = vi.fn(async (options: RequestOptions) => options.url.endsWith('/sales')
      ? reply(envelope([recordedInput().sales[0]], Number(options.query?.page), Number(options.query?.page) === 1 ? 14 : 15, 2, Number(options.query?.page) === 1 ? '?page=2' : null)) : base(options));
    await expect(fetchSpTemporalInput('3T2026', { request: changing })).rejects.toThrow('base mudou');
  });
});
