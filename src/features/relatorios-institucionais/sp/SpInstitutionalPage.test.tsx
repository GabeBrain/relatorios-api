import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import SpInstitutionalPage from './SpInstitutionalPage';

const access = vi.hoisted(() => ({ token: 'synthetic-token', error: false, loading: false, fixtureMode: 'success', apiMode: 'success', aborted: false, seriesPending: false, salesPending: false, stockPending: false, neighborhoodsPending: false, neighborhoodCalls: 0, typologiesPending: false, projectsPending: false, finishProjects: null as (() => void) | null, reload: vi.fn() }));
vi.mock('@/store/auth-store', () => ({ useAuthStore: (selector: (state: { getToken: () => string }) => unknown) => selector({ getToken: () => access.token }) }));
vi.mock('@/features/shared/geo-api-scope-engine', () => ({
  GeoApiScopeSelector: ({ onChange }: { onChange: (geo: { uf: string; city: string }) => void }) => <div><button onClick={() => onChange({ uf: 'SP', city: 'São Paulo' })}>Escolher capital</button><button onClick={() => onChange({ uf: 'SP', city: 'Campinas' })}>Escolher Campinas</button><button onClick={() => onChange({ uf: 'RJ', city: '' })}>Trocar UF</button></div>,
  useGeoApiScope: ({ value }: { value: { city: string } }) => ({ strictReady: Boolean(value.city && access.token), hasToken: Boolean(access.token), isLoading: access.loading, error: access.error ? new Error('failed') : null, reload: access.reload }),
}));
vi.mock('./fixture', async importOriginal => {
  const original = await importOriginal<typeof import('./fixture')>();
  return { spFixture: () => {
    if (access.fixtureMode === 'error') throw new Error('private diagnostic detail');
    const data = original.spFixture();
    return access.fixtureMode === 'empty' ? { ...data, buildings: [] } : data;
  } };
});
vi.mock('./api', async () => {
  const { recordedInput } = await import('./__tests__/recorded');
  const { syntheticWindow } = await import('./__tests__/synthetic-window');
  const { userSeptemberReplay } = await import('./__tests__/user-september');
  const { syntheticTypologyInput, syntheticPreviousTypology } = await import('./__tests__/typology');
  const { syntheticHistoryBatch } = await import('./__tests__/history-batch');
  const { syntheticLaunchSeries, syntheticSalesSeries, syntheticVglInput, syntheticStockSeries } = await import('./__tests__/launch-series');
  const { buildSpMunicipalPrices } = await import('./municipal-prices');
  return { fetchSpMunicipalPrices: async (report: import('./model').SpPreview) => buildSpMunicipalPrices([], report), fetchSpTemporalInput: async (_quarter: string, options: { signal: AbortSignal; groupBy?: 'Padrão' | 'Tipologia' }) => {
    if (access.apiMode === 'error') throw new Error('private API diagnostic');
    if (access.apiMode === 'pending') return new Promise((_resolve, reject) => { options.signal.addEventListener('abort', () => { access.aborted = true; reject(new DOMException('cancelled', 'AbortError')); }); });
    if (options.groupBy === 'Tipologia') {
      if (access.typologiesPending) await new Promise((_resolve, reject) => { options.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError'))); });
      const data = access.apiMode === 'user-september' ? userSeptemberReplay() : access.apiMode === 'closed' ? syntheticWindow('09') : recordedInput();
      return _quarter === '3T2025' ? syntheticPreviousTypology(data) : syntheticTypologyInput(data);
    }
    return { ...syntheticVglInput(['closed', 'user-september'].includes(access.apiMode) ? { ...(access.apiMode === 'user-september' ? userSeptemberReplay() : syntheticWindow('09')), groupBy: options.groupBy ?? 'Padrão' } : recordedInput()), origin: 'api' };
  }, fetchSpLaunchSeriesRows: async (_report: unknown, options: { signal: AbortSignal }) => {
    if (access.seriesPending) await new Promise((_resolve, reject) => { options.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError'))); });
    if (access.apiMode === 'error') throw new Error('private long series diagnostic');
    const input = access.apiMode === 'user-september' ? userSeptemberReplay() : access.apiMode === 'closed' ? syntheticWindow('09') : recordedInput();
    return syntheticLaunchSeries(input);
  }, fetchSpSalesSeriesRows: async (_report: unknown, options: { signal: AbortSignal }) => {
    if (access.salesPending) await new Promise((_resolve, reject) => { options.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError'))); });
    if (access.apiMode === 'error') throw new Error('private sales series diagnostic');
    return syntheticSalesSeries(access.apiMode === 'user-september' ? userSeptemberReplay() : access.apiMode === 'closed' ? syntheticWindow('09') : recordedInput());
  }, fetchSpStockSeriesRows: async (_report: unknown, options: { signal: AbortSignal }) => {
    if (access.stockPending) await new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError'))));
    if (access.apiMode === 'error') throw new Error('private stock diagnostic');
    return syntheticStockSeries(access.apiMode === 'user-september' ? userSeptemberReplay() : access.apiMode === 'closed' ? syntheticWindow('09') : recordedInput());
  }, fetchSpHistoryBatch: async (_report: unknown, options: { signal: AbortSignal }) => {
    if (access.apiMode === 'error') throw new Error('private historical API diagnostic');
    if (access.apiMode === 'pending') return new Promise((_resolve, reject) => { options.signal.addEventListener('abort', () => { access.aborted = true; reject(new DOMException('cancelled', 'AbortError')); }); });
    const data = syntheticHistoryBatch();
    if (access.apiMode === 'unbalanced') data.previous.stock[0].stock = Number(data.previous.stock[0].stock) + 1;
    return data;
  } };
});
vi.mock('./projects', async importOriginal => {
  const original = await importOriginal<typeof import('./projects')>();
  const { syntheticGranularBuildings } = await import('./__tests__/granular-buildings');
  return { ...original, fetchSpBuildingRecords: async (_report: unknown, options: { signal: AbortSignal }) => {
    access.neighborhoodCalls++;
    if (access.neighborhoodsPending) await new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError'))));
    return syntheticGranularBuildings();
  }, fetchSpProjects: async (report: import('./model').SpPreview, options: { signal: AbortSignal }) => {
    if (access.fixtureMode === 'granular-error') throw new Error('private granular diagnostic');
    if (access.projectsPending) await new Promise<void>((resolve, reject) => { access.finishProjects = resolve; options.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError'))); });
    return original.buildSpProjects([{ building_id: 1, city: 'São Paulo', state: 'SP', building_type: 'Vertical', release_date: '2026-07-01', standard: 'Econômico' }], report);
  } };
});
beforeEach(() => { vi.setSystemTime(new Date('2026-11-03T12:00:00Z')); access.token = 'synthetic-token'; access.error = false; access.loading = false; access.fixtureMode = 'success'; access.apiMode = 'success'; access.aborted = false; access.seriesPending = false; access.salesPending = false; access.stockPending = false; access.neighborhoodsPending = false; access.neighborhoodCalls = 0; access.typologiesPending = false; access.projectsPending = false; access.finishProjects = null; access.reload.mockClear(); });
afterEach(()=>{cleanup();vi.useRealTimers();});

describe('Geração automática SP institucional', () => {
  const generate=()=>{fireEvent.click(screen.getByText('Escolher capital'));fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));};
  const finished=()=>screen.findByRole('heading',{name:/Relatório gerado/});
  it('executa todas as etapas com um clique e compartilha históricos',async()=>{
    render(<SpInstitutionalPage/>);generate();await finished();
    expect(access.neighborhoodCalls).toBe(1);
    expect(document.querySelectorAll('[data-status="waiting"],[data-status="running"]')).toHaveLength(0);
    expect(screen.queryByRole('button',{name:/Conferir detalhamentos/})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'53. Evolução R$/m², média geral'}));
    expect(access.neighborhoodCalls).toBe(1);
    fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));await finished();
    expect(access.neighborhoodCalls).toBe(2);
  });
  it('preserva a memória de cálculo e ressalvas nos insights',async()=>{
    render(<SpInstitutionalPage/>);generate();await finished();
    fireEvent.mouseDown(screen.getByRole('tab',{name:'Insights do analista'}),{button:0,ctrlKey:false});
    await screen.findByRole('heading',{name:'Insights para o analista'});
    expect(screen.getByText('Conciliação mês a mês')).toBeInTheDocument();
    expect(screen.getByText(/Uma diferença não comprova distrato/)).toBeInTheDocument();
    expect(screen.getByRole('columnheader',{name:'Oferta inicial'})).toBeInTheDocument();
  });
  it('cancela a coleta inicial e permite retomar',async()=>{
    access.apiMode='pending';render(<SpInstitutionalPage/>);generate();
    const dialog=await screen.findByRole('region',{name:'Carregamento do relatório'});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Etapa 1 de 8/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button',{name:'Cancelar geração'}));
    expect(access.aborted).toBe(true);expect(screen.getByText('Geração interrompida')).toBeInTheDocument();
    access.apiMode='success';fireEvent.click(screen.getByRole('button',{name:'Retomar geração'}));await finished();
  });
  it('retoma uma etapa interrompida preservando as anteriores',async()=>{
    access.seriesPending=true;render(<SpInstitutionalPage/>);generate();
    await waitFor(()=>expect(document.querySelector('[data-step="launches"]')).toHaveAttribute('data-status','running'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.queryByRole('article')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Cancelar geração'}));
    expect(document.querySelector('[data-step="municipal"]')).toHaveAttribute('data-status','warning');
    access.seriesPending=false;fireEvent.click(screen.getByRole('button',{name:'Retomar geração'}));await finished();
  });
  it('bloqueia chamadas sem catálogo ou fora do modelo',()=>{
    access.error=true;render(<SpInstitutionalPage/>);
    expect(screen.getByRole('button',{name:'Gerar relatório'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Tentar carregar cidades novamente'}));expect(access.reload).toHaveBeenCalledOnce();
    cleanup();access.error=false;render(<SpInstitutionalPage/>);fireEvent.click(screen.getByText('Escolher Campinas'));
    expect(screen.getByRole('button',{name:'Gerar relatório'})).toBeDisabled();expect(access.neighborhoodCalls).toBe(0);
  });
  it('trata falha inicial sem expor diagnóstico privado e repete',async()=>{
    access.apiMode='error';render(<SpInstitutionalPage/>);generate();await screen.findByText('Não foi possível iniciar o relatório');
    expect(document.body).not.toHaveTextContent('private API diagnostic');expect(access.neighborhoodCalls).toBe(0);
    access.apiMode='success';fireEvent.click(screen.getByRole('button',{name:'Repetir etapas pendentes'}));await finished();
  });
  it('invalida resultados e aborta ao trocar escopo ou autenticação',async()=>{
    const view=render(<SpInstitutionalPage/>);generate();await finished();
    fireEvent.click(screen.getByText('Trocar UF'));expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('region',{name:'Etapas de geração'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Escolher capital'));access.apiMode='pending';fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));
    await screen.findByRole('region',{name:'Carregamento do relatório'});access.token='';view.rerender(<SpInstitutionalPage/>);
    await waitFor(()=>expect(screen.queryByRole('region',{name:'Carregamento do relatório'})).not.toBeInTheDocument());expect(access.aborted).toBe(true);
  });
});
