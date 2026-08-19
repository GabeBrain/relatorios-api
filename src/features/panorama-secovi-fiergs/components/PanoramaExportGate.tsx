import { lazy, Suspense } from 'react';
import { usePanoramaExportStore } from '../export-store';

const PanoramaExportHost = lazy(() => import('./PanoramaExportHost'));

/**
 * Portão leve montado pelo shell. Só puxa o host (e com ele a feature inteira) quando existe um
 * export em andamento, preservando o lazy-loading da rota do Panorama.
 */
export function PanoramaExportGate() {
  const active = usePanoramaExportStore((state) => state.status !== 'idle');
  if (!active) return null;
  return <Suspense fallback={null}><PanoramaExportHost /></Suspense>;
}
