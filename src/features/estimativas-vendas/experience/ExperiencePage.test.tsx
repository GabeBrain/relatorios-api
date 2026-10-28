import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExperiencePage from './ExperiencePage';
import { loadUniverse } from './universe';
import type { Universe } from './domain';
const access = vi.hoisted(() => ({ token: 'fixture', disposed: 0, calls: 0 }));
vi.mock('@/store/auth-store', () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ getToken: () => access.token }) }));
vi.mock('./universe', () => ({ loadUniverse: vi.fn() }));
vi.mock('./Controls', async original => ({ ...await original<typeof import('./Controls')>(), UniverseSelector: ({ onLoad }: { onLoad: (areas: { city: string; uf: string }[], ids: string[]) => void }) => <button onClick={() => onLoad([{ city: 'Curitiba', uf: 'PR' }], [])}>Carregar empreendimentos</button> }));
vi.mock('./ForecastChart', () => ({ ForecastChart: ({ label }: { label: string }) => <div role="img" aria-label={label} /> }));
vi.mock('./runtime', async () => {
  const D = await import('./domain');
  const M = await import('./mosaic');
  return { AnalysisRuntime: class {
    constructor(readonly dataset: Universe) {}
    inventory(cutoff: string) { return Promise.resolve(D.summarizeInventory(this.dataset.buildings, cutoff)); }
    analyze(id: string, spec: Parameters<typeof D.analyzeCase>[2]) { access.calls++; return D.analyzeCase(this.dataset, id, D.buildingSpec(this.dataset, id, spec)); }
    capabilities(ids: string[], cutoff: string) { return D.capabilities(this.dataset, ids, cutoff); }
    tiles(ids: string[], spec: Parameters<typeof D.analyzeCase>[2]) { return M.buildTiles(this.dataset, ids, spec); }
    cancelQueued() {}
    dispose() { access.disposed++; }
  } };
});
function dataset(): Universe { return { schema: 'forecast-universe-v1', complete: true, areas: [{ city: 'Curitiba', uf: 'PR' }], locations: { '1': { city: 'Curitiba', uf: 'PR' } }, requests: [], missingIds: [], hash: 'fixture', fetchedAt: '2026-10-28T12:00:00Z', city: 'Curitiba', uf: 'PR', buildings: [{ building_id: '1', name: 'Caso de revisão', release_date: '2025-01-01', sourceType: 'Horizontal', typologies_history: ['2026-06', '2026-07', '2026-08', '2026-09'].map((period, i) => ({ period, typology_id: '10', pattern: 'Loteamento Fechado', qty: 100, typology_stock: 50 - i, sold_in_period: 1 })) }] }; }
beforeEach(() => { access.token = 'fixture'; access.disposed = 0; access.calls = 0; vi.mocked(loadUniverse).mockReset().mockResolvedValue(dataset()); });
describe('jornada essencial', () => {
  it('abre curvas direto, mantém seleção fora do filtro e não consulta API ao mudar views', async () => {
    render(<ExperiencePage />); fireEvent.click(screen.getByRole('button', { name: 'Carregar empreendimentos' }));
    await screen.findByRole('button', { name: 'Explorar curva de Caso de revisão' });
    await screen.findByRole('img', { name: 'Curva de vendas de Caso de revisão' });
    expect(document.querySelectorAll('main.evx-page > details').length).toBe(0);
    expect(screen.getByRole('group', { name: 'Tipo de empreendimento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Explorar curva de Caso de revisão' }).closest('.evm-card')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Caso de revisão' }));
    fireEvent.change(screen.getByPlaceholderText('Nome ou ID'), { target: { value: 'ausente' } });
    expect(screen.getByText('1 selecionados · 1 fora do filtro atual')).toBeTruthy();
    expect(loadUniverse).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByPlaceholderText('Nome ou ID'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Explorar curva de Caso de revisão' })).toBeTruthy();
  });
  it('falha em atualização conserva universo anterior e troca de token elimina dados/seleção', async () => {
    const view = render(<ExperiencePage />); fireEvent.click(screen.getByRole('button', { name: 'Carregar empreendimentos' }));
    await screen.findByRole('button', { name: 'Explorar curva de Caso de revisão' });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Caso de revisão' }));
    vi.mocked(loadUniverse).mockRejectedValueOnce(new Error('Segunda página indisponível'));
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar dados' }));
    await screen.findByRole('alert'); expect(screen.getByRole('region', { name: 'Universo carregado' })).toBeTruthy();
    expect(screen.getByText('1 selecionados · 0 fora do filtro atual')).toBeTruthy();
    access.token = 'other-user'; view.rerender(<ExperiencePage />);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Universo carregado' })).toBeNull());
    expect(screen.queryByRole('region', { name: 'Seleção para exportação' })).toBeNull(); expect(access.disposed).toBeGreaterThan(0);
  });
});
