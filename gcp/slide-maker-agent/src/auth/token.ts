import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token de acesso do trabalho (§8): 32 bytes aleatórios, devolvido uma única vez. */
export function gerarToken(): string {
  return randomBytes(32).toString('base64url');
}

/** O banco guarda só o sha256 (hex) do token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function tokenConfere(token: string | undefined, hashGuardado: string): boolean {
  if (!token || token.length > 128) return false;
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(hashGuardado, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
