import { httpRequest } from '@/lib/http-client';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import { insertBuilding,readBuildingPage } from '@/features/panorama-secovi-fiergs/domain/building-source';
import { fortalezaScope,type FortalezaSelection } from './model';
import { normalizeMarketText } from './market';
import { normalizePriceFrames,priceMonths,priceSourceKey,priceSourceHasIssues,type PriceCollection,type PriceSource } from './monthly-prices';
import type { FortalezaReadOptions,FortalezaEnvelope } from './api';
export async function fetchMonthlyPrices(selection:FortalezaSelection,authorized:string[],options:FortalezaReadOptions,previous?:PriceCollection):Promise<PriceCollection> {
  const scope = fortalezaScope(selection,authorized),months = priceMonths(selection);
  if (!scope.valid || !options.token) throw new Error('Confirme o recorte autorizado antes dos preços.');
  const scopeKey = JSON.stringify([scope.cities,months,'fortaleza-prices-v1']),tasks = scope.cities.flatMap(city => (['Vertical','Horizontal'] as const).map(segment => ({ city,segment })));
  const check = () => { if (options.signal?.aborted) throw new DOMException('Consulta cancelada.','AbortError'); };
  const completed = new Map<number,PriceSource>(); let next = 0;
  async function worker() {
    while (next < tasks.length) {
      check(); const index = next++,task = tasks[index];
      const cached = previous?.scopeKey === scopeKey ? previous.sources.find(source => priceSourceKey(source) === priceSourceKey(task) && !priceSourceHasIssues(source)) : null;
      if (cached) { completed.set(index,cached); continue; }
      const source:PriceSource = { ...task,complete:false,records:[],frames:{},issue:null,requests:0,startedAt:new Date().toISOString(),finishedAt:'' };
      const records = new Map<string,Record<string,unknown>>();
      try {
        let last:number|null = null,total:number|null = null,received = 0;
        for (let page=1;page<=20;page++) {
          check(); options.onProgress?.(`${completed.size} de ${tasks.length} fontes de preços conferidas · ${task.city} · ${task.segment} · página ${page}${last ? ` de ${last}` : ''}`);
          const response = await requestWithRetry(async () => {
            check(); source.requests++;
            return (options.request ?? (value => httpRequest<FortalezaEnvelope>(value)))({ method:'POST',url:'https://app.geobrain.com.br/public-api/v2/building-with-history-internal',query:{ city:task.city,type:task.segment,per_page:50,page },headers:{ Authorization:`Bearer ${options.token}`,'Content-Type':'application/json' },includeAuth:false,signal:options.signal,timeoutMs:60_000,cache:'no-store' });
          },{ signal:options.signal,attempts:2,sleep:options.sleep });
          check();
          if (!response.ok || !response.data) throw new Error();
          const payload = readBuildingPage(response.data as Record<string,unknown>,{ city:task.city,uf:'CE' },page,'fortaleza-prices-v2');
          if (payload.total === null || payload.total > 1000 || payload.lastPage > 20 || payload.buildings.length > 50 || last !== null && (last !== payload.lastPage || total !== payload.total)) throw new Error();
          total ??= payload.total; last ??= payload.lastPage;
          if (page < last && !payload.buildings.length) throw new Error();
          for (const building of payload.buildings) {
            if (normalizeMarketText(building.city) !== normalizeMarketText(task.city) || normalizeMarketText(building.state ?? building.uf) !== 'ce' || normalizeMarketText(building.building_type) !== normalizeMarketText(task.segment)) throw new Error();
            insertBuilding(records,building);
          }
          received += payload.buildings.length;
          if (page === last) { if (received !== total || records.size !== total) throw new Error(); source.complete = true; break; }
        }
        if (!source.complete) throw new Error();
        source.records = [...records.values()];
        options.onProgress?.(`${task.city} · conferindo identidades e fotografias de preços`);
        await new Promise<void>(resolve => setTimeout(resolve,0)); check();
        source.frames = normalizePriceFrames(source,months);
      } catch { check(); source.complete = false; source.records = []; source.frames = {}; source.issue = 'A coleta v2 de preços não comprovou uma cobertura estável de empreendimentos. Confira acesso e disponibilidade.'; }
      source.finishedAt = new Date().toISOString(); completed.set(index,source);
    }
  }
  check(); const outcomes = await Promise.allSettled([worker(),worker()]); check();
  const failure = outcomes.find(outcome => outcome.status === 'rejected'); if (failure?.status === 'rejected') throw failure.reason;
  const sources = tasks.map((_,index) => completed.get(index)!);
  return { scopeKey,months,sources,issues:sources.filter(priceSourceHasIssues).map(source => `${priceSourceKey(source)}: ${source.issue ?? 'Há fotografias ou preços históricos a conferir; veja os insights do slide.'}`) };
}
