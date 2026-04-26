import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeatureCollection } from 'geojson';

export interface GeoLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  order: number;
  data: FeatureCollection;
  color: string;
  metricField?: string | null;
}

interface MapState {
  layers: GeoLayer[];
  selectedFeatureId: string | null;
  hoveredFeatureId: string | null;
  searchQuery: string;
  sidebarOpen: boolean;

  addLayer: (layer: GeoLayer) => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerMetricField: (id: string, metricField: string | null) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setHoveredFeatureId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

const LAYER_COLORS = [
  '#5B7537', '#254A80', '#8A6A00', '#8F1F1F', '#3F5A23',
  '#2563EB', '#D97706', '#7C3AED', '#0891B2', '#DB2777',
];

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      layers: [],
      selectedFeatureId: null,
      hoveredFeatureId: null,
      searchQuery: '',
      sidebarOpen: true,

      addLayer: (layer) =>
        set((s) => ({ layers: [...s.layers, { ...layer, color: layer.color || LAYER_COLORS[s.layers.length % LAYER_COLORS.length] }] })),

      removeLayer: (id) =>
        set((s) => ({ layers: s.layers.filter((l) => l.id !== id) })),

      toggleLayerVisibility: (id) =>
        set((s) => ({
          layers: s.layers.map((l) =>
            l.id === id ? { ...l, visible: !l.visible } : l
          ),
        })),

      setLayerOpacity: (id, opacity) =>
        set((s) => ({
          layers: s.layers.map((l) =>
            l.id === id ? { ...l, opacity } : l
          ),
        })),

      setLayerMetricField: (id, metricField) =>
        set((s) => ({
          layers: s.layers.map((l) =>
            l.id === id ? { ...l, metricField } : l
          ),
        })),

      reorderLayers: (fromIndex, toIndex) =>
        set((s) => {
          const arr = [...s.layers];
          const [moved] = arr.splice(fromIndex, 1);
          arr.splice(toIndex, 0, moved);
          return { layers: arr.map((l, i) => ({ ...l, order: i })) };
        }),

      setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),
      setHoveredFeatureId: (id) => set({ hoveredFeatureId: id }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'brain-geo-store',
      partialize: (state) => ({
        layers: state.layers.map(({ data, ...rest }) => rest),
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
