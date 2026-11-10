import { describe,expect,it } from 'vitest';
import { annualLaunchFacts,buildAnnualCompositions,annualCompositionPublishable,type AnnualLaunchFact } from '../report/annual-composition';
import { buildCityCube } from '../domain/cube';
import type { PanoramaScope } from '../types';
const scope:PanoramaScope={uf:'RS',cities:['Canela'],entity:'fiergs-rs',startQuarter:'2T2023',endQuarter:'3T2026'};
const facts:AnnualLaunchFact[]=[{key:'A',city:'Canela',quarter:'2T2023',standard:'Médio',units:10,vgl:2},{key:'B',city:'Canela',quarter:'3T2023',standard:null,units:30,vgl:null},
 {key:'C',city:'Canela',quarter:'1T2024',standard:'Luxo',units:-2,vgl:-1},{key:'D',city:'Canela',quarter:'2T2025',standard:'Médio',units:0,vgl:0}];
describe('composição anual observada',()=>{
 it('conta IDs distintos e mantém categoria desconhecida no denominador',()=>{
  const block=buildAnnualCompositions([...facts,facts[0]],scope).find((b)=>b.metric==='units')!;
  const year=block.years[0];expect(year.total).toBe(40);expect(year.from).toBe('2T2023');
  expect(year.values.find((v)=>v.label==='Não classificado')?.share).toBe(75);
  expect(year.values.reduce((s,v)=>s+(v.share??0),0)).toBeCloseTo(100);
 });
 it('não normaliza preço ausente, negativo ou ano zerado para100%',()=>{
  const blocks=buildAnnualCompositions(facts,scope);
  expect(blocks.find((b)=>b.metric==='vgl')?.years[0].status).toBe('incomplete');
  expect(blocks.find((b)=>b.metric==='units')?.years[1].status).toBe('negative');
  expect(blocks.find((b)=>b.metric==='units')?.years[2].status).toBe('empty');
  expect(blocks.find((b)=>b.metric==='vgl')?.years[0].values.every((v)=>v.share===null)).toBe(true);
  expect(annualCompositionPublishable(buildAnnualCompositions(facts.map((f)=>({...f,standard:null})),scope)[0])).toBe(false);
 });
 it('usa classificação efetivamente observada no lançamento, sem trazer padrão futuro',()=>{
  const building={building_id:'A',building_type:'Vertical',name:'A',release_date:'2023-04-01',standard:'Luxo',total_units:10,
   typologies_history:[{period:'2023-04-01',typology_id:1,pattern:'Médio',qty:10,typology_stock:10,liquid_sales:0,price:100000,private_area:50},
    {period:'2026-09-01',typology_id:1,pattern:'Luxo',qty:10,typology_stock:5,liquid_sales:1,price:200000,private_area:50}]};
  const cube=buildCityCube([building],{uf:'RS',city:'Canela',entity:'fiergs-rs',endQuarter:'3T2026',engineVersion:'v4'});
  expect(annualLaunchFacts([building],cube)[0].standard).toBe('Médio');
  expect(annualLaunchFacts([{...building,typologies_history:[building.typologies_history[1]]}],cube)[0].standard).toBeNull();
 });
});
