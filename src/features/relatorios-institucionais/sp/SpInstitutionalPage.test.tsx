import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import SpInstitutionalPage from './SpInstitutionalPage';

const access = vi.hoisted(() => ({ token: 'synthetic-token', error: false, loading: false, fixtureMode: 'success', apiMode: 'success', aborted: false, reload: vi.fn() }));
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
  const { syntheticTypologyInput } = await import('./__tests__/typology');
  return { fetchSpTemporalInput: async (_quarter: string, options: { signal: AbortSignal; groupBy?: string }) => {
    if (access.apiMode === 'error') throw new Error('private API diagnostic');
    if (access.apiMode === 'pending') return new Promise((_resolve, reject) => { options.signal.addEventListener('abort', () => { access.aborted = true; reject(new DOMException('cancelled', 'AbortError')); }); });
    return { ...(options.groupBy === 'Tipologia' ? syntheticTypologyInput() : recordedInput()), origin: 'api' };
  } };
});
beforeEach(() => { access.token = 'synthetic-token'; access.error = false; access.loading = false; access.fixtureMode = 'success'; access.apiMode = 'success'; access.aborted = false; access.reload.mockClear(); });
afterEach(cleanup);

describe('Página SP institucional', () => {
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
    fireEvent.click(screen.getByRole('button', { name: '6. Lançamentos por tipologia' }));
    expect(screen.getByRole('img', { name: 'Distribuição por tipologia em unidades e participação percentual' })).toBeInTheDocument();
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
  it('mostra julho/agosto como parcial, com empreendimento indisponível e sem rótulo fictício', async () => {
    render(<SpInstitutionalPage />);
    fireEvent.click(screen.getByText('Escolher capital'));
    fireEvent.click(screen.getByRole('button', { name: 'Conferir dados reais' }));
    expect(await screen.findByText('Conferência parcial de dados da API')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /3T2026 · parcial até agosto de 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '26.824' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Indisponível' })).toHaveLength(1);
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
