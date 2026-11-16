import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectMaceioMarket } from './api';
import { buildMaceioMarket } from './market';
import { MACEIO_CITIES_MONTHLY, type MaceioSelection } from './model';
import { useMaceioMarket } from './useMaceioMarket';
import { marketFixture } from './__tests__/market-fixture';

vi.mock('./api', async importOriginal => ({ ...(await importOriginal<typeof import('./api')>()), collectMaceioMarket: vi.fn() }));
const collect = vi.mocked(collectMaceioMarket);

const selection: MaceioSelection = { uf: 'AL', city: 'Maceió', territory: 'capital-rm', periodicity: 'monthly', year: 2026, position: 5 };
const cities = [...MACEIO_CITIES_MONTHLY];
const token = 'synthetic-token';

function successPayload() {
  const inputs = cities.map(city => marketFixture(selection, city));
  const report = buildMaceioMarket(selection, cities, inputs);
  return { report, result: { scopeKey: 'scope', collection: { outcomes: [], completedCities: cities, failedCities: [] } } } as unknown as Awaited<ReturnType<typeof collectMaceioMarket>>;
}

describe('useMaceioMarket', () => {
  beforeEach(() => { collect.mockReset(); });
  it('consulta o núcleo, organiza o blueprint e publica as etapas concluídas', async () => {
    collect.mockResolvedValue(successPayload());
    const { result } = renderHook(() => useMaceioMarket(selection, cities, token, true));
    await act(async () => { await result.current.consult(); });
    await waitFor(() => expect(result.current.state?.phase).toBe('done'));
    const state = result.current.state!;
    expect(state.report?.metrics).toEqual({ launches: 70, sales: 98, stock: 1022 });
    expect(state.blueprint?.pages).toHaveLength(82);
    expect(state.steps.every(step => step.status === 'done')).toBe(true);
    expect(state.hasFailedCities).toBe(false);
    expect(JSON.stringify(state.report)).not.toContain(token);
  });
  it('não consulta sem recorte pronto', async () => {
    const { result } = renderHook(() => useMaceioMarket(selection, cities, token, false));
    await act(async () => { await result.current.consult(); });
    expect(collect).not.toHaveBeenCalled();
    expect(result.current.state).toBeNull();
  });
  it('falha de coleta vira estado de erro sem resultado parcial', async () => {
    collect.mockRejectedValue(new Error('internal-provider-detail'));
    const { result } = renderHook(() => useMaceioMarket(selection, cities, token, true));
    await act(async () => { await result.current.consult(); });
    await waitFor(() => expect(result.current.state?.phase).toBe('error'));
    expect(result.current.state?.report).toBeNull();
    expect(result.current.state?.message).not.toContain('internal-provider-detail');
  });
  it('cancelamento descarta resultados e marca a etapa corrente', async () => {
    collect.mockImplementation(async (_s, _c, options) => { options.onStage?.('sources'); return new Promise(() => {}); });
    const { result } = renderHook(() => useMaceioMarket(selection, cities, token, true));
    act(() => { void result.current.consult(); });
    await waitFor(() => expect(result.current.state?.phase).toBe('loading'));
    act(() => { result.current.cancel(); });
    expect(result.current.state?.phase).toBe('cancelled');
    expect(result.current.state?.report).toBeNull();
    expect(result.current.state?.steps.some(step => step.status === 'cancelled')).toBe(true);
  });
  it('troca de período/token zera o estado e o cache', async () => {
    collect.mockResolvedValue(successPayload());
    const { result, rerender } = renderHook(({ sel }) => useMaceioMarket(sel, cities, token, true), { initialProps: { sel: selection } });
    await act(async () => { await result.current.consult(); });
    await waitFor(() => expect(result.current.state?.phase).toBe('done'));
    rerender({ sel: { ...selection, position: 6 } });
    expect(result.current.state).toBeNull();
  });
});
