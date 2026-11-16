import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectFortalezaMarket } from './api';
import { buildFortalezaMarket } from './market';
import { useFortalezaMarket } from './useFortalezaMarket';
import { marketFixture, monthlySelection } from './__tests__/market-fixture';
import { fetchFortalezaIntro } from './intro-data';
import { fetchMonthlyLaunches } from './monthly-launch-api';
import { fetchMonthlyPrices } from './monthly-prices-api';
import { fetchMonthlyMarket } from './monthly-market-api';
import observedSkipped from './__tests__/quarterly-skipped-sources-2T2026.json';
import { FORTALEZA_CITIES } from './model';
import { buildFortalezaDiagnostic } from './diagnostic';
import { monthlyMarketFixture } from './__tests__/monthly-market-fixture';
import { quarterlyPriceFixture } from './__tests__/quarterly-price-fixture';
import { buildIntroProject } from './intro-data';
import { monthlyLaunchMonths } from './monthly-launches';

vi.mock('./api', () => ({ collectFortalezaMarket: vi.fn() }));
vi.mock('./intro-data', async importOriginal => ({ ...await importOriginal<typeof import('./intro-data')>(), fetchFortalezaIntro: vi.fn() }));
vi.mock('./monthly-launch-api', () => ({ fetchMonthlyLaunches: vi.fn() }));
vi.mock('./monthly-prices-api', () => ({ fetchMonthlyPrices: vi.fn() }));
vi.mock('./monthly-market-api', () => ({ fetchMonthlyMarket: vi.fn() }));
const collect = vi.mocked(collectFortalezaMarket);
type Payload = Awaited<ReturnType<typeof collectFortalezaMarket>>;
function payload(failed = false): Payload {
  const input = marketFixture();
  const failures = failed ? [{ city: 'Fortaleza', error: 'Fonte indisponível.' }] : [];
  return {
    result: { scopeKey: 'fixture', collection: { state: failed ? 'unavailable' : 'ready', requestedCities: ['Fortaleza'], completedCities: failed ? [] : ['Fortaleza'], failedCities: failures, outcomes: [{ city: 'Fortaleza', status: failed ? 'failed' : 'completed', value: failed ? null : input, error: failed ? 'Fonte indisponível.' : null, attempts: 1, durationMs: 1 }] } },
    report: buildFortalezaMarket(monthlySelection, ['Fortaleza'], failed ? [] : [input], failures),
  };
}
function deferred() {
  let resolve!: (result: Payload) => void;
  const promise = new Promise<Payload>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => { vi.mocked(fetchMonthlyPrices).mockReset();vi.mocked(fetchMonthlyPrices).mockResolvedValue({scopeKey:"quarterly",months:[],sources:[],issues:[]}); vi.mocked(fetchMonthlyMarket).mockReset(); vi.mocked(fetchMonthlyMarket).mockResolvedValue({scopeKey:"quarterly",months:[],sources:[],issues:[]}); collect.mockReset(); vi.mocked(fetchMonthlyLaunches).mockReset(); vi.mocked(fetchMonthlyLaunches).mockResolvedValue({ sources: [], issues: [] }); vi.mocked(fetchFortalezaIntro).mockResolvedValue({ status: 'ready', projects: [], issues: [], requests: 0, startedAt: '', finishedAt: '' }); });
afterEach(cleanup);

describe('Fortaleza — sessão e ciclo da consulta', () => {
  it('coleta a janela de cada periodicidade sem transferir o cache mensal para o trimestral', async () => {
    collect.mockResolvedValue(payload());
    const { result, rerender } = renderHook(({ periodicity }: { periodicity: 'monthly' | 'quarterly' }) => useFortalezaMarket({ ...monthlySelection, periodicity, position: periodicity === 'monthly' ? 6 : 2 }, ['Fortaleza'], 'token-a', true), { initialProps: { periodicity: 'monthly' } });
    await act(async () => { await result.current.consult(); });
    expect(fetchMonthlyLaunches).toHaveBeenCalledTimes(1);
    expect(result.current.state.monthlyLaunches).toEqual({ sources: [], issues: [] });
    rerender({ periodicity: 'quarterly' });
    expect(result.current.state).toBeNull();
    await act(async () => { await result.current.consult(); });
    expect(fetchMonthlyLaunches).toHaveBeenCalledTimes(1);
    expect(fetchMonthlyMarket).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchMonthlyMarket).mock.calls[0][0].periodicity).toBe('quarterly');
    expect(vi.mocked(fetchMonthlyMarket).mock.calls[0][3]).toBeUndefined();
    expect(result.current.state.monthlyLaunches?.market?.scopeKey).toBe('quarterly');
  });
  it('uma falha do histórico preserva o núcleo e oferece recuperação', async () => {
    collect.mockResolvedValue(payload());
    vi.mocked(fetchMonthlyLaunches).mockResolvedValue({ sources: [], issues: ['Histórico incompleto.'] });
    const { result } = renderHook(() => useFortalezaMarket(monthlySelection, ['Fortaleza'], 'token-a', true));
    await act(async () => { await result.current.consult(); });
    expect(result.current.state.report.metrics).not.toBeNull();
    expect(result.current.state.hasFailedCities).toBe(true);
    expect(result.current.state.steps.find(step => step.id === 'sources').status).toBe('attention');
    await act(async () => { await result.current.consult(true); });
    expect(vi.mocked(fetchMonthlyLaunches).mock.calls[1][3]).toEqual({ sources: [], issues: ['Histórico incompleto.'] });
  });
  it('só consulta após ação explícita e bloqueia duplicidade enquanto a primeira está pendente', async () => {
    const request = deferred(); collect.mockReturnValue(request.promise);
    const { result } = renderHook(() => useFortalezaMarket(monthlySelection, ['Fortaleza'], 'token-a', true));
    expect(collect).not.toHaveBeenCalled();
    act(() => { void result.current.consult(); void result.current.consult(); });
    expect(collect).toHaveBeenCalledTimes(1);
    await act(async () => { request.resolve(payload()); await request.promise; });
    await waitFor(() => expect(result.current.state.phase).toBe('done'));
    expect(result.current.state.blueprint.pages).toHaveLength(60);
    expect(result.current.state.steps.every(step => step.status === 'done')).toBe(true);
  });
  it('cancelamento rejeita o resultado que chegar depois', async () => {
    const request = deferred(); collect.mockReturnValue(request.promise);
    const { result } = renderHook(() => useFortalezaMarket(monthlySelection, ['Fortaleza'], 'token-a', true));
    act(() => { void result.current.consult(); });
    const signal = collect.mock.calls[0][2].signal;
    act(() => { result.current.cancel(); });
    expect(signal.aborted).toBe(true);
    await act(async () => { request.resolve(payload()); await request.promise; });
    expect(result.current.state.phase).toBe('cancelled');
    expect(result.current.state.report).toBeNull();
  });
  it('troca de token cancela a anterior e descarta cache antes de nova ação', async () => {
    collect.mockResolvedValue(payload(true));
    const { result, rerender } = renderHook(({ token }) => useFortalezaMarket(monthlySelection, ['Fortaleza'], token, true), { initialProps: { token: 'token-a' } });
    await act(async () => { await result.current.consult(); });
    rerender({ token: 'token-b' });
    expect(result.current.state).toBeNull();
    collect.mockResolvedValue(payload());
    await act(async () => { await result.current.consult(true); });
    expect(collect.mock.calls[1][2].token).toBe('token-b');
    expect(collect.mock.calls[1][3]).toBeUndefined();
  });
  it('troca de período aborta operação pendente e não reaparece com o resultado antigo', async () => {
    const request = deferred(); collect.mockReturnValue(request.promise);
    const { result, rerender } = renderHook(({ position }) => useFortalezaMarket({ ...monthlySelection, position }, ['Fortaleza'], 'token-a', true), { initialProps: { position: 6 } });
    act(() => { void result.current.consult(); });
    const signal = collect.mock.calls[0][2].signal;
    rerender({ position: 7 });
    expect(signal.aborted).toBe(true);
    await act(async () => { request.resolve(payload()); await request.promise; });
    expect(result.current.state).toBeNull();
  });
  it('retry recebe o cache da mesma sessão; nova consulta completa não recebe', async () => {
    const failed = payload(true); collect.mockResolvedValueOnce(failed).mockResolvedValue(payload());
    const { result } = renderHook(() => useFortalezaMarket(monthlySelection, ['Fortaleza'], 'token-a', true));
    await act(async () => { await result.current.consult(); });
    expect(result.current.state.hasFailedCities).toBe(true);
    await act(async () => { await result.current.consult(true); });
    expect(collect.mock.calls[1][3]).toEqual(failed.result);
    await act(async () => { await result.current.consult(); });
    expect(collect.mock.calls[2][3]).toBeUndefined();
  });
  it('perder autorização retira resultados e bloqueia novas consultas', async () => {
    collect.mockResolvedValue(payload());
    const { result, rerender } = renderHook(({ ready }) => useFortalezaMarket(monthlySelection, ['Fortaleza'], 'token-a', ready), { initialProps: { ready: true } });
    await act(async () => { await result.current.consult(); });
    rerender({ ready: false });
    await waitFor(() => expect(result.current.state).toBeNull());
    await act(async () => { await result.current.consult(); });
    expect(collect).toHaveBeenCalledTimes(1);
  });
  it('falha no núcleo preserva o aviso sem impedir as fontes independentes e a estrutura', async () => {
    collect.mockResolvedValue(payload(true));
    const { result } = renderHook(() => useFortalezaMarket(monthlySelection, ['Fortaleza'], 'token-a', true));
    await act(async () => { await result.current.consult(); });
    expect(result.current.state.steps.find(step => step.id === 'sources').status).toBe('attention');
    expect(result.current.state.steps.find(step => step.id === 'structure').status).toBe('done');
    expect(result.current.state.blueprint.pages).toHaveLength(60);
    expect(fetchMonthlyLaunches).toHaveBeenCalledTimes(1);
    expect(fetchFortalezaIntro).toHaveBeenCalled();
    expect(result.current.state.report.metrics).toBeNull();
  });
  it('reproduz os 64 slides bloqueados do diagnóstico real e consulta os históricos mesmo com núcleo reprovado',async()=>{
    const selection={...observedSkipped.selection,territory:'capital-rm' as const,periodicity:'quarterly' as const},cities=[...FORTALEZA_CITIES],base=payload();
    base.report={...base.report,metrics:null,status:'incomplete',issues:observedSkipped.coreIssues,cities:cities.map(city=>({city,status:'incomplete',issue:observedSkipped.coreIssues.find(issue=>issue.startsWith(`${city}:`))??null,lines:[],monthly:[]}))};
    const intro={status:'ready' as const,issues:[],requests:23,startedAt:'',finishedAt:observedSkipped.generatedAt,projects:monthlyLaunchMonths(selection).map((month,index)=>buildIntroProject({building_id:index+1,city:'Fortaleza',building_type:'Vertical',standard:'Standard',release_date:`${month}-01`}))};
    const before=buildFortalezaDiagnostic(selection,{phase:'done',startedAt:0,report:base.report,blueprint:null,intro,monthlyLaunches:null});
    expect(before.summary).toEqual(observedSkipped.summary);
    expect(before.slides.filter(slide=>slide.status==='source-pending').map(slide=>slide.number)).toEqual(observedSkipped.pendingSlides);
    expect(before.sources.municipal).toHaveLength(0);expect(before.sources.detailed).toHaveLength(0);
    expect(before.collection.municipal).toMatchObject({requested:false,expected:45,collected:0});
    collect.mockResolvedValue(base);vi.mocked(fetchFortalezaIntro).mockResolvedValue(intro);
    vi.mocked(fetchMonthlyMarket).mockResolvedValue(monthlyMarketFixture(selection));vi.mocked(fetchMonthlyPrices).mockResolvedValue(quarterlyPriceFixture(selection));
    const {result}=renderHook(()=>useFortalezaMarket(selection,cities,'synthetic-only',true));
    await act(async()=>{await result.current.consult();});
    const state=result.current.state!;
    expect(fetchMonthlyMarket).toHaveBeenCalledTimes(1);expect(fetchMonthlyPrices).toHaveBeenCalledTimes(1);
    expect(state.report.metrics).toBeNull();expect(state.report.issues).toEqual(observedSkipped.coreIssues);
    expect(state.steps.find(step=>step.id==='reconciliation').status).toBe('attention');
    const after=buildFortalezaDiagnostic(selection,state);
    expect(after.sources.municipal).toHaveLength(45);expect(after.sources.detailed).toHaveLength(10);
    expect(after.collection.municipal).toMatchObject({requested:true,expected:45,collected:45});
    expect(after.collection.detailed).toMatchObject({requested:true,expected:10,collected:10});
    expect(after.summary['source-pending']).toBe(0);expect(after.homologated).toBe(false);
  });
  it('uma fonte realmente ausente continua bloqueada após a coleta independente',async()=>{
    const selection={...monthlySelection,periodicity:'quarterly' as const,position:2,territory:'capital-rm' as const},market=monthlyMarketFixture(selection);
    const core=payload();core.report.metrics=null;core.report.status='incomplete';collect.mockResolvedValue(core);
    market.sources.find(source=>source.city==='Fortaleza'&&source.segment==='Vertical'&&source.metric==='releases')!.complete=false;
    vi.mocked(fetchMonthlyMarket).mockResolvedValue(market);vi.mocked(fetchMonthlyPrices).mockResolvedValue(quarterlyPriceFixture(selection));
    const {result}=renderHook(()=>useFortalezaMarket(selection,[...FORTALEZA_CITIES],'synthetic-only',true));
    await act(async()=>{await result.current.consult();});
    const after=buildFortalezaDiagnostic(selection,result.current.state!);
    expect(after.slides[11].status).toBe('source-pending');expect(after.slides[41].status).toBe('available');
    expect(after.sources.municipal).toHaveLength(45);
  });
  it('oferece recuperação quando a paginação concluiu mas o núcleo foi reprovado',async()=>{
    const data=payload();data.report.cities[0].status='incomplete';data.report.metrics=null;
    collect.mockResolvedValue(data);
    const {result}=renderHook(()=>useFortalezaMarket(monthlySelection,['Fortaleza'],'token-a',true));
    await act(async()=>{await result.current.consult();});
    expect(result.current.state.hasFailedCities).toBe(true);
  });
  it('oferece recuperação do cadastro inicial sem repetir fontes concluídas',async()=>{
    collect.mockResolvedValue(payload());
    vi.mocked(fetchFortalezaIntro).mockResolvedValueOnce({status:'blocked',projects:[],issues:['Cadastro indisponível.'],requests:1,startedAt:'',finishedAt:''});
    const {result}=renderHook(()=>useFortalezaMarket(monthlySelection,['Fortaleza'],'token-a',true));
    await act(async()=>{await result.current.consult();});
    expect(result.current.state.hasFailedCities).toBe(true);
    await act(async()=>{await result.current.consult(true);});
    expect(result.current.state.intro.status).toBe('ready');expect(result.current.state.hasFailedCities).toBe(false);
    expect(collect.mock.calls[1][3]).toBeDefined();
  });
  it('progresso segue a etapa real e balanço pendente não recebe conclusão sem ressalva', async () => {
    const request = deferred();
    collect.mockImplementation((_selection, _cities, options) => { options.onStage('sources'); options.onProgress('Fortaleza · vendas líquidas · página 1'); return request.promise; });
    const { result } = renderHook(() => useFortalezaMarket(monthlySelection, ['Fortaleza'], 'token-a', true));
    act(() => { void result.current.consult(); });
    expect(result.current.state.steps.find(step => step.id === 'sources').status).toBe('running');
    expect(result.current.state.message).toContain('vendas líquidas');
    const data = payload(); data.report.issues.push('Há diferenças de balanço a conferir.');
    await act(async () => { request.resolve(data); await request.promise; });
    await waitFor(() => expect(result.current.state.phase).toBe('done'));
    expect(result.current.state.steps.find(step => step.id === 'reconciliation').status).toBe('attention');
    expect(result.current.state.message).toContain('confira');
  });
});
