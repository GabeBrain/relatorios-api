import { prepareReferenceModels } from './referenceModels';
import { forecast, MODELS, type FitArtifact, type ForecastResult, type ModelId } from './models';
import type { OriginResult } from './contract';
export type ModelCache = Map<string, Map<ModelId, ForecastResult>>;
/** Compute once per source/cut/horizon. Switching models or selection performs no network or fitting. */
export async function prepareComparison(origins: OriginResult[], horizon: number, signal: AbortSignal, progress: (done: number) => void, artifacts: FitArtifact[] = []): Promise<ModelCache> {
    if (origins.some(r => r.origin?.segment === 'vertical')) await prepareReferenceModels();
    const cache: ModelCache = new Map();
    for (let i = 0; i < origins.length; i++) {
        if (signal.aborted) throw new DOMException('Cálculo cancelado', 'AbortError');
        const r = origins[i], models: Map<ModelId, ForecastResult> = new Map();
        for (const m of MODELS) {
            if (m.id === 'auto') continue;
            models.set(m.id, r.origin ? forecast(r.origin, m.id, horizon, artifacts.find(a => a.model === m.id && a.segment === r.origin?.segment)) : {id:r.id, name:r.name, forecast:null, reason:r.reason});
        }
        const reference = models.get('finotti-reference')!, recent = models.get('stock-trend')!;
        const auto = reference.forecast ? reference : recent.forecast ? {...recent, forecast: {...recent.forecast, warnings: [...recent.forecast.warnings, `Finotti indisponível neste corte: ${reference.reason}`]}} : reference;
        models.set('auto', auto);
        cache.set(r.id, models);
        if (i % 8 === 0) {progress(i + 1); await new Promise(resolve => setTimeout(resolve, 0));}
    }
    if (signal.aborted) throw new DOMException('Cálculo cancelado', 'AbortError');
    progress(origins.length);
    return cache;
}
