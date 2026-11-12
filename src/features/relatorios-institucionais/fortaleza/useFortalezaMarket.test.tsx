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

vi.mock('./api', () => ({ collectFortalezaMarket: vi.fn() }));
vi.mock('./intro-data', () => ({ fetchFortalezaIntro: vi.fn() }));
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
  it('fontes incompletas não marcam a prévia como organizada', async () => {
    collect.mockResolvedValue(payload(true));
    const { result } = renderHook(() => useFortalezaMarket(monthlySelection, ['Fortaleza'], 'token-a', true));
    await act(async () => { await result.current.consult(); });
    expect(result.current.state.steps.find(step => step.id === 'sources').status).toBe('attention');
    expect(result.current.state.steps.find(step => step.id === 'structure').status).toBe('waiting');
    expect(result.current.state.blueprint).toBeNull();
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
