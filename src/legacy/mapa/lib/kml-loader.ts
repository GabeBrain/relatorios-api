import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { kml as kmlToGeoJson } from '@tmcw/togeojson';
import { unzipSync } from 'fflate';

function toFeatureCollection(geojson: any): FeatureCollection {
  if (!geojson || geojson.type !== 'FeatureCollection') {
    throw new Error('Arquivo sem FeatureCollection valida.');
  }
  return geojson as FeatureCollection;
}

function isPolygonLike(geometry: Geometry | null | undefined): boolean {
  if (!geometry) return false;
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
}

function firstPolygonFeature(fc: FeatureCollection): Feature | null {
  for (const feature of fc.features) {
    if (isPolygonLike(feature.geometry)) return feature as Feature;
  }
  return null;
}

function parseKmlTextToFeatureCollection(kmlText: string): FeatureCollection {
  const doc = new DOMParser().parseFromString(kmlText, 'text/xml');
  const geojson = kmlToGeoJson(doc);
  return toFeatureCollection(geojson);
}

export async function parseKmlOrKmzToPolygonFeatureCollection(
  file: File
): Promise<FeatureCollection> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  let fc: FeatureCollection;
  if (ext === 'kml') {
    const text = await file.text();
    fc = parseKmlTextToFeatureCollection(text);
  } else if (ext === 'kmz') {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const files = unzipSync(buffer);
    const kmlFileName = Object.keys(files).find((f) => f.toLowerCase().endsWith('.kml'));
    if (!kmlFileName) throw new Error('KMZ sem KML interno.');
    const text = new TextDecoder().decode(files[kmlFileName]);
    fc = parseKmlTextToFeatureCollection(text);
  } else {
    throw new Error('Formato suportado apenas: .kml ou .kmz');
  }

  const polygonFeature = firstPolygonFeature(fc);
  if (!polygonFeature) throw new Error('Nenhum poligono encontrado no arquivo enviado.');

  return {
    type: 'FeatureCollection',
    features: [polygonFeature],
  };
}
