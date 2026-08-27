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

/**
 * Pequeno mosaico CARTO/OSM, sem chave, apenas para dar referência geográfica ao slide 56.
 * O zoom diminui até o recorte inteiro caber em no máximo 5 × 4 tiles.
 */
export function buildMapTilePlan(points: GeographicPoint[]): MapTilePlan | null {
  if (!points.length) return null;
  let zoom = 14;
  let minX = 0; let maxX = 0; let minY = 0; let maxY = 0;
  for (; zoom >= 4; zoom -= 1) {
    const xs = points.map((point) => tileX(point.longitude, zoom));
    const ys = points.map((point) => tileY(point.latitude, zoom));
    minX = Math.floor(Math.min(...xs)) - 1; maxX = Math.floor(Math.max(...xs)) + 1;
    minY = Math.floor(Math.min(...ys)) - 1; maxY = Math.floor(Math.max(...ys)) + 1;
    if (maxX - minX + 1 <= 5 && maxY - minY + 1 <= 4) break;
  }
  const world = 2 ** zoom;
  minY = clamp(minY, 0, world - 1); maxY = clamp(maxY, 0, world - 1);
  const columns = maxX - minX + 1; const rows = maxY - minY + 1;
  const tiles = Array.from({ length: rows * columns }, (_, index) => {
    const x = minX + index % columns; const y = minY + Math.floor(index / columns);
    const host = ['a', 'b', 'c', 'd'][(x + y) & 3];
    return { x, y, url: `https://${host}.basemaps.cartocdn.com/light_all/${zoom}/${x}/${y}.png` };
  });
  return {
    zoom, columns, rows, tiles,
    positionOf: (point) => ({
      left: clamp((tileX(point.longitude, zoom) - minX) / columns * 100, 3, 97),
      top: clamp((tileY(point.latitude, zoom) - minY) / rows * 100, 3, 97),
    }),
  };
}
