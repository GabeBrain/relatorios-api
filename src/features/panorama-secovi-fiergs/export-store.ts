import { create } from 'zustand';
import type { PanoramaReportModel } from './types';

/**
 * Estado do export do Panorama fora da árvore da rota: a rasterização das lâminas pode levar alguns minutos e
 * o usuário precisa continuar navegando pela plataforma enquanto ela acontece. Este módulo é
 * deliberadamente leve — quem o importa não deve arrastar a feature inteira para o bundle inicial.
 */
export type PanoramaExportStatus = 'idle' | 'preparing' | 'capturing' | 'assembling' | 'done' | 'error';
export type PanoramaExportFormat = 'pdf' | 'pptx';

export interface PanoramaExportResult { url: string; name: string; pages: number }

interface PanoramaExportState {
  consistencyAcknowledged: boolean;
  status: PanoramaExportStatus;
  progress: number;
  total: number;
  error: string;
  format: PanoramaExportFormat;
  /** Snapshot do modelo no momento do clique: o export não depende mais da página seguir montada. */
  report: PanoramaReportModel | null;
  result: PanoramaExportResult | null;
  controller: AbortController | null;

  start: (report: PanoramaReportModel, format: PanoramaExportFormat, options?: { consistencyAcknowledged?: boolean }) => void;
  markCapturing: (total: number) => void;
  reportProgress: (current: number, total: number) => void;
  markAssembling: () => void;
  succeed: (result: PanoramaExportResult) => void;
  fail: (error: string) => void;
  cancel: () => void;
  dismiss: () => void;
}

const isRunning = (status: PanoramaExportStatus) => status === 'preparing' || status === 'capturing' || status === 'assembling';

/** Decisão única usada pela interface, pelo estado e pelo host imediatamente antes da captura. */
export function panoramaExportBlockReason(report: Pick<PanoramaReportModel, 'scope' | 'reconciliation' | 'provenance'>, options: { consistencyAcknowledged?: boolean } = {}): string | null {
  if (!report.provenance) return 'Exportação bloqueada: a proveniência de cobertura municipal não está disponível.';
  const requested = new Set([...report.provenance.requestedCities, ...report.scope.cities]);
  const completed = new Set(report.provenance.completedCities);
  const missing = [...requested].filter((city) => !completed.has(city));
  if (missing.length || report.provenance.failedCities.length) {
    return `Exportação bloqueada: coleta incompleta para ${missing.join(', ') || report.provenance.failedCities.map(({ city }) => city).join(', ')}.`;
  }
  // User-directed export policy: numeric checks stay intact; a reviewed alert permits this job.
  // Coverage/provenance are checked above and cannot be bypassed by this acknowledgement.
  if (report.scope.entity !== 'fiergs-rs' || options.consistencyAcknowledged) return null;
  const critical = report.reconciliation?.rows?.filter((row) => row.critical && row.status !== 'match') ?? [];
  if (report.reconciliation?.homologable && critical.length === 0) return null;
  const metrics = critical.slice(0, 3).map((row) => row.metricId).join(', ');
  const detail = critical.length ? ` ${critical.length} invariantes: ${metrics}${critical.length > 3 ? '…' : ''}.` : '';
  return `Exportação bloqueada: o relatório FIERGS possui invariantes críticas não reconciliadas.${detail}`;
}

export const usePanoramaExportStore = create<PanoramaExportState>()((set, get) => ({
  consistencyAcknowledged: false,
  status: 'idle',
  progress: 0,
  total: 0,
  error: '',
  format: 'pdf',
  report: null,
  result: null,
  controller: null,

  start: (report, format, options = {}) => {
    if (isRunning(get().status)) return;
    const consistencyAcknowledged = options.consistencyAcknowledged === true;
    const blockReason = panoramaExportBlockReason(report, { consistencyAcknowledged });
    if (blockReason) {
      set({ status: 'error', progress: 0, total: 0, error: blockReason, format, report: null, result: null, controller: null, consistencyAcknowledged: false });
      return;
    }
    const previous = get().result;
    if (previous) URL.revokeObjectURL(previous.url);
    set({ status: 'preparing', progress: 0, total: 0, error: '', format, report, result: null, controller: new AbortController(), consistencyAcknowledged });
  },
  markCapturing: (total) => set({ status: 'capturing', total }),
  reportProgress: (current, total) => set({ progress: current, total }),
  markAssembling: () => set({ status: 'assembling' }),
  succeed: (result) => set({ status: 'done', result, report: null, controller: null, consistencyAcknowledged: false }),
  fail: (error) => set({ status: 'error', error, report: null, controller: null, consistencyAcknowledged: false }),
  cancel: () => {
    const { controller, status } = get();
    if (!isRunning(status)) return;
    controller?.abort();
    set({ status: 'idle', progress: 0, total: 0, report: null, controller: null, consistencyAcknowledged: false });
  },
  dismiss: () => {
    const { result, status } = get();
    if (isRunning(status)) return;
    if (result) URL.revokeObjectURL(result.url);
    set({ status: 'idle', progress: 0, total: 0, error: '', result: null, consistencyAcknowledged: false });
  },
}));

export const panoramaExportIsRunning = isRunning;
