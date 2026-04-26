import type { FeatureCollection, Geometry } from 'geojson';

export type LonLat = [number, number];
export type PolygonRings = LonLat[][];

function pointInRing(point: LonLat, ring: LonLat[]): boolean {
  const [lon, lat] = point;
  let inside = false;
  const n = ring.length;
  if (n < 3) return false;

  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    const intersects = y1 > lat !== y2 > lat;
    if (!intersects) continue;
    const x = ((x2 - x1) * (lat - y1)) / ((y2 - y1) + 1e-15) + x1;
    if (lon < x) inside = !inside;
  }
  return inside;
}

export function pointInPolygonRings(point: LonLat, rings: PolygonRings): boolean {
  if (!rings.length) return false;
  if (!pointInRing(point, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(point, rings[i])) return false;
  }
  return true;
}

export function geometryToPolygonRings(geometry: Geometry | null | undefined): PolygonRings[] {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates as LonLat[][]];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates as LonLat[][][];
  }
  return [];
}

export function featureCollectionFirstPolygonRings(
  fc: FeatureCollection | null | undefined
): PolygonRings | null {
  if (!fc?.features?.length) return null;
  for (const feature of fc.features) {
    const polygons = geometryToPolygonRings(feature.geometry);
    if (polygons.length > 0) return polygons[0];
  }
  return null;
}

export function polygonRingsToFeatureCollection(rings: PolygonRings): FeatureCollection {
  if (!rings.length) {
    return { type: 'FeatureCollection', features: [] };
  }
  const closedRings = rings.map((ring) => {
    if (!ring.length) return ring;
    const first = ring[0];
    const last = ring[ring.length - 1];
    const isClosed = first[0] === last[0] && first[1] === last[1];
    return isClosed ? ring : [...ring, first];
  });
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: closedRings as any,
        },
      },
    ],
  };
}

export function lonLatListToLineFeatureCollection(points: LonLat[]): FeatureCollection {
  if (points.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: points as any,
        },
      },
    ],
  };
}
