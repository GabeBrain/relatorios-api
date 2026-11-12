import { createHmac, createHash, randomUUID } from 'node:crypto';
import { FaseAtivaExistente } from '../repo/tipos.js';

export class BridgeError extends Error {
  constructor(readonly code: string) { super(`Ponte Lovable: ${code}`); }
}
export class BridgeClient {
  constructor(readonly url: string, private readonly secret: string, private readonly transport: typeof fetch = fetch) {
    const u = new URL(url);
    if (u.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname)) throw new Error('URL da ponte exige HTTPS');
  }
  async call<T>(operation: string, args: unknown[]): Promise<T> {
    const body = JSON.stringify({ operation, args, key: randomUUID() });
    // Uma repetição de transporte conserva a idempotência, mas recebe nova assinatura/nonce.
    for (let attempt = 0; attempt < 2; attempt++) {
      const timestamp = String(Math.floor(Date.now() / 1000)), nonce = randomUUID();
      const hash = createHash('sha256').update(body).digest('hex');
      const signature = createHmac('sha256', this.secret).update(['1', timestamp, nonce, 'POST', '/slide-maker-bridge', hash].join('\n')).digest('hex');
      let response: Response;
      try {
        response = await this.transport(this.url, { method: 'POST', body, redirect: 'error', signal: AbortSignal.timeout(30000),
          headers: { 'content-type': 'application/json', 'x-slide-version': '1', 'x-slide-timestamp': timestamp, 'x-slide-nonce': nonce, 'x-slide-signature': signature } });
      } catch {
        if (attempt === 0) continue;
        throw new BridgeError('transporte_indisponivel');
      }
      if (response.status >= 500 && attempt === 0) continue;
      const result = await response.json().catch(() => null) as { data?: T; error?: string } | null;
      if (!response.ok || !result || !('data' in result)) {
        if (result?.error === '23505') throw new FaseAtivaExistente();
        throw new BridgeError(result?.error?.match(/^[a-zA-Z0-9_]{1,50}$/)?.[0] ?? 'resposta_invalida');
      }
      return result.data as T;
    }
    throw new BridgeError('transporte_indisponivel');
  }
  async transfer(url: string, init?: RequestInit) {
    const target = new URL(url), bridge = new URL(this.url);
    if (target.protocol !== 'https:' || target.origin !== bridge.origin || !target.pathname.startsWith('/storage/v1/')) throw new BridgeError('url_arquivo_invalida');
    const response = await this.transport(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new BridgeError('transferencia_arquivo');
    return response;
  }
}
