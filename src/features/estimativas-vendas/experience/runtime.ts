import { buildingSpec, specKey, type AnalysisSpec, type CaseAnalysis, type Universe } from './domain';
import type { InventoryRow, StudyMethod } from '../scientific/study';
type Task = { key: string; priority: number; kind: 'case' | 'inventory' | 'capabilities'; buildingId?: string; buildingIds?: string[]; spec?: AnalysisSpec; cutoff?: string; resolve: (v: unknown) => void; reject: (e: Error) => void };
export class AnalysisRuntime {
  private worker: Worker;
  private queue: Task[] = [];
  private active: Task | null = null;
  private sequence = 0;
  private disposed = false;
  private initialized = false;
  private cache = new Map<string, unknown>();
  private pending = new Map<string, Promise<unknown>>();
  constructor(readonly dataset: Universe) {
    this.worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = event => {
      if (this.disposed) return;
      if (event.data.id === 0) { this.initialized = true; this.pump(); return; }
      const task = this.active;
      if (!task || event.data.id !== this.sequence) return;
      this.active = null; this.pending.delete(task.key);
      if (event.data.error) task.reject(new Error(event.data.error));
      else {
        this.cache.set(task.key, event.data.result);
        const inventories = [...this.cache.keys()].filter(k => k.startsWith('inventory|'));
        if (inventories.length > 4) this.cache.delete(inventories[0]);
        if (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value!);
        task.resolve(event.data.result);
      }
      this.pump();
    };
    this.worker.onerror = () => this.dispose(new Error('O cálculo local falhou. Atualize os dados para reiniciar.'));
    this.worker.postMessage({ kind: 'init', id: 0, dataset });
  }
  private pump() {
    if (!this.initialized || this.active || this.disposed || !this.queue.length) return;
    this.queue.sort((a, b) => a.priority - b.priority);
    const next = this.queue.shift()!; this.active = next;
    this.worker.postMessage({ ...next, resolve: undefined, reject: undefined, id: ++this.sequence });
  }
  private request<T>(key: string, task: Omit<Task, 'key' | 'resolve' | 'reject'>): Promise<T> {
    if (this.disposed) return Promise.reject(new DOMException('Cálculo cancelado', 'AbortError'));
    if (this.cache.has(key)) { const v = this.cache.get(key); this.cache.delete(key); this.cache.set(key, v); return Promise.resolve(v as T); }
    const previous = this.pending.get(key); if (previous) { const queued = this.queue.find(t => t.key === key); if (queued) queued.priority = Math.min(task.priority, queued.priority); return previous as Promise<T>; }
    const promise = new Promise<T>((resolve, reject) => { this.queue.push({ ...task, key, resolve: v => resolve(v as T), reject }); });
    this.pending.set(key, promise); this.pump(); return promise;
  }
  analyze(id: string, requested: AnalysisSpec, priority = 1) { const spec = buildingSpec(this.dataset, id, requested); return this.request<CaseAnalysis>(specKey(this.dataset.hash, id, spec), { kind: 'case', buildingId: id, spec, priority }); }
  peek(id: string, spec: AnalysisSpec) { return this.cache.get(specKey(this.dataset.hash, id, buildingSpec(this.dataset, id, spec))) as CaseAnalysis | undefined; }
  inventory(cutoff: string) { return this.request<InventoryRow[]>(`inventory|${cutoff}`, { kind: 'inventory', cutoff, priority: 0 }); }
  capabilities(ids: string[], cutoff: string) { return this.request<Record<string, StudyMethod[]>>(`capabilities|${cutoff}|${ids.join(',')}`, { kind: 'capabilities', buildingIds: ids, cutoff, priority: 3 }); }
  cancelQueued() { for (const t of this.queue.splice(0)) { this.pending.delete(t.key); t.reject(new DOMException('Cálculo substituído', 'AbortError')); } }
  dispose(error: Error = new DOMException('Cálculo cancelado', 'AbortError')) {
    this.disposed = true; this.worker.terminate(); this.active?.reject(error); this.active = null;
    for (const t of this.queue.splice(0)) t.reject(error);
    this.cache.clear(); this.pending.clear();
  }
}
