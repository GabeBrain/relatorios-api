import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurveMap } from './CurveMap';
import { ALL_METHODS, summarizeInventory, type Universe } from './domain';
import type { AnalysisRuntime } from './runtime';
import type { CurveTile } from './mosaic';
describe('interação do mapa', () => {
  it('descarta resumos atrasados ao mudar a duração e preserva a seleção', async () => {
    const data: Universe = { schema: 'forecast-universe-v1', complete: true, areas: [], locations: {}, requests: [], missingIds: [], hash: 'synthetic', fetchedAt: '', city: 'Curitiba', uf: 'PR', buildings: [{ building_id: '1', name: 'Teste', sourceType: 'Horizontal', release_date: '2025-01-01', typologies_history: [{ period: '2026-09', typology_id: '1', pattern: 'Loteamento Fechado', qty: 100, typology_stock: 50, sold_in_period: 1 }] }] };
    let resolveOld!: (v: CurveTile[]) => void;
    const tile: CurveTile = { id: '1', cutoff: '2026-09', finotti: true, reason: '', sales: 6, stock: 50, finalStock: 44, history: [], forecast: [] };
    const tiles = vi.fn().mockImplementationOnce(() => new Promise<CurveTile[]>(r => { resolveOld = r; })).mockResolvedValueOnce([tile]);
    const runtime = { tiles } as unknown as AnalysisRuntime;
    const props = { universe: data, rows: summarizeInventory(data.buildings, 'latest'), allIds: ['1'], runtime, comparisonMode: true, selection: new Set(['1']), onToggle: vi.fn(), onExplore: vi.fn() };
    const spec = { cutoff: 'latest', duration: 12, methods: ALL_METHODS };
    const view = render(<CurveMap {...props} spec={spec} />);
    await waitFor(() => expect(tiles).toHaveBeenCalledTimes(1));
    view.rerender(<CurveMap {...props} spec={{ ...spec, duration: 6 }} />);
    await screen.findByText('6 un.');
    await act(async () => resolveOld([{ ...tile, sales: 999 }]));
    expect(screen.queryByText('999 un.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Selecionar Teste' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Cards detalhados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Explorar curva de Teste' }));
    expect(props.onExplore).toHaveBeenCalledWith('1', ['1']); expect(props.onToggle).not.toHaveBeenCalled();
  });
});
