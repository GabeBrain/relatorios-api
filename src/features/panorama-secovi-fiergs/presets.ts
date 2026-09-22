import type { PanoramaScope } from './types';

export const FIERGS_RM_PORTO_ALEGRE_CITIES = [
  'Alvorada',
  'Cachoeirinha',
  'Canoas',
  'Eldorado do Sul',
  'Esteio',
  'Gravataí',
  'Guaíba',
  'Novo Hamburgo',
  'Porto Alegre',
  'São Leopoldo',
  'Viamão',
] as const;

export interface PanoramaPreset {
  id: string;
  label: string;
  scope: Pick<PanoramaScope, 'uf' | 'cities' | 'entity' | 'engineVersion'>;
}

export const FIERGS_RM_PORTO_ALEGRE_PRESET: PanoramaPreset = {
  id: 'fiergs-rm-porto-alegre',
  label: 'Recorte FIERGS — RM Porto Alegre',
  scope: {
    uf: 'RS',
    cities: [...FIERGS_RM_PORTO_ALEGRE_CITIES],
    entity: 'fiergs-rs',
    engineVersion: 'v4',
  },
};
