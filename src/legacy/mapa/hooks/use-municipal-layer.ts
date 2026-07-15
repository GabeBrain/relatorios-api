import { useCallback, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { useMapStore } from '@/legacy/mapa/store/map-store';
import { isMunicipalLayerName, MUNICIPAL_LAYER_NAME } from '@/legacy/mapa/lib/ibge-selection';

const MUNICIPAL_LAYER_URL = '/data/ibge_municipios_2024_socio.geojson';

type LoadResult = 'loaded' | 'exists';

export function useMunicipalLayer() {
  const [loading, setLoading] = useState(false);
  const addLayer = useMapStore((s) => s.addLayer);
  const layers = useMapStore((s) => s.layers);
  const removeLayer = useMapStore((s) => s.removeLayer);

  const loadMunicipalLayer = useCallback(async (): Promise<LoadResult> => {
    const existing = layers.find((layer) => isMunicipalLayerName(layer.name));
    if (existing) {
      const hasData = Boolean(existing.data?.features?.length);
      if (hasData) return 'exists';
      removeLayer(existing.id);
    }

    setLoading(true);
    try {
      const response = await fetch(MUNICIPAL_LAYER_URL, { cache: 'force-cache' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao carregar a camada municipal`);
      }

      const geojson = (await response.json()) as FeatureCollection;
      const layerId = crypto.randomUUID();
      geojson.features?.forEach((feature, i) => {
        if (!feature.id) feature.id = `${layerId}-${i}`;
        if (!feature.properties) feature.properties = {};
        feature.properties._layerId = layerId;
        feature.properties._featureId = String(feature.id);
      });

      addLayer({
        id: layerId,
        name: MUNICIPAL_LAYER_NAME,
        visible: true,
        opacity: 0.8,
        order: 0,
        data: geojson,
        color: '#1E5C93',
        metricField: 'renda_media_domic_assets',
      });
      return 'loaded';
    } finally {
      setLoading(false);
    }
  }, [addLayer, layers, removeLayer]);

  return { loadMunicipalLayer, loadingMunicipal: loading };
}
