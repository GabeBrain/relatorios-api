import { buildingId, readHorizontalHistory, type SourceType } from '../source';
import { compactBuilding } from '../scientific/study';
import { snapshotHash } from '../scientific/client';
import type { Area, Universe } from './domain';

/** Atomic universe loading. Sequential city/type calls share the transport's eight-request pool. */
export async function loadUniverse(areas: Area[], ids: string[], signal: AbortSignal, progress: (text: string) => void): Promise<Universe> {
  if (!areas.length || areas.some(a => !a.uf || !a.city)) throw new Error('Escolha um universo autorizado.');
  const buildings: Universe['buildings'] = [], locations: Universe['locations'] = {}, requests: Universe['requests'] = [];
  const wanted = new Set(ids), seen = new Set<string>();
  const uniqueAreas = [...new Map(areas.map(a => [`${a.uf}|${a.city}`, a])).values()];
  for (const area of uniqueAreas) for (const type of ['Horizontal', 'Vertical'] as SourceType[]) {
    const response = await readHorizontalHistory(area.uf, area.city, signal, (p, n) => progress(`${area.city}/${area.uf} · ${type} · ${p}/${n} páginas · ${requests.length}/${uniqueAreas.length * 2} consultas concluídas`), type);
    requests.push({ ...area, type, pages: response.pages });
    for (const b of response.buildings) {
      const id = buildingId(b);
      if (wanted.size && !wanted.has(id)) continue;
      if (seen.has(id)) throw new Error(`ID ${id} repetido entre consultas; revise a identidade da fonte.`);
      seen.add(id); buildings.push(compactBuilding(b)); locations[id] = area;
    }
  }
  if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
  const content = { schema: 'forecast-universe-v1' as const, complete: true as const, areas: uniqueAreas, locations, requests, missingIds: ids.filter(id => !seen.has(id)), buildings };
  return { ...content, city: uniqueAreas.length === 1 ? uniqueAreas[0].city : '', uf: uniqueAreas.length === 1 ? uniqueAreas[0].uf : '', fetchedAt: new Date().toISOString(), hash: await snapshotHash(content) };
}
