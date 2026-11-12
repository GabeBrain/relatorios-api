import { fortalezaPeriod, type FortalezaSelection } from '../model';
import type { CityMarketInput, MarketMetric } from '../market';
import type { FortalezaEnvelope, FortalezaRequest } from '../api';
import type { HttpResponse, RequestOptions } from '@/lib/http-client';

export const monthlySelection: FortalezaSelection = { uf: 'CE', city: 'Fortaleza', territory: 'city', periodicity: 'monthly', year: 2026, position: 6 };
export function marketFixture(selection = monthlySelection, city = 'Fortaleza'): CityMarketInput {
  const period = fortalezaPeriod(selection);
  const input: CityMarketInput = { city, uf: 'CE', sampleConfirmed: true, sales: [], releases: [], stock: [], complete: { sales: true, releases: true, stock: true }, startedAt: '2026-11-09T12:00:00Z', finishedAt: '2026-11-09T12:00:01Z', requests: 4 };
  const groups = ['Econômico', 'Standard'];
  const row = (month: string, group: string, field: string, value: number) => ({ city, state: 'CE', building_type: 'Vertical', period: `${month}-01`, group, [field]: value });
  let stock = [100, 50];
  input.stock.push(...groups.map((group, index) => row(period.opening, group, 'stock', stock[index])));
  for (const month of period.months) {
    input.releases.push(...groups.map((group, index) => row(month, group, 'releases_in_period', index === 0 ? 10 : 0)));
    input.sales.push(...groups.map((group, index) => row(month, group, 'liquid_sales', index === 0 ? 15 : -1)));
    stock = [stock[0] - 5, stock[1] + 1];
    input.stock.push(...groups.map((group, index) => row(month, group, 'stock', stock[index])));
  }
  return input;
}
export function response(payload: FortalezaEnvelope, status = 200): HttpResponse<FortalezaEnvelope> {
  return { ok: status >= 200 && status < 300, status, data: payload, text: null, contentType: 'application/json', latencyMs: 1, bytes: 1, error: null, requestHeaders: {}, requestQuery: {}, requestBody: null, url: '', method: 'GET' };
}
export function fixtureRequest(selection = monthlySelection): FortalezaRequest {
  return async (options: RequestOptions) => {
    const city = String(options.query.city);
    if (options.url.endsWith('/building-with-history')) return response({ data: [{ city, state: 'CE', building_type: 'Vertical', period: '2026-10-01' }], meta: { current_page: 1, last_page: 1, total: 80 } });
    const metric = options.url.split('/').at(-1) as MarketMetric;
    const data = marketFixture(selection, city)[metric];
    return response({ data, meta: { current_page: 1, last_page: 1, total: data.length }, links: { next: null } });
  };
}
