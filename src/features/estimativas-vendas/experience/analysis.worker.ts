/// <reference lib="webworker" />
import { analyzeCase, capabilities, summarizeInventory, type AnalysisSpec, type Universe } from './domain';
let dataset: Universe;
self.onmessage = async (event: MessageEvent<{ kind: 'init' | 'case' | 'inventory' | 'capabilities'; id: number; dataset?: Universe; buildingId?: string; buildingIds?: string[]; spec?: AnalysisSpec; cutoff?: string }>) => {
  const m = event.data;
  try {
    if (m.kind === 'init') { dataset = m.dataset!; self.postMessage({ id: m.id, result: true }); }
    else if (m.kind === 'inventory') self.postMessage({ id: m.id, result: summarizeInventory(dataset.buildings, m.cutoff!) });
    else if (m.kind === 'capabilities') self.postMessage({ id: m.id, result: await capabilities(dataset, m.buildingIds!, m.cutoff!) });
    else self.postMessage({ id: m.id, result: await analyzeCase(dataset, m.buildingId!, m.spec!) });
  } catch (e) { self.postMessage({ id: m.id, error: e instanceof Error ? e.message : 'Falha de cálculo.' }); }
};
