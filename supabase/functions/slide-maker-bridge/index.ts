import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';
import { handler, REPO_OPERATIONS } from './handler.ts';
import { objectPath } from './protocol.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const buckets = new Set(['slide-maker-entrada','slide-maker-saida','slide-maker-trabalho']);
function checked<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) throw new Error('backend_unavailable');
  return result.data as NonNullable<T>;
}
Deno.serve(handler({
  async execute(operation, args, key, hash, nonce) {
    if ((REPO_OPERATIONS as readonly string[]).includes(operation)) {
      const result = await db.rpc('slide_maker_bridge_dispatch', { p_operation: operation, p_args: args, p_key: key, p_hash: hash, p_nonce: nonce });
      if (result.error) {
        const message = result.error.message;
        throw new Error(['replay','idempotency_conflict','invalid_arguments','rate_limit'].includes(message) ? message : result.error.code === '23505' ? '23505' : 'backend_unavailable');
      }
      return result.data;
    }
    const accepted = checked(await db.rpc('slide_maker_bridge_nonce', { p_nonce: nonce }));
    if (!accepted) throw new Error('replay');
    if (operation === 'emitir') {
      const [jobId, event] = args;
      if (typeof jobId !== 'string' || !uuid.test(jobId) || !event || typeof event !== 'object') throw new Error('invalid_arguments');
      const e = event as Record<string, unknown>;
      if (Object.keys(e).some(k => !['estado','fase','etapa','versao_atual'].includes(k)) || JSON.stringify(event).length > 1024) throw new Error('invalid_arguments');
      const response = await fetch(`${url}/realtime/v1/api/broadcast`, { method: 'POST', signal: AbortSignal.timeout(5000),
        headers: { 'content-type': 'application/json', apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}` },
        body: JSON.stringify({ messages: [{ topic: `slide-maker:${jobId}`, event: 'estado', payload: event }] }) });
      if (!response.ok) throw new Error('backend_unavailable');
      return null;
    }
    const [bucket, rawPath, extra] = args;
    if (typeof bucket !== 'string' || !buckets.has(bucket)) throw new Error('invalid_arguments');
    const storage = db.storage.from(bucket);
    if (operation === 'removerObjetos') {
      if (!Array.isArray(rawPath) || rawPath.length > 500) throw new Error('invalid_arguments');
      const paths = rawPath.map(p => objectPath(p));
      if (new Set(paths.map(p => p.split('/')[0])).size > 1) throw new Error('invalid_arguments');
      if (paths.length) checked(await storage.remove(paths));
      return null; // Remoção já é idempotente; não há trabalho pago neste endpoint.
    }
    const path = objectPath(rawPath, operation === 'listarObjetos');
    if (operation === 'upload') return checked(await storage.createSignedUploadUrl(path, { upsert: true }));
    if (operation === 'download') {
      if (!Number.isInteger(extra) || Number(extra) < 1 || Number(extra) > 600) throw new Error('invalid_arguments');
      return checked(await storage.createSignedUrl(path, Number(extra), { download: true })).signedUrl;
    }
    if (operation === 'listarObjetos') {
      const pending = [path], output: string[] = [];
      while (pending.length) {
        const folder = pending.pop()!;
        for (let offset = 0; ; offset += 1000) {
          const data = checked(await storage.list(folder, { limit: 1000, offset }));
          for (const entry of data) {
            const name = objectPath(`${folder}/${entry.name}`);
            if (entry.id === null) pending.push(name); else output.push(name);
          }
          if (output.length + pending.length > 10000) throw new Error('invalid_arguments');
          if (data.length < 1000) break;
        }
      }
      return output;
    }
    throw new Error('invalid_arguments');
  },
}, Deno.env.get('SLIDE_MAKER_BRIDGE_SECRET') ?? ''));
