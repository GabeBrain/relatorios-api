import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Studies } from './ScientificPage';
import { inventory, runStudy, sourcePeriods, type InventoryRow, type StudyDataset, type StudyProtocol, type StudyResult } from './study';
import { readHorizontalHistory } from '../source';
import { processStudy } from './client';

const access = vi.hoisted(() => ({ allowed: true, token: 'fixture', failWorker: false }));
vi.mock('@/store/auth-store', () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ getToken: () => access.token }) }));
vi.mock('@/features/shared/geo-api-scope-engine', () => ({ useGeoApiScope: () => ({ hasToken: true, isLoading: false, error: null, citiesByUf: access.allowed ? { PR: ['Curitiba'] } : { AC: ['Rio Branco'] } }) }));
vi.mock('../source', async original => ({ ...await original<object>(), readHorizontalHistory: vi.fn() }));
vi.mock('./client', () => ({ snapshotHash: async () => 'fixture-hash', processStudy: vi.fn() }));
vi.mock('./StudyCharts', () => ({ StudyCharts: () => <div>Gráficos de comparação</div>, formatNumber: (n: number | null) => n === null || n === undefined ? '—' : String(n), methodColor: () => 'green' }));
vi.mock('./StudyDetail', () => ({ StudyDetail: ({ onClose }: { onClose: () => void }) => <div role="dialog"><button onClick={onClose}>Fechar caso</button></div> }));
const processMock = vi.mocked(processStudy as (kind: 'inventory' | 'run', dataset: StudyDataset, signal: AbortSignal, progress?: (done: number, total: number) => void, protocol?: StudyProtocol) => Promise<InventoryRow[] | StudyResult>);

beforeEach(() => {
  access.allowed = true; access.token = 'fixture'; access.failWorker = false;
  vi.mocked(readHorizontalHistory).mockReset().mockImplementation(async (_uf, _city, _signal, _progress, type) => ({ pages: 1, fetchedAt: '2026-10-27T12:00:00Z', buildings: [{ id: type === 'Horizontal' ? '1' : '2', sourceType: type, name: `${type} exemplo`, release_date: '2025-01-01', typologies_history: ['2025-09', '2025-12', '2026-03', '2026-06', '2026-09'].map((period, i) => ({ period, typology_id: 1, pattern: type === 'Horizontal' ? 'Loteamento Fechado' : 'Standard', qty: 100, typology_stock: 90 - i * 10, sold_in_period: 10 })) }] }));
  processMock.mockReset().mockImplementation(async (kind, dataset, signal, progress, protocol) => {
    if (access.failWorker) throw new Error('Falha controlada no processamento');
    return kind === 'inventory' ? inventory(dataset.buildings, sourcePeriods(dataset.buildings).at(-1)!) : runStudy(dataset, protocol!, signal, progress);
  });
});

describe('jornada de estudos', () => {
  it('bloqueia Curitiba fora do catálogo autorizado sem consultar histórico', () => {
    access.allowed = false; render(<Studies onOperation={vi.fn()}/>);
    expect(screen.getByRole('button', { name: 'Carregar Curitiba' })).toBeDisabled();
    expect(screen.getByText(/Curitiba\/PR não está disponível/)).toBeTruthy();
    expect(readHorizontalHistory).not.toHaveBeenCalled();
  });
  it('carrega os tipos, executa retrospectiva e filtra sem chamar API outra vez', async () => {
    render(<Studies onOperation={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar Curitiba' }));
    await screen.findByRole('region', { name: 'Catálogo de estudos' });
    expect(readHorizontalHistory).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /Panorama de Curitiba/ }));
    expect(screen.getByRole('region', { name: 'Desenho do estudo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Executar retrospectiva' }));
    await screen.findByRole('region', { name: 'Resultados da retrospectiva' });
    expect(screen.getByText(/não constituem validação independente/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Desenho do estudo' })).toHaveAttribute('data-collapsed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Rever desenho do estudo' }));
    expect(screen.getByRole('region', { name: 'Desenho do estudo' })).toHaveAttribute('data-collapsed', 'false');
    expect(screen.getByRole('region', { name: 'Nível de evidência' })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Nome ou ID'), { target: { value: 'não existe' } });
    expect(screen.getByText(/Nenhum empreendimento corresponde/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Resultados da retrospectiva' })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Nome ou ID'), { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Explorar caso' })[0]);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar caso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Executar retrospectiva' }));
    expect(processStudy).toHaveBeenCalledTimes(2); // inventory + one cached scientific run
    expect(readHorizontalHistory).toHaveBeenCalledTimes(2);
  });
  it('falha no segundo tipo não promove resposta parcial nem substitui snapshot anterior', async () => {
    render(<Studies onOperation={vi.fn()}/>);
    const read = vi.mocked(readHorizontalHistory).getMockImplementation()!;
    vi.mocked(readHorizontalHistory).mockImplementationOnce(read).mockRejectedValueOnce(new Error('Segundo tipo indisponível'));
    fireEvent.click(screen.getByRole('button', { name: 'Carregar Curitiba' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Segundo tipo indisponível'));
    expect(screen.queryByRole('region', { name: 'Catálogo de estudos' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('region', { name: 'Catálogo de estudos' });
    vi.mocked(readHorizontalHistory).mockRejectedValueOnce(new Error('Atualização indisponível'));
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar Curitiba' }));
    await screen.findByText('Atualização indisponível');
    expect(screen.getByRole('region', { name: 'Catálogo de estudos' })).toBeTruthy();
  });
  it('falha local tem ação recuperável e troca de token descarta dados e cache', async () => {
    const view = render(<Studies onOperation={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar Curitiba' }));
    await screen.findByRole('region', { name: 'Catálogo de estudos' });
    fireEvent.click(screen.getByRole('button', { name: /Panorama de Curitiba/ }));
    access.failWorker = true; fireEvent.click(screen.getByRole('button', { name: 'Executar retrospectiva' }));
    await screen.findByText('Falha controlada no processamento');
    access.failWorker = false; fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('region', { name: 'Resultados da retrospectiva' });
    access.token = 'outra sessão'; view.rerender(<Studies onOperation={vi.fn()}/>);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Resultados da retrospectiva' })).toBeNull());
    expect(screen.queryByRole('region', { name: 'Catálogo de estudos' })).toBeNull();
  });
  it('atualização que falha dentro de um estudo repete a consulta, não o cálculo em cache', async () => {
    render(<Studies onOperation={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar Curitiba' }));
    await screen.findByRole('region', { name: 'Catálogo de estudos' });
    fireEvent.click(screen.getByRole('button', { name: /Panorama de Curitiba/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Executar retrospectiva' }));
    await screen.findByRole('region', { name: 'Resultados da retrospectiva' });
    vi.mocked(readHorizontalHistory).mockRejectedValueOnce(new Error('Atualização do recorte falhou'));
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar Curitiba' }));
    await screen.findByText('Atualização do recorte falhou');
    const before = vi.mocked(readHorizontalHistory).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('region', { name: 'Catálogo de estudos' });
    expect(readHorizontalHistory).toHaveBeenCalledTimes(before + 2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
