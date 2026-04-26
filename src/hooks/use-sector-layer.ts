import { useCallback, useMemo, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { useMapStore } from '@/store/map-store';
import {
  findSelectedMunicipality,
  SETOR_LAYER_PREFIX,
} from '@/lib/ibge-selection';

const POF_CURITIBA_CD_MUN = '4106902';
const POF_SECTOR_LAYER_BASE_URL = '/data/pof_setores_2026';

type LoadResult = 'loaded' | 'exists';

interface UseSectorLayerResult {
  loadingSetor: boolean;
  selectedMunicipalityLabel: string | null;
  loadSectorLayerFromSelection: () => Promise<LoadResult>;
}

export function useSectorLayer(): UseSectorLayerResult {
  const [loading, setLoading] = useState(false);
  const addLayer = useMapStore((s) => s.addLayer);
  const removeLayer = useMapStore((s) => s.removeLayer);
  const layers = useMapStore((s) => s.layers);
  const selectedFeatureId = useMapStore((s) => s.selectedFeatureId);

  const selectedMunicipality = useMemo(
    () => findSelectedMunicipality(layers, selectedFeatureId),
    [layers, selectedFeatureId]
  );

  const selectedMunicipalityLabel = selectedMunicipality
    ? `${selectedMunicipality.nmMun} (${selectedMunicipality.siglaUf || 'UF'})`
    : null;

  const loadSectorLayerFromSelection = useCallback(async (): Promise<LoadResult> => {
    const selected = findSelectedMunicipality(layers, selectedFeatureId);
    if (!selected) {
      throw new Error('Selecione um municipio na camada municipal antes de carregar setores');
    }
    if (selected.cdMun !== POF_CURITIBA_CD_MUN) {
      throw new Error(
        `A malha setorial POF esta disponivel no momento apenas para Curitiba (CD_MUN ${POF_CURITIBA_CD_MUN})`
      );
    }

    const layerName = `${SETOR_LAYER_PREFIX}${selected.nmMun} (${selected.siglaUf || 'UF'})`;
    const existing = layers.find((layer) => layer.name === layerName);
    if (existing) {
      const hasData = Boolean(existing.data?.features?.length);
      if (hasData) return 'exists';
      removeLayer(existing.id);
    }

    setLoading(true);
    try {
      const municipalityLabel = `${selected.nmMun} (${selected.siglaUf || 'UF'})`;
      const url = `${POF_SECTOR_LAYER_BASE_URL}/${selected.cdMun}.geojson`;
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Recorte setorial POF indisponivel para ${municipalityLabel} (CD_MUN ${selected.cdMun}). Arquivo esperado: ${url}`
          );
        }
        throw new Error(`HTTP ${response.status} ao carregar recorte setorial POF`);
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
        name: layerName,
        visible: true,
        opacity: 0.88,
        order: 0,
        data: geojson,
        color: '#A03D2F',
        metricField: 'rend_mensal_por_domicilio2026',
      });
      return 'loaded';
    } finally {
      setLoading(false);
    }
  }, [addLayer, layers, removeLayer, selectedFeatureId]);

  return {
    loadingSetor: loading,
    selectedMunicipalityLabel,
    loadSectorLayerFromSelection,
  };
}
