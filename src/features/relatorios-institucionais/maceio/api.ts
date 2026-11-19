import { httpRequest, type HttpResponse, type RequestOptions } from '@/lib/http-client';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import { collectByCity, type CollectionResult } from '@/features/panorama-secovi-fiergs/domain/collection';
import { maceioPeriod, maceioScope, type MaceioSelection } from './model';
import { buildCityMarket, buildMaceioMarket, marketMonth, normalizeMarketText, type CityMarketInput, type MarketMetric, type MarketRow } from './market';
import { scopeMaceioRow } from './source-contract';

const BASE = 'https://geobrain.com.br/public-api';
export interface MaceioEnvelope {
  data?: MarketRow[];
  meta?: { current_page?: number; last_page?: number; total?: number };
  links?: { next?: string | null };
}
export type MaceioRequest = (options: RequestOptions) => Promise<HttpResponse<MaceioEnvelope>>;
export interface MaceioReadOptions {
  token: string;
  signal?: AbortSignal;
  onProgress?: (label: string) => void;
  onUnitsProgress?: (completed:number,total:number)=>void;
  onStage?: (stage: 'validation' | 'sources' | 'reconciliation') => void;
  request?: MaceioRequest;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}
export class MaceioReadError extends Error { name = 'MaceioReadError'; }
export interface MaceioCollection { scopeKey: string; collection: CollectionResult<CityMarketInput> }
function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
}

export async function collectMaceioMarket(selection: MaceioSelection, authorizedCities: string[], options: MaceioReadOptions, previous?: MaceioCollection) {
  options.onStage?.('validation');
  const scope = maceioScope(selection, authorizedCities), period = maceioPeriod(selection);
  if (!options.token || !scope.valid) throw new MaceioReadError('Autentique-se e confirme todos os municípios do recorte antes de consultar dados.');
  checkAbort(options.signal);
  const scopeKey = JSON.stringify({ cities: scope.cities, start: period.start, end: period.end, segment: 'Vertical' });
  options.onStage?.('sources');
  const reusable = previous?.scopeKey === scopeKey ? previous.collection.outcomes.filter(city => city.status === 'completed' && city.value && buildCityMarket(city.value, selection).status === 'complete') : [];
  let completedCities=0;
  const collection = await collectByCity(scope.cities, async city => {
    const cached = reusable.find(value => value.city === city)?.value;
    if (cached) { options.onUnitsProgress?.(++completedCities,scope.cities.length); options.onProgress?.(`${city} · fontes já concluídas nesta tentativa preservadas`); return cached; }
    const input: CityMarketInput = { city, uf: 'AL', sampleConfirmed: false, releases: [], sales: [], stock: [], complete: { releases: false, sales: false, stock: false }, startedAt: new Date().toISOString(), finishedAt: '', requests: 0 };
    const read = async (path: string, query: Record<string, unknown>) => {
      const request = options.request ?? (requestOptions => httpRequest<MaceioEnvelope>(requestOptions));
      let response: HttpResponse<MaceioEnvelope>;
      try {
        response = await requestWithRetry(async () => {
          checkAbort(options.signal); input.requests++;
          const value = await request({ url: `${BASE}/${path}`, query, headers: { Authorization: `Bearer ${options.token}` }, includeAuth: false, signal: options.signal, timeoutMs: 20_000, cache: 'no-store' });
          if (value.status === 429) options.onProgress?.(`${city} · aguardando a pausa solicitada pela API`);
          return value;
        }, { signal: options.signal, attempts: 2, sleep: options.sleep });
      } catch {
        checkAbort(options.signal);
        throw new MaceioReadError('A conexão com a fonte não foi concluída. Tente novamente.');
      }
      checkAbort(options.signal);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new MaceioReadError('O acesso não autorizou esta consulta. Entre novamente.');
        if (response.status === 429) throw new MaceioReadError('A API limitou as consultas. Aguarde antes de tentar novamente.');
        throw new MaceioReadError('A fonte não respondeu nesta tentativa. Confira a conexão e tente novamente.');
      }
      if (!Array.isArray(response.data?.data)) throw new MaceioReadError('A fonte respondeu fora do contrato esperado.');
      return path.startsWith('temporal-analysis-city/')
        ? { ...response.data, data: response.data.data.map(row => scopeMaceioRow(row, city, 'Vertical', true)) }
        : response.data;
    };
    try {
      options.onProgress?.(`${city} · conferindo o recorte vertical`);
      const sample = await read('building-with-history', { city, uf: 'AL', type: 'Vertical', per_page: 1, page: 1 });
      if (sample.meta?.total === 0 && sample.data!.length === 0) { input.finishedAt = new Date().toISOString(); return input; }
      const first = sample.data![0];
      if (sample.data!.length !== 1 || !Number.isSafeInteger(sample.meta?.total) || sample.meta!.total! < 1 || normalizeMarketText(first.city) !== normalizeMarketText(city) || first.state !== 'AL' || normalizeMarketText(first.building_type) !== 'vertical') throw new MaceioReadError('A amostra não confirmou o município e o segmento solicitados.');
      input.sampleConfirmed = true;
      for (const metric of ['releases', 'sales', 'stock'] as const) {
        const start = metric === 'stock' ? `${period.opening}-01` : period.start;
        const label: Record<MarketMetric, string> = { releases: 'lançamentos', sales: 'vendas líquidas', stock: 'oferta final' };
        let expectedTotal: number | undefined, expectedLast: number | undefined;
        for (let page = 1; page <= 2; page++) {
          options.onProgress?.(`${city} · ${label[metric]} · página ${page}`);
          const payload = await read(`temporal-analysis-city/${metric}`, { city, uf: 'AL', 'type[]': ['Vertical'], group_by: 'Padrão', start_period: start, end_period: period.end, per_page: 100, page });
          const { meta, links } = payload;
          if (!meta || meta.current_page !== page || !Number.isSafeInteger(meta.total) || meta.total! < 0 || meta.total! > 200 || !Number.isSafeInteger(meta.last_page) || meta.last_page! < page || meta.last_page! > 2 || !links || !Object.prototype.hasOwnProperty.call(links, 'next') || (links.next !== null && typeof links.next !== 'string') || links.next === '') throw new MaceioReadError('A paginação não confirmou uma janela completa dentro do limite curto.');
          expectedTotal ??= meta.total; expectedLast ??= meta.last_page;
          if (meta.total !== expectedTotal || meta.last_page !== expectedLast || (meta.total! > 0 && !payload.data!.length) || payload.data!.length > 100) throw new MaceioReadError('A fonte retornou uma página incompleta ou mudou durante a consulta.');
          for (const row of payload.data!) {
            const month = marketMonth(row.period);
            if (!month || month < start.slice(0, 7) || month > period.end.slice(0, 7)) throw new MaceioReadError('A fonte retornou uma competência fora da janela solicitada.');
          }
          input[metric].push(...payload.data!);
          if (links.next === null) {
            if (page !== meta.last_page || input[metric].length !== meta.total) throw new MaceioReadError('A fonte retornou uma cobertura incompleta.');
            input.complete[metric] = true; break;
          }
          if (page === meta.last_page || page === 2) throw new MaceioReadError('A janela excedeu o limite curto. A coleta permanece incompleta.');
          // Rebuild the next request with the same scope; provider links cannot drop the filters.
        }
      }
      input.finishedAt = new Date().toISOString();
      return input;
    } catch (failure) {
      checkAbort(options.signal);
      throw failure instanceof MaceioReadError ? failure : new MaceioReadError('Não foi possível concluir as fontes deste município.');
    } finally { options.onUnitsProgress?.(++completedCities,scope.cities.length); }
  }, { concurrency: 1, attempts: 1, signal: options.signal });
  checkAbort(options.signal);
  const result: MaceioCollection = { scopeKey, collection };
  const inputs = collection.outcomes.flatMap(city => city.value ? [city.value] : []);
  options.onStage?.('reconciliation');
  return { result, report: buildMaceioMarket(selection, scope.cities, inputs, collection.failedCities) };
}
