import { create } from 'zustand';
import type { SlideResult, Verdict } from './analysis-store';
import {
  saveProjectToDb,
  loadProjectsFromDb,
  deleteProjectFromDb,
  clearAllProjectsFromDb,
  updateErrorVerdictInDb,
  markProjectReviewedInDb,
} from '../lib/archive-db';
import { logActivity } from '@/lib/activity-log';

export type ArchivedSlide = Omit<SlideResult, 'imageDataUrl'> & {
  /** Caminho da thumbnail no bucket (null após poda dos slides OK). */
  imagePath?: string | null;
};

export interface ArchivedProject {
  id: string;
  savedAt: string;
  /** Carimbo de revisão concluída (null = em revisão). */
  reviewedAt?: string | null;
  projectName: string;
  cityName: string;
  radii: string;
  model: string;
  totalSlides: number;
  slidesOk: number;
  slidesWithErrors: number;
  slidesSkipped: number;
  slidesError: number;
  totalErrors: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  reportText: string;
  slides?: ArchivedSlide[];
}

interface ArchiveStore {
  projects: ArchivedProject[];
  loading: boolean;
  loadProjects: () => Promise<void>;
  addProject: (
    meta: Omit<ArchivedProject, 'id' | 'savedAt' | 'slides'>,
    slides: SlideResult[]
  ) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setErrorVerdict: (projectId: string, errorId: string, verdict: Verdict | null) => Promise<void>;
  markReviewed: (projectId: string) => Promise<void>;
}

export const useArchiveStore = create<ArchiveStore>((set) => ({
  projects: [],
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    try {
      const projects = await loadProjectsFromDb();
      set({ projects });
    } catch (err) {
      console.error('Falha ao carregar histórico:', err);
    } finally {
      set({ loading: false });
    }
  },

  addProject: async (meta, slides) => {
    try {
      await saveProjectToDb(meta, slides);
      logActivity('Auditoria salva', `${meta.projectName} (${meta.totalErrors} erros)`);
      const projects = await loadProjectsFromDb();
      set({ projects });
    } catch (err) {
      console.error('Falha ao salvar projeto:', err);
    }
  },

  removeProject: async (id) => {
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
    try {
      await deleteProjectFromDb(id);
    } catch (err) {
      console.error('Falha ao remover projeto:', err);
    }
  },

  clearAll: async () => {
    set({ projects: [] });
    try {
      await clearAllProjectsFromDb();
    } catch (err) {
      console.error('Falha ao limpar histórico:', err);
    }
  },

  setErrorVerdict: async (projectId, errorId, verdict) => {
    const apply = (v: Verdict | null) =>
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                slides: p.slides?.map((s) => ({
                  ...s,
                  errors: s.errors.map((e) => (e.id === errorId ? { ...e, verdict: v } : e)),
                })),
              }
        ),
      }));

    const previous = useArchiveStore
      .getState()
      .projects.find((p) => p.id === projectId)
      ?.slides?.flatMap((s) => s.errors)
      .find((e) => e.id === errorId)?.verdict ?? null;

    apply(verdict); // otimista
    try {
      await updateErrorVerdictInDb(errorId, verdict);
    } catch (err) {
      apply(previous); // reverte
      throw err;
    }
  },

  markReviewed: async (projectId) => {
    await markProjectReviewedInDb(projectId);
    logActivity('Revisão concluída', `projeto ${projectId} (imagens OK podadas)`);
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              reviewedAt: new Date().toISOString(),
              slides: p.slides?.map((s) => (s.errors.length === 0 ? { ...s, imagePath: null } : s)),
            }
          : p
      ),
    }));
  },
}));
