import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBuilding, candidateOutput, shiftMonth} from '../../src/features/estimativas-vendas/operational/selection.mjs';
const make=(cadence=1)=>Array.from({length:4},(_,i)=>({buildingId:'b',typologyId:'t',period:shiftMonth('2026-09',(i-3)*cadence),release:'2025-01',units:100,stock:23-i,net:1,estimated:false,status:'Ativo',type:'Horizontal',pattern:'Loteamento Fechado',sourceRow:i+2}));
const check=(rows, cadence=1)=>assessBuilding(rows,{cutoff:'2026-09',cadence});
test('monthly candidate preserves conservative blockers and cannot be imported',()=>{
 const r=check(make());assert.equal(r.calculationAllowed,true);assert.equal(r.importable,false);assert.equal(r.target,'2026-10');assert.ok(r.blockers.includes('DIVISAO_METADE'));
 const o=candidateOutput(r,82,{id:'test'});assert.equal(o.estimatedNetPeriod,2);assert.equal(o.initialStock-o.estimatedNetPeriod,o.finalStock);assert.equal(o.estimatedCancellations,null);assert.equal(o.price,null);
});
test('four quarterly positions span nine months, target is whole next quarter',()=>{const r=check(make(3),3);assert.equal(r.calculationAllowed,true);assert.equal(r.target,'2026-12');assert.equal(check(make(),3).calculationAllowed,false);});
for(const [stock,collect] of [[0,true],[5,true],[6,false],[30,false],[31,true]]) test(`stock boundary ${stock}`,()=>{
 const rows=make().map((r,i)=>({...r,stock:stock+3-i}));assert.equal(check(rows).reasons.includes('ESTOQUE_EXIGE_COLETA'),collect);
});
test('estimated previous period forces collection, unknown cannot pass',()=>{for(const flag of [true,null]){const rows=make();rows[3].estimated=flag;assert.equal(check(rows).calculationAllowed,false);} });
test('missing periods, duplicate keys, fractional and invalid stocks blocked',()=>{
 for(const rows of [make().slice(1),[...make(),make()[0]],make().map(r=>({...r,stock:1.2})),make().map(r=>({...r,stock:null}))]) assert.equal(check(rows).calculationAllowed,false);
});
test('mixed typologies do not receive arbitrary allocation; total stock uses all',()=>{
 const r=check([...make(),...make().map(r=>({...r,typologyId:'t2'}))]);assert.equal(r.stockBuilding,40);assert.ok(r.reasons.includes('MULTITIPOLOGIA_SEM_REGRA_DE_CALCULO'));assert.equal(r.calculationAllowed,false);
});
test('missing current typology is not silently omitted',()=>{const r=check([...make(),{...make()[0],typologyId:'old'}]);assert.ok(r.reasons.includes('TIPOLOGIA_AUSENTE_NO_CORTE'));});
test('existing target cannot be overwritten',()=>{const r=check([...make(),{...make()[3],period:'2026-10'}]);assert.ok(r.reasons.includes('ALVO_JA_POSSUI_REGISTRO'));});
test('offer changes and unexplained flows require review',()=>{
 for(const field of ['units','net']){const rows=make();rows[2][field]+=1;assert.equal(check(rows).calculationAllowed,false);}
});
test('different building IDs and invalid month rejected',()=>{assert.equal(check([...make(),{...make()[0],buildingId:'other'}]).calculationAllowed,false);assert.throws(()=>assessBuilding(make(),{cutoff:'2026-13',cadence:1}));});
test('reference age and past training cutoff protected',()=>{const r=check(make().map(r=>({...r,release:'2010-01'})));assert.ok(r.reasons.includes('IDADE_FORA_DO_MODELO'));assert.throws(()=>candidateOutput(check(make()),101,{}));});
