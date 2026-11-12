// Gerado por scripts/sync-bridge.mjs; fonte em supabase/functions/slide-maker-bridge/.
// Contrato compartilhado pelo cliente Node e pelo handler Deno; sem dependências de runtime.
export const VERSION = '1';
export const MAX_BODY = 1024 * 1024;
export const WINDOW_SECONDS = 120;
// O gateway pode remover /functions/v1 antes de chamar a função.
export const CONTRACT_PATH = '/slide-maker-bridge';
export function objectPath(path: unknown, prefix = false): string {
  if (typeof path !== 'string' || path.length > 1024 || /[\\%]/.test(path) ||
      Array.from(path).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new Error('invalid_arguments');
  const parts = path.replace(/\/$/, '').split('/');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(parts[0] ?? '') ||
      (!prefix && parts.length < 2) || parts.some(p => !p || p === '.' || p === '..')) throw new Error('invalid_arguments');
  return path.replace(/\/$/, '');
}
const enc = new TextEncoder();
export const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
export async function digest(body: string) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(body))); }
export async function sign(secret: string, timestamp: string, nonce: string, path: string, body: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode([VERSION, timestamp, nonce, 'POST', path, await digest(body)].join('\n'))));
}
export async function authenticate(request: Request, body: string, secret: string, now = Date.now()) {
  const timestamp = request.headers.get('x-slide-timestamp') ?? '';
  const nonce = request.headers.get('x-slide-nonce') ?? '';
  const signature = request.headers.get('x-slide-signature') ?? '';
  if (request.method !== 'POST' || request.headers.get('x-slide-version') !== VERSION ||
      !/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > WINDOW_SECONDS ||
      !/^[0-9a-f-]{36}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(signature) || secret.length < 43) return false;
  if (!new URL(request.url).pathname.endsWith(CONTRACT_PATH)) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signed = new Uint8Array(signature.match(/../g)!.map(pair => parseInt(pair, 16)));
  return crypto.subtle.verify('HMAC', key, signed, enc.encode([VERSION, timestamp, nonce, 'POST', CONTRACT_PATH, await digest(body)].join('\n')));
}
