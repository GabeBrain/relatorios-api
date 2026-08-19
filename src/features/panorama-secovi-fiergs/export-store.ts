import { create } from 'zustand';
import type { PanoramaReportModel } from './types';

/**
 * Estado do export do Panorama fora da árvore da rota: a rasterização das 62 lâminas leva ~90 s e
 * o usuário precisa continuar navegando pela plataforma enquanto ela acontece. Este módulo é
 * deliberadamente leve — quem o importa não deve arrastar a feature inteira para o bundle inicial.
 */
export type PanoramaExportStatus = 'idle' | 'preparing' | 'capturing' | 'assembling' | 'done' | 'error';

export interface PanoramaExportResult { url: string; name: string; pages: number }

interface PanoramaExportState {
  status: PanoramaExportStatus;
  progress: number;
  total: number;
  error: string;
  /** Snapshot do modelo no momento do clique: o export não depende mais da página seguir montada. */
  report: PanoramaReportModel | null;
  result: PanoramaExportResult | null;
  controller: AbortController | null;

  start: (report: PanoramaReportModel) => void;
  markCapturing: (total: number) => void;
  reportProgress: (current: number, total: number) => void;
  markAssembling: () => void;
  succeed: (result: PanoramaExportResult) => void;
  fail: (error: string) => void;
  cancel: () => void;
  dismiss: () => void;
}

const isRunning = (status: PanoramaExportStatus) => status === 'preparing' || status === 'capturing' || status === 'assembling';

export const usePanoramaExportStore = create<PanoramaExportState>()((set, get) => ({
  status: 'idle',
  progress: 0,
  total: 0,
  error: '',
  report: null,
  result: null,
  controller: null,

  start: (report) => {
    if (isRunning(get().status)) return;
    const previous = get().result;
    if (previous) URL.revokeObjectURL(previous.url);
    set({ status: 'preparing', progress: 0, total: 0, error: '', report, result: null, controller: new AbortController() });
  },
  markCapturing: (total) => set({ status: 'capturing', total }),
  reportProgress: (current, total) => set({ progress: current, total }),
  markAssembling: () => set({ status: 'assembling' }),
  succeed: (result) => set({ status: 'done', result, report: null, controller: null }),
  fail: (error) => set({ status: 'error', error, report: null, controller: null }),
  cancel: () => {
    const { controller, status } = get();
    if (!isRunning(status)) return;
    controller?.abort();
    set({ status: 'idle', progress: 0, total: 0, report: null, controller: null });
  },
  dismiss: () => {
    const { result, status } = get();
    if (isRunning(status)) return;
    if (result) URL.revokeObjectURL(result.url);
    set({ status: 'idle', progress: 0, total: 0, error: '', result: null });
  },
}));

export const panoramaExportIsRunning = isRunning;
