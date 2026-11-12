import { describe,expect,it,vi } from 'vitest';
import type { FortalezaRequest } from './api';
import { fetchMonthlyMarket } from './monthly-market-api';
import { monthlyMarketFixture,monthlyMarketSelection as selection } from './__tests__/monthly-market-fixture';
import { FORTALEZA_CITIES } from './model';
import { fetchMonthlyLaunches } from './monthly-launch-api';
function transport(mode = 'success') {
  let active = 0, maximum = 0;
  const fixture = monthlyMarketFixture();
  const request = vi.fn<FortalezaRequest>(async options => {
    active++; maximum = Math.max(maximum,active); await Promise.resolve();
    try {
      const city = String(options.query.city), segment = String((options.query['type[]'] as string[])[0]), metric = options.url.split('/').at(-1);
      const source = fixture.sources.find(source => source.city === city && source.segment === segment && source.metric === metric)!;
      const rows = source.rows.map(row => ({ ...row })), page = Number(options.query.page), last = Math.ceil(rows.length / 100);
      if (mode === 'unknown' && segment === 'Horizontal') rows[0].group = 'Não mapeado';
      return { ok:mode !== 'forbidden' || segment !== 'Horizontal',status:mode === 'forbidden' && segment === 'Horizontal' ? 403 : 200,data:{ data:rows.slice((page-1)*100,page*100),meta:{ total:mode === 'changing' && page === 2 ? rows.length+1 : rows.length,current_page:page,last_page:mode === 'limit' ? 9 : last },links:{ next:page === last ? null : 'https://untrusted.invalid/drop-scope' } },text:null,contentType:'application/json',latencyMs:1,bytes:1,error:null,requestHeaders:{},requestQuery:{},requestBody:null,url:'',method:'GET' };
    } finally { active--; }
  });
  return { request,maximum:() => maximum };
}
describe('Fortaleza — coleta compartilhada 12/14 e16–25', () => {
  it('consulta cada cidade/segmento/fonte uma vez, pagina preservando escopo e limita concorrência a2', async () => {
    const { request,maximum } = transport();
    const result = await fetchMonthlyMarket(selection,[...FORTALEZA_CITIES],{ token:'synthetic',request });
    expect(result.sources).toHaveLength(40); expect(result.issues).toEqual([]);
    expect(result.sources.every(source => source.complete)).toBe(true); expect(maximum()).toBeLessThanOrEqual(2);
    for (const [options] of request.mock.calls) {
      expect(options.query).toMatchObject({ uf:'CE',start_period:options.url.endsWith('stock') ? '2024-06-01' : '2024-07-01',end_period:'2026-07-31',per_page:100 });
      expect(options.url).not.toContain('untrusted.invalid'); expect(options.includeAuth).toBe(false);
    }
    const count = request.mock.calls.length;
    await fetchMonthlyMarket(selection,[...FORTALEZA_CITIES],{ token:'synthetic',request },result);
    expect(request).toHaveBeenCalledTimes(count);
  });
  it.each(['unknown','changing','limit','forbidden'])('falha %s não publica fonte parcial e preserva as fontes independentes', async mode => {
    const { request } = transport(mode);
    const result = await fetchMonthlyMarket({ ...selection,territory:'city' },['Fortaleza'],{ token:'synthetic',request });
    expect(result.issues.length).toBeGreaterThan(0);
    for (const source of result.sources.filter(source => !source.complete)) expect(source.rows).toEqual([]);
    if(mode==='unknown'){
      const evidence=result.sources.find(source=>source.segment==='Horizontal'&&source.metric==='releases')!.coverage!;
      expect(evidence.rowsReceived).toBeGreaterThan(0);expect(evidence.groups.some(group=>group.group==='Não mapeado'&&group.unknownCategory)).toBe(true);
    }
    if (mode === 'unknown' || mode === 'forbidden') expect(result.sources.filter(source => source.segment === 'Vertical').every(source => source.complete)).toBe(true);
  });
  it('adapta a coleta compartilhada para13/15 sem nova consulta vertical', async () => {
    const { request } = transport();
    const result = await fetchMonthlyLaunches({ ...selection,territory:'city' },['Fortaleza'],{ token:'synthetic',request,includeMonthlyReport:true });
    expect(result.market.sources).toHaveLength(8); expect(result.sources).toHaveLength(1); expect(result.sources[0].rows).toHaveLength(175);
    const verticalReleaseCalls = request.mock.calls.filter(([options]) => options.url.endsWith('releases') && (options.query['type[]'] as string[])[0] === 'Vertical');
    expect(verticalReleaseCalls).toHaveLength(2);
  });
  it('cancelamento drena as duas tarefas e recorte não autorizado não chama rede', async () => {
    const controller = new AbortController(), base = transport();
    const request = vi.fn<FortalezaRequest>(async options => { controller.abort(); return base.request(options); });
    await expect(fetchMonthlyMarket(selection,[...FORTALEZA_CITIES],{ token:'synthetic',request,signal:controller.signal })).rejects.toMatchObject({ name:'AbortError' });
    expect(request.mock.calls.length).toBeLessThanOrEqual(2);
    const forbidden = transport();
    await expect(fetchMonthlyMarket(selection,[],{ token:'synthetic',request:forbidden.request })).rejects.toThrow();
    expect(forbidden.request).not.toHaveBeenCalled();
  });
});
