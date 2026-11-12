import type { PanoramaScope } from '../types';
import type { GeographicPoint } from './map-tiles';

export interface MunicipalTerritory {
  source: string;
  cities: string[];
  extent: { minLatitude: number; maxLatitude: number; minLongitude: number; maxLongitude: number };
}
const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const cache = new Map<string, Promise<MunicipalTerritory>>();

/** IBGE is cartography only, never a fallback list of authorized monitored cities. */
export async function loadMunicipalTerritory(scope: PanoramaScope, signal?: AbortSignal): Promise<MunicipalTerritory | undefined> {
  const key = `${scope.uf}:${scope.cities.map(normalize).sort().join('|')}`;
  if (!cache.has(key)) cache.set(key, (async () => {
    const read = async (url: string) => {
      const response = await fetch(url, { signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(12_000)]) });
      if (!response.ok) throw new Error('Cartografia municipal indisponível.');
      return response.json();
    };
    const base = 'https://servicodados.ibge.gov.br/api';
    const municipalities = await read(`${base}/v1/localidades/estados/${encodeURIComponent(scope.uf)}/municipios`) as { id: number; nome: string }[];
    const points: GeographicPoint[] = [];
    for (const city of scope.cities) {
      const found = municipalities.find((m) => normalize(m.nome) === normalize(city));
      if (!found) throw new Error('Município sem referência cartográfica.');
      const data = await read(`${base}/v3/malhas/municipios/${found.id}?formato=application/vnd.geo+json&qualidade=minima`);
      const coordinates = (node: unknown): void => {
        if (!Array.isArray(node)) return;
        if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
          points.push({ longitude: node[0], latitude: node[1] }); return;
        }
        node.forEach(coordinates);
      };
      for (const feature of data.features ?? []) coordinates(feature.geometry?.coordinates);
    }
    if (!points.length) throw new Error('Malha municipal vazia.');
    return { source: 'IBGE API de Malhas v3 · qualidade mínima · enquadramento retangular', cities: [...scope.cities],
      extent: { minLatitude: Math.min(...points.map((p) => p.latitude)), maxLatitude: Math.max(...points.map((p) => p.latitude)),
        minLongitude: Math.min(...points.map((p) => p.longitude)), maxLongitude: Math.max(...points.map((p) => p.longitude)) } };
  })());
  try { return await cache.get(key); } catch { cache.delete(key); if (signal?.aborted) throw signal.reason; return undefined; }
}

export function pointInsideTerritory(point: GeographicPoint, territory?: MunicipalTerritory) {
  if (!territory) return false;
  const b = territory.extent;
  return point.latitude >= b.minLatitude && point.latitude <= b.maxLatitude && point.longitude >= b.minLongitude && point.longitude <= b.maxLongitude;
}
