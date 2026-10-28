import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/auth-store';
import { fetchBuildings } from '@/features/relatorio-api-excel/api';
import * as engine from '@/features/relatorio-api-excel/report';
import RelatorioApiExcel from '../RelatorioApiExcel';

vi.mock('@/features/relatorio-api-excel/api', () => ({ fetchBuildings: vi.fn() }));
vi.mock('@/features/relatorio-api-excel/report', async (original) => {
  const actual = await original<typeof import('@/features/relatorio-api-excel/report')>();
  return { ...actual, buildReport: vi.fn(actual.buildReport), dateBounds: vi.fn(actual.dateBounds) };
});
vi.mock('@/features/shared/geo-api-scope-engine', () => ({
  GeoApiScopeSelector: ({ onLoad }: { onLoad: (request: { uf: string }) => void }) => <button onClick={() => onLoad({ uf: 'MT' })}>Carregar</button>,
  useGeoApiScope: () => ({ error: null, isLoading: false, citiesByUf: { MT: ['Sinop'] }, availableUfs: ['MT'], availableCities: ['Sinop'] }),
}));

const sample = [{ building_id: 10, name: 'Teste', city: 'Sinop', state: 'MT', building_type: 'Vertical', status: 'Ativo', release_date: '2026-01-01',
  typologies_history: [
    { typology_id: 1, period: '2026-01-01', qty: 10, price: 100, private_area: 50, gross_sales: 2, distractions: 1, typology_stock: 8 },
    { typology_id: 1, period: '2026-02-28', qty: 10, price: 200, private_area: 50, gross_sales: 3, distractions: 0, typology_stock: 5 },
  ],
}];

describe('Relatório API Excel — geração explícita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setToken('fixture-only', 'fixture@example.test');
    vi.mocked(fetchBuildings).mockResolvedValue(sample);
  });
  afterEach(() => { cleanup(); useAuthStore.getState().clearToken(); });

  it('não processa durante coleta, após coletar nem ao editar seleções; gera só pelo botão e bloqueia download desatualizado', async () => {
    let finish!: (result: typeof sample) => void;
    vi.mocked(fetchBuildings).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<RelatorioApiExcel />);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar' }));
    expect(engine.buildReport).not.toHaveBeenCalled();
    expect(engine.dateBounds).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Gerar relatório' })).not.toBeInTheDocument();
    await act(async () => finish(sample));
    const generate = screen.getByRole('button', { name: 'Gerar relatório' });
    const download = screen.getByRole('button', { name: 'Baixar Excel' });
    expect(download).toBeDisabled();
    expect(engine.buildReport).not.toHaveBeenCalled();
    expect(engine.dateBounds).not.toHaveBeenCalled();
    const columns = screen.getByRole('region', { name: 'Colunas de exportação' });
    expect(within(columns).getByText('Estoque', { exact: true })).toBeVisible();
    expect(within(columns).queryByText(/Estoque .*2026/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar coluna'), { target: { value: 'Estoque' } });
    fireEvent.click(screen.getByLabelText('Data inicial'));
    fireEvent.change(screen.getByLabelText('Ano', { exact: true }), { target: { value: '2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'fevereiro de 2026' }));
    expect(screen.getByLabelText('Data inicial')).toHaveTextContent('01/02/2026');
    expect(engine.buildReport).not.toHaveBeenCalled();
    expect(engine.dateBounds).not.toHaveBeenCalled();
    fireEvent.click(generate);
    await waitFor(() => expect(download).toBeEnabled());
    expect(engine.buildReport).toHaveBeenCalledTimes(1);
    expect(engine.dateBounds).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('columnheader', { name: 'Estoque fev/2026' })).toBeVisible();
    fireEvent.click(within(columns).getByRole('button', { name: 'Limpar seleção' }));
    fireEvent.click(within(columns).getByText('Estoque', { exact: true }));
    expect(download).toBeDisabled();
    expect(engine.buildReport).toHaveBeenCalledTimes(1);
    fireEvent.click(generate);
    await waitFor(() => expect(download).toBeEnabled());
    expect(engine.buildReport).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('columnheader').map((element) => element.textContent)).toEqual(['Estoque fev/2026']);
    expect(fetchBuildings).toHaveBeenCalledTimes(1);
    const resultButtons = within(screen.getByRole('region', { name: 'Resultado do relatório' })).getAllByRole('button');
    expect(resultButtons.indexOf(generate)).toBeLessThan(resultButtons.indexOf(download));
  });

  it('separa nível de seleção, remove campos incompatíveis e exige nova geração ao trocar', async () => {
    render(<RelatorioApiExcel />);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar' }));
    const columns = await screen.findByRole('region', { name: 'Colunas de exportação' });
    expect(within(columns).getByText('ID Tipologia', { exact: true })).toBeVisible();
    expect(screen.getByLabelText('Nível do relatório')).toHaveTextContent('Por tipologia');
    fireEvent.click(screen.getByRole('button', { name: 'Gerar relatório' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar Excel' })).toBeEnabled());
    fireEvent.click(screen.getByLabelText('Nível do relatório'));
    fireEvent.click(screen.getByRole('option', { name: 'Por empreendimento', exact: true }));
    for (const field of ['ID Tipologia', 'Garagem', 'Vendas Brutas', 'Unidades por Tipologia']) expect(within(columns).queryByText(field, { exact: true })).not.toBeInTheDocument();
    expect(within(columns).getByText('Faixa MCMV', { exact: true })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Baixar Excel' })).toBeDisabled();
    expect(engine.buildReport).toHaveBeenCalledTimes(1);
    fireEvent.click(within(columns).getByRole('button', { name: 'Limpar seleção' }));
    fireEvent.click(within(columns).getByText('Empreendimentos', { exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar relatório' }));
    await waitFor(() => expect(engine.buildReport).toHaveBeenCalledTimes(2));
    expect(vi.mocked(engine.buildReport).mock.calls[1][1].level).toBe('building');
    expect(screen.getAllByRole('columnheader').map((node) => node.textContent)).toEqual(['Empreendimentos']);
    expect(fetchBuildings).toHaveBeenCalledTimes(1);
  });

  it('não gera relatório quando a coleta falha', async () => {
    vi.mocked(fetchBuildings).mockRejectedValueOnce(new Error('HTTP 503'));
    render(<RelatorioApiExcel />);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar' }));
    await screen.findByText(/Nenhum relatório parcial foi liberado/);
    expect(engine.buildReport).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Gerar relatório' })).not.toBeInTheDocument();
  });
});
