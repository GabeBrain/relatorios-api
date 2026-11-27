import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {monetaryIssue,createCalculator} from '../../modelo-03/calculate';
import {REGIONS,citiesFor,citySelection} from '../model';
import {calculateReport} from '../calculate';
import {diagnostic,conferenceCsv} from '../diagnostic';
import Insights from '../Insights';
import {fixture,selection,catalogFor} from './fixture';

describe('Tratamento do VGV',()=>{
 it.each(REGIONS)('$label: localiza o dado monetário nulo com saldo líquido zero e preserva as demais competências',region=>{
  const s={...selection,region:region.id},catalog=catalogFor(region.id),cities=citiesFor(s,catalog),city=cities[0],sources=fixture(s,catalog);
  const source=sources.find(x=>x.city===city.city&&x.metric==='sales')!,row=source.rows.find(r=>r.period==='2026-05-01')!;
  row.liquid_sales=0;row.vgv_liquid_sales=null;
  const report=calculateReport(s,cities,[],sources,'2026-11-27T12:00:00Z'),slide=report.slides.find(x=>x.id==='sales-money-quarters')!;
  expect(slide.tables[0].rows.find(r=>r.label==='2T2026')!.values[0]).toBeNull();
  expect(slide.tables[1].rows.find(r=>r.label==='Jan–Set/2026')!.values[0]).toBeNull();
  expect(slide.tables[0].rows.find(r=>r.label==='3T2026')!.values[0]).toBeTypeOf('number');
  expect(report.slides.find(x=>x.id==='sales-units-quarters')!.tables[0].rows.find(r=>r.label==='2T2026')!.values[0]).toBe(cities.length*6-1);
  expect(slide.coverage).toBe('partial');
  expect(report.slides.find(x=>x.id==='sales-states')!.warnings.join(' ')).not.toContain('vgv_liquid_sales');
  expect(report.slides.find(x=>x.id==='sales-money-standards')!.warnings.join(' ')).toContain('vgv_liquid_sales');
  const audit=diagnostic(report),issue=audit.sources.find(x=>x.city===city.city&&x.metric==='sales')!.monetaryIssues;
  expect(issue).toEqual([{...city,month:'2026-05',group:row.group,metric:'sales',field:'vgv_liquid_sales',reason:'null',units:0,zeroNetSales:true}]);
  const csv=conferenceCsv(report);expect(csv).toContain('pendencia-monetaria');expect(csv).toContain('2026-05/vgv_liquid_sales');
  const html=renderToStaticMarkup(<Insights report={report} onOpenSlide={()=>{}}/>);
  expect(html).toContain(`${city.city}/${city.uf}, 2026-05`);expect(html).toContain('Vendas líquidas zero não comprovam VGV zero');
  expect(JSON.stringify(issue)).not.toContain('PRIVATE_');
 });
 it('preserva VGV explicitamente zero e VGV negativo mesmo com saldo líquido zero',()=>{
  const city={uf:'PR',city:'Curitiba'},sources=fixture(selection,{PR:['Curitiba']}),source=sources.find(x=>x.metric==='sales')!;
  for(const row of source.rows){row.liquid_sales=0;row.vgv_liquid_sales=0;}
  const row=source.rows.find(r=>r.period==='2026-05-01')!;
  expect(monetaryIssue(row,'sales',city.city,city.uf)).toBeNull();
  expect(createCalculator(citySelection(selection,city),sources).temporal(city.city,'sales','2026-04','2026-06','Padrão',true)).toBe(0);
  row.vgv_liquid_sales=-1000;
  expect(monetaryIssue(row,'sales',city.city,city.uf)).toBeNull();
  expect(createCalculator(citySelection(selection,city),sources).temporal(city.city,'sales','2026-04','2026-06','Padrão',true)).toBeLessThan(0);
 });
 it('não deixa um padrão inválido bloquear o VGV de outro padrão',()=>{
  const city={uf:'PR',city:'Curitiba'},sources=fixture(selection,{PR:['Curitiba']}),source=sources.find(x=>x.metric==='sales')!;
  source.rows.find(r=>r.period==='2026-05-01'&&r.group==='Standard')!.vgv_liquid_sales=null;
  const calculator=createCalculator(citySelection(selection,city),sources);
  expect(calculator.temporal(city.city,'sales','2026-04','2026-06','Padrão',true,row=>row.group==='MCMV')).toBeGreaterThan(0);
  expect(()=>calculator.temporal(city.city,'sales','2026-04','2026-06','Padrão',true)).toThrow(/vgv_liquid_sales nulo/);
 });
 it.each([[undefined,'absent'],[null,'null'],['  ','empty'],['DO_NOT_EXPORT_SECRET','invalid'],[false,'invalid']])('classifica %s sem exportar o valor bruto',(value,reason)=>{
  const issue=monetaryIssue({period:'2026-05-01',group:'Compacto',liquid_sales:0,vgv_liquid_sales:value},'sales','Cidade','UF');
  expect(issue?.reason).toBe(reason);expect(JSON.stringify(issue)).not.toContain('DO_NOT_EXPORT_SECRET');
 });
});
