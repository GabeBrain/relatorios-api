import { httpRequest } from '@/lib/http-client';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import { fortalezaPeriod, fortalezaScope, type FortalezaSelection } from './model';
import { monthlyLaunchMonths, monthlyLaunchSourceIssue, type MonthlyLaunchData, type MonthlyLaunchSource } from './monthly-launches';
import type { FortalezaReadOptions, FortalezaEnvelope } from './api';
import { fetchMonthlyMarket } from './monthly-market-api';

/** A bounded 25-month vertical window, at most three pages per authorized city. */
export async function fetchMonthlyLaunches(selection: FortalezaSelection, authorized: string[], options: FortalezaReadOptions & { includeMonthlyReport?: boolean }, previous?: MonthlyLaunchData | null): Promise<MonthlyLaunchData> {
  if (options.includeMonthlyReport) {
    const market = await fetchMonthlyMarket(selection, authorized, options, previous?.market);
    const firstMonth = monthlyLaunchMonths(selection)[0];
    return { scopeKey: market.scopeKey, market, issues: market.issues, sources: market.sources.filter(source => source.segment === 'Vertical' && source.metric === 'releases').map(source => ({ city:source.city, complete:source.complete, rows:source.rows.filter(row => String(row.period).slice(0,7) >= firstMonth), requests:source.requests, startedAt:source.startedAt, finishedAt:source.finishedAt })) };
  }
  const scope = fortalezaScope(selection, authorized), period = fortalezaPeriod(selection);
  const months = monthlyLaunchMonths(selection);
  if (!options.token || !scope.valid) throw new Error('Confirme o acesso ao recorte mensal antes da consulta.');
  const scopeKey = JSON.stringify([scope.cities, months]);
  const output: MonthlyLaunchData = { scopeKey, sources: [], issues: [] };
  const check = () => { if (options.signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError'); };
  check();
  for (const city of scope.cities) {
    check();
    // The hook owns the scope/session cache and clears it on period/token changes.
    const cached = previous?.scopeKey === scopeKey ? previous.sources.find(source => source.city === city && !monthlyLaunchSourceIssue(source, selection)) : null;
    if (cached) { output.sources.push(cached); continue; }
    const source: MonthlyLaunchSource = { city, rows: [], complete: false, requests: 0, startedAt: new Date().toISOString(), finishedAt: '' };
    try {
      let total: number | undefined, last: number | undefined;
      for (let page = 1; page <= 3; page++) {
        check(); options.onProgress?.(`${city} · lançamentos verticais ${months[0]} a ${months.at(-1)} · página ${page}${last ? ` de ${last}` : ''}`);
        const response = await requestWithRetry(async () => {
          check(); source.requests++;
          return (options.request ?? (value => httpRequest<FortalezaEnvelope>(value)))({ url: 'https://geobrain.com.br/public-api/temporal-analysis-city/releases', query: { city, uf: 'CE', 'type[]': ['Vertical'], group_by: 'Padrão', start_period: `${months[0]}-01`, end_period: period.end, per_page: 100, page }, headers: { Authorization: `Bearer ${options.token}` }, includeAuth: false, cache: 'no-store', timeoutMs: 20_000, signal: options.signal });
        }, { signal: options.signal, attempts: 2, sleep: options.sleep });
        check();
        const payload = response.data, meta = payload?.meta, next = payload?.links?.next;
        if (!response.ok || !Array.isArray(payload?.data) || !meta || meta.current_page !== page || !Number.isSafeInteger(meta.total) || meta.total! < 0 || meta.total! > 300 || !Number.isSafeInteger(meta.last_page) || meta.last_page! < page || meta.last_page! > 3 || next !== null && (typeof next !== 'string' || !next)) throw new Error();
        total ??= meta.total; last ??= meta.last_page;
        if (total !== meta.total || last !== meta.last_page || payload.data.length > 100 || total > 0 && !payload.data.length) throw new Error();
        source.rows.push(...payload.data);
        if (next === null) {
          if (page !== last || source.rows.length !== total) throw new Error();
          source.complete = true; break;
        }
        if (page === last) throw new Error();
      }
      if (!source.complete) throw new Error();
      const issue = monthlyLaunchSourceIssue(source, selection);
      if (issue) { source.complete = false; source.rows = []; output.issues.push(issue); }
    } catch {
      check(); source.rows = []; source.complete = false;
      output.issues.push(`${city}: não foi possível concluir o histórico mensal de lançamentos. Tente gerar novamente.`);
    }
    source.finishedAt = new Date().toISOString(); output.sources.push(source);
  }
  return output;
}
