export interface AccessDependencies {
  geoLogin(email: string, password: string): Promise<string | null>;
  exchange(email: string): Promise<{ access_token: string; refresh_token: string; userEmail: string } | null>;
}
/** A identidade vem do login validado no servidor; email/token declarados no cliente não autorizam acesso. */
export async function authorizeCorretor(body: unknown, deps: AccessDependencies) {
  if (!body || typeof body !== 'object') return { status: 400, data: { error: 'Informe e-mail e senha.' } };
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string' || !password || password.length > 1000) return { status: 400, data: { error: 'Informe e-mail e senha.' } };
  const identity = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity) || identity.length > 254) return { status: 400, data: { error: 'E-mail inválido.' } };
  // Qualquer conta autenticada pelo GeoBrain pode entrar; acesso aos arquivos segue as políticas por projeto.
  const token = await deps.geoLogin(identity, password);
  if (!token) return { status: 401, data: { error: 'E-mail ou senha não autorizados pelo GeoBrain.' } };
  const session = await deps.exchange(identity);
  if (!session || session.userEmail.toLowerCase() !== identity) return { status: 503, data: { error: 'Não foi possível habilitar o acesso aos arquivos. Tente novamente.' } };
  return { status: 200, data: { token, session: { access_token: session.access_token, refresh_token: session.refresh_token } } };
}
