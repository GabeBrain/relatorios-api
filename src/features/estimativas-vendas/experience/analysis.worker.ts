/// <reference lib="webworker" />
import { analyzeCase, capabilities, summarizeInventory, type AnalysisSpec, type Universe } from './domain';
import { buildTiles } from './mosaic';
let dataset: Universe;
self.onmessage = async (event: MessageEvent<{ kind: 'init' | 'case' | 'inventory' | 'capabilities' | 'tiles'; id: number; dataset?: Universe; buildingId?: string; buildingIds?: string[]; spec?: AnalysisSpec; cutoff?: string }>) => {
  const m = event.data;
  try {
    if (m.kind === 'init') { dataset = m.dataset!; self.postMessage({ id: m.id, result: true }); }
    else if (m.kind === 'inventory') self.postMessage({ id: m.id, result: summarizeInventory(dataset.buildings, m.cutoff!) });
    else if (m.kind === 'capabilities') self.postMessage({ id: m.id, result: await capabilities(dataset, m.buildingIds!, m.cutoff!) });
    else if (m.kind === 'tiles') self.postMessage({ id: m.id, result: await buildTiles(dataset, m.buildingIds!, m.spec!) });
    else self.postMessage({ id: m.id, result: await analyzeCase(dataset, m.buildingId!, m.spec!) });
  } catch (e) { self.postMessage({ id: m.id, error: e instanceof Error ? e.message : 'Falha de cálculo.' }); }
};
