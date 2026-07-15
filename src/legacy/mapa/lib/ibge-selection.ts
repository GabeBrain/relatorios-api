import type { Feature } from 'geojson';
import type { GeoLayer } from '@/legacy/mapa/store/map-store';

export const MUNICIPAL_LAYER_NAME = 'IBGE Municipios + Indicadores';
export const MUNICIPAL_LAYER_NAME_UTF8 = 'IBGE MunicÃ­pios + Indicadores';
export const MUNICIPAL_LAYER_NAME_LEGACY = 'IBGE MunicÃƒÂ­pios + Indicadores';
export const MUNICIPAL_LAYER_NAME_LEGACY_DOUBLE = 'IBGE MunicÃƒÆ’Ã‚Â­pios + Indicadores';
export const SETOR_LAYER_PREFIX = 'POF Setores 2026 - ';

export interface SelectedMunicipality {
  cdMun: string;
  nmMun: string;
  siglaUf: string;
}

function normalizeMunicipalityCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 7) return digitsOnly;
  return trimmed;
}

function getFeatureId(feature: Feature): string {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const featureId = props._featureId;
  if (featureId != null) return String(featureId);
  if (feature.id != null) return String(feature.id);
  return '';
}

function pickStringProp(props: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = props[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function municipalityFromProps(props: Record<string, unknown>): SelectedMunicipality | null {
  const cdMun = normalizeMunicipalityCode(
    pickStringProp(props, [
      'CD_MUN',
      'cd_mun',
      'cod_mun',
      'COD_MUN',
      'ID_MUN',
      'id_mun',
      'municipio_id',
      'codmun',
    ])
  );
  if (!/^\d{7}$/.test(cdMun)) return null;

  const nmMun = pickStringProp(props, ['NM_MUN', 'nm_mun', 'municipio']);
  const siglaUf = pickStringProp(props, ['SIGLA_UF', 'NM_UF', 'CD_UF', 'uf']);

  return {
    cdMun,
    nmMun: nmMun || cdMun,
    siglaUf,
  };
}

function findSelectedFeature(
  layers: GeoLayer[],
  selectedFeatureId: string
): Feature | null {
  for (const layer of layers) {
    const features = layer.data?.features as Feature[] | undefined;
    if (!features?.length) continue;
    const selected = features.find((feature) => getFeatureId(feature) === selectedFeatureId);
    if (selected) return selected;
  }
  return null;
}

function findMunicipalityByCode(
  layers: GeoLayer[],
  cdMun: string
): SelectedMunicipality | null {
  for (const layer of layers) {
    if (!isMunicipalLayerName(layer.name)) continue;
    const features = layer.data?.features as Feature[] | undefined;
    if (!features?.length) continue;
    const feature = features.find((f) => {
      const props = (f.properties ?? {}) as Record<string, unknown>;
      const featureCdMun = normalizeMunicipalityCode(
        pickStringProp(props, [
          'CD_MUN',
          'cd_mun',
          'cod_mun',
          'COD_MUN',
          'ID_MUN',
          'id_mun',
          'municipio_id',
          'codmun',
        ])
      );
      return featureCdMun === cdMun;
    });
    if (!feature) continue;
    return municipalityFromProps((feature.properties ?? {}) as Record<string, unknown>);
  }
  return null;
}

export function findSelectedMunicipality(
  layers: GeoLayer[],
  selectedFeatureId: string | null
): SelectedMunicipality | null {
  if (!selectedFeatureId) return null;

  const selectedFeature = findSelectedFeature(layers, selectedFeatureId);
  if (selectedFeature) {
    const fromSelected = municipalityFromProps(
      (selectedFeature.properties ?? {}) as Record<string, unknown>
    );
    if (fromSelected) return fromSelected;
  }

  if (/^\d{7}$/.test(selectedFeatureId)) {
    const byCode = findMunicipalityByCode(layers, selectedFeatureId);
    if (byCode) return byCode;
  }

  return null;
}

export function isMunicipalLayerName(name: string): boolean {
  return (
    name === MUNICIPAL_LAYER_NAME ||
    name === MUNICIPAL_LAYER_NAME_UTF8 ||
    name === MUNICIPAL_LAYER_NAME_LEGACY ||
    name === MUNICIPAL_LAYER_NAME_LEGACY_DOUBLE
  );
}
