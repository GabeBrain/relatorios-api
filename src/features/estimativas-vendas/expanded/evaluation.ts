import { monthIndex, normalizeOrigin, periodValid, shiftMonth, type Measurement, type Provenance, type Segment } from './contract';
import { forecast, type FitArtifact, type ModelId } from './models';
import { buildingId, type Building } from '../source';
export type Trial = {
    id: string;
    model: ModelId;
    effectiveModel?: ModelId;
    modelVersion?: string;
    cutoff: string;
    target: string;
    horizon: number;
    segment: Segment;
    units: number;
    predicted: number | null;
    actual: number | null;
    error: number | null;
    absolutePp: number | null;
    reason: string;
    provenance: Provenance;
};
/** Predictions are made first. Future rows only determine evaluation labels afterward. */
export function retrospective(buildings: Building[], cutoffs: string[], models: ModelId[], horizons: number[], measurement: Measurement = 'unknown', provenance: Provenance = 'unknown', artifacts: FitArtifact[] = []): Trial[] {
    const trials: Trial[] = [];
    if (new Set(buildings.map(buildingId)).size !== buildings.length)
        throw new Error('Empreendimentos duplicados na amostra.');
    for (const b of buildings)
        for (const cutoff of cutoffs)
            for (const model of models) {
                const normalized = normalizeOrigin(b, cutoff, measurement, provenance);
                const artifact = artifacts.find(a => a.model === model && a.segment === normalized.origin?.segment && a.trainedThrough <= cutoff && !a.trainingIds.includes(buildingId(b)));
                const futureReference = ['finotti', 'finotti-extra'].includes(model) && cutoff < '2026-09';
                const result = futureReference ? {forecast: null, reason: 'Coeficientes da referência posterior ao corte; retrospectiva independente indisponível.'} : normalized.origin ? forecast(normalized.origin, model, Math.max(...horizons), artifact) : null;
                for (const horizon of horizons) {
                    const target = shiftMonth(cutoff, horizon);
                    const actualOrigin = normalizeOrigin(b, target, measurement, provenance).origin;
                    const predicted = result?.forecast?.points.find(p => p.offset === horizon)?.predicted ?? null;
                    // Future revisions make the fixed-denominator target incomparable.
                    const actual = actualOrigin && normalized.origin && actualOrigin.units === normalized.origin.units ? actualOrigin.sold : null;
                    const error = predicted === null || actual === null ? null : predicted - actual;
                    trials.push({ id: buildingId(b), model, effectiveModel: result?.forecast?.model, modelVersion: result?.forecast?.version, cutoff, target, horizon, segment: normalized.origin?.segment ?? 'unknown', units: normalized.origin?.units ?? 0, predicted, actual, error, absolutePp: error === null ? null : 100 * Math.abs(error) / normalized.origin!.units, reason: !normalized.origin ? normalized.reason : !result?.forecast ? result?.reason ?? 'Sem modelo' : actual === null ? 'Sem alvo comparável no corte futuro' : 'Comparação com posição de estoque reportada', provenance });
                }
            }
    return trials;
}
export const quantile = (values: number[], q: number) => { const xs = [...values].sort((a, b) => a - b); if (!xs.length)
    return null; const at = (xs.length - 1) * q, lo = Math.floor(at); return xs[lo] + (xs[Math.ceil(at)] - xs[lo]) * (at - lo); };
export function metrics(trials: Trial[]) {
    const good = trials.filter((t): t is Trial & {
        error: number;
        absolutePp: number;
    } => t.error !== null && t.absolutePp !== null);
    return { attempted: trials.length, evaluated: good.length, buildings: new Set(good.map(t => t.id)).size, coverage: trials.length ? good.length / trials.length : 0, maeUnits: good.length ? good.reduce((s, t) => s + Math.abs(t.error), 0) / good.length : null, biasUnits: good.length ? good.reduce((s, t) => s + t.error, 0) / good.length : null, medianPp: quantile(good.map(t => t.absolutePp), .5), p90Pp: quantile(good.map(t => t.absolutePp), .9) };
}
export function paired(a: Trial[], b: Trial[]) { const keys = new Set(b.filter(t => t.error !== null).map(t => `${t.id}|${t.cutoff}|${t.horizon}`)); return metrics(a.filter(t => keys.has(`${t.id}|${t.cutoff}|${t.horizon}`))); }
export type TrainingPair = {
    id: string;
    segment: Segment;
    cutoff: string;
    target: string;
    age: number;
    before: number;
    after: number;
    units: number;
    provenance: Provenance;
};
export function fitAbsorption(pairs: TrainingPair[], segment: Segment, trainedThrough: string, testIds: string[], scope: string): FitArtifact {
    const rows = pairs.filter(p => p.segment === segment);
    if (!rows.length || !periodValid(trainedThrough) || rows.some(p => testIds.includes(p.id) || p.target > trainedThrough || p.cutoff >= p.target || p.age <= 0 || p.before <= 0 || p.after <= 0 || p.after >= p.units || p.before >= p.units))
        throw new Error('Treino inválido, futuro indisponível ou IDs compartilhados com teste.');
    const ks = rows.map(p => Math.log(Math.log1p(-p.after / p.units) / Math.log1p(-p.before / p.units)) / Math.log((p.age + monthIndex(p.target) - monthIndex(p.cutoff)) / p.age)).filter(k => Number.isFinite(k) && k > 0);
    if (!ks.length)
        throw new Error('Sem absorção positiva identificável.');
    // Equal weight per project, not per repeated origin.
    const perId = [...new Set(rows.map(p => p.id))].map(id => { const vals = rows.filter(p => p.id === id).map(p => Math.log(Math.log1p(-p.after / p.units) / Math.log1p(-p.before / p.units)) / Math.log((p.age + monthIndex(p.target) - monthIndex(p.cutoff)) / p.age)).filter(k => Number.isFinite(k) && k > 0); return quantile(vals, .5); }).filter((v): v is number => v !== null);
    return { model: 'absorption', version: `absorption-fit-v1:${trainedThrough}:${segment}`, segment, trainedThrough, trainingIds: [...new Set(rows.map(p => p.id))], k: quantile(perId, .5)!, scope, provenance: rows.every(p => p.provenance === 'observed') ? 'observed' : rows.every(p => p.provenance === 'synthetic') ? 'synthetic' : 'unknown' };
}
export function fitCohort(pairs: TrainingPair[], segment: Segment, trainedThrough: string, testIds: string[], scope: string): FitArtifact {
    const rows = pairs.filter(p => p.segment === segment);
    if (!rows.length || rows.some(p => testIds.includes(p.id) || p.target > trainedThrough || p.cutoff >= p.target || p.units <= 0 || p.before < 0 || p.after < 0 || p.before > p.units || p.after > p.units))
        throw new Error('Pares de coorte inválidos ou compartilhados com teste.');
    const ids = [...new Set(rows.map(p => p.id))];
    const rates = ids.map(id => quantile(pairs.filter(p => p.id === id && p.segment === segment).map(p => (p.after - p.before) / p.units / (monthIndex(p.target) - monthIndex(p.cutoff))), .5)!);
    return { model: 'cohort', version: `cohort-rate-v1:${trainedThrough}:${segment}`, segment, trainedThrough, trainingIds: ids, scope, provenance: rows.every(p => p.provenance === 'observed') ? 'observed' : rows.every(p => p.provenance === 'synthetic') ? 'synthetic' : 'unknown', monthlyFraction: quantile(rates, .5)! };
}
export type Calibration = {
    model: ModelId;
    segment: Segment;
    horizon: number;
    calibratedThrough: string;
    ids: string[];
    q10: number;
    q25: number;
    q75: number;
    q90: number;
    provenance: Provenance;
};
/** Policy is explicit: minimum distinct projects is chosen by the experiment, never inferred from row count. */
export function calibrate(trials: Trial[], model: ModelId, segment: Segment, horizon: number, through: string, trainingIds: string[], testIds: string[], minimumProjects: number): Calibration | null {
    if (!Number.isInteger(minimumProjects) || minimumProjects < 2)
        throw new Error('Defina suporte mínimo do experimento (ao menos 2 projetos).');
    const rows = trials.filter(t => t.model === model && t.segment === segment && t.horizon === horizon && t.error !== null);
    if (rows.some(t => trainingIds.includes(t.id) || testIds.includes(t.id) || t.target > through))
        throw new Error('Calibração compartilha treino/teste ou usa resultado futuro.');
    const ids = [...new Set(rows.map(t => t.id))];
    if (ids.length < minimumProjects)
        return null;
    // One latest available origin per project avoids pseudo-replication of overlapping horizons.
    const unique = ids.map(id => rows.filter(t => t.id === id).sort((a, b) => b.cutoff.localeCompare(a.cutoff))[0]);
    const errors = unique.map(t => -t.error! / t.units);
    return { model, segment, horizon, calibratedThrough: through, ids, q10: quantile(errors, .1)!, q25: quantile(errors, .25)!, q75: quantile(errors, .75)!, q90: quantile(errors, .9)!, provenance: unique.every(t => t.provenance === 'observed') ? 'observed' : unique.every(t => t.provenance === 'synthetic') ? 'synthetic' : 'unknown' };
}
export function predictionBands(predicted: number, units: number, c: Calibration, cutoff: string, id: string, model: ModelId, segment: Segment, horizon: number) {
    if (c.calibratedThrough > cutoff || c.ids.includes(id) || c.model !== model || c.segment !== segment || c.horizon !== horizon)
        return null;
    if (![predicted, units, c.q10, c.q25, c.q75, c.q90].every(Number.isFinite) || units <= 0 || c.q10 > c.q25 || c.q25 > c.q75 || c.q75 > c.q90)
        return null;
    const bound = (q: number) => Math.max(0, Math.min(units, predicted + q * units));
    return { lo80: bound(c.q10), lo50: bound(c.q25), hi50: bound(c.q75), hi80: bound(c.q90) };
}
export function intervalMetrics(rows: {
    actual: number;
    lo80: number;
    hi80: number;
    lo50: number;
    hi50: number;
}[]) {
    if (!rows.length)
        return null;
    return { n: rows.length, coverage80: rows.filter(r => r.actual >= r.lo80 && r.actual <= r.hi80).length / rows.length, coverage50: rows.filter(r => r.actual >= r.lo50 && r.actual <= r.hi50).length / rows.length, width80: rows.reduce((s, r) => s + r.hi80 - r.lo80, 0) / rows.length, intervalScore80: rows.reduce((s, r) => s + r.hi80 - r.lo80 + 10 * Math.max(0, r.lo80 - r.actual, r.actual - r.hi80), 0) / rows.length };
}
export function groupSplit(buildings: Building[], seed = 1701) {
    const hash = (id: string) => [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, seed);
    const ids = [...new Set(buildings.map(buildingId))].sort((a, b) => hash(a) - hash(b) || a.localeCompare(b));
    return { seed, training: ids.slice(0, Math.floor(ids.length * .6)), calibration: ids.slice(Math.floor(ids.length * .6), Math.floor(ids.length * .8)), test: ids.slice(Math.floor(ids.length * .8)) };
}
/** Paired project-level bootstrap: repeated origins stay in the same sampled cluster. */
export function pairedBootstrap(a: Trial[], b: Trial[], seed = 1701, draws = 500) {
    const lookup = new Map(b.filter(t => t.absolutePp !== null).map(t => [`${t.id}|${t.cutoff}|${t.horizon}`, t.absolutePp!]));
    const ids = [...new Set(a.filter(t => t.absolutePp !== null && lookup.has(`${t.id}|${t.cutoff}|${t.horizon}`)).map(t => t.id))];
    if (ids.length < 2)
        return null;
    const differences = ids.map(id => { const rows = a.filter(t => t.id === id && t.absolutePp !== null && lookup.has(`${t.id}|${t.cutoff}|${t.horizon}`)); return rows.reduce((s, t) => s + t.absolutePp! - lookup.get(`${t.id}|${t.cutoff}|${t.horizon}`)!, 0) / rows.length; });
    let state = seed >>> 0;
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const samples = Array.from({ length: draws }, () => ids.reduce(s => s + differences[Math.floor(random() * ids.length)], 0) / ids.length);
    return { projects: ids.length, seed, draws, meanDifferencePp: differences.reduce((s, v) => s + v, 0) / ids.length, lo95: quantile(samples, .025), hi95: quantile(samples, .975) };
}
/** Each row is a JOINT residual trajectory for the same fixed member set/horizon. */
export function jointPortfolioBands(predictions: {
    id: string;
    value: number;
    units: number;
}[], jointErrors: {
    id: string;
    error: number;
}[][], minimumJointSamples: number) {
    const ids = predictions.map(p => p.id).sort();
    if (new Set(ids).size !== ids.length || jointErrors.length < minimumJointSamples || minimumJointSamples < 2)
        return null;
    if (jointErrors.some(row => row.length !== ids.length || new Set(row.map(p => p.id)).size !== ids.length || row.map(p => p.id).sort().join('|') !== ids.join('|') || row.some(p => !Number.isFinite(p.error))))
        return null;
    const predicted = predictions.reduce((s, p) => s + p.value, 0), units = predictions.reduce((s, p) => s + p.units, 0);
    const totals = jointErrors.map(row => Math.max(0, Math.min(units, predicted + row.reduce((s, p) => s + p.error, 0))));
    return { lo80: quantile(totals, .1)!, lo50: quantile(totals, .25)!, hi50: quantile(totals, .75)!, hi80: quantile(totals, .9)!, samples: jointErrors.length };
}
