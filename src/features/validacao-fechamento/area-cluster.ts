import type { ValidationBuilding } from './api';

export interface AreaBand { lo: number; hi: number; }

/** Mesmo algoritmo de computeRangeBuckets do Dashboard, isolado nesta feature. */
export function areaBands(values: number[]): AreaBand[] {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const edges: number[] = [];
  for (let i = 1; i < 6; i++) {
    const value = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * i / 6))];
    const magnitude = 10 ** (Math.floor(Math.log10(value)) - 1);
    const edge = Math.round(value / magnitude) * magnitude;
    if (edge > 0 && (!edges.length || edge > edges[edges.length - 1])) edges.push(edge);
  }
  return [0, ...edges].map((lo, index, cuts) => ({ lo, hi: cuts[index + 1] ?? Infinity }));
}

export const areaKey = (buildingId: string, typologyId: string) => JSON.stringify([buildingId, typologyId]);

/** Uma área representativa por tipologia, independente do período filtrado da validação. */
export function typologyAreaGroups(buildings: ValidationBuilding[]): Map<string, string> {
  const entries = buildings.flatMap((building) => building.typologies.map((typology) => {
    const area = [...typology.history].sort((a, b) => b.period.localeCompare(a.period))
      .find((history) => history.private_area != null && Number.isFinite(history.private_area) && history.private_area > 0)?.private_area ?? null;
    return { key: areaKey(building.building_id, typology.typology_id), scope: JSON.stringify([building.city, building.building_type]), area };
  }));
  const scopes = new Map<string, number[]>();
  for (const entry of entries) {
    if (!scopes.has(entry.scope)) scopes.set(entry.scope, []);
    if (entry.area != null) scopes.get(entry.scope)!.push(entry.area);
  }
  const ranges = new Map([...scopes].map(([scope, values]) => [scope, areaBands(values)]));
  return new Map(entries.map((entry) => {
    const band = entry.area == null ? undefined : ranges.get(entry.scope)?.find(({ lo, hi }) => entry.area! >= lo && entry.area! < hi);
    return [entry.key, band ? `Área: [${band.lo}, ${band.hi === Infinity ? '∞' : band.hi}) m²` : 'Área não informada'];
  }));
}
