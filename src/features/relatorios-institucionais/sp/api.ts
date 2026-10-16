import { httpRequest, type HttpResponse, type RequestOptions } from '@/lib/http-client';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { monthOf, type SpPreview } from './model';
import { monthEnd, priorMonth, quarterMonths, type SpTemporalInput, type SpTemporalRow } from './temporal';
import { matchedLaunchMonths, type SpLaunchHistoryInput } from './history';

const BASE = 'https://geobrain.com.br/public-api';
interface Envelope { data?: SpTemporalRow[]; meta?: { current_page?: number; last_page?: number; total?: number }; links?: { next?: string | null } }
type Request = (options: RequestOptions) => Promise<HttpResponse<Envelope>>;
export interface SpReadOptions {
  groupBy?: 'Padrão' | 'Tipologia';
  signal?: AbortSignal;
  onProgress?: (label: string) => void;
  request?: Request;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

function createSpRead(options: SpReadOptions) {
  const request = options.request ?? (requestOptions => httpRequest<Envelope>(requestOptions));
  const checkAbort = () => { if (options.signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError'); };
  return async (path: string, query: Record<string, unknown>) => {
    checkAbort();
    const response = await requestWithRetry(async () => {
      checkAbort();
      const value = await request({ url: `${BASE}/${path}`, query, signal: options.signal, timeoutMs: 20_000 });
      return { ...value, retryAfterMs: Math.min(value.retryAfterMs ?? 0, 3000) || null };
    }, { signal: options.signal, attempts: 2, sleep: options.sleep });
    checkAbort();
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'A autenticação não autorizou esta consulta. Entre novamente.' : 'Não foi possível concluir a consulta curta. Tente novamente.');
    if (!Array.isArray(response.data?.data)) throw new Error('A fonte respondeu fora do contrato esperado.');
    return response.data;
  };
}

async function readSpClosing(read: ReturnType<typeof createSpRead>, options: SpReadOptions) {
  options.onProgress?.('Conferindo o fechamento na amostra da cidade…');
  const sample = await read('building-with-history', { city: 'São Paulo', uf: 'SP', type: 'Vertical', per_page: 1, page: 1 });
  const building = sample.data![0];
  const period = monthOf(building?.period);
  if (sample.data!.length !== 1 || !period || String(building.city) !== 'São Paulo' || String(building.state) !== 'SP' || building.building_type !== 'Vertical' || !Number.isInteger(sample.meta?.total) || sample.meta!.total! < 1) throw new Error('A amostra não comprovou o recorte e o fechamento; nenhuma consulta de mercado foi iniciada.');
  return { rootPeriod: building.period, period, total: sample.meta!.total! };
}

async function readSpSeries(read: ReturnType<typeof createSpRead>, metric: 'sales' | 'releases' | 'stock', query: Record<string, unknown>): Promise<SpTemporalRow[]> {
  const rows: SpTemporalRow[] = [];
  let expectedTotal: number | null = null;
  for (let page = 1; page <= 2; page++) {
    const payload = await read(`temporal-analysis-city/${metric}`, { ...query, per_page: 100, page });
    const meta = payload.meta;
    if (!meta || meta.current_page !== page || !Number.isInteger(meta.total) || meta.total! < 0 || !Number.isInteger(meta.last_page) || meta.last_page! < page || !payload.links || !Object.prototype.hasOwnProperty.call(payload.links, 'next')) throw new Error('A paginação não confirmou a cobertura da consulta.');
    expectedTotal ??= meta.total!;
    if (meta.total !== expectedTotal) throw new Error('A base mudou durante a paginação. Recomece a consulta.');
    rows.push(...payload.data!);
    if (!payload.links.next) {
      if (page !== meta.last_page || rows.length !== meta.total) throw new Error('A fonte retornou uma página incompleta.');
      return rows;
    }
    if (page === meta.last_page || page === 2) throw new Error('A consulta excede o limite curto de duas páginas por fonte. A coleta completa precisa ser delimitada separadamente.');
    // Preserve original filters; never follow a provider URL that can drop scope.
  }
  throw new Error('A consulta curta não foi concluída.');
}

/** One building sample + up to two pages per municipal source. Never collect 5k histories. */
export async function fetchSpTemporalInput(quarter: Quarter, options: SpReadOptions = {}): Promise<SpTemporalInput> {
  const months = quarterMonths(quarter);
  if (!months.length) throw new Error('Trimestre inválido.');
  const read = createSpRead(options);
  const { rootPeriod, period, total } = await readSpClosing(read, options);
  const end = period < months[2] ? period : months[2];
  const result: SpTemporalInput = { origin: 'api', groupBy: options.groupBy ?? 'Padrão', uf: 'SP', city: 'São Paulo', rootPeriod, sampledBuildings: 1, totalBuildings: total, sales: [], releases: [], stock: [], complete: { sales: true, releases: true, stock: true } };
  if (end < months[0]) return result;

  for (const metric of ['sales', 'releases', 'stock'] as const) {
    options.onProgress?.({ sales: 'Consultando vendas dos meses disponíveis…', releases: 'Consultando lançamentos dos meses disponíveis…', stock: 'Consultando estoque e conferindo a paginação…' }[metric]);
    result[metric] = await readSpSeries(read, metric, { city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: options.groupBy ?? 'Padrão', start_period: `${metric === 'stock' ? priorMonth(months[0]) : months[0]}-01`, end_period: monthEnd(end) });
  }
  return result;
}

/** Three requests normally: one closure sample and one bounded releases window per year. */
export async function fetchSpLaunchHistory(report: SpPreview, options: SpReadOptions = {}): Promise<SpLaunchHistoryInput> {
  const months = matchedLaunchMonths(report);
  if (!months || report.patterns?.status !== 'ready') throw new Error('Confira os totais municipais antes do histórico.');
  const read = createSpRead(options);
  const { rootPeriod, period } = await readSpClosing(read, options);
  const result: SpLaunchHistoryInput = { city: 'São Paulo', uf: 'SP', rootPeriod, current: [], previous: [], complete: { current: false, previous: false } };
  if (period !== report.closingMonth) return result;
  for (const source of ['current', 'previous'] as const) {
    options.onProgress?.(source === 'current' ? 'Reconferindo os lançamentos do período atual…' : 'Consultando os mesmos meses do ano anterior…');
    result[source] = await readSpSeries(read, 'releases', { city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: 'Padrão', start_period: `${months[source][0]}-01`, end_period: monthEnd(months[source].at(-1)!) });
    result.complete[source] = true;
  }
  return result;
}
