import { scopeCityLabel, type PanoramaScope } from '../types';
import type { PanoramaExportMetadata } from './pdf-export';

export function panoramaExportMetadata(scope: PanoramaScope, buildId?: string): PanoramaExportMetadata {
  const period = scope.endQuarter;
  const engine = scope.engineVersion ?? 'v4';
  const territory = `${scopeCityLabel(scope)}/${scope.uf}`;
  const preset = scope.entity === 'fiergs-rs' ? 'FIERGS/RS' : scope.entity === 'secovi-sp' ? 'Secovi-SP' : territory;
  const cleanBuild = buildId?.trim() || undefined;
  return {
    title: scope.entity ? `Panorama ${preset} — ${period}` : `Panorama imobiliário de ${territory} — ${period}`,
    author: 'Brain Inteligência Estratégica',
    subject: `${territory} · ${period} · motor ${engine}${cleanBuild ? ` · build ${cleanBuild}` : ''}`,
    keywords: ['Panorama imobiliário', preset, scope.uf, ...scope.cities, period, `motor ${engine}`, ...(cleanBuild ? [`build ${cleanBuild}`] : [])],
  };
}
