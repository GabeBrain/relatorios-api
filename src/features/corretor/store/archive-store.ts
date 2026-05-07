import { create } from 'zustand';
import type { SlideResult } from './analysis-store';
import {
  saveProjectToDb,
  loadProjectsFromDb,
  deleteProjectFromDb,
  clearAllProjectsFromDb,
} from '../lib/archive-db';

export type ArchivedSlide = Omit<SlideResult, 'imageDataUrl'>;

export interface ArchivedProject {
  id: string;
  savedAt: string;
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
}));
