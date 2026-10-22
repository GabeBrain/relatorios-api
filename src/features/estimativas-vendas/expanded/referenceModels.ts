import { projetar } from './reference/horizontal.js';
import { simulate, poolKey } from './reference/vertical.js';
import horizontalParameters from './reference/horizontal-parameters.json';
import { shiftMonth, type Origin } from './contract';
import type { ForecastResult, ForecastPoint } from './models';

let cohorts: unknown;
export async function prepareReferenceModels() {
    cohorts ??= (await import('./reference/vertical-cohorts.json')).default;
}
export function referenceForecast(o: Origin, horizon: number): ForecastResult {
    const fail = (reason: string): ForecastResult => ({id: o.id, name: o.name, forecast: null, reason});
    if (o.cutoff < '2026-09') return fail('Referência treinada até setembro/2026: use um modelo independente para retrospectivas anteriores.');
    if (o.age === null || o.age < 1) return fail('Lançamento ausente: histórico disponível, previsão sem idade de origem.');
    const vertical = o.segment === 'vertical';
    const maxAge = vertical ? 36 : 60;
    if (o.age > maxAge) return fail(`Método Finotti ${vertical ? 'vertical' : 'horizontal'} disponível até o mês ${maxAge}. Histórico preservado.`);
    const points: ForecastPoint[] = [{period: o.cutoff, offset: 0, age: o.age, predicted: o.sold, stock: o.stock, boundary: false}];
    const warnings = [...o.warnings, 'Referência Finotti treinada até setembro/2026; não comprova precisão fora dessa base.'];
    const parameters: Record<string, string | number> = {trainedThrough: '2026-09', pattern: o.pattern ?? 'Não informado'};
    if (!o.stock) {
        for (let h = 1; h <= horizon; h++) points.push({period: shiftMonth(o.cutoff, h), offset: h, age: o.age + h, predicted: o.units, stock: 0, boundary: false});
    } else if (vertical) {
        if (!cohorts) return fail('Carregando referência de comparáveis.');
        const output = simulate(cohorts, o.pattern ?? '', o.units, o.age, o.sold);
        if (!output.neighbors) return fail('Sem comparáveis na referência para este estágio.');
        parameters.peers = output.neighbors;
        parameters.pool = poolKey(o.pattern ?? '');
        if (parameters.pool === 'g3:Médio+') warnings.push('Padrão sem grupo específico; referência utiliza o grupo agregado Médio+, conforme Finotti.');
        for (let h = 1; h <= horizon; h++) {
            const value = (key: 'central' | 'conservador' | 'otimista') => output[key][h - 1]?.cum ?? output[key].at(-1)?.cum ?? o.sold;
            const predicted = value('central');
            points.push({period: shiftMonth(o.cutoff, h), offset: h, age: o.age + h, predicted, stock: o.units - predicted, boundary: false, sourceWide: [value('conservador'), value('otimista')]});
        }
        warnings.push('Sombra P10–P90 entre comparáveis; inclui continuação de séries censuradas. Não é garantia de cobertura local.');
    } else {
        const pattern = o.segment === 'aberto' ? 'Loteamento Aberto' : o.segment === 'fechado' ? 'Loteamento Fechado' : o.pattern;
        if (!['Loteamento Aberto', 'Loteamento Fechado', 'Condomínio de Casas/Sobrados', 'Condomínio de casas', 'Geral'].includes(pattern ?? '')) return fail('Padrão horizontal sem correspondência documentada na referência.');
        const output = projetar(horizontalParameters, pattern!, o.units, o.age, o.sold);
        if (output.resumo) parameters.k = output.resumo.k;
        if (o.age > 48) warnings.push('Meses 49–60: extrapolação permitida pela referência, fora do intervalo original de ajuste.');
        for (let h = 1; h <= horizon; h++) {
            const row = output.tabela[h - 1] ?? output.tabela.at(-1);
            const predicted = row?.acumulado ?? o.sold;
            points.push({period: shiftMonth(o.cutoff, h), offset: h, age: o.age + h, predicted, stock: o.units - predicted, boundary: false,
                ...(row ? {sourceWide: [row.ampla_min, row.ampla_max] as [number, number], sourceCentral: [row.central_min, row.central_max] as [number, number]} : {})});
        }
        warnings.push('Sombras P25–P75 e P5–P95 da referência. Cobertura relatada na fonte: 53% e 80%; não aferida neste recorte.');
    }
    return {id: o.id, name: o.name, reason: 'Referência Finotti por tipo', forecast: {origin: o, model: 'finotti-reference', version: 'finotti-drive-2026-10-22', points, reason: 'Faixas da referência, sem recalibração local', parameters, warnings}};
}
