import { httpRequest, type HttpResponse, type RequestOptions } from '@/lib/http-client';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { isSpMunicipalPreview, type SpPreview } from './model';
import { buildSpTemporalPreview, monthEnd, priorMonth, quarterMonths, type SpTemporalInput, type SpTemporalRow } from './temporal';
import { matchedLaunchMonths, type SpLaunchHistoryInput } from './history';
import { priorYearQuarter, type SpHistoryBatchInput } from './history-batch';

import { spHistoryWindows } from './periods';
import { SpReadError } from './read-errors';
import type { SpWorkProgress } from './work-progress';
import { buildSpMunicipalPrices, spPricePeriods, type SpPriceSource, type SpPriceMetric, type SpPriceGrouping } from './municipal-prices';

const BASE = 'https://geobrain.com.br/public-api';
interface Envelope { data?: SpTemporalRow[]; meta?: { current_page?: number; last_page?: number; total?: number }; links?: { next?: string | null } }
type Request = (options: RequestOptions) => Promise<HttpResponse<Envelope>>;
export interface SpReadOptions {
  windowEnd?: string;
  groupBy?: 'Padrão' | 'Tipologia';
  signal?: AbortSignal;
  onProgress?: (label: string) => void;
  onWorkProgress?: (progress:SpWorkProgress) => void;
  request?: Request;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

function createSpRead(options: SpReadOptions, timeoutMs = 20_000) {
  const request = options.request ?? (requestOptions => httpRequest<Envelope>(requestOptions));
  const checkAbort = () => { if (options.signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError'); };
  return async (path: string, query: Record<string, unknown>) => {
    checkAbort();
    const response = await requestWithRetry(async () => {
      checkAbort();
      const value = await request({ url: `${BASE}/${path}`, query, signal: options.signal, timeoutMs, cache: 'no-store' });
      if(value.status===429)options.onProgress?.('A API solicitou uma pausa. Aguardando nova tentativa; você pode cancelar.');
      return value;
    }, { signal: options.signal, attempts: 2, sleep: options.sleep });
    checkAbort();
    if (!response.ok) {
      if(response.status===401||response.status===403)throw new SpReadError('A autenticação não autorizou esta consulta. Entre novamente.','authorization');
      if(response.status===429)throw new SpReadError('A API limitou temporariamente as consultas (HTTP 429). Aguarde e tente novamente.','rate-limit');
      if(response.status===408||response.status===504)throw new SpReadError('A API excedeu o tempo de resposta desta janela. Tente conferir a série novamente.','timeout');
      if(response.status===null)throw new SpReadError('A conexão com a API não foi concluída ou excedeu o tempo de espera. Tente novamente.','network');
      throw new SpReadError(`A API não concluiu a consulta (HTTP ${response.status}). Tente novamente.`,'http');
    }
    if (!Array.isArray(response.data?.data)) throw new SpReadError('A fonte respondeu fora do contrato esperado.');
    return response.data;
  };
}

async function readSpSample(read: ReturnType<typeof createSpRead>, options: SpReadOptions) {
  options.onProgress?.('Conferindo uma amostra da cidade…');
  const sample = await read('building-with-history', { city: 'São Paulo', uf: 'SP', type: 'Vertical', per_page: 1, page: 1 });
  const building = sample.data![0];
  if (sample.data!.length !== 1 || String(building.city) !== 'São Paulo' || String(building.state) !== 'SP' || building.building_type !== 'Vertical' || !Number.isInteger(sample.meta?.total) || sample.meta!.total! < 1) throw new SpReadError('A amostra não comprovou o recorte; nenhuma consulta de mercado foi iniciada.');
  return { rootPeriod: building.period, total: sample.meta!.total! };
}

async function readSpSeries(read: ReturnType<typeof createSpRead>, metric: 'sales' | 'releases' | 'stock' | SpPriceMetric, query: Record<string, unknown>, maxPages = 2, onPage?: (page: number) => void, maxRows?:number): Promise<SpTemporalRow[]> {
  const rows: SpTemporalRow[] = [];
  let expectedTotal: number | null = null;
  let expectedLast: number | null = null;
  for (let page = 1; page <= maxPages; page++) {
    onPage?.(page);
    const payload = await read(`temporal-analysis-city/${metric}`, { ...query, per_page: 100, page });
    const meta = payload.meta;
    if (!meta || meta.current_page !== page || !Number.isInteger(meta.total) || meta.total! < 0 || !Number.isInteger(meta.last_page) || meta.last_page! < page || !payload.links || !Object.prototype.hasOwnProperty.call(payload.links, 'next')) throw new SpReadError('A paginação não confirmou a cobertura da consulta.');
    if(maxRows!==undefined&&meta.total!>maxRows)throw new SpReadError('A fonte retornou mais registros do que os meses e padrões desta janela permitem. Confira os filtros da API.');
    if(meta.total!>0&&!payload.data!.length)throw new SpReadError('A fonte retornou uma página incompleta: vazia antes de concluir a cobertura.');
    expectedTotal ??= meta.total!;
    expectedLast ??= meta.last_page!;
    if (meta.total !== expectedTotal || meta.last_page !== expectedLast) throw new SpReadError('A base mudou durante a paginação. Recomece a consulta.');
    rows.push(...payload.data!);
    if (!payload.links.next) {
      if (page !== meta.last_page || rows.length !== meta.total) throw new SpReadError('A fonte retornou uma página incompleta.');
      return rows;
    }
    if (page === meta.last_page || page === maxPages) throw new SpReadError(maxPages === 2 ? 'A consulta excede o limite curto de duas páginas por fonte. A coleta completa precisa ser delimitada separadamente.' : 'A série histórica excedeu a janela paginada permitida.');
    // Preserve original filters; never follow a provider URL that can drop scope.
  }
  throw new SpReadError('A consulta curta não foi concluída.');
}

/** Native prices are independent observations, not aggregates of pattern means. */
export async function fetchSpMunicipalPrices(report: SpPreview, options: SpReadOptions = {}) {
  if (!isSpMunicipalPreview(report) || !report.throughMonth) throw new SpReadError('Confira o período municipal antes dos preços.');
  const read = createSpRead(options, 40_000), sources: SpPriceSource[] = [];
  const start = spPricePeriods(report)[0].month, end = report.throughMonth;
  let completed = 0;
  const tasks = (['medium-prices-meter', 'medium-prices'] as const).flatMap(metric => (['overall', 'Padrão', 'Tipologia'] as const).map(grouping => ({ metric, grouping })));
  const windows = (metric: SpPriceMetric) => {
    if (metric === 'medium-prices') return [{ start: end, end }];
    const result: { start: string; end: string }[] = [];
    for (let year = Number(start.slice(0, 4)); year <= Number(end.slice(0, 4)); year++) result.push({ start: year === Number(start.slice(0, 4)) ? start : `${year}-01`, end: year === Number(end.slice(0, 4)) ? end : `${year}-12` });
    return result;
  };
  const total = tasks.reduce((sum, task) => sum + windows(task.metric).length, 0);
  for (const task of tasks) {
    const rows: SpTemporalRow[] = [];
    try {
      for (const window of windows(task.metric)) {
        options.onProgress?.(`Conferindo preços ${task.grouping === 'overall' ? 'gerais' : `por ${task.grouping.toLowerCase()}`}: ${window.start} a ${window.end}…`);
        options.onWorkProgress?.({ completed, total, unit: 'janelas' });
        const count = Number(window.end.slice(5)) - Number(window.start.slice(5)) + 1, maxRows = count * 16;
        const batch = await readSpSeries(read, task.metric, { city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'],
          ...(task.grouping === 'overall' ? {} : { group_by: task.grouping as SpPriceGrouping }),
          start_period: `${window.start}-01`, end_period: monthEnd(window.end) }, Math.ceil(maxRows / 100), undefined, maxRows);
        if (batch.some(row => typeof row.period !== 'string' || row.period.slice(0, 7) < window.start || row.period.slice(0, 7) > window.end)) throw new SpReadError('Preços fora da janela solicitada.');
        rows.push(...batch); completed++;
        options.onWorkProgress?.({ completed, total, unit: 'janelas' });
      }
      sources.push({ ...task, rows });
    } catch (error) {
      if (options.signal?.aborted || error instanceof DOMException && error.name === 'AbortError') throw error;
      sources.push({ ...task, rows: [], issue: error instanceof SpReadError ? error.message : 'A fonte municipal de preços não foi concluída.' });
    }
  }
  return buildSpMunicipalPrices(sources, report);
}

/** One bounded municipal releases series; no building histories or other metrics. */
export async function fetchSpLaunchSeriesRows(report: SpPreview, options: SpReadOptions = {}): Promise<SpTemporalRow[]> {
  return fetchSpFlowSeriesRows(report, 'releases', options);
}
export async function fetchSpSalesSeriesRows(report: SpPreview, options: SpReadOptions = {}): Promise<SpTemporalRow[]> {
  return fetchSpFlowSeriesRows(report, 'sales', options);
}
export async function fetchSpStockSeriesRows(report: SpPreview, options: SpReadOptions = {}): Promise<SpTemporalRow[]> {
  return fetchSpHistoricalSeries(report,'stock',options);
}
async function fetchSpFlowSeriesRows(report: SpPreview, metric: 'releases' | 'sales', options: SpReadOptions): Promise<SpTemporalRow[]> {
  return fetchSpHistoricalSeries(report,metric,options);
}
async function fetchSpHistoricalSeries(report:SpPreview,metric:'releases'|'sales'|'stock',options:SpReadOptions):Promise<SpTemporalRow[]> {
  if(!isSpMunicipalPreview(report)||!report.throughMonth)throw new SpReadError('Confira os meses municipais antes das séries históricas.');
  const read=createSpRead(options,40_000),rows:SpTemporalRow[]=[];
  const label=metric==='releases'?'lançamentos':metric==='sales'?'vendas':'oferta';
  const windows=spHistoryWindows(report,metric==='stock');let completed=0;
  options.onWorkProgress?.({completed,total:windows.length,unit:'janelas'});
  for(const window of windows){
    const months=Number(window.end.slice(5))-Number(window.start.slice(5))+1,maxRows=months*7;
    try{
      const batch=await readSpSeries(read,metric,{city:'São Paulo',uf:'SP','type[]':['Vertical'],group_by:'Padrão',start_period:`${window.start}-01`,end_period:monthEnd(window.end)},maxRows,page=>options.onProgress?.(`Conferindo ${label}: ${window.start} a ${window.end}, página ${page}…`),maxRows);
      if(batch.some(row=>typeof row.period!=='string'||row.period.slice(0,7)<window.start||row.period.slice(0,7)>window.end))throw new SpReadError('A fonte retornou competência fora da janela solicitada.');
      rows.push(...batch);
      options.onWorkProgress?.({completed:++completed,total:windows.length,unit:'janelas'});
    }catch(error){if(error instanceof SpReadError)throw new SpReadError(`${label[0].toUpperCase()+label.slice(1)} de ${window.start} a ${window.end}: ${error.message}`,error.code);throw error;}
  }
  return rows;
}

/** One contextual building sample + up to two pages per municipal source through the requested window. The sample period never limits municipal availability. */
export async function fetchSpTemporalInput(quarter: Quarter, options: SpReadOptions = {}): Promise<SpTemporalInput> {
  const months = quarterMonths(quarter);
  if (!months.length) throw new SpReadError('Trimestre inválido.');
  if (options.windowEnd !== undefined && !months.includes(options.windowEnd)) throw new SpReadError('Limite da janela inválido.');
  const read = createSpRead(options);
  let completed=0;options.onWorkProgress?.({completed,total:4,unit:'fontes'});
  const { rootPeriod, total } = await readSpSample(read, options);
  options.onWorkProgress?.({completed:++completed,total:4,unit:'fontes'});
  const requestedEnd = options.windowEnd ?? months[2];
  const end = requestedEnd;
  const result: SpTemporalInput = { origin: 'api', windowEnd: options.windowEnd, groupBy: options.groupBy ?? 'Padrão', uf: 'SP', city: 'São Paulo', rootPeriod, sampledBuildings: 1, totalBuildings: total, sales: [], releases: [], stock: [], complete: { sales: true, releases: true, stock: true } };

  for (const metric of ['sales', 'releases', 'stock'] as const) {
    options.onProgress?.({ sales: 'Consultando vendas dos meses disponíveis…', releases: 'Consultando lançamentos dos meses disponíveis…', stock: 'Consultando estoque e conferindo a paginação…' }[metric]);
    result[metric] = await readSpSeries(read, metric, { city: 'São Paulo', uf: 'SP', 'type[]': ['Vertical'], group_by: options.groupBy ?? 'Padrão', start_period: `${metric === 'stock' ? priorMonth(months[0]) : months[0]}-01`, end_period: monthEnd(end) });
    options.onWorkProgress?.({completed:++completed,total:4,unit:'fontes'});
  }
  return result;
}

/** Three requests normally: one contextual sample and one bounded releases window per year. */
export async function fetchSpLaunchHistory(report: SpPreview, options: SpReadOptions = {}): Promise<SpLaunchHistoryInput> {
  const months = matchedLaunchMonths(report);
  if (!months || report.patterns?.status !== 'ready') throw new SpReadError('Confira os totais municipais antes do histórico.');
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
  if (!months || report.patterns?.status !== 'ready') throw new SpReadError('Confira os totais municipais antes dos históricos.');
  const readOptions = { ...options, groupBy: 'Padrão' as const };
  const current = await fetchSpTemporalInput(report.quarter, { ...readOptions, windowEnd: months.current.at(-1)! });
  if (buildSpTemporalPreview(current, report.quarter).throughMonth !== report.throughMonth) return { current };
  const previous = await fetchSpTemporalInput(priorYearQuarter(report.quarter), { ...readOptions, windowEnd: months.previous.at(-1)! });
  return { current, previous };
}
