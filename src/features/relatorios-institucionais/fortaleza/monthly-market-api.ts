import { httpRequest } from '@/lib/http-client';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import { fortalezaScope, fortalezaPeriod, type FortalezaSelection } from './model';
import { monthlyMarketMonths, monthlyStockMonths, monthlyMarketSourceIssue, monthlySourceKey, type MonthlyMarketData, type MonthlyMarketSource, type MonthlyMetric, type MonthlySegment } from './monthly-market';
import type { FortalezaEnvelope, FortalezaReadOptions } from './api';
import { monthlySourceCoverage } from './municipal-coverage';

/** Shared monthly harvest: two in-flight source streams; each stream paginates in order. */
export async function fetchMonthlyMarket(selection: FortalezaSelection, authorizedCities: string[], options: FortalezaReadOptions, previous?: MonthlyMarketData): Promise<MonthlyMarketData> {
  const scope = fortalezaScope(selection, authorizedCities), months = monthlyMarketMonths(selection), period = fortalezaPeriod(selection);
  if (!scope.valid || !options.token) throw new Error('Confirme o recorte autorizado antes do histórico mensal.');
  const scopeKey = JSON.stringify([scope.cities,months,'fortaleza-monthly-v4']);
  const output: MonthlyMarketData = { scopeKey, months, sources: [], issues: [] };
  const check = () => { if (options.signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError'); };
  const tasks = scope.cities.flatMap(city => (['Vertical','Horizontal','Comercial'] as MonthlySegment[]).flatMap(segment => (segment === 'Comercial'&&selection.periodicity==='monthly' ? ['releases','sales'] : ['releases','sales','stock'] as MonthlyMetric[]).map(metric => ({ city, segment, metric:metric as MonthlyMetric }))));
  const completed = new Map<number, MonthlyMarketSource>(); let nextTask = 0;
  async function worker() {
    while (nextTask < tasks.length) {
      check(); const taskIndex = nextTask++, task = tasks[taskIndex];
      const cached = previous?.scopeKey === scopeKey ? previous.sources.find(source => monthlySourceKey(source) === monthlySourceKey(task) && !monthlyMarketSourceIssue(source,months)) : null;
      if (cached) { completed.set(taskIndex,cached); continue; }
      const source: MonthlyMarketSource = { ...task, rows: [], complete: false, issue: null, requests: 0, startedAt: new Date().toISOString(), finishedAt: '', ...(task.metric === 'stock' ? { openingIncluded:true } : {}) };
      const sourceMonths = task.metric === 'stock' ? monthlyStockMonths(months) : months;
      try {
        let total: number | undefined, last: number | undefined;
        for (let page = 1; page <= 8; page++) {
          check(); options.onProgress?.(`${completed.size} de ${tasks.length} fontes mensais concluídas · ${task.city} · ${task.segment} · ${{ releases:'lançamentos',sales:'vendas',stock:'oferta final' }[task.metric]} · página ${page}${last ? ` de ${last}` : ''}`);
          const response = await requestWithRetry(async () => {
            check(); source.requests++;
            return (options.request ?? (value => httpRequest<FortalezaEnvelope>(value)))({ url: `https://geobrain.com.br/public-api/temporal-analysis-city/${task.metric}`, query: { city: task.city, uf:'CE', 'type[]':[task.segment], group_by:'Padrão', start_period:`${sourceMonths[0]}-01`, end_period:period.end, per_page:100, page }, headers: { Authorization:`Bearer ${options.token}` }, includeAuth:false, signal:options.signal, timeoutMs:20_000, cache:'no-store' });
          }, { attempts:2, signal:options.signal, sleep:options.sleep });
          check(); const payload = response.data, meta = payload?.meta, link = payload?.links?.next;
          if (!response.ok || !Array.isArray(payload?.data) || !meta || meta.current_page !== page || !Number.isSafeInteger(meta.total) || meta.total! < 0 || meta.total! > 800 || !Number.isSafeInteger(meta.last_page) || meta.last_page! < page || meta.last_page! > 8 || link !== null && (typeof link !== 'string' || !link)) throw new Error();
          total ??= meta.total; last ??= meta.last_page;
          if (total !== meta.total || last !== meta.last_page || payload.data.length > 100 || total > 0 && !payload.data.length) throw new Error();
          source.rows.push(...payload.data);
          if (link === null) {
            if (page !== last || source.rows.length !== total) throw new Error();
            source.complete = true; break;
          }
          if (page === last) throw new Error();
        }
        if (!source.complete) throw new Error();
        source.coverage=monthlySourceCoverage(source,months);
        const issue = monthlyMarketSourceIssue(source,months);
        if (issue) { source.complete = false; source.issue = issue; source.rows = []; }
      } catch {
        check(); source.complete = false; source.rows = []; source.issue = 'A fonte mensal não concluiu uma paginação estável. Tente novamente.';
      }
      source.finishedAt = new Date().toISOString(); completed.set(taskIndex, source);
    }
  }
  check();
  // Drain both streams on cancellation so no request continues after the generation settles.
  const outcomes = await Promise.allSettled([worker(),worker()]);
  check(); const failure = outcomes.find(outcome => outcome.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
  output.sources = tasks.map((_, index) => completed.get(index)!);
  output.issues = output.sources.filter(source => !source.complete).map(source => `${monthlySourceKey(source)}: ${source.issue}`);
  return output;
}
