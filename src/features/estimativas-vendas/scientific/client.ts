import type { InventoryRow, StudyDataset, StudyProtocol, StudyResult } from './study';

/** One disposable worker per operation; termination also cancels expensive reference loading. */
export function processStudy(kind: 'inventory', dataset: StudyDataset, signal: AbortSignal, progress?: (done: number, total: number) => void): Promise<InventoryRow[]>;
export function processStudy(kind: 'run', dataset: StudyDataset, signal: AbortSignal, progress: ((done: number, total: number) => void) | undefined, protocol: StudyProtocol): Promise<StudyResult>;
export function processStudy(kind: 'inventory' | 'run', dataset: StudyDataset, signal: AbortSignal, progress?: (done: number, total: number) => void, protocol?: StudyProtocol): Promise<InventoryRow[] | StudyResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelado', 'AbortError')); return; }
    const worker = new Worker(new URL('./study.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => { signal.removeEventListener('abort', abort); worker.terminate(); };
    const abort = () => { cleanup(); reject(new DOMException('Cancelado', 'AbortError')); };
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = event => {
      if (event.data.kind === 'progress') progress?.(event.data.done, event.data.total);
      else {
        cleanup();
        if (event.data.kind === 'error') reject(new Error(event.data.message));
        else resolve(event.data.result);
      }
    };
    worker.onerror = () => { cleanup(); reject(new Error('O processamento local falhou. Tente novamente.')); };
    worker.postMessage({ kind, dataset, protocol });
  });
}

export async function snapshotHash(value: unknown) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(buffer)].map(n => n.toString(16).padStart(2, '0')).join('');
}
