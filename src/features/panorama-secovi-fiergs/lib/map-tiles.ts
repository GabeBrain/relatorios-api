export interface GeographicPoint { latitude: number; longitude: number; }

export interface MapTilePlan {
  zoom: number;
  columns: number;
  rows: number;
  tiles: { x: number; y: number; url: string }[];
  positionOf: (point: GeographicPoint) => { left: number; top: number };
}

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
  let zoom = 14;
  let minX = 0; let maxX = 0; let minY = 0; let maxY = 0;
  for (; zoom >= 4; zoom -= 1) {
    const xs = validPoints.map((point) => tileX(point.longitude, zoom));
    const ys = validPoints.map((point) => tileY(point.latitude, zoom));
    minX = Math.floor(Math.min(...xs)) - 1; maxX = Math.floor(Math.max(...xs)) + 1;
    minY = Math.floor(Math.min(...ys)) - 1; maxY = Math.floor(Math.max(...ys)) + 1;
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
    positionOf: (point) => ({
      left: clamp((tileX(point.longitude, zoom) - minX) / columns * 100, 3, 97),
      top: clamp((tileY(point.latitude, zoom) - minY) / rows * 100, 3, 97),
    }),
  };
}
