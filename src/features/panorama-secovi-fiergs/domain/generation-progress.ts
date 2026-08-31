export type PanoramaGenerationPhase = 'collecting' | 'consolidating' | 'preparing';

export interface PanoramaGenerationProgress {
  phase: PanoramaGenerationPhase;
  completed: number;
  total: number;
  percent: number;
  startedAt: number;
  city?: string;
  operation?: string;
  completedCities: string[];
  failedCities: string[];
}

export type PanoramaProgressListener = (progress: PanoramaGenerationProgress) => void;

const UNITS_PER_CITY = 11;

/** Progresso baseado nas chamadas realmente encerradas, não em temporizador estimado. */
export function createPanoramaGenerationProgress(cityCount: number, listener?: PanoramaProgressListener) {
  const total = Math.max(2, cityCount * UNITS_PER_CITY + 2);
  const startedAt = Date.now();
  let completed = 0;
  let phase: PanoramaGenerationPhase = 'collecting';
  let city: string | undefined;
  let operation: string | undefined;
  const completedCities = new Set<string>();
  const failedCities = new Set<string>();

  const emit = () => listener?.({
    phase, completed, total, percent: Math.round(completed / total * 100), startedAt, city, operation,
    completedCities: [...completedCities], failedCities: [...failedCities],
  });
  const step = (nextPhase: PanoramaGenerationPhase, nextCity?: string, nextOperation?: string) => {
    completed = Math.min(total, completed + 1);
    phase = nextPhase; city = nextCity; operation = nextOperation;
    emit();
  };

  return {
    start: () => emit(),
    unit: (nextCity: string, nextOperation: string) => step('collecting', nextCity, nextOperation),
    cityComplete: (nextCity: string) => { completedCities.add(nextCity); city = nextCity; operation = 'cidade concluída'; emit(); },
    cityFailed: (nextCity: string) => { failedCities.add(nextCity); city = nextCity; operation = 'cidade indisponível'; emit(); },
    consolidate: () => step('consolidating', undefined, 'consolidando municípios'),
    prepare: () => step('preparing', undefined, 'preparando páginas'),
  };
}

export function observedRemainingMs(progress: PanoramaGenerationProgress, now = Date.now()): number | null {
  if (progress.completed < 2 || progress.completed >= progress.total) return null;
  const elapsed = Math.max(0, now - progress.startedAt);
  return Math.max(0, Math.round(elapsed / progress.completed * (progress.total - progress.completed)));
}

export function formatRemainingTime(milliseconds: number | null): string | null {
  if (milliseconds === null) return null;
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes} min ${remainder} s` : `${minutes} min`;
}
