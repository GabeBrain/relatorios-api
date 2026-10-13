import { panoramaScopeIdentity } from '../scope-identity';
import type { PanoramaScope } from '../types';

/** Composição editorial; não altera escopo, cubo ou nomes dos arquivos. */
export function customCoverLayout(scope: PanoramaScope) {
  const identity = panoramaScopeIdentity(scope);
  const longest = Math.max(0, ...identity.cities.map((city) => city.length));
  const showCoverNames = identity.cities.length > 1 && identity.cities.length <= 4 && longest <= 42;
  const titleSize = identity.cities.length === 1 ? longest > 96 ? 'small' : longest > 54 ? 'medium' : longest > 32 ? 'large' : 'display' : 'large';
  return { ...identity, showCoverNames, titleSize,
    headline: identity.cities.length === 1 ? identity.cities[0] : 'Panorama de mercado',
    cityCountLabel: `${identity.cities.length} ${identity.cities.length === 1 ? 'município' : 'municípios'}`,
  };
}

export function customTerritoryPages(scope: Pick<PanoramaScope, 'cities'>): string[][] {
  const cities = [...scope.cities].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (!cities.length) return [[]];
  const longest = Math.max(...cities.map((city) => city.length));
  const capacity = longest > 70 ? 3 : longest > 36 ? 8 : 12;
  const pages = Math.ceil(cities.length / capacity);
  // Treze cidades viram 7+6, em vez de 12+1; todas as continuações têm peso similar.
  const pageSize = Math.floor(cities.length / pages);
  const remainder = cities.length % pages;
  return Array.from({ length: pages }, (_, index) => {
    const start = index * pageSize + Math.min(index, remainder);
    return cities.slice(start, start + pageSize + (index < remainder ? 1 : 0));
  });
}

export function customTerritoryLayout(cities: string[]) {
  const longest = Math.max(0, ...cities.map((city) => city.length));
  const columns = cities.length <= 3 ? Math.max(1, cities.length) : cities.length === 4 || longest > 36 ? 2 : 3;
  return { columns: longest > 70 ? 1 : columns, dense: cities.length > 6, longNames: longest > 36 };
}
