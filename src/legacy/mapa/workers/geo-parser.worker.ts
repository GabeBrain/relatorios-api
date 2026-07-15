import { kml } from '@tmcw/togeojson';
import { unzipSync } from 'fflate';

// Web Workers don't have DOMParser by default in all environments.
// We parse XML manually using the worker's own DOMParser or a polyfill approach.
function parseXML(text: string): Document {
  // In modern browsers, Web Workers DO have DOMParser.
  // But Vite's worker bundling may run in a context without it.
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(text, 'text/xml');
  }
  throw new Error('DOMParser not available in this worker context');
}

self.onmessage = async (e: MessageEvent) => {
  const { id, fileName, data } = e.data as {
    id: string;
    fileName: string;
    data: ArrayBuffer;
  };

  try {
    const ext = fileName.toLowerCase().split('.').pop();
    let geojson: any;

    if (ext === 'geojson' || ext === 'json') {
      const text = new TextDecoder().decode(data);
      geojson = JSON.parse(text);
    } else if (ext === 'kml') {
      const text = new TextDecoder().decode(data);
      const doc = parseXML(text);
      geojson = kml(doc);
    } else if (ext === 'kmz') {
      const files = unzipSync(new Uint8Array(data));
      const kmlFile = Object.keys(files).find((f) =>
        f.toLowerCase().endsWith('.kml')
      );
      if (!kmlFile) throw new Error('No KML found in KMZ');
      const text = new TextDecoder().decode(files[kmlFile]);
      const doc = parseXML(text);
      geojson = kml(doc);
    } else {
      throw new Error(`Unsupported format: ${ext}`);
    }

    self.postMessage({ id, geojson, error: null });
  } catch (err: any) {
    self.postMessage({ id, geojson: null, error: err.message });
  }
};
