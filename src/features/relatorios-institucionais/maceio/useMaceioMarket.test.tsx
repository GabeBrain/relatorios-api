import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectMaceioMarket } from './api';
import { buildMaceioMarket } from './market';
import { MACEIO_CITIES_MONTHLY, type MaceioSelection } from './model';
import { useMaceioMarket } from './useMaceioMarket';
import { marketFixture } from './__tests__/market-fixture';
import {collectMaceioCaged} from './caged-api';
import {cagedFixture} from './__tests__/caged-fixture';

vi.mock('./api', async importOriginal => ({ ...(await importOriginal<typeof import('./api')>()), collectMaceioMarket: vi.fn() }));
vi.mock('./intro-data',()=>({collectMaceioIntro:vi.fn(async()=>({cities:[],collectedAt:'2026-11-16T12:00:00Z'}))}));
vi.mock('./market-slides-data',()=>({collectMaceioMarketSlides:vi.fn(async()=>({sources:[],start:'2021-01',end:'2026-05',finishedAt:'2026-11-16T12:00:00Z'}))}));
vi.mock('./caged-api',async()=>{const {cagedFixture}=await import('./__tests__/caged-fixture');return {collectMaceioCaged:vi.fn(async()=>({report:cagedFixture(),issue:null}))};});
const collect = vi.mocked(collectMaceioMarket);
const cagedCollect=vi.mocked(collectMaceioCaged);

const selection: MaceioSelection = { uf: 'AL', city: 'Maceió', territory: 'capital-rm', periodicity: 'monthly', year: 2026, position: 5 };
const cities = [...MACEIO_CITIES_MONTHLY];
const token = 'synthetic-token';

function successPayload() {
  const inputs = cities.map(city => marketFixture(selection, city));
  const report = buildMaceioMarket(selection, cities, inputs);
  return { report, result: { scopeKey: 'scope', collection: { outcomes: [], completedCities: cities, failedCities: [] } } } as unknown as Awaited<ReturnType<typeof collectMaceioMarket>>;
}

describe('useMaceioMarket', () => {
  beforeEach(() => { collect.mockReset(); cagedCollect.mockResolvedValue({report:cagedFixture(),issue:null}); cagedCollect.mockClear(); });
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
  it('falha CAGED preserva núcleo e retry consulta a fonte novamente',async()=>{
    collect.mockResolvedValue(successPayload());cagedCollect.mockResolvedValueOnce({report:null,issue:'Fonte indisponível.'});
    const {result}=renderHook(()=>useMaceioMarket(selection,cities,token,true));
    await act(async()=>{await result.current.consult();});
    expect(result.current.state?.report?.metrics).toBeTruthy();expect(result.current.state?.hasFailedCities).toBe(true);expect(result.current.state?.steps.find(step=>step.id==='caged')?.status).toBe('attention');
    await act(async()=>{await result.current.consult(true);});expect(cagedCollect).toHaveBeenCalledTimes(2);expect(result.current.state?.steps.find(step=>step.id==='caged')?.status).toBe('done');
  });
  it('cancelamento enquanto CAGED responde impede publicar a resposta atrasada',async()=>{
    collect.mockResolvedValue(successPayload());let finish:(value:Awaited<ReturnType<typeof collectMaceioCaged>>)=>void;
    cagedCollect.mockImplementationOnce(async()=>new Promise(resolve=>{finish=resolve;}));
    const {result}=renderHook(()=>useMaceioMarket(selection,cities,token,true));let pending:Promise<void>;
    act(()=>{pending=result.current.consult();});await waitFor(()=>expect(result.current.state?.steps.find(step=>step.id==='caged')?.status).toBe('running'));
    act(()=>result.current.cancel());await act(async()=>{finish!({report:cagedFixture(),issue:null});await pending;});
    expect(result.current.state?.phase).toBe('cancelled');expect(result.current.state?.report).toBeNull();expect(result.current.state?.intro).toBeUndefined();
  });
});
