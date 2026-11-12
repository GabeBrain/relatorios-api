import { OAuth2Client } from 'google-auth-library';

/** Verifica o token OIDC com que o Cloud Tasks chama `/internal/fase` (§8 item 2). */
export interface VerificadorOidc {
  verificar(authorization: string | undefined): Promise<boolean>;
}

export class VerificadorOidcGoogle implements VerificadorOidc {
  private readonly cliente = new OAuth2Client();

  constructor(private readonly audiencia: string, private readonly emailEsperado: string) {}

  async verificar(authorization: string | undefined): Promise<boolean> {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) return false;
    try {
      const ticket = await this.cliente.verifyIdToken({ idToken: token, audience: this.audiencia });
      const p = ticket.getPayload();
      return Boolean(p && p.email === this.emailEsperado && p.email_verified);
    } catch {
      return false;
    }
  }
}
