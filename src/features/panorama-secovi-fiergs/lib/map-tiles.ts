export interface GeographicPoint { latitude: number; longitude: number; }

export interface MapTilePlan {
  zoom: number;
  bounds: { minLatitude: number; maxLatitude: number; minLongitude: number; maxLongitude: number };
  columns: number;
  rows: number;
  tiles: { x: number; y: number; url: string }[];
  positionOf: (point: GeographicPoint) => { left: number; top: number };
}

export interface PositionedMapPoint<T extends GeographicPoint> { point: T; left: number; top: number; coincident: number; }

const tileX = (longitude: number, zoom: number) => (longitude + 180) / 360 * 2 ** zoom;
const tileY = (latitude: number, zoom: number) => {
  const radians = latitude * Math.PI / 180;
  return (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * 2 ** zoom;
};
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isMappable = (point: GeographicPoint) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  && point.latitude >= -85.05112878 && point.latitude <= 85.05112878
  && point.longitude >= -180 && point.longitude <= 180;

/**
 * Pequeno mosaico CARTO/OSM, sem chave, apenas para dar referência geográfica ao slide 56.
 * O zoom diminui até o recorte inteiro caber em no máximo 5 × 4 tiles.
 */
export function buildMapTilePlan(points: GeographicPoint[], mapboxAccessToken: string): MapTilePlan | null {
  const validPoints = points.filter(isMappable);
  if (!validPoints.length || !mapboxAccessToken.trim()) return null;
  let zoom = validPoints.length === 1 ? 14 : 12;
  let minX = 0; let maxX = 0; let minY = 0; let maxY = 0;
  for (; zoom >= 4; zoom -= 1) {
    const xs = validPoints.map((point) => tileX(point.longitude, zoom));
    const ys = validPoints.map((point) => tileY(point.latitude, zoom));
    // O próprio marcador recebe margem percentual em `positionOf`; adicionar um tile inteiro em
    // cada lado abria excessivamente o recorte metropolitano e diminuía a legibilidade.
    minX = Math.floor(Math.min(...xs)); maxX = Math.floor(Math.max(...xs));
    minY = Math.floor(Math.min(...ys)); maxY = Math.floor(Math.max(...ys));
    if (maxX - minX + 1 <= 5 && maxY - minY + 1 <= 4) break;
  }
  // A API pode trazer uma coordenada fora do globo; nunca deixe isso produzir um
  // mosaico gigantesco ao renderizar todas as páginas de uma vez.
  if (zoom < 4) return null;
  const world = 2 ** zoom;
  minX = clamp(minX, 0, world - 1); maxX = clamp(maxX, 0, world - 1);
  minY = clamp(minY, 0, world - 1); maxY = clamp(maxY, 0, world - 1);
  const columns = maxX - minX + 1; const rows = maxY - minY + 1;
  if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows) || columns < 1 || rows < 1 || columns * rows > 20) return null;
  const tiles = Array.from({ length: rows * columns }, (_, index) => {
    const x = minX + index % columns; const y = minY + Math.floor(index / columns);
    return { x, y, url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/${zoom}/${x}/${y}?access_token=${encodeURIComponent(mapboxAccessToken)}` };
  });
  return {
    zoom, columns, rows, tiles,
    bounds: {
      minLatitude: Math.min(...validPoints.map((point) => point.latitude)),
      maxLatitude: Math.max(...validPoints.map((point) => point.latitude)),
      minLongitude: Math.min(...validPoints.map((point) => point.longitude)),
      maxLongitude: Math.max(...validPoints.map((point) => point.longitude)),
    },
    positionOf: (point) => ({
      left: clamp((tileX(point.longitude, zoom) - minX) / columns * 100, 3, 97),
      top: clamp((tileY(point.latitude, zoom) - minY) / rows * 100, 3, 97),
    }),
  };
}

/**
 * Separa somente coordenadas exatamente coincidentes. A posição geográfica original permanece no
 * modelo e na auditoria; o deslocamento pequeno, estável e circular existe apenas na renderização.
 */
export function positionMapPoints<T extends GeographicPoint>(points: T[], plan: MapTilePlan): PositionedMapPoint<T>[] {
  const groups = new Map<string, number[]>();
  points.forEach((point, index) => {
    const key = `${point.latitude.toFixed(6)}:${point.longitude.toFixed(6)}`;
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  const positioned: PositionedMapPoint<T>[] = Array(points.length);
  groups.forEach((indexes) => indexes.forEach((pointIndex, groupIndex) => {
    const base = plan.positionOf(points[pointIndex]);
    const radius = indexes.length > 1 ? Math.min(1.4, .42 + Math.floor(groupIndex / 8) * .36) : 0;
    const angle = groupIndex / Math.min(8, indexes.length) * Math.PI * 2;
    positioned[pointIndex] = {
      point: points[pointIndex],
      left: clamp(base.left + Math.cos(angle) * radius, 2.5, 97.5),
      top: clamp(base.top + Math.sin(angle) * radius, 2.5, 97.5),
      coincident: indexes.length,
    };
  }));
  return positioned;
}
