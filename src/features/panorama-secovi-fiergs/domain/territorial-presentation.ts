import type { PanoramaScope, TerritorialPresentation } from '../types';
import { normalizeText } from './taxonomy';

export function defaultTerritorialPresentation(cities: string[]): TerritorialPresentation {
  return cities.length >= 2 && cities.length <= 3 ? { mode: 'comparison', units: cities.map((city) => ({
    id: `city-${normalizeText(city).replace(/[^a-z0-9]+/g, '-')}`, label: city, cities: [city],
  })) } : { mode: 'consolidated' };
}

/** Pure validation: a label is never an instruction to infer a regional membership. */
export function territorialPresentationErrors(scope: Pick<PanoramaScope, 'cities' | 'presentation'>): string[] {
  if (!scope.presentation || scope.presentation.mode === 'consolidated') return [];
  const units = scope.presentation.units ?? [];
  const errors: string[] = [];
  if (units.length < 2 || units.length > 3) errors.push('A comparação precisa de dois ou três territórios.');
  const names = new Set<string>(); const ids = new Set<string>(); const assigned = new Set<string>();
  const selected = new Set(scope.cities.map(normalizeText));
  if (selected.size !== scope.cities.length) errors.push('A seleção contém municípios repetidos.');
  for (const unit of units) {
    const name = normalizeText(unit.label);
    if (!name || unit.label.trim().length > 60) errors.push('Use nomes de território com 1 a 60 caracteres.');
    if (names.has(name)) errors.push('Os nomes dos territórios devem ser diferentes.');
    names.add(name);
    if (!unit.id || ids.has(unit.id)) errors.push('Cada território precisa de um identificador único.');
    ids.add(unit.id);
    if (!unit.cities.length) errors.push(`Atribua ao menos uma cidade a ${unit.label || 'cada território'}.`);
    for (const city of unit.cities) {
      const key = normalizeText(city);
      if (!selected.has(key)) errors.push(`${city} não pertence ao recorte selecionado.`);
      if (assigned.has(key)) errors.push(`${city} está em mais de um território.`);
      assigned.add(key);
    }
  }
  if ([...selected].some((city) => !assigned.has(city))) errors.push('Atribua todas as cidades selecionadas a um território.');
  return [...new Set(errors)];
}

export function territorialPresentationKey(presentation?: TerritorialPresentation): string {
  return JSON.stringify(!presentation || presentation.mode === 'consolidated' ? ['consolidated'] :
    ['comparison', ...(presentation.units ?? []).map((u) => [u.id, u.label.trim(), u.cities.map(normalizeText).sort()])]);
}

/** Shared by the query/session callers; editorial names/memberships never change collection identity. */
export function panoramaCollectionKey(scope: PanoramaScope): string {
  return JSON.stringify([scope.entity ?? 'secovi-sp', scope.engineVersion ?? 'v4', scope.uf,
    scope.cities.map(normalizeText).sort(), scope.startQuarter, scope.endQuarter]);
}
