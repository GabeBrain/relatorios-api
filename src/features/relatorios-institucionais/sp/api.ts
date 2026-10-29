import { httpRequest, type HttpResponse, type RequestOptions } from '@/lib/http-client';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { isSpMunicipalPreview, type SpPreview } from './model';
import { buildSpTemporalPreview, monthEnd, priorMonth, quarterMonths, type SpTemporalInput, type SpTemporalRow } from './temporal';
import { matchedLaunchMonths, type SpLaunchHistoryInput } from './history';
import { priorYearQuarter, type SpHistoryBatchInput } from './history-batch';

const BASE = 'https://geobrain.com.br/public-api';
interface Envelope { data?: SpTemporalRow[]; meta?: { current_page?: number; last_page?: number; total?: number }; links?: { next?: string | null } }
type Request = (options: RequestOptions) => Promise<HttpResponse<Envelope>>;
export interface SpReadOptions {
  windowEnd?: string;
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
      const value = await request({ url: `${BASE}/${path}`, query, signal: options.signal, timeoutMs: 20_000, cache: 'no-store' });
      return { ...value, retryAfterMs: Math.min(value.retryAfterMs ?? 0, 3000) || null };
    }, { signal: options.signal, attempts: 2, sleep: options.sleep });
    checkAbort();
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'A autenticação não autorizou esta consulta. Entre novamente.' : 'Não foi possível concluir a consulta curta. Tente novamente.');
    if (!Array.isArray(response.data?.data)) throw new Error('A fonte respondeu fora do contrato esperado.');
    return response.data;
  };
}

async function readSpSample(read: ReturnType<typeof createSpRead>, options: SpReadOptions) {
  options.onProgress?.('Conferindo uma amostra da cidade…');
  const sample = await read('building-with-history', { city: 'São Paulo', uf: 'SP', type: 'Vertical', per_page: 1, page: 1 });
  const building = sample.data![0];
  if (sample.data!.length !== 1 || String(building.city) !== 'São Paulo' || String(building.state) !== 'SP' || building.building_type !== 'Vertical' || !Number.isInteger(sample.meta?.total) || sample.meta!.total! < 1) throw new Error('A amostra não comprovou o recorte; nenhuma consulta de mercado foi iniciada.');
  return { rootPeriod: building.period, total: sample.meta!.total! };
}

async function readSpSeries(read: ReturnType<typeof createSpRead>, metric: 'sales' | 'releases' | 'stock', query: Record<string, unknown>, maxPages = 2, onPage?: (page: number) => void): Promise<SpTemporalRow[]> {
  const rows: SpTemporalRow[] = [];
  let expectedTotal: number | null = null;
  let expectedLast: number | null = null;
  for (let page = 1; page <= maxPages; page++) {
    onPage?.(page);
    const payload = await read(`temporal-analysis-city/${metric}`, { ...query, per_page: 100, page });
    const meta = payload.meta;
    if (!meta || meta.current_page !== page || !Number.isInteger(meta.total) || meta.total! < 0 || !Number.isInteger(meta.last_page) || meta.last_page! < page || !payload.links || !Object.prototype.hasOwnProperty.call(payload.links, 'next')) throw new Error('A paginação não confirmou a cobertura da consulta.');
    expectedTotal ??= meta.total!;
    expectedLast ??= meta.last_page!;
    if (meta.total !== expectedTotal || meta.last_page !== expectedLast) throw new Error('A base mudou durante a paginação. Recomece a consulta.');
    rows.push(...payload.data!);
    if (!payload.links.next) {
      if (page !== meta.last_page || rows.length !== meta.total) throw new Error('A fonte retornou uma página incompleta.');
      return rows;
    }
    if (page === meta.last_page || page === maxPages) throw new Error(maxPages === 2 ? 'A consulta excede o limite curto de duas páginas por fonte. A coleta completa precisa ser delimitada separadamente.' : 'A série histórica excedeu a janela paginada permitida.');
    // Preserve original filters; never follow a provider URL that can drop scope.
  }
  throw new Error('A consulta curta não foi concluída.');
}

/** One bounded municipal releases series; no building histories or other metrics. */
export async function fetchSpLaunchSeriesRows(report: SpPreview, options: SpReadOptions = {}): Promise<SpTemporalRow[]> {
  return fetchSpFlowSeriesRows(report, 'releases', options);
}
export async function fetchSpSalesSeriesRows(report: SpPreview, options: SpReadOptions = {}): Promise<SpTemporalRow[]> {
  return fetchSpFlowSeriesRows(report, 'sales', options);
}
async function fetchSpFlowSeriesRows(report: SpPreview, metric: 'releases' | 'sales', options: SpReadOptions): Promise<SpTemporalRow[]> {
  if (!isSpMunicipalPreview(report) || !report.throughMonth) throw new Error('Confira os meses municipais antes das séries históricas.');
  options.onProgress?.(metric === 'releases' ? 'Consultando o histórico de unidades lançadas…' : 'Consultando o histórico de vendas líquidas…');
  return readSpSeries(createSpRead(options), metric, { city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: 'Padrão', start_period: '2021-01-01', end_period: monthEnd(report.throughMonth) }, 6, page => options.onProgress?.(`Conferindo ${metric === 'releases' ? 'lançamentos' : 'vendas'}: página ${page}…`));
}

/** One contextual building sample + up to two pages per municipal source through the requested window. The sample period never limits municipal availability. */
export async function fetchSpTemporalInput(quarter: Quarter, options: SpReadOptions = {}): Promise<SpTemporalInput> {
  const months = quarterMonths(quarter);
  if (!months.length) throw new Error('Trimestre inválido.');
  if (options.windowEnd !== undefined && !months.includes(options.windowEnd)) throw new Error('Limite da janela inválido.');
  const read = createSpRead(options);
  const { rootPeriod, total } = await readSpSample(read, options);
  const requestedEnd = options.windowEnd ?? months[2];
  const end = requestedEnd;
  const result: SpTemporalInput = { origin: 'api', windowEnd: options.windowEnd, groupBy: options.groupBy ?? 'Padrão', uf: 'SP', city: 'São Paulo', rootPeriod, sampledBuildings: 1, totalBuildings: total, sales: [], releases: [], stock: [], complete: { sales: true, releases: true, stock: true } };

  for (const metric of ['sales', 'releases', 'stock'] as const) {
    options.onProgress?.({ sales: 'Consultando vendas dos meses disponíveis…', releases: 'Consultando lançamentos dos meses disponíveis…', stock: 'Consultando estoque e conferindo a paginação…' }[metric]);
    result[metric] = await readSpSeries(read, metric, { city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: options.groupBy ?? 'Padrão', start_period: `${metric === 'stock' ? priorMonth(months[0]) : months[0]}-01`, end_period: monthEnd(end) });
  }
  return result;
}

/** Three requests normally: one contextual sample and one bounded releases window per year. */
export async function fetchSpLaunchHistory(report: SpPreview, options: SpReadOptions = {}): Promise<SpLaunchHistoryInput> {
  const months = matchedLaunchMonths(report);
  if (!months || report.patterns?.status !== 'ready') throw new Error('Confira os totais municipais antes do histórico.');
  const read = createSpRead(options);
  const { rootPeriod } = await readSpSample(read, options);
  const result: SpLaunchHistoryInput = { city: 'São Paulo', uf: 'SP', rootPeriod, current: [], previous: [], complete: { current: false, previous: false } };
  for (const source of ['current', 'previous'] as const) {
    options.onProgress?.(source === 'current' ? 'Reconferindo os lançamentos do período atual…' : 'Consultando os mesmos meses do ano anterior…');
    result[source] = await readSpSeries(read, 'releases', { city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: 'Padrão', start_period: `${months[source][0]}-01`, end_period: monthEnd(months[source].at(-1)!) });
    result.complete[source] = true;
  }
  return result;
}

/** Two short windows, each with one contextual sample and three bounded municipal series. */
export async function fetchSpHistoryBatch(report: SpPreview, options: SpReadOptions = {}): Promise<SpHistoryBatchInput> {
  const months = matchedLaunchMonths(report);
  if (!months || report.patterns?.status !== 'ready') throw new Error('Confira os totais municipais antes dos históricos.');
  const readOptions = { ...options, groupBy: 'Padrão' as const };
  const current = await fetchSpTemporalInput(report.quarter, { ...readOptions, windowEnd: months.current.at(-1)! });
  if (buildSpTemporalPreview(current, report.quarter).throughMonth !== report.throughMonth) return { current };
  const previous = await fetchSpTemporalInput(priorYearQuarter(report.quarter), { ...readOptions, windowEnd: months.previous.at(-1)! });
  return { current, previous };
}
