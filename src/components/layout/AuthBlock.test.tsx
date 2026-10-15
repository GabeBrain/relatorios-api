import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ geo: vi.fn(), project: vi.fn(), signOut: vi.fn() }));
vi.mock('@/features/corretor/lib/project-access', () => ({ loginCorretor: mocks.project, CorretorAccessUnavailable: class extends Error {} }));
vi.mock('@/lib/http-client', () => ({ loginRequest: mocks.geo }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));
vi.mock('@/hooks/use-openapi-docs', () => ({ useOpenAPIDocs: () => ({ data: [{ operations: [{ path: '/auth/login', method: 'POST', baseUrl: 'https://fixture.invalid/public-api' }] }] }) }));
import { AuthBlock } from './AuthBlock';
import { CorretorAccessUnavailable } from '@/features/corretor/lib/project-access';
import { useAuthStore } from '@/store/auth-store';
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); useAuthStore.getState().clearToken(); mocks.geo.mockResolvedValue({ ok: true, data: { token: 'geo-fixture' } }); mocks.project.mockResolvedValue('project-geo-fixture'); mocks.signOut.mockResolvedValue({ error: null }); });
afterEach(cleanup);
async function login(path: string) {
  render(<MemoryRouter initialEntries={[path]}><AuthBlock /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'fixture-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gerar token' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument());
}
it('preserva login GeoBrain dos demais módulos sem chamar a ponte Corretor', async () => {
  await login('/inicio'); expect(mocks.geo).toHaveBeenCalledWith('https://fixture.invalid/public-api/auth/login', 'staff@example.invalid', 'fixture-password'); expect(mocks.project).not.toHaveBeenCalled();
});
it('usa a mesma entrada de credenciais para projetos e limpa os acessos ao remover', async () => {
  await login('/corretor/projetos'); expect(mocks.project).toHaveBeenCalledWith('staff@example.invalid', 'fixture-password'); expect(mocks.geo).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Remover' })); expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('preserva APIs com aviso quando a função ainda não existe', async () => {
  mocks.project.mockRejectedValue(new CorretorAccessUnavailable());
  await login('/corretor'); expect(mocks.geo).toHaveBeenCalled(); expect(useAuthStore.getState().token).toBe('geo-fixture');
});
it('falha de autorização não contorna a ponte com outro login', async () => {
  mocks.project.mockRejectedValue(new Error('Conta não habilitada'));
  render(<MemoryRouter initialEntries={['/corretor']}><AuthBlock /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'fixture-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gerar token' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Gerar token' })).toBeEnabled()); expect(mocks.geo).not.toHaveBeenCalled(); expect(useAuthStore.getState().token).toBe('');
});
