import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExportContent } from './ExportContent';
import { downloadFile, forecastWorkbook, type ExportPlan } from './export';
vi.mock('./export', () => ({ forecastWorkbook: vi.fn(), downloadFile: vi.fn(), downloadPackage: vi.fn() }));

describe('download do quadro revisado', () => {
  it('congela layout e plano, bloqueia cliques repetidos e libera os controles ao terminar', async () => {
    let finish!: () => void;
    vi.mocked(forecastWorkbook).mockImplementationOnce(() => new Promise<Uint8Array>(resolve => { finish = () => resolve(new Uint8Array(0)); }));
    const plan = { forecasts: [{ id_empreendimento: '001', mes: '2026-10' }] } as unknown as ExportPlan;
    const busy = vi.fn(), layout = ['mes', 'id_empreendimento'] as const;
    render(<ExportContent plan={plan} columns={[...layout]} onColumns={vi.fn()} onBusy={busy} />);
    const button = screen.getByRole('button', { name: 'Baixar previsões em Excel' }); fireEvent.click(button); fireEvent.click(button);
    expect(forecastWorkbook).toHaveBeenCalledTimes(1); expect(forecastWorkbook).toHaveBeenCalledWith(plan, [...layout]);
    expect(button).toBeDisabled(); expect(screen.getByRole('button', { name: 'Restaurar colunas' })).toBeDisabled();
    await act(async () => finish()); await waitFor(() => expect(button).toBeEnabled());
    expect(downloadFile).toHaveBeenCalledTimes(1); expect(busy.mock.calls).toEqual([[true], [false]]);
  });
  it('exibe erro de geração sem ocultar o conjunto e permite nova tentativa', async () => {
    vi.mocked(forecastWorkbook).mockRejectedValueOnce(new Error('Falha de geração')).mockResolvedValueOnce(new Uint8Array(0));
    render(<ExportContent plan={{ forecasts: [{ mes: '2026-10' }] } as unknown as ExportPlan} columns={['mes']} onColumns={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Baixar previsões em Excel' })); await screen.findByRole('alert');
    expect(screen.getByRole('region', { name: 'Prévia do Excel' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Baixar previsões em Excel' })); await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
  it('não inicia download se a sessão for desmontada durante a geração', async () => {
    let finish!: () => void;
    vi.mocked(forecastWorkbook).mockImplementationOnce(() => new Promise<Uint8Array>(resolve => { finish = () => resolve(new Uint8Array(0)); }));
    vi.mocked(downloadFile).mockClear();
    const view = render(<ExportContent plan={{ forecasts: [{ mes: '2026-10' }] } as unknown as ExportPlan} columns={['mes']} onColumns={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Baixar previsões em Excel' })); view.unmount();
    await act(async () => finish()); expect(downloadFile).not.toHaveBeenCalled();
  });

});
