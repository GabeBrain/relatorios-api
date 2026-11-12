import {describe,it,expect} from 'vitest';
import {classify, reviewExport, situationCounts, prepareReview} from './workbench';
import type {Building} from '../source';
const fixture=(id=1):Building=>({building_id:id,name:`Empreendimento ${id}`,sourceType:'Horizontal',release_date:'2026-01-01',estimation:false,
  typologies_history:Array.from({length:9},(_,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,typology_id:id,pattern:'Loteamento Fechado',qty:100,typology_stock:100-(i+1)*9,sold_in_period:9}))});
describe('revisão operacional e inventário',()=>{
 it('não promove cadastro estimation=false a origem histórica comprovada',async()=>{
  const [row]=await prepareReview([{building:fixture(),uf:'PR',city:'Curitiba'}],'2026-09',new AbortController().signal,()=>{});
  expect(row.methods.get('finotti-reference')?.forecast).toBeTruthy();expect(row.status).toBe('PENDENTE');expect(row.reasons.join(' ')).toContain('cadência oficial');
  expect(row.methods.has('auto')).toBe(false);expect(row.methods.has('absorption')).toBe(false);
 });
 it('coleta por estoque não altera o resultado matemático',async()=>{
  const b=fixture();b.typologies_history.at(-1)!.typology_stock=4;
  const [r]=await prepareReview([{building:b,uf:'PR',city:'Curitiba'}],'2026-09',new AbortController().signal,()=>{});
  expect(r.status).toBe('COLETA');expect(r.methods.get('finotti-reference')?.forecast).toBeTruthy();
 });
 it('exporta a composição explícita completa, independente de filtros',()=>{
  const r=[1,2].map(id=>classify({building:fixture(id),uf:'PR',city:'Curitiba'},'2026-09',new Map()));
  const draft=new Set(['1','2']);const filtered=r.filter(x=>x.id==='1');expect(filtered).toHaveLength(1);
  const e=reviewExport(r,draft,'2026-09');expect(e).toHaveLength(2);expect(e.every(x=>!x.importable&&!x.operationallyApproved)).toBe(true);expect([...draft]).toEqual(['1','2']);
 });
 it('frequências fecham no universo e são ordenadas por ocorrência',()=>{
  const r=[1,2,3].map(id=>classify({building:fixture(id),uf:'PR',city:'Curitiba'},'2026-09',new Map()));
  expect(situationCounts(r)).toHaveLength(1);expect(situationCounts(r)[0][1]).toBe(3);
 });
 it('cancelamento não retorna uma revisão parcial',async()=>{const c=new AbortController();c.abort();await expect(prepareReview([{building:fixture(),uf:'PR',city:'Curitiba'}],'2026-09',c.signal,()=>{})).rejects.toMatchObject({name:'AbortError'});});
 it('corte sem posição não fabrica estoque zero',()=>{const r=classify({building:fixture(),uf:'PR',city:'Curitiba'},'2026-10',new Map());expect(r.status).toBe('PENDENTE');expect(r.normalized.origin).toBeNull();});
});
