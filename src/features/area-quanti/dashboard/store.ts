import { create } from 'zustand';
import type { CategoricalField, Filters } from './types';

interface State {
  datasetId: string;
  filters: Filters;
  setDatasetId: (id: string) => void;
  setFilter: (field: CategoricalField, values: string[]) => void;
  toggleValue: (field: CategoricalField, value: string) => void;
  removeFilter: (field: CategoricalField, value?: string) => void;
  clearAll: () => void;
}

export const useQuantiStore = create<State>((set) => ({
  datasetId: '2020',
  filters: {},
  setDatasetId: (id) => set({ datasetId: id, filters: {} }),
  setFilter: (field, values) =>
    set((s) => {
      const next = { ...s.filters };
      if (!values.length) delete next[field];
      else next[field] = values;
      return { filters: next };
    }),
  toggleValue: (field, value) =>
    set((s) => {
      const cur = s.filters[field] ?? [];
      const next = { ...s.filters };
      if (cur.includes(value)) {
        const remain = cur.filter((v) => v !== value);
        if (remain.length) next[field] = remain;
        else delete next[field];
      } else {
        next[field] = [...cur, value];
      }
      return { filters: next };
    }),
  removeFilter: (field, value) =>
    set((s) => {
      const next = { ...s.filters };
      if (value == null) { delete next[field]; return { filters: next }; }
      const cur = (next[field] ?? []).filter((v) => v !== value);
      if (cur.length) next[field] = cur; else delete next[field];
      return { filters: next };
    }),
  clearAll: () => set({ filters: {} }),
}));
