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
  return { fetchSpTemporalInput: async (_quarter: string, options: { signal: AbortSignal; groupBy?: 'Padrão' | 'Tipologia' }) => {
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
    return original.buildSpProjects([{ building_id: 1, city: 'São Paulo', state: 'SP', building_type: 'Vertical', release_date: '2026-07-01' }], report);
  } };
});
beforeEach(() => { access.token = 'synthetic-token'; access.error = false; access.loading = false; access.fixtureMode = 'success'; access.apiMode = 'success'; access.aborted = false; access.seriesPending = false; access.salesPending = false; access.stockPending = false; access.neighborhoodsPending = false; access.neighborhoodCalls = 0; access.typologiesPending = false; access.projectsPending = false; access.finishProjects = null; access.reload.mockClear(); });
afterEach(cleanup);

describe('Página SP institucional', () => {
  it('compartilha uma coleta entre preços, área e bairros e invalida cache em nova geração', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText(/Oferta histórica conferida desde janeiro/);
    fireEvent.click(screen.getByRole('button', { name: '53. Evolução R$/m², média geral' }));
    await screen.findByText(/Históricos de áreas e preços processados/);
    expect(access.neighborhoodCalls).toBe(1);
    for (const title of ['51. IVV por área útil, tabela MCMV/demais padrões','55. Evolução R$/m², 1 dormitório sem MCMV','61. Ticket médio por sete padrões e média geral','39. Top 10 bairros por vendas líquidas']) {
      fireEvent.click(screen.getByRole('button', { name: title }));
      expect(screen.getByRole('article')).not.toHaveTextContent('em conferência');
    }
    expect(access.neighborhoodCalls).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText(/Oferta histórica conferida desde janeiro/);
    fireEvent.click(screen.getByRole('button', { name: '53. Evolução R$/m², média geral' }));
    await screen.findByText(/Históricos de áreas e preços processados/);
    expect(access.neighborhoodCalls).toBe(2);
  });
  it('recuperar oferta revalida os históricos em memória sem repetir a coleta pesada', async () => {
    access.stockPending = true;
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByRole('button', { name: 'Cancelar oferta histórica' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar oferta histórica' }));
    await screen.findByText('Oferta histórica indisponível');
    fireEvent.click(screen.getByRole('button', { name: '51. IVV por área útil, tabela MCMV/demais padrões' }));
    await screen.findByText(/Históricos de áreas e preços processados/);
    expect(screen.getByRole('article')).toHaveTextContent('em conferência');
    expect(access.neighborhoodCalls).toBe(1);
    access.stockPending = false;
    fireEvent.click(screen.getByRole('button', { name: 'Conferir oferta histórica' }));
    await waitFor(() => expect(screen.getByRole('article')).not.toHaveTextContent('em conferência'));
    expect(access.neighborhoodCalls).toBe(1);
  });
  it('só coleta históricos de bairros ao abrir39, mantém demais slides e permite cancelar/repetir', async () => {
    access.neighborhoodsPending = true;
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText(/Oferta histórica conferida desde janeiro/);
    expect(access.neighborhoodCalls).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '39. Top 10 bairros por vendas líquidas' }));
    await screen.findByRole('button', { name: 'Cancelar históricos detalhados' });
    expect(access.neighborhoodCalls).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '39. Top 10 bairros por vendas líquidas' }));
    expect(access.neighborhoodCalls).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '40. VGV vendido trimestral, corrigido INCC' }));
    expect(screen.queryByRole('dialog', { name: 'Consulta do relatório' })).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar históricos detalhados' }));
    await screen.findByText('Vendas por bairro indisponíveis');
    access.neighborhoodsPending = false;
    fireEvent.click(screen.getByRole('button', { name: 'Conferir vendas por bairro' }));
    await screen.findByText(/Vendas por bairro conferidas por mês/);
    expect(access.neighborhoodCalls).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: '39. Top 10 bairros por vendas líquidas' }));
    expect(screen.getByRole('article')).not.toHaveTextContent('em conferência');
    fireEvent.click(screen.getByText('Trocar UF'));
    expect(screen.queryByRole('region', { name: 'Páginas do relatório' })).not.toBeInTheDocument();
  });
  it('oferta pode cancelar e repetir sem retirar vendas, moeda ou totais municipais', async () => {
    access.stockPending = true;
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByRole('button', { name: 'Cancelar oferta histórica' });
    await screen.findByText(/VGV vendido corrigido pelo INCC-DI/);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar oferta histórica' }));
    await screen.findByText('Oferta histórica indisponível');
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
    access.stockPending = false;
    fireEvent.click(screen.getByRole('button', { name: 'Conferir oferta histórica' }));
    await screen.findByText(/Oferta histórica conferida desde janeiro/);
    expect(screen.getByText(/VGV vendido corrigido pelo INCC-DI/)).toBeInTheDocument();
  });
  it('série longa não bloqueia municipal ou empreendimentos, pode cancelar e repetir isoladamente', async () => {
    access.seriesPending = true;
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText(/Cobertura conferida:/);
    expect(screen.queryByRole('dialog', { name: 'Consulta do relatório' })).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar série de lançamentos' }));
    await screen.findByText('Séries de lançamentos indisponíveis');
    expect(screen.getByText(/Cobertura conferida:/)).toBeInTheDocument();
    access.seriesPending = false;
    fireEvent.click(screen.getByRole('button', { name: 'Conferir séries de lançamentos' }));
    await screen.findByText(/Séries de unidades lançadas conferidas desde janeiro de 2021/);
  });
  it('cancela vendas e tipologias independentemente, preservando municipal e permitindo repetir', async () => {
    access.salesPending = true; access.typologiesPending = true;
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText(/Cobertura conferida:/);
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar série de vendas' }));
    await screen.findByText('Séries de vendas indisponíveis');
    expect(screen.getByRole('button', { name: 'Cancelar tipologias' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar tipologias' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancelar tipologias' })).not.toBeInTheDocument());
    access.salesPending = false; access.typologiesPending = false;
    fireEvent.click(screen.getByRole('button', { name: 'Conferir séries de vendas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir tipologias' }));
    await screen.findByText(/Séries de vendas líquidas conferidas/);
    await screen.findByText(/Tipologias conferidas:/);
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
  });
  it('libera municipal antes da contagem, permite cancelar e repetir somente empreendimentos', async () => {
    access.projectsPending = true;
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText('Conferência parcial de dados da API');
    expect(screen.queryByRole('dialog', { name: 'Consulta do relatório' })).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar contagem' }));
    await screen.findByText('Contagem de empreendimentos indisponível');
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
    access.projectsPending = false;
    fireEvent.click(screen.getByRole('button', { name: 'Conferir empreendimentos' }));
    await screen.findByText(/Cobertura conferida:/);
  });
  it('mescla contagem tardia com históricos e tipologias sem apagar nenhum resultado', async () => {
    access.projectsPending = true;
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText('Conferência parcial de dados da API');
    fireEvent.click(screen.getByRole('button', { name: 'Conferir históricos' }));
    await screen.findByText(/Três comparativos conferidos/);
    access.finishProjects?.();
    await screen.findByText(/Cobertura conferida:/);
    expect(screen.getByText(/Três comparativos conferidos/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Conferir tipologias' }));
    await screen.findByText(/Tipologias conferidas:/);
    expect(screen.getByText(/Cobertura conferida:/)).toBeInTheDocument();
  });
  it('ignora contagem antiga ao trocar o escopo', async () => {
    access.projectsPending = true;
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText('Conferência parcial de dados da API');
    fireEvent.click(screen.getByText('Escolher Campinas'));
    access.finishProjects?.();
    expect(screen.queryByRole('region', { name: 'Prévia do estudo' })).not.toBeInTheDocument();
  });
  it('preenche slide 2 e preserva os totais municipais quando a coleta granular falha', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText(/Cobertura conferida:/);
    fireEvent.click(screen.getByRole('button', { name: '13. Empreendimentos lançados, série trimestral' }));
    expect(screen.getByRole('article')).toHaveTextContent('Reconstituição do cadastro atual');
    expect(screen.getByRole('article')).not.toHaveTextContent('Contagem de empreendimentos pendente');
    access.fixtureMode = 'granular-error';
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText('Contagem de empreendimentos indisponível');
    expect(screen.getByText('Conferência parcial de dados da API')).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Indisponível' })).toHaveLength(1);
    expect(screen.queryByText('private granular diagnostic')).not.toBeInTheDocument();
  });
  it('exibe setembro e o diagnóstico de 22 unidades sem zerar os valores da fonte', async () => {
    access.apiMode = 'user-september';
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText('Trimestre completo nas séries municipais da API');
    expect(screen.getByText(/Balanço 2026-09: diferença de 22 unidades entre estoque/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /trimestre completo até setembro/ })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Diferenças de balanço por grupo'));
    expect(screen.getAllByRole('cell', { name: '126.307' }).length).toBeGreaterThan(0);
    expect(screen.getByText(/não comprovam sua causa/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '46. Oferta final histórica e escoamento por padrão' }));
    expect(screen.getByRole('article')).toHaveTextContent('126.307');
  });
  it('nova geração substitui a parcial pelo trimestre fechado e mantém os detalhamentos disponíveis', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText('Conferência parcial de dados da API');
    access.apiMode = 'closed';
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByText('Trimestre completo nas séries municipais da API');
    expect(screen.getByRole('heading', { name: /3T2026 · trimestre completo até setembro/ })).toBeInTheDocument();
    expect(screen.queryByText('Conferência parcial de dados da API')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conferir históricos' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Conferir tipologias' }));
    await screen.findByText(/Tipologias conferidas:/);
    fireEvent.click(screen.getByRole('button', { name: '24. Lançamentos por segmento, comparação anual' }));
    expect(screen.getByRole('img', { name: 'Comparação anual por segmento · lançamentos' })).toBeInTheDocument();
    expect(screen.queryAllByRole('cell', { name: 'Indisponível' })).toHaveLength(0);
  });
  it('um balanço anterior divergente não oculta comparativos presentes', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByRole('button', { name: 'Conferir históricos' });
    access.apiMode = 'unbalanced';
    fireEvent.click(screen.getByRole('button', { name: 'Conferir históricos' }));
    await screen.findByText(/Três comparativos conferidos/);
    for (const title of ['24. Lançamentos por segmento, comparação anual', '38. Vendas por segmento, comparação anual', '48. Oferta por segmento, comparação anual']) {
      fireEvent.click(screen.getByRole('button', { name: title }));
      expect(within(screen.getByRole('article')).getByRole('img', { name: title.startsWith('48.') ? 'Comparação anual por segmento · oferta' : `Comparação anual por segmento · ${title.startsWith('24.') ? 'lançamentos' : 'vendas'}` })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('cell', { name: '124.706' })).toHaveLength(2);
  });
  it('busca o comparativo sob demanda, mantém a parcial e preserva a oferta independente após falha', async () => {
    render(<SpInstitutionalPage />);
    expect(screen.queryByRole('button', { name: 'Conferir históricos' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Conferir históricos' }));
    await screen.findByText(/Três comparativos conferidos/);
    fireEvent.click(screen.getByRole('button', { name: '48. Oferta por segmento, comparação anual' }));
    expect(screen.getByRole('img', { name: 'Comparação anual por segmento · oferta' })).toBeInTheDocument();
    access.apiMode = 'error';
    fireEvent.click(screen.getByRole('button', { name: 'Conferir históricos' }));
    expect(await screen.findByText('Não foi possível conferir os históricos')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Comparação anual por segmento · oferta' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '24.351' })).toBeInTheDocument();
    expect(screen.queryByText('private historical API diagnostic')).not.toBeInTheDocument();
    access.apiMode = 'success';
    fireEvent.click(screen.getByRole('button', { name: 'Conferir históricos' }));
    await screen.findByText(/Três comparativos conferidos/);
    fireEvent.click(screen.getByText('Trocar UF'));
    expect(screen.queryByRole('region', { name: 'Páginas do relatório' })).not.toBeInTheDocument();
  });
  it('cancela a consulta histórica e não mantém um resultado de outro escopo', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    await screen.findByRole('button', { name: 'Conferir históricos' });
    access.apiMode = 'pending';
    fireEvent.click(screen.getByRole('button', { name: 'Conferir históricos' }));
    await screen.findByRole('button', { name: 'Cancelar consulta' });
    await new Promise(resolve => setTimeout(resolve, 0));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar consulta' }));
    expect(access.aborted).toBe(true);
    expect(screen.queryByRole('region', { name: 'Páginas do relatório' })).not.toBeInTheDocument();
    expect(screen.queryByText('Não foi possível conferir os históricos')).not.toBeInTheDocument();
  });
  it('mostra os padrões recebidos sem converter Econômico em MCMV e limpa ao trocar escopo', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    const panel = within(await screen.findByRole('region', { name: 'Conferência dos padrões' }));
    fireEvent.click(panel.getByText('Ver padrões recebidos da API'));
    expect(panel.getByRole('cell', { name: 'Econômico' })).toBeInTheDocument();
    expect(panel.getByRole('cell', { name: '20.328' })).toBeInTheDocument();
    expect(panel.queryByRole('cell', { name: 'MCMV' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Trocar UF'));
    expect(screen.queryByRole('region', { name: 'Conferência dos padrões' })).not.toBeInTheDocument();
  });
  it('confere tipologias sob demanda e mantém o bloqueio de trimestre completo', async () => {
    render(<SpInstitutionalPage />);
    expect(screen.queryByRole('button', { name: 'Conferir tipologias' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Conferir tipologias' }));
    expect(await screen.findByText(/Tipologias conferidas:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '23. Lançamentos por tipologia, comparação com mesmo trimestre anterior' }));
    expect(screen.getByRole('img', { name: 'Comparação anual por tipologia · lançamentos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /3T2026 · parcial até agosto/ })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Trocar UF'));
    expect(screen.queryByRole('button', { name: 'Conferir tipologias' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Páginas do relatório' })).not.toBeInTheDocument();
  });
  it('retira tipologias antigas em falha de uma nova consulta e permite tentar novamente', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Conferir tipologias' }));
    await screen.findByText(/Tipologias conferidas:/);
    access.apiMode = 'error';
    fireEvent.click(screen.getByRole('button', { name: 'Conferir tipologias' }));
    expect(await screen.findByText('Não foi possível conferir as tipologias')).toBeInTheDocument();
    expect(screen.queryByText(/Tipologias conferidas:/)).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
    expect(screen.queryByText('private API diagnostic')).not.toBeInTheDocument();
    access.apiMode = 'success';
    fireEvent.click(screen.getByRole('button', { name: 'Conferir tipologias' }));
    expect(await screen.findByText(/Tipologias conferidas:/)).toBeInTheDocument();
  });
  it('bloqueia acesso sem token ou município válido', () => {
    access.token = '';
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    expect(screen.getByRole('button', { name: 'Ver prévia com dados de teste' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Conferir dados reais' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Prévia do estudo' })).not.toBeInTheDocument();
  });
  it('identifica dados fictícios e bloqueia indicadores do trimestre aberto', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Ver prévia com dados de teste' }));
    expect(await screen.findByText('Trimestre ainda não fechado')).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Indisponível' })).toHaveLength(4);
    expect(screen.getByText('Prévia de desenvolvimento · dados fictícios')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Trocar UF'));
    expect(screen.queryByRole('region', { name: 'Prévia do estudo' })).not.toBeInTheDocument();
  });
  it('não mostra prévia antiga para outra cidade ou identidade', async () => {
    const view = render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Ver prévia com dados de teste' }));
    await screen.findByText('Trimestre ainda não fechado');
    access.token = 'another-synthetic-token'; view.rerender(<SpInstitutionalPage />);
    expect(screen.queryByRole('region', { name: 'Prévia do estudo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Escolher Campinas'));
    expect(screen.getByRole('button', { name: 'Ver prévia com dados de teste' })).toBeDisabled();
  });
  it('expõe carregamento e erro de catálogo sem liberar a ação', () => {
    access.loading = true;
    const view = render(<SpInstitutionalPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando municípios autorizados');
    access.loading = false; access.error = true; view.rerender(<SpInstitutionalPage />);
    expect(screen.getByText('Não foi possível carregar as cidades autorizadas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar cidades novamente' }));
    expect(access.reload).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Ver prévia com dados de teste' })).toBeDisabled();
  });
  it('trata fonte vazia sem indicadores zero', async () => {
    access.fixtureMode = 'empty';
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Ver prévia com dados de teste' }));
    expect(await screen.findByText('Nenhum empreendimento disponível para comprovar o fechamento.')).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Indisponível' })).toHaveLength(4);
  });
  it('recupera falha da prévia sem expor diagnóstico interno', async () => {
    access.fixtureMode = 'error';
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Ver prévia com dados de teste' }));
    expect(await screen.findByText('Não foi possível preparar a prévia')).toBeInTheDocument();
    expect(screen.queryByText('private diagnostic detail')).not.toBeInTheDocument();
    access.fixtureMode = 'success';
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Trimestre ainda não fechado')).toBeInTheDocument();
  });
  it('mostra julho/agosto como parcial, com empreendimento contado e sem rótulo fictício', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    expect(await screen.findByText('Conferência parcial de dados da API')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /3T2026 · parcial até agosto de 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
    expect(screen.queryAllByRole('cell', { name: 'Indisponível' })).toHaveLength(0);
    expect(screen.queryByText('Prévia de desenvolvimento · dados fictícios')).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'setembro de 2026' })).not.toBeInTheDocument();
  });
  it('cancela leitura pendente sem publicar resultado ou mostrar erro', async () => {
    access.apiMode = 'pending';
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    // Wait until the dynamic adapter is entered, then cancel the operation.
    await screen.findByRole('button', { name: 'Cancelar consulta' });
    await new Promise(resolve => setTimeout(resolve, 0));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar consulta' }));
    expect(access.aborted).toBe(true);
    expect(screen.queryByRole('region', { name: 'Prévia do estudo' })).not.toBeInTheDocument();
    expect(screen.queryByText('Não foi possível preparar a prévia')).not.toBeInTheDocument();
  });
});
