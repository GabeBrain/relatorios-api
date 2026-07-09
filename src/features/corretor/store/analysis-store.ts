import { create } from 'zustand';

// ErrorType agora vive no catálogo central (20 tipos). Reexportado aqui para
// compatibilidade com o código v1 que importa de '../store/analysis-store'.
import type { ErrorType } from '../lib/error-catalog';
export type { ErrorType };
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';
export type SlideStatus = 'pending' | 'processing' | 'done' | 'skipped' | 'error';
export type AnalysisStatus = 'idle' | 'processing' | 'done' | 'cancelled';
export type ModelId = 'gpt-4o' | 'gpt-4o-mini';

/** Veredito da analista na revisão: bug real ou falso positivo. */
export type Verdict = 'bug' | 'fp';

export interface SlideError {
  type: ErrorType;
  severity: Severity;
  description: string;
  location: string;
  /** Presente apenas em erros carregados do histórico (id da linha em slide_errors). */
  id?: string;
  verdict?: Verdict | null;
}

export interface SlideResult {
  slideNumber: number;
  status: SlideStatus;
  errors: SlideError[];
  hasData: boolean;
  summary: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  imageDataUrl?: string;
}

export interface ProjectConfig {
  projectName: string;
  cityName: string;
  radii: string;
  model: ModelId;
}

export interface CostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  avgCostPerSlide: number;
  processedSlides: number;
  skippedSlides: number;
  slidesWithErrors: number;
  projectedTotal: number;
  totalSlides: number;
}

interface AnalysisStore {
  file: File | null;
  config: ProjectConfig | null;
  slides: SlideResult[];
  status: AnalysisStatus;
  currentSlide: number;

  setFile: (file: File) => void;
  setConfig: (config: ProjectConfig) => void;
  initSlides: (count: number) => void;
  updateSlide: (slideNumber: number, update: Partial<SlideResult>) => void;
  setStatus: (status: AnalysisStatus) => void;
  setCurrentSlide: (n: number) => void;
  reset: () => void;
  getCostSummary: () => CostSummary;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  file: null,
  config: null,
  slides: [],
  status: 'idle',
  currentSlide: 0,

  setFile: (file) => set({ file }),
  setConfig: (config) => set({ config }),

  initSlides: (count) =>
    set({
      slides: Array.from({ length: count }, (_, i) => ({
        slideNumber: i + 1,
        status: 'pending',
        errors: [],
        hasData: false,
        summary: '',
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      })),
    }),

  updateSlide: (slideNumber, update) =>
    set((state) => ({
      slides: state.slides.map((s) =>
        s.slideNumber === slideNumber ? { ...s, ...update } : s
      ),
    })),

  setStatus: (status) => set({ status }),
  setCurrentSlide: (n) => set({ currentSlide: n }),

  reset: () =>
    set({
      file: null,
      config: null,
      slides: [],
      status: 'idle',
      currentSlide: 0,
    }),

  getCostSummary: () => {
    const { slides } = get();
    const done = slides.filter((s) => s.status === 'done');
    const skipped = slides.filter((s) => s.status === 'skipped');
    const withErrors = done.filter((s) => s.errors.length > 0);
    const totalInputTokens = done.reduce((sum, s) => sum + s.inputTokens, 0);
    const totalOutputTokens = done.reduce((sum, s) => sum + s.outputTokens, 0);
    const totalCost = done.reduce((sum, s) => sum + s.cost, 0);
    const avgCostPerSlide = done.length > 0 ? totalCost / done.length : 0;
    const totalSlides = slides.length;
    const processed = done.length + skipped.length;
    const projectedTotal =
      processed > 0 ? (totalCost / processed) * totalSlides : 0;

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      avgCostPerSlide,
      processedSlides: done.length,
      skippedSlides: skipped.length,
      slidesWithErrors: withErrors.length,
      projectedTotal,
      totalSlides,
    };
  },
}));
