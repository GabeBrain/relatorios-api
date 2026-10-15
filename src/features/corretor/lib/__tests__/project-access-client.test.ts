import { expect, it, vi, beforeEach, afterEach } from 'vitest';
const session = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { setSession: session } } }));
import { loginCorretor } from '../project-access';
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());
it('não altera sessão quando a validação de acesso falha', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Não autorizado' }) }));
  await expect(loginCorretor('fixture@example.invalid', 'fixture')).rejects.toThrow('Não autorizado'); expect(session).not.toHaveBeenCalled();
});
it('não devolve token GeoBrain se a sessão do app falhar', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'geo-fixture', session: { access_token: 'app-fixture', refresh_token: 'refresh-fixture' } }) }));
  session.mockResolvedValue({ error: { message: 'fixture' } });
  await expect(loginCorretor('fixture@example.invalid', 'fixture')).rejects.toThrow('guardar');
});
it('conclui as duas identidades sem armazenar a senha na sessão', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'geo-fixture', session: { access_token: 'app-fixture', refresh_token: 'refresh-fixture' } }) }));
  session.mockResolvedValue({ error: null });
  expect(await loginCorretor('fixture@example.invalid', 'fixture')).toBe('geo-fixture');
  expect(session).toHaveBeenCalledWith({ access_token: 'app-fixture', refresh_token: 'refresh-fixture' });
});
it('função ausente não simula sessão de arquivos disponível', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false, json: async () => ({}) }));
  await expect(loginCorretor('fixture@example.invalid', 'fixture')).rejects.toThrow('publicação'); expect(session).not.toHaveBeenCalled();
});
