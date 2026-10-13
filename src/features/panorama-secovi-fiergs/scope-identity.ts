import { FIERGS_RM_PORTO_ALEGRE_PRESET } from './presets';
import type { PanoramaScope } from './types';

export type TerritoryScope = Pick<PanoramaScope, 'uf' | 'cities' | 'entity'>;
export const normalizedCity = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
const slug = (value: string) => normalizedCity(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A identidade do preset depende de todo o conjunto, nunca da quantidade ou da ordem. */
export function panoramaScopeIdentity(scope: TerritoryScope) {
  const cities = [...new Map(scope.cities.filter((city) => city.trim()).map((city) => [normalizedCity(city), city.trim()])).values()]
    .sort((a, b) => normalizedCity(a).localeCompare(normalizedCity(b), 'pt-BR'));
  const keys = cities.map(normalizedCity);
  const officialKeys = FIERGS_RM_PORTO_ALEGRE_PRESET.scope.cities.map(normalizedCity).sort();
  const uf = scope.uf.trim().toUpperCase();
  const official = scope.entity === 'fiergs-rs' && uf === 'RS' && keys.length === officialKeys.length
    && [...keys].sort().every((key, index) => key === officialKeys[index]);
  const cityList = cities.join(', ');
  const shortLabel = official ? 'RM de Porto Alegre' : cities.length === 1 ? `${cities[0]}/${uf}` : `${cities.length} municípios · ${uf}`;
  // A lista completa evita colisões entre conjuntos com as mesmas primeiras cidades.
  const scopeKey = `${uf}:${keys.join('|')}`;
  let hash = 2166136261;
  for (let index = 0; index < scopeKey.length; index += 1) hash = Math.imul(hash ^ scopeKey.charCodeAt(index), 16777619);
  const citySlug = cities.length <= 3 ? cities.map(slug).join('-') : `${cities.slice(0, 2).map(slug).join('-')}-e-mais-${cities.length - 2}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  return {
    mode: official ? 'official' as const : 'custom' as const,
    presetId: official ? FIERGS_RM_PORTO_ALEGRE_PRESET.id : null,
    official, uf, cities, cityList, scopeKey, shortLabel,
    coverTitle: official ? 'RM PORTO ALEGRE' : cities.length === 1 ? `${cities[0]} · ${uf}` : `CONJUNTO DE ${cities.length} MUNICÍPIOS · ${uf}`,
    territoryDescription: official ? 'Recorte metropolitano sem Porto Alegre no universo numérico.' : `${cities.length === 1 ? 'Município selecionado' : 'Municípios selecionados'}: ${cityList} · ${uf}.`,
    fileSlug: official ? 'fiergs-rs' : `fiergs-${uf.toLowerCase()}-${citySlug || 'sem-cidade'}`,
  };
}

/** Escopo inválido não pode disparar coleta, mesmo com um primeiro município autorizado. */
export function panoramaCitiesAuthorized(cities: string[], availableCities: string[]): boolean {
  const available = new Set(availableCities.map(normalizedCity));
  return cities.length > 0 && cities.every((city) => available.has(normalizedCity(city)));
}
