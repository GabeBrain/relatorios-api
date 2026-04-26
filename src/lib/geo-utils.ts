import type { FeatureCollection, Position } from 'geojson';

export function getBounds(fc: FeatureCollection | undefined | null): [[number, number], [number, number]] | null {
  if (!fc || !fc.features) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let found = false;

  function processCoord(coord: Position) {
    found = true;
    if (coord[0] < minLng) minLng = coord[0];
    if (coord[1] < minLat) minLat = coord[1];
    if (coord[0] > maxLng) maxLng = coord[0];
    if (coord[1] > maxLat) maxLat = coord[1];
  }

  function walk(coords: any) {
    if (typeof coords[0] === 'number') {
      processCoord(coords as Position);
    } else {
      for (const c of coords) walk(c);
    }
  }

  for (const f of fc.features || []) {
    if (f.geometry && 'coordinates' in f.geometry) {
      walk(f.geometry.coordinates);
    }
  }

  return found ? [[minLng, minLat], [maxLng, maxLat]] : null;
}
