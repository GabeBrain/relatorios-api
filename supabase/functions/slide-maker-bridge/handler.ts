import { authenticate, digest, MAX_BODY } from './protocol.ts';

export const REPO_OPERATIONS = ['reservarEvento','criarJob','obterJob','obterJobs','atualizarJob','listarJobsEquipe','inserirMensagem','listarMensagens','inserirArquivo','listarArquivos','inserirVersao','listarVersoes','salvarRelatorio','criarFase','obterFase','atualizarFase','faseAtiva','contarFasesDesde','contarFasesAtivasPorEmail'] as const;
const OPERATIONS = new Set<string>([...REPO_OPERATIONS, 'upload','download','listarObjetos','removerObjetos','emitir']);
const ARITY: Record<string, number> = Object.fromEntries(REPO_OPERATIONS.map(op => [op,
  ['atualizarJob','atualizarFase'].includes(op) ? 3 : op === 'contarFasesDesde' ? 2 : 1]));
Object.assign(ARITY, { upload: 2, download: 3, listarObjetos: 2, removerObjetos: 2, emitir: 2 });
export interface Backend {
  execute(operation: string, args: unknown[], key: string, hash: string, nonce: string): Promise<unknown>;
}
const json = (status: number, value: unknown) => Response.json(value, { status, headers: { 'cache-control': 'no-store' } });

/** Única entrada da ponte. Não usa CORS: chamadas são somente entre servidores. */
export function handler(backend: Backend, secret: string) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return json(405, { error: 'method' });
    if (!secret || secret.length < 43) return json(503, { error: 'configuration' });
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json(415, { error: 'content_type' });
    // Não confiar apenas no Content-Length; limitar também corpos chunked.
    const reader = request.body?.getReader();
    if (!reader) return json(400, { error: 'body' });
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); return json(413, { error: 'size' }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = new TextDecoder().decode(bytes);
    if (!await authenticate(request, body, secret)) return json(401, { error: 'authentication' });
    let payload: { operation: string; args: unknown[]; key: string };
    try {
      payload = JSON.parse(body);
      if (!payload || Object.keys(payload).sort().join(',') !== 'args,key,operation' ||
          !OPERATIONS.has(payload.operation) || !Array.isArray(payload.args) || payload.args.length !== ARITY[payload.operation] ||
          typeof payload.key !== 'string' || !/^[0-9a-f-]{36}$/.test(payload.key)) throw new Error();
    } catch { return json(400, { error: 'payload' }); }
    try {
      const data = await backend.execute(payload.operation, payload.args, payload.key, await digest(JSON.stringify([payload.operation, payload.args])), request.headers.get('x-slide-nonce')!);
      return json(200, { data: data ?? null });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const allowed = ['23505','replay','idempotency_conflict','invalid_arguments','rate_limit'];
      return json(allowed.includes(code) ? 409 : 503, { error: allowed.includes(code) ? code : 'backend_unavailable' });
    }
  };
}
