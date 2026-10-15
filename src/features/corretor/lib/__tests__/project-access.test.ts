import { expect, it, vi } from 'vitest';
import { authorizeCorretor } from '../../../../../supabase/functions/corretor-access/core';
const setup = () => ({ allowedEmails: ['staff@example.invalid'], geoLogin: vi.fn().mockResolvedValue('geo-fixture'), exchange: vi.fn().mockResolvedValue({ access_token: 'app-fixture', refresh_token: 'refresh-fixture', userEmail: 'staff@example.invalid' }) });
it('nega conta não habilitada antes de consultar upstream ou emitir sessão', async () => {
  const deps = setup(); expect((await authorizeCorretor({ email: 'outside@example.invalid', password: 'fixture' }, deps)).status).toBe(403);
  expect(deps.geoLogin).not.toHaveBeenCalled(); expect(deps.exchange).not.toHaveBeenCalled();
});
it('não aceita token ou email declarado sem a senha validada', async () => {
  const deps = setup(); deps.geoLogin.mockResolvedValue(null);
  expect((await authorizeCorretor({ email: 'staff@example.invalid', password: 'bad-fixture', token: 'pretend' }, deps)).status).toBe(401);
  expect(deps.exchange).not.toHaveBeenCalled();
});
it('recusa divergência de identidade na troca de sessão', async () => {
  const deps = setup(); deps.exchange.mockResolvedValue({ access_token: 'fixture', refresh_token: 'fixture', userEmail: 'other@example.invalid' });
  const result = await authorizeCorretor({ email: 'staff@example.invalid', password: 'fixture' }, deps);
  expect(result.status).toBe(503); expect(result.data).not.toHaveProperty('session');
});
it('normaliza a conta e só devolve sessão após as duas confirmações', async () => {
  const deps = setup(); const result = await authorizeCorretor({ email: ' STAFF@example.invalid ', password: 'fixture' }, deps);
  expect(result.status).toBe(200); expect(deps.geoLogin).toHaveBeenCalledWith('staff@example.invalid', 'fixture'); expect(result.data).not.toHaveProperty('password');
});
it('lista vazia fecha acesso e não provisiona usuário', async () => {
  const deps = setup(); deps.allowedEmails = [];
  expect((await authorizeCorretor({ email: 'staff@example.invalid', password: 'fixture' }, deps)).status).toBe(403); expect(deps.exchange).not.toHaveBeenCalled();
});
