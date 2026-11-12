import { httpRequest, type HttpResponse, type RequestOptions } from '@/lib/http-client';
import { insertBuilding, readBuildingPage } from '@/features/panorama-secovi-fiergs/domain/building-source';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import { isSpMunicipalPreview, type SpPreview } from './model';
import { quarterMonths } from './temporal';
import { buildSpProjectTrends, buildSpTrendBreakdown, type SpProjectTrends, type SpTrendBreakdown } from './project-trends';
import { buildSpLaunchNeighborhoods, type SpLaunchNeighborhoods } from './neighborhoods';
import { SpReadError } from './read-errors';
import type { SpWorkProgress } from './work-progress';

export const SP_BUILDING_HISTORY_V2 = 'https://app.geobrain.com.br/public-api/v2/building-with-history-internal';

type Building = Record<string, unknown>;
export interface SpProjects {
  status: 'ready' | 'blocked';
  issues: string[];
  source: 'building';
  received: number;
  distinct: number;
  monthly: { month: string; value: number }[];
  total: number | null;
  trends?: SpProjectTrends;
  breakdown?: SpTrendBreakdown;
  neighborhoods?: SpLaunchNeighborhoods;
}
export const blockedSpProjects = (message: string): SpProjects => ({ status: 'blocked', issues: [message], source: 'building', received: 0, distinct: 0, monthly: [], total: null });
const normalized = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** Counts original launch dates, independently of typology rows, units and building root period. */
export function buildSpProjects(buildings: Building[], report: SpPreview, received = buildings.length): SpProjects {
  if (!isSpMunicipalPreview(report) || !report.throughMonth) return blockedSpProjects('Confira os meses municipais antes da contagem de empreendimentos.');
  const months = quarterMonths(report.quarter).filter(month => month <= report.throughMonth!);
  const monthly = months.map(month => ({ month, value: 0 }));
  const byId = new Map<string, Building>();
  const launchesByMonth = new Map<string, number>();
  const launchesByPattern: { month: string; group: unknown; value: number }[] = [];
  for (const building of buildings) {
    if (normalized(building.city) !== 'sao paulo' || normalized(building.state ?? building.uf) !== 'sp' || normalized(building.building_type) !== 'vertical') throw new Error('A coleta contém empreendimento fora de São Paulo/SP vertical.');
    insertBuilding(byId, { ...building, __panoramaSource: { source: 'building', page: 1 } });
  }
  for (const building of byId.values()) {
    const date = String(building.release_date ?? '');
    const day = date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day) throw new Error('Há empreendimento sem data de lançamento válida; a contagem permanece indisponível.');
    const launchMonth = day.slice(0, 7);
    launchesByMonth.set(launchMonth, (launchesByMonth.get(launchMonth) ?? 0) + 1);
    launchesByPattern.push({ month: launchMonth, group: building.standard, value: 1 });
    const row = monthly.find(row => row.month === day.slice(0, 7));
    if (row) row.value++;
  }
  return { status: 'ready', issues: [], source: 'building', received, distinct: byId.size, monthly, total: monthly.reduce((sum, row) => sum + row.value, 0), trends: buildSpProjectTrends(launchesByMonth, report.quarter, report.throughMonth), breakdown: buildSpTrendBreakdown(launchesByPattern, report.quarter, report.throughMonth), neighborhoods: buildSpLaunchNeighborhoods([...byId.values()], report) };
}

interface Options {
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
  onWorkProgress?: (progress:SpWorkProgress) => void;
  request?: (options: RequestOptions) => Promise<HttpResponse<Record<string, unknown>>>;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/** Panorama pagination/integrity primitives, adapted to SP vertical without status exclusions. */
export async function fetchSpProjects(report: SpPreview, options: Options = {}): Promise<SpProjects> {
  const buildings = await fetchSpBuildingRecords(report, options, 'building');
  return buildSpProjects(buildings, report, buildings.length);
}

/** Complete collection shared by neighborhood, area, price and stock detail slides. */
export async function fetchSpBuildingRecords(report: SpPreview, options: Options = {}, source: 'building' | 'building-with-history' = 'building-with-history'): Promise<Building[]> {
  if (!isSpMunicipalPreview(report)) throw new Error('Período municipal indisponível.');
  const request = options.request ?? (value => httpRequest<Record<string, unknown>>(value));
  const byId = new Map<string, Building>();
  let expectedLast: number | null = null, expectedTotal: number | null = null, received = 0, completed = 0;
  const checkAbort = () => { if (options.signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError'); };
  async function readPage(page: number) {
    checkAbort();
    const response = await requestWithRetry(async () => {
      checkAbort();
      const detailed=source==='building-with-history';
      const value = await request({ method: detailed?'POST':'GET', url: detailed?SP_BUILDING_HISTORY_V2:`https://geobrain.com.br/public-api/${source}`, query: { type: 'Vertical', city: 'São Paulo', ...(!detailed?{uf:'SP'}:{}), per_page: 100, page }, ...(detailed?{headers:{'Content-Type':'application/json'}}:{}), includeAuth:true, signal: options.signal, timeoutMs: 60_000, cache: 'no-store' });
      return detailed?value:{ ...value, retryAfterMs: Math.min(value.retryAfterMs ?? 0, 3000) || null };
    }, { signal: options.signal, attempts: 2, sleep: options.sleep });
    checkAbort();
    if (!response.ok || !response.data) {
      if(source==='building-with-history')throw new SpReadError(response.status===401||response.status===403?'A API v2 não autorizou a coleta detalhada. Confira o acesso GeoBrain à rota de históricos.':`A coleta detalhada na API v2 não foi concluída${response.status?` (HTTP ${response.status})`:''}. Confira conexão, disponibilidade e permissão da rota no navegador.`);
      throw new Error('A coleta de empreendimentos não foi concluída.');
    }
    const payload = readBuildingPage(response.data, { city: 'São Paulo', uf: 'SP' }, page, source==='building-with-history'?'building-with-history-internal-v2':source);
    if (payload.lastPage > 100 || payload.total === null || payload.total === 0 || (expectedLast !== null && (expectedLast !== payload.lastPage || expectedTotal !== payload.total))) throw new Error('A paginação mudou ou não confirmou o total de empreendimentos.');
    expectedLast = payload.lastPage; expectedTotal = payload.total;
    if (page < expectedLast && !payload.buildings.length) throw new Error('A coleta retornou uma página intermediária vazia.');
    received += payload.buildings.length;
    if (received > expectedTotal) throw new Error('A coleta excedeu o total informado pela fonte.');
    for (const building of payload.buildings) insertBuilding(byId, building);
    completed++;
    options.onWorkProgress?.({completed,total:expectedLast!,unit:'páginas'});
    options.onProgress?.(`Conferindo ${source === 'building' ? 'empreendimentos' : 'vendas por bairro'}: ${completed} de ${expectedLast} páginas concluídas…`);
  }
  await readPage(1);
  // Refill each free slot immediately instead of waiting for the slowest page in a batch.
  // A retry/backoff keeps its slot. Stop scheduling on failure and drain in-flight work.
  let nextPage = 2;
  let failure: { reason: unknown } | undefined;
  async function worker() {
    while (!failure && nextPage <= expectedLast!) {
      const page = nextPage++;
      try { await readPage(page); }
      catch (reason) { failure ??= { reason }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, expectedLast! - 1) }, () => worker()));
  if (failure) throw failure.reason;
  checkAbort();
  if (received !== expectedTotal || byId.size !== expectedTotal) throw new Error('A coleta não comprovou a cobertura de IDs distintos; recomece a consulta.');
  return [...byId.values()];
}
