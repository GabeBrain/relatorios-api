import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalysisRuntime } from './runtime';
import type { Universe, AnalysisSpec } from './domain';
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: Record<string, unknown>[] = [];
  terminate = vi.fn();
  constructor() { FakeWorker.instances.push(this); }
  postMessage(message: Record<string, unknown>) { this.messages.push(message); }
  reply(id: number, result: unknown) { this.onmessage?.({ data: { id, result } }); }
}
afterEach(() => { vi.unstubAllGlobals(); FakeWorker.instances = []; });
const dataset = { hash: 'one' } as Universe;
const spec: AnalysisSpec = { cutoff: '2026-09', duration: 12, methods: ['constant'] };
describe('worker persistente e cache', () => {
  it('envia snapshot uma vez, prioriza detalhe e deduplica jobs', async () => {
    vi.stubGlobal('Worker', FakeWorker); const r = new AnalysisRuntime(dataset), worker = FakeWorker.instances[0];
    const low = r.analyze('a', spec, 4), high = r.analyze('b', spec, 0), duplicate = r.analyze('b', spec, 0);
    worker.reply(0, true); expect(worker.messages[1].buildingId).toBe('b');
    worker.reply(1, { id: 'b' }); expect(await high).toEqual({ id: 'b' }); expect(await duplicate).toEqual({ id: 'b' });
    expect(worker.messages[2].buildingId).toBe('a'); worker.reply(2, { id: 'a' }); await low;
    expect(await r.analyze('a', spec)).toEqual({ id: 'a' }); expect(worker.messages).toHaveLength(3);
    expect(worker.messages.filter(m => m.kind === 'init')).toHaveLength(1); r.dispose();
  });
  it('cancelamento rejeita fila; dispose encerra worker e não reaproveita dados', async () => {
    vi.stubGlobal('Worker', FakeWorker); const r = new AnalysisRuntime(dataset), worker = FakeWorker.instances[0];
    const p = r.analyze('a', spec); const check = expect(p).rejects.toMatchObject({ name: 'AbortError' }); r.cancelQueued(); await check;
    worker.reply(0, true); const active = r.analyze('b', spec); const fail = expect(active).rejects.toMatchObject({ name: 'AbortError' }); r.dispose(); await fail;
    expect(worker.terminate).toHaveBeenCalledOnce(); await expect(r.analyze('a', spec)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
