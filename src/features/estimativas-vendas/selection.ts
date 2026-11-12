import { buildingId, buildingName, type Building } from './source';
import type { Decision } from './research';

/** A lista contém toda a resposta da cidade; elegibilidade é um filtro opcional. */
export function visibleBuildings(buildings: Building[], search: string, eligibleOnly: boolean, decisions: Map<string, Decision>): Building[] {
  const query = search.trim().toLocaleLowerCase('pt-BR');
  return buildings.filter(building => {
    const matches = `${buildingName(building)} ${buildingId(building)}`.toLocaleLowerCase('pt-BR').includes(query);
    return matches && (!eligibleOnly || Boolean(decisions.get(buildingId(building))?.projection));
  });
}
