import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SlideMakerPage from './SlideMakerPage';

vi.mock('@/lib/activity-log', () => ({ logActivity: vi.fn() }));

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><SlideMakerPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('SlideMakerPage', () => {
  it('sem o endereço do serviço, explica e não oferece criar', () => {
    vi.stubEnv('VITE_SLIDE_MAKER_AGENT_URL', '');
    montar();
    expect(screen.getByRole('alert')).toHaveTextContent('ainda não está disponível neste ambiente');
    expect(screen.queryByRole('button', { name: 'Nova apresentação' })).not.toBeInTheDocument();
  });

  it('pede o e-mail @brain.srv.br antes de criar, guarda no navegador e permite trocar', async () => {
    vi.stubEnv('VITE_SLIDE_MAKER_AGENT_URL', 'http://servico.local');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    montar();
    expect(await screen.findByText('Nenhuma apresentação ainda')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled(); // sem trabalhos neste navegador, nada a consultar
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pessoa@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Use seu e-mail @brain.srv.br.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'Pessoa@Brain.srv.br' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('button', { name: 'Nova apresentação' })).toBeInTheDocument();
    expect(localStorage.getItem('slide-maker:email')).toBe('pessoa@brain.srv.br');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });
});
