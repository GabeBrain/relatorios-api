/// <reference lib="webworker" />
import { inventory, runStudy, sourcePeriods, type StudyDataset, type StudyProtocol } from './study';

self.onmessage = async (event: MessageEvent<{ kind: 'inventory' | 'run'; dataset: StudyDataset; protocol?: StudyProtocol }>) => {
  try {
    const { kind, dataset, protocol } = event.data;
    if (kind === 'inventory') {
      const latest = sourcePeriods(dataset.buildings).at(-1);
      self.postMessage({ kind: 'inventory', result: latest ? inventory(dataset.buildings, latest) : [] });
    } else if (protocol) {
      const result = await runStudy(dataset, protocol, undefined, (done, total) => self.postMessage({ kind: 'progress', done, total }));
      self.postMessage({ kind: 'run', result });
    }
  } catch (error) {
    self.postMessage({ kind: 'error', message: error instanceof Error ? error.message : 'Falha no processamento local.' });
  }
};
