import {describe,it,expect} from 'vitest';
import {REGIONS,citiesFor,citySelection} from '../model';
import {calculateReport} from '../calculate';
import {diagnostic} from '../diagnostic';
import {createCalculator} from '../../modelo-03/calculate';
import {scheduledObservations} from '../../modelo-03/coverage';
import {fixture,selection,catalogFor} from './fixture';
import sulSalesGap from './sul-sales-gap-2026-11-27.json';

/** Reproduce distinct causes in the actual regional engine; fixtures are not API evidence. */
describe.each(REGIONS)('Investigação das lacunas · $label',region=>{
 const s={...selection,region:region.id},catalog=catalogFor(region.id),cities=citiesFor(s,catalog),target=cities[0];
 const run=(sources:ReturnType<typeof fixture>)=>calculateReport(s,cities,[],sources,'2026-11-27T12:00:00Z');
 it('propaga uma competência municipal ausente ao total regional sem apagar as demais',()=>{
  const sources=fixture(s,catalog),source=sources.find(x=>x.city===target.city&&x.metric==='releases')!;
  source.rows=source.rows.filter(row=>String(row.period).slice(0,7)!=='2026-06');
  const report=run(sources),slide=report.slides.find(x=>x.id==='releases-units-quarters')!;
  expect(slide.tables[0].rows.find(row=>row.label==='2T2026')!.values[0]).toBeNull();
  expect(slide.tables[0].rows.find(row=>row.label==='3T2026')!.values[0]).toBe(cities.length*6);
  expect(slide.warnings.join(' ')).toContain(target.city);
  expect(slide.warnings.join(' ')).toContain('competências ausentes');
  expect(diagnostic(report).sources.find(x=>x.key.includes(`${target.uf}/${target.city}/Vertical/releases/`))!.complete).toBe(true);
 });
 it('campo VGV ausente bloqueia dinheiro, preservando unidades da mesma competência',()=>{
  const sources=fixture(s,catalog),source=sources.find(x=>x.city===target.city&&x.metric==='releases')!;
  delete source.rows.find(row=>String(row.period).slice(0,7)==='2026-06')!.vgv_release;
  const report=run(sources);
  expect(report.slides.find(x=>x.id==='releases-money-quarters')!.tables[0].rows.find(row=>row.label==='2T2026')!.values[0]).toBeNull();
  expect(report.slides.find(x=>x.id==='releases-units-quarters')!.tables[0].rows.find(row=>row.label==='2T2026')!.values[0]).toBe(cities.length*6);
  expect(diagnostic(report).sources.find(x=>x.city===target.city&&x.metric==='releases')!.missingFields.vgv_release).toBe(1);
 });
 it('fotografia ausente pode bloquear preço mesmo com coleta e estoque municipal completos',()=>{
  const sources=fixture(s,catalog),source=sources.find(x=>x.city===target.city&&x.metric==='details')!;
  for(const building of source.rows)building.typologies_history=(building.typologies_history as Record<string,unknown>[]).filter(row=>String(row.period).slice(0,7)!=='2026-09');
  const report=run(sources),row=report.slides.find(x=>x.id==='meter-states')!.tables[0].rows.find(row=>row.label===target.uf)!;
  expect(row.values[0]).toBeNull();expect(row.values[3]).toBe(80);
  expect(source.complete).toBe(true);
 });
});

it('cadência trimestral preserva trimestres sem exigir meses intermediários; since não limita o esperado atual',()=>{
 const s={...selection},city={uf:'RS',city:'Estrela'},sources=fixture(s,{RS:['Estrela']});
 for(const source of sources){
  if(source.metric==='details')for(const building of source.rows)building.typologies_history=(building.typologies_history as Record<string,unknown>[]).filter(row=>Number(String(row.period).slice(5,7))%3===0&&String(row.period)>='2025-06');
  else source.rows=source.rows.filter(row=>Number(String(row.period).slice(5,7))%3===0&&String(row.period)>='2025-06');
 }
 const calculator=createCalculator(citySelection(s,city),sources),source=sources.find(x=>x.metric==='releases')!;
 expect(calculator.temporal(city.city,'releases','2026-04','2026-06')).toBe(2);
 expect(scheduledObservations(source,'2024-07','2025-06')).toEqual(['2024-09','2024-12','2025-03','2025-06']);
 expect(()=>calculator.temporal(city.city,'releases','2024-07','2024-09')).toThrow(/fotografia válida/);
});

it('diagnóstico com cadência mensal recente pode apontar falsas lacunas de meses intermediários antigos',()=>{
 const city={uf:'RS',city:'Estrela'},sources=fixture(selection,{RS:['Estrela']});
 for(const source of sources){
  const include=(row:Record<string,unknown>)=>String(row.period)>='2025-10'||Number(String(row.period).slice(5,7))%3===0;
  if(source.metric==='details')for(const building of source.rows)building.typologies_history=(building.typologies_history as Record<string,unknown>[]).filter(include);
  else source.rows=source.rows.filter(include);
 }
 const calculator=createCalculator(citySelection(selection,city),sources),source=sources.find(x=>x.metric==='releases')!;
 // The calculator evaluates cadence at each historical window's end: this quarter is valid.
 expect(calculator.temporal(city.city,'releases','2025-04','2025-06')).toBe(2);
 // The diagnostic schedules its entire window using the recent monthly cadence instead.
 expect(scheduledObservations(source,'2025-04','2026-09')).toContain('2025-04');
 const audit=diagnostic(calculateReport(selection,[city],['PR','SC'],sources,'2026-11-27T12:00:00Z'));
 expect(audit.sources.find(x=>x.metric==='releases')!.missingRequiredMonths).toContain('2025-04');
});

it('reproduz a lacuna real de VGV vendido em Santa Cruz do Sul sem converter saldo líquido zero em dinheiro zero',()=>{
 const {city,observations}=sulSalesGap,sources=fixture(selection,{[city.uf]:[city.city]});
 const source=sources.find(x=>x.metric==='sales')!;
 expect(observations.every(row=>row.records===1)).toBe(true);
 source.rows=observations.map(row=>({period:`${row.month}-01`,group:row.group,...row.values}));
 const calculator=createCalculator(citySelection(selection,city),sources);
 expect(calculator.temporal(city.city,'sales','2026-04','2026-06')).toBe(118);
 expect(()=>calculator.temporal(city.city,'sales','2026-04','2026-06','Padrão',true)).toThrow(/numérico necessário/);
 const missing=observations.filter(row=>Object.keys(row.missing).length);
 expect(missing).toMatchObject([{month:'2026-05',group:'Compacto',values:{liquid_sales:0,vgv_liquid_sales:null}}]);
});
