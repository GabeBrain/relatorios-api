import { buildLaunchModel } from '../lib/launches';
import type { LaunchRecord, PanoramaReportModel, PanoramaScope } from '../types';
export function buildPanoramaReportModel(scope: PanoramaScope, records: LaunchRecord[]): PanoramaReportModel {
  const launches = buildLaunchModel(records);
  return { scope, generatedAt: new Date().toISOString(), launches, source: 'building-with-history', dataState: records.length ? (launches.warnings.length ? 'partial' : 'ready') : 'unavailable', openMethodologies: ['Vendas, estoque, IVV, preços e recortes horizontais aguardam homologação metodológica.'] };
}
