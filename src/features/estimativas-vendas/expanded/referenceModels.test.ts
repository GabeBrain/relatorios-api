import {describe, expect, it} from 'vitest';
import {projetar} from './reference/horizontal.js';
import {simulate} from './reference/vertical.js';
import parameters from './reference/horizontal-parameters.json';
import cohorts from './reference/vertical-cohorts.json';
import horizontalCases from './reference/horizontal-cases.json';
import verticalCases from './reference/vertical-cases.json';
import {prepareReferenceModels, referenceForecast} from './referenceModels';
import {prepareComparison} from './pipeline';
import {normalizeOrigin, type Origin} from './contract';
import {retrospective} from './evaluation';
import type {Building} from '../source';

describe('referência Finotti recebida pelo Drive', () => {
    for (const c of horizontalCases) it(`horizontal: ${JSON.stringify(c.entrada)}`, () => {
        const e = c.entrada, expected = c.esperado;
        const result = projetar(parameters, e.padrao, e.unidades, e.meses, e.vendidas);
        if ('esgotado' in expected && expected.esgotado) {expect(result.esgotado).toBe(true); return;}
        const out = result.resumo!;
        expect(out.k).toBeCloseTo(expected.k!, 5);
        expect(out.mes_esgotamento).toBe(expected.mes_esgotamento);
        expect(out.vendas_12m).toBe(expected.vendas_12m);
        expect(out.esgotamento_central).toEqual(expected.esgotamento_central);
        expect(out.esgotamento_amplo).toEqual(expected.esgotamento_amplo);
        expect(result.tabela.length).toBe(expected.linhas_tabela);
        expect(result.tabela.slice(0,12).map(r => r.vendas)).toEqual(expected.vendas_primeiros_12);
        const row = result.tabela[11] ?? result.tabela.at(-1)!;
        expect(row.acumulado).toBe(expected.acum_n12);
        expect([row.central_min,row.central_max]).toEqual(expected.central_n12);
        expect([row.ampla_min,row.ampla_max]).toEqual(expected.ampla_n12);
    });
    for (const c of verticalCases) it(`vertical: ${c.padrao}, ${c.Q}/${c.V}, mês ${c.n}`, () => {
        const out = simulate(cohorts,c.padrao,c.Q,c.n,c.V);
        for (const key of ['central','conservador','otimista'] as const) {
            const rows=out[key];
            expect(rows.at(-1)!.cum >= c.Q ? rows.at(-1)!.t : '>240').toBe(c[key]);
            expect(rows.every((r,i) => r.cum >= (rows[i-1]?.cum ?? c.V) && r.cum <= c.Q)).toBe(true);
        }
        expect(out.central[11]?.cum ?? out.central.at(-1)?.cum).toBe(c.acum_n12);
        let previous=c.V;
        expect(out.central.slice(0,12).map(r => {const v=r.cum-previous;previous=r.cum;return v;})).toEqual(c.vendas_12m_central);
    });
    it('adapta vertical, ancora o corte e bloqueia vazamento temporal',async () => {
        await prepareReferenceModels();
        const o: Origin = {id:'x',name:'x',cutoff:'2026-09',segment:'vertical',pattern:'Standard',age:6,units:120,sold:36,stock:84,history:[],measurement:'unknown',provenance:'unknown',warnings:[]};
        const f=referenceForecast(o,24).forecast!;
        expect(f.points[0].predicted).toBe(36);expect(f.points[12].predicted).toBe(84);
        expect(f.points[12].sourceWide).toHaveLength(2);
        expect(referenceForecast({...o,cutoff:'2025-09'},24).forecast).toBeNull();
    });
    it('prepara todos os modelos sem confirmação de venda mensal e cancela integralmente', async () => {
        const b:Building={id:'x',sourceType:'Vertical',release_date:'2026-04-01',typologies_history:[{period:'2026-06',typology_id:1,pattern:'Standard',qty:120,typology_stock:100,sold_in_period:null},{period:'2026-09',typology_id:1,pattern:'Standard',qty:120,typology_stock:84,sold_in_period:null}]};
        const r=normalizeOrigin(b,'2026-09');const cache=await prepareComparison([r],24,new AbortController().signal,()=>{});
        expect(cache.get('x')?.get('auto')?.forecast?.model).toBe('finotti-reference');
        expect(cache.get('x')?.get('stock-trend')?.forecast).not.toBeNull();
        expect(retrospective([b],['2026-06'],['finotti','finotti-extra','finotti-reference'],[3]).every(t => t.predicted === null)).toBe(true);
        const controller=new AbortController();controller.abort();
        await expect(prepareComparison([r],24,controller.signal,()=>{})).rejects.toMatchObject({name:'AbortError'});
    });
});
