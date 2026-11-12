import { describe, expect, it, vi } from 'vitest';
import { fetchMonthlyLaunches } from './monthly-launch-api';
import { monthlySelection } from './__tests__/market-fixture';
import { monthlyLaunchFixture } from './__tests__/monthly-launch-fixture';
import type { FortalezaRequest } from './api';
const selection = { ...monthlySelection, position: 7 };
function transport(mode = 'success') {
  return vi.fn<FortalezaRequest>(async options => {
    const city = String(options.query.city), page = Number(options.query.page);
    const rows = monthlyLaunchFixture([city]).sources[0].rows;
    if (mode === 'missing') rows.splice(0,7);
    const total = rows.length, last = Math.ceil(total / 100);
    const next = page === last ? null : 'https://provider.invalid/next-without-filters';
    return { ok: mode !== 'error', status: mode === 'error' ? 403 : 200, data: { data: rows.slice((page - 1) * 100, page * 100), meta: { current_page: page, total: mode === 'unstable' && page === 2 ? total + 1 : total, last_page: mode === 'limit' ? 4 : last }, links: { next } }, text: null, contentType: 'application/json', latencyMs: 1, bytes: 1, error: null, requestHeaders: {}, requestQuery: {}, requestBody: null, url: '', method: 'GET' };
  });
}
describe('Fortaleza mensal — coleta limitada', () => {
  it('pagina com filtros preservados e valida 25 meses sem seguir URL externa', async () => {
    const request = transport();
    const result = await fetchMonthlyLaunches(selection, ['Fortaleza'], { token: 'synthetic', request });
    expect(result.sources[0].complete).toBe(true); expect(result.sources[0].rows).toHaveLength(175);
    expect(request).toHaveBeenCalledTimes(2);
    for (const [options] of request.mock.calls) {
      expect(options.query).toMatchObject({ city: 'Fortaleza', uf: 'CE', 'type[]': ['Vertical'], start_period: '2024-07-01', end_period: '2026-07-31' });
      expect(options.url).not.toContain('provider.invalid'); expect(options.includeAuth).toBe(false);
    }
  });
  it.each(['missing', 'unstable', 'limit', 'error'])('mantém indisponibilidade sem consolidar linhas com %s', async mode => {
    const result = await fetchMonthlyLaunches(selection, ['Fortaleza'], { token: 'synthetic', request: transport(mode) });
    expect(result.sources[0].complete).toBe(false); expect(result.sources[0].rows).toEqual([]); expect(result.issues).toHaveLength(1);
  });
  it('reutiliza somente janela e cidade correspondentes, e descarta cache com outro mês', async () => {
    const request = transport();
    const first = await fetchMonthlyLaunches(selection, ['Fortaleza'], { token: 'synthetic', request });
    await fetchMonthlyLaunches(selection, ['Fortaleza'], { token: 'synthetic', request }, first);
    expect(request).toHaveBeenCalledTimes(2);
    await fetchMonthlyLaunches({ ...selection, position: 8 }, ['Fortaleza'], { token: 'synthetic', request }, first);
    expect(request).toHaveBeenCalledTimes(4);
  });
  it('cancelamento e escopo inválido não deixam continuar chamadas', async () => {
    const controller = new AbortController(), request = transport(); controller.abort();
    await expect(fetchMonthlyLaunches(selection, ['Fortaleza'], { token: 'synthetic', request, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    await expect(fetchMonthlyLaunches(selection, [], { token: 'synthetic', request })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
