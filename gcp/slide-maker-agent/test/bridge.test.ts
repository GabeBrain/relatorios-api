import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { BridgeClient } from '../src/bridge/client.js';
import { repoBridge, StorageBridge } from '../src/bridge/adapters.js';
import { handler } from '../src/bridge/shared/handler.js';
import { sign, CONTRACT_PATH, objectPath } from '../src/bridge/shared/protocol.js';

const SECRET = 'test-only-'.padEnd(64, 'x');
const URL = 'https://fixture.supabase.co/functions/v1/slide-maker-bridge';
async function request(body: string, options: { timestamp?: string; nonce?: string; secret?: string } = {}) {
  const timestamp = options.timestamp ?? String(Math.floor(Date.now() / 1000)), nonce = options.nonce ?? randomUUID();
  return new Request(URL, { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-slide-version': '1',
    'x-slide-timestamp': timestamp, 'x-slide-nonce': nonce, 'x-slide-signature': await sign(options.secret ?? SECRET, timestamp, nonce, CONTRACT_PATH, body) } });
}
describe('ponte servidor-servidor', () => {
  it('limita caminhos ao prefixo UUID e recusa escapes, codificações e separadores alternativos', () => {
    const id = randomUUID();
    expect(objectPath(`${id}/trabalho/deck.json`)).toBe(`${id}/trabalho/deck.json`);
    expect(objectPath(id, true)).toBe(id);
    for (const path of [id, `${id}/../outro`, `${id}/%2e%2e/x`, `${id}\\arquivo`, `outro/x`, `${id}//x`, `${id}/./x`]) expect(() => objectPath(path)).toThrow();
  });
  it('recusa assinatura errada, corpo adulterado, prazo e versão antes de acessar backend', async () => {
    let calls = 0;
    const serve = handler({ execute: async () => { calls++; return null; } }, SECRET);
    const body = JSON.stringify({ operation: 'obterJob', args: [randomUUID()], key: randomUUID() });
    expect((await serve(await request(body, { secret: 'wrong' }))).status).toBe(401);
    expect((await serve(await request(body, { timestamp: '1000000000' }))).status).toBe(401);
    const valid = await request(body);
    expect((await serve(new Request(URL, { method: 'POST', headers: valid.headers, body: body + ' ' }))).status).toBe(401);
    valid.headers.set('x-slide-version', '2');
    expect((await serve(valid)).status).toBe(401);
    expect(calls).toBe(0);
  });
  it('recusa operação livre e corpo grande sem executar backend', async () => {
    let calls = 0;
    const serve = handler({ execute: async () => { calls++; return null; } }, SECRET);
    expect((await serve(await request(JSON.stringify({ operation: 'sql', args: ['delete'], key: randomUUID() })))).status).toBe(400);
    expect((await serve(await request('x'.repeat(1024 * 1024 + 1)))).status).toBe(413);
    expect(calls).toBe(0);
  });
  it('cliente repete transporte com a mesma operação idempotente e novo nonce', async () => {
    const bodies: string[] = [], nonces: string[] = [];
    let attempts = 0;
    const serve = handler({ execute: async () => ({ id: 'created' }) }, SECRET);
    const client = new BridgeClient(URL, SECRET, async (url, init) => {
      bodies.push(String(init?.body)); nonces.push(new Headers(init?.headers).get('x-slide-nonce')!);
      const result = await serve(new Request(url, init));
      if (attempts++ === 0) throw new Error('resposta perdida depois do commit');
      return result;
    });
    expect(await repoBridge(client).criarJob({ colaborador_email: 'a@brain.srv.br', titulo: 'Teste', contexto: null, token_acesso_hash: 'a'.repeat(64) })).toEqual({ id: 'created' });
    expect(bodies[0]).toBe(bodies[1]); expect(nonces[0]).not.toBe(nonces[1]);
  });
  it('transferência de arquivo não envia segredo nem aceita outra origem/redirect', async () => {
    const calls: { url: string; headers: Headers; redirect: string | undefined }[] = [];
    const client = new BridgeClient(URL, SECRET, async (url, init) => {
      calls.push({ url: String(url), headers: new Headers(init?.headers), redirect: init?.redirect });
      return new Response('ok');
    });
    await client.transfer('https://fixture.supabase.co/storage/v1/object/sign/x?token=fixture');
    expect(calls[0]?.headers.has('x-slide-signature')).toBe(false);
    expect(calls[0]?.redirect).toBe('error');
    await expect(client.transfer('https://attacker.invalid/storage/v1/object/x')).rejects.toThrow('url_arquivo_invalida');
    expect(calls).toHaveLength(1);
  });
  it('upload usa URL assinada e bytes diretamente, sem transportar binário pelo handler', async () => {
    const seen: string[] = [];
    const serve = handler({ execute: async (op, args) => { seen.push(JSON.stringify({ op, args })); return { signedUrl: 'https://fixture.supabase.co/storage/v1/object/upload/sign/x?token=fixture' }; } }, SECRET);
    let uploaded = 0;
    const client = new BridgeClient(URL, SECRET, async (url, init) => {
      if (String(url).includes('/storage/')) { uploaded = Number((init?.body as Uint8Array).byteLength); return new Response('{}'); }
      return serve(new Request(url, init));
    });
    await new StorageBridge(client).gravar('slide-maker-entrada', `${randomUUID()}/a.pdf`, new Uint8Array(2 * 1024 * 1024));
    expect(uploaded).toBe(2 * 1024 * 1024); expect(seen[0]!.length).toBeLessThan(300);
  });
});
