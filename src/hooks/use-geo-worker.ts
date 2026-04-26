import { useCallback } from 'react';
import { kml } from '@tmcw/togeojson';
import { unzipSync } from 'fflate';
import { useMapStore } from '@/store/map-store';

/** Parse geo files on the main thread — DOMParser is always available here. */
export function useGeoWorker() {
  const addLayer = useMapStore((s) => s.addLayer);

  const parseFile = useCallback(
    (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const buffer = reader.result as ArrayBuffer;
            const ext = file.name.toLowerCase().split('.').pop();
            const id = crypto.randomUUID();
            let geojson: any;

            if (ext === 'geojson' || ext === 'json') {
              geojson = JSON.parse(new TextDecoder().decode(buffer));
            } else if (ext === 'kml') {
              const doc = new DOMParser().parseFromString(
                new TextDecoder().decode(buffer),
                'text/xml'
              );
              geojson = kml(doc);
            } else if (ext === 'kmz') {
              const files = unzipSync(new Uint8Array(buffer));
              const kmlName = Object.keys(files).find((f) =>
                f.toLowerCase().endsWith('.kml')
              );
              if (!kmlName) throw new Error('No KML found inside KMZ');
              const doc = new DOMParser().parseFromString(
                new TextDecoder().decode(files[kmlName]),
                'text/xml'
              );
              geojson = kml(doc);
            } else {
              throw new Error(`Unsupported format: .${ext}`);
            }

            // Tag features with unique ids
            geojson.features?.forEach((f: any, i: number) => {
              if (!f.id) f.id = `${id}-${i}`;
              if (!f.properties) f.properties = {};
              f.properties._layerId = id;
              f.properties._featureId = f.id;
            });

            addLayer({
              id,
              name: file.name.replace(/\.[^.]+$/, ''),
              visible: true,
              opacity: 1,
              order: 0,
              data: geojson,
              color: '',
              metricField: null,
            });
            resolve();
          } catch (err: any) {
            reject(err);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
    },
    [addLayer]
  );

  return { parseFile };
}
