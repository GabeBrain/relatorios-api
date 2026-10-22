import { buildingId, buildingName, finite, type Building, type HistoryRow } from '../source';
export type Provenance = 'observed' | 'estimated' | 'unknown' | 'synthetic';
export type Segment = 'aberto' | 'fechado' | 'vertical' | 'comercial' | 'misto' | 'unknown';
export type Measurement = 'monthly-confirmed' | 'unknown';
export type Observation = {
    period: string;
    units: number | null;
    stock: number | null;
    net: number | null;
    gross: number | null;
    cancellations: number | null;
};
export type Origin = {
    id: string;
    name: string;
    cutoff: string;
    segment: Segment;
    pattern?: string;
    age: number | null;
    units: number;
    sold: number;
    stock: number;
    history: Observation[];
    provenance: Provenance;
    measurement: Measurement;
    warnings: string[];
};
export type OriginResult = {
    id: string;
    name: string;
    origin: Origin | null;
    reason: string;
};
export const periodValid = (p: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
export const monthIndex = (p: string) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1;
export function shiftMonth(p: string, n: number) { const index = monthIndex(p) + n; return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`; }
const completeSum = (rows: HistoryRow[], field: keyof HistoryRow) => rows.some(r => finite(r[field]) === null) ? null : rows.reduce((s, r) => s + Number(r[field]), 0);
/** No future record or current building-level estimation flag determines the origin. */
export function normalizeOrigin(b: Building, cutoff: string, measurement: Measurement = 'unknown', provenance: Provenance = 'unknown'): OriginResult {
    const id = buildingId(b), name = buildingName(b);
    const fail = (reason: string): OriginResult => ({ id, name, origin: null, reason });
    if (!id || !periodValid(cutoff))
        return fail('Escolha uma competência válida e um cadastro com ID.');
    const rows = (b.typologies_history ?? []).filter(r => periodValid(r.period.slice(0, 7)) && r.period.slice(0, 7) <= cutoff);
    const atCutoff = rows.filter(r => r.period.slice(0, 7) === cutoff);
    if (!atCutoff.length)
        return fail('Sem posição de estoque no corte. Escolha outra competência ou um cenário informado.');
    const seen = new Set<string>();
    for (const r of rows) {
        const key = `${r.typology_id}|${r.period.slice(0, 7)}`;
        if (seen.has(key))
            return fail('Tipologia e competência duplicadas; revisar a fonte.');
        seen.add(key);
    }
    const validQty = (r: HistoryRow) => { const v = finite(r.qty); return v !== null && Number.isSafeInteger(v) && v > 0; };
    if (atCutoff.some(r => !validQty(r)))
        return fail('Unidades ausentes ou inválidas no corte.');
    if (atCutoff.some(r => { const s = finite(r.typology_stock); return s === null || !Number.isSafeInteger(s) || s < 0 || s > Number(r.qty); }))
        return fail('Estoque ausente ou fora das unidades no corte.');
    const units = atCutoff.reduce((s, r) => s + Number(r.qty), 0), stock = atCutoff.reduce((s, r) => s + Number(r.typology_stock), 0);
    if (!Number.isSafeInteger(units) || !Number.isSafeInteger(stock))
        return fail('Soma de unidades fora do domínio numérico seguro.');
    const patterns = [...new Set(atCutoff.map(r => r.pattern))];
    const segment: Segment = b.sourceType === 'Vertical' ? 'vertical' : patterns.length === 1 && patterns[0] === 'Loteamento Aberto' ? 'aberto' : patterns.length === 1 && patterns[0] === 'Loteamento Fechado' ? 'fechado' : 'unknown';
    const periods = [...new Set(rows.map(r => r.period.slice(0, 7)))].sort();
    const history: Observation[] = periods.map(period => { const group = rows.filter(r => r.period.slice(0, 7) === period); return { period, units: group.every(validQty) ? completeSum(group, 'qty') : null, stock: completeSum(group, 'typology_stock'), net: completeSum(group, 'sold_in_period'), gross: completeSum(group, 'gross_sales'), cancellations: completeSum(group, 'distractions') }; });
    const warnings: string[] = ['Origem por base/período não comprovada na API.'];
    const release = String(b.release_date ?? '').slice(0, 7);
    const releaseAge = periodValid(release) && release <= cutoff ? monthIndex(cutoff) - monthIndex(release) + 1 : null;
    const ages = [...new Set(atCutoff.map(r => finite(r.time_on_sale)).filter((v): v is number => v !== null && Number.isInteger(v) && v > 0))];
    const age: number | null = releaseAge;
    if (releaseAge !== null && ages.some(a => a !== releaseAge)) {
        warnings.push('Tempo em venda diverge do lançamento; idade usa lançamento, conforme referência Finotti.');
    }
    if (releaseAge === null)
        warnings.push('Sem lançamento válido; não inferir idade pela primeira linha histórica.');
    if (history.some((r, i) => i > 0 && r.period !== shiftMonth(history[i - 1].period, 1)))
        warnings.push('Histórico tem lacunas.');
    if (history.some(r => r.units !== units))
        warnings.push('Oferta histórica mudou; modelos de ritmo exigem janela estável.');
    const known = history.every(r => r.net !== null);
    if (!known || history.reduce((s, r) => s + (r.net ?? 0), 0) !== units - stock)
        warnings.push('Soma de vendas não concilia com estoque; origem usa somente a posição no corte.');
    if (measurement === 'unknown')
        warnings.push('Duração das vendas do período não confirmada; modelos mensais indisponíveis.');
    return { id, name, reason: 'Posição no corte disponível.', origin: { id, name, cutoff, segment, pattern: [...atCutoff].sort((a,b) => Number(b.qty)-Number(a.qty))[0]?.pattern, age, units, sold: units - stock, stock, history, provenance, measurement, warnings } };
}
export function monthlyWindow(o: Origin, length: number): Observation[] | null {
    if (o.measurement !== 'monthly-confirmed')
        return null;
    const rows = o.history.slice(-length);
    return rows.length === length && rows.every((r, i) => r.period === shiftMonth(o.cutoff, i - length + 1) && r.units === o.units && r.stock !== null && r.stock >= 0 && r.stock <= o.units && r.net !== null) ? rows : null;
}
