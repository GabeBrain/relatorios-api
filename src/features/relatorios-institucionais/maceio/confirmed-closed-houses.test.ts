import { describe,it,expect } from 'vitest';
import { maceioHorizontalProduct,MACEIO_CONFIRMED_CLOSED_HOUSES } from './classification';
import { buildMaceioClosedReview } from './closed-review';
import { buildRemainingSlide } from './remaining-data';
import { remainingFixture } from './__tests__/remaining-fixture';
import type { MaceioSelection } from './model';

const confirmed=[['7980','Barra de São Miguel'],['12692','Maceió'],['20502','Maceió'],['7984','Marechal Deodoro'],['425','Marechal Deodoro'],['28486','Marechal Deodoro'],['21639','Marechal Deodoro'],['21640','Marechal Deodoro'],['422','Marechal Deodoro'],['28491','Rio Largo']];
const project=(id:string,city:string)=>({building_id:id,city,state:'AL',building_type:'Horizontal',work:'Fechado',standard:'',release_date:'2020-01-01'});
describe('10 exceções Fechado confirmadas por Lucas em 19/11/2026',()=>{
  it('conserva exatamente os dez IDs e municípios informados',()=>expect(Object.entries(MACEIO_CONFIRMED_CLOSED_HOUSES).sort()).toEqual([...confirmed].sort()));
  for(const [id,city] of confirmed)it(`classifica somente no escopo correto: ${id}`,()=>{
    const building=project(id,city);
    expect(maceioHorizontalProduct(building)).toBe('Condomínio de Casas');
    for(const changed of [{city:'Pilar'},{state:'SP'},{building_type:'Vertical'},{building_id:'999999'},{work:'Econômico'}])expect(maceioHorizontalProduct({...building,...changed})).toBe('');
    expect(maceioHorizontalProduct({...building,work:'Loteamento Fechado'})).toBe('Loteamento Fechado');
    expect(maceioHorizontalProduct({...building,subtype:'Condomínio de Chácaras'})).toBe('Condomínio de Chácaras');
  });
  for(const periodicity of ['monthly','quarterly'] as const)it(`inclui as dez exceções nos totais e remove só elas da lista pendente · ${periodicity}`,()=>{
    const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity,year:2026,position:periodicity==='monthly'?5:2};
    const data=remainingFixture(selection),pages=periodicity==='monthly'?[71,75]:[72,76];
    const total=()=>pages.reduce((sum,page)=>sum+Number(buildRemainingSlide(page,selection,data).tables[0].rows.at(-1)!.values[4]),0);
    const before=total();
    for(const [id,city] of confirmed){
      data.horizontal!.find(s=>s.city===city&&s.metric==='details')!.rows.push({...project(id,city),typologies_history:[{period:`${data.end}-01`,typology_id:1,qty:20,typology_stock:7,price:500000,private_area:50}]});
      const municipal=data.horizontal!.find(s=>s.city===city&&s.metric==='stock')!.rows[0];municipal.stock=Number(municipal.stock)+7;
    }
    expect(total()).toBe(before+70);
    for(const page of periodicity==='monthly'?[71,72,73,75,76,77]:[72,73,74,76,77,78])expect(buildRemainingSlide(page,selection,data,'stock-weighted').issue).toBeNull();
    expect(buildMaceioClosedReview(selection,data).count).toBe(0);
    data.horizontal!.find(s=>s.city==='Maceió'&&s.metric==='details')!.rows.push(project('999999','Maceió'));
    const review=buildMaceioClosedReview(selection,data);expect(review.count).toBe(1);expect(review.csv).toContain('999999');
  });
});
