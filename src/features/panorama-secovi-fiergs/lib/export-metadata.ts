import { scopeCityLabel, scopeExportPeriod, type PanoramaScope } from '../types';
import { panoramaScopeIdentity } from '../scope-identity';
import type { PanoramaExportMetadata } from './pdf-export';

export function panoramaExportMetadata(scope: PanoramaScope, buildId?: string): PanoramaExportMetadata {
  const period = scopeExportPeriod(scope);
  const engine = scope.engineVersion ?? 'v4';
  const territory = `${scopeCityLabel(scope)}/${scope.uf}`;
  const identity = panoramaScopeIdentity(scope);
  const preset = scope.entity === 'fiergs-rs' ? `FIERGS/${identity.uf}` : scope.entity === 'secovi-sp' ? 'Secovi-SP' : territory;
  const cleanBuild = buildId?.trim() || undefined;
  return {
    title: scope.entity === 'fiergs-rs' && !identity.official ? `Panorama ${preset} — ${identity.shortLabel} — ${period}`
      : scope.entity ? `Panorama ${preset} — ${period}` : `Panorama imobiliário de ${territory} — ${period}`,
    author: 'Brain Inteligência Estratégica',
    subject: `${territory} · ${period} · motor ${engine}${cleanBuild ? ` · build ${cleanBuild}` : ''}`,
    keywords: ['Panorama imobiliário', preset, scope.uf, ...scope.cities, period, `motor ${engine}`, ...(cleanBuild ? [`build ${cleanBuild}`] : [])],
  };
}
