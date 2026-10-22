import { HORIZONTAL_PARAMETERS } from '../parameters';
import { calculateHorizontalShape } from '../horizontal';
import { monthlyWindow, shiftMonth, type Origin, type Segment } from './contract';
export const MODELS = [
    { id: 'constant', label: 'Estoque constante', version: 'constant-v1' },
    { id: 'last', label: 'Último mês', version: 'last-month-v1' },
    { id: 'mean3', label: 'Média de 3 meses', version: 'mean3-v1' },
    { id: 'mean12', label: 'Média de 12 meses', version: 'mean12-v1' },
    { id: 'finotti', label: 'Finotti original', version: HORIZONTAL_PARAMETERS.version },
    { id: 'finotti-extra', label: 'Finotti extrapolado', version: 'finotti-extrapolation-v1' },
    { id: 'absorption', label: 'Absorção recalibrada', version: 'absorption-fit-v1' },
    { id: 'flows', label: 'Vendas e distratos', version: 'flows-exposure-v1' },
    { id: 'cohort', label: 'Pares do treino', version: 'cohort-rate-v1' },
] as const;
export type ModelId = typeof MODELS[number]['id'];
export type FitArtifact = {
    version: string;
    model: 'absorption' | 'cohort';
    segment: Segment;
    trainedThrough: string;
    trainingIds: string[];
    k?: number;
    monthlyFraction?: number;
    scope: string;
    provenance: 'synthetic' | 'unknown' | 'observed';
};
export type ForecastPoint = {
    period: string;
    offset: number;
    age: number | null;
    predicted: number | null;
    stock: number | null;
    boundary: boolean;
};
export type Forecast = {
    origin: Origin;
    model: ModelId;
    version: string;
    points: ForecastPoint[];
    reason: string;
    parameters: Record<string, number | string>;
    warnings: string[];
};
export type ForecastResult = {
    id: string;
    name: string;
    forecast: Forecast | null;
    reason: string;
};
export function forecast(o: Origin, model: ModelId, horizon = 24, artifact?: FitArtifact): ForecastResult {
    const fail = (reason: string): ForecastResult => ({ id: o.id, name: o.name, forecast: null, reason });
    if (!Number.isInteger(horizon) || horizon < 1 || horizon > 36)
        return fail('Horizonte permitido: 1 a 36 meses.');
    if (![o.units, o.sold, o.stock].every(Number.isFinite) || o.units <= 0 || o.sold < 0 || o.sold > o.units || o.stock !== o.units - o.sold)
        return fail('Posição de origem inválida.');
    let k: number | null = null, rate = 0, grossRate = 0, cancelRate = 0;
    const parameters: Record<string, number | string> = {};
    const warnings = [...o.warnings];
    if (model === 'finotti' || model === 'finotti-extra' || model === 'absorption') {
        if (o.age === null || o.age < 1 || o.sold <= 0 || o.sold >= o.units)
            return fail('Absorção exige idade confirmada e vendas entre 0% e 100%.');
        if (model === 'absorption') {
            if (!artifact || artifact.model !== model || artifact.segment !== o.segment || !artifact.k || artifact.k <= 0 || !Number.isFinite(artifact.k) || artifact.trainedThrough > o.cutoff || artifact.trainingIds.includes(o.id))
                return fail('Sem parâmetros independentes de treino para este segmento e corte.');
            k = artifact.k;
            parameters.artifact = artifact.version;
        }
        else {
            if (o.segment !== 'aberto' && o.segment !== 'fechado')
                return fail('Coeficientes Finotti disponíveis apenas para loteamentos abertos ou fechados.');
            if (model === 'finotti') {
                try {
                    k = calculateHorizontalShape({ pattern: o.segment, launchedUnits: o.units, netSoldUnits: o.sold, marketMonth: o.age }).k;
                }
                catch (e) {
                    return fail(e instanceof Error ? e.message : 'Fora do domínio Finotti.');
                }
            }
            else {
                const p = HORIZONTAL_PARAMETERS[o.segment], ln = Math.log(o.age);
                k = p.c0 + p.c1 * ln + (p.c2 + p.c3 * ln) * Math.log(-Math.log1p(-o.sold / o.units));
                if (!Number.isFinite(k) || k <= 0)
                    return fail('Extrapolação sem curva crescente para esta origem.');
                warnings.push('Extrapolação experimental; inclui cauda matemática sem regra operacional de esgotamento.');
            }
        }
        parameters.k = k;
    }
    if (model === 'last' || model === 'mean3' || model === 'mean12' || model === 'flows') {
        const n = model === 'last' ? 1 : model === 'mean12' ? 12 : 3;
        const window = monthlyWindow(o, n);
        if (!window)
            return fail(`Exige ${n} meses completos, oferta estável e periodicidade mensal confirmada.`);
        rate = window.reduce((s, r) => s + r.net!, 0) / n;
        parameters.windowMonths = n;
        parameters.netRate = rate;
        if (model === 'flows') {
            if (window.some(r => r.gross === null || r.cancellations === null || r.gross < 0 || r.cancellations < 0 || r.gross - r.cancellations !== r.net))
                return fail('Fluxos exigem vendas brutas e distratos conciliados nos três meses.');
            // Rate/exposure uses the beginning stock reconstructed from end stock + net sales.
            const exposure = window.reduce((s, r) => s + r.stock! + r.net!, 0);
            const soldExposure = window.reduce((s, r) => s + o.units - r.stock! - r.net!, 0);
            if (window.some(r => r.stock! + r.net! < 0 || r.stock! + r.net! > o.units))
                return fail('Balanço histórico de fluxos inválido.');
            grossRate = exposure > 0 ? window.reduce((s, r) => s + r.gross!, 0) / exposure : 0;
            cancelRate = soldExposure > 0 ? window.reduce((s, r) => s + r.cancellations!, 0) / soldExposure : 0;
            if (grossRate > 1 || cancelRate > 1 || (soldExposure === 0 && window.some(r => r.cancellations! > 0)))
                return fail('Taxas de fluxo fora do suporte; revisar eventos dentro do período.');
            parameters.grossRate = grossRate;
            parameters.cancelRate = cancelRate;
            warnings.push('Modelo de fluxos por exposição; distribuição de contagem ainda não ajustada.');
        }
    }
    if (model === 'cohort') {
        if (!artifact || artifact.model !== model || artifact.segment !== o.segment || artifact.trainedThrough > o.cutoff || artifact.trainingIds.includes(o.id) || artifact.monthlyFraction === undefined || !Number.isFinite(artifact.monthlyFraction) || Math.abs(artifact.monthlyFraction) > 1)
            return fail('Sem coorte independente disponível para este segmento.');
        rate = artifact.monthlyFraction * o.units;
        parameters.artifact = artifact.version;
        parameters.peers = artifact.trainingIds.length;
        parameters.monthlyFraction = artifact.monthlyFraction;
    }
    let sold = o.sold;
    const points: ForecastPoint[] = [];
    for (let offset = 0; offset <= horizon; offset++) {
        let raw = o.sold;
        if (offset > 0) {
            if (k !== null)
                raw = o.units * -Math.expm1(Math.log1p(-o.sold / o.units) * Math.pow((o.age! + offset) / o.age!, k));
            else if (model === 'flows')
                raw = sold + grossRate * (o.units - sold) - cancelRate * sold;
            else
                raw = o.sold + rate * offset;
        }
        sold = Math.max(0, Math.min(o.units, raw));
        const omitted = model === 'finotti' && sold / o.units >= .95;
        points.push({ period: shiftMonth(o.cutoff, offset), offset, age: o.age === null ? null : o.age + offset, predicted: omitted ? null : sold, stock: omitted ? null : o.units - sold, boundary: sold !== raw });
    }
    if (points.some(p => p.boundary))
        warnings.push('Ritmo atingiu limite físico de 0/unidades; projeção limitada e sinalizada.');
    const version = MODELS.find(m => m.id === model)!.version;
    return { id: o.id, name: o.name, reason: 'Previsão experimental', forecast: { origin: o, model, version, points, reason: 'Faixa ainda não estimada', parameters, warnings } };
}
export function portfolio(results: ForecastResult[]) {
    const valid = results.flatMap(r => r.forecast ? [r.forecast] : []);
    if (!valid.length)
        return [];
    if (new Set(valid.map(f => f.origin.id)).size !== valid.length || new Set(valid.map(f => f.origin.cutoff)).size !== 1)
        throw new Error('Carteira exige IDs únicos e corte comum.');
    const units = valid.reduce((s, f) => s + f.origin.units, 0);
    return valid[0].points.map(p => { const values = valid.map(f => f.points.find(x => x.period === p.period)?.predicted); const predicted = values.some(v => v === null || v === undefined) ? null : values.reduce<number>((s, v) => s + v!, 0); return { period: p.period, offset: p.offset, units, members: valid.length, predicted, stock: predicted === null ? null : units - predicted }; });
}
export async function forecastBatch(origins: Origin[], model: ModelId, horizon: number, signal: AbortSignal, onProgress?: (done: number) => void, artifacts: FitArtifact[] = []): Promise<ForecastResult[]> {
    const result: ForecastResult[] = [];
    for (let i = 0; i < origins.length; i++) {
        if (signal.aborted)
            throw new DOMException('Cancelado', 'AbortError');
        const artifact = artifacts.find(a => a.model === model && a.segment === origins[i].segment && a.trainedThrough <= origins[i].cutoff && !a.trainingIds.includes(origins[i].id));
        result.push(forecast(origins[i], model, horizon, artifact));
        if ((i + 1) % 10 === 0) {
            onProgress?.(i + 1);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    if (signal.aborted)
        throw new DOMException('Cancelado', 'AbortError');
    return result;
}
