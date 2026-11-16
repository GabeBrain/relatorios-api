import {describe,it,expect} from 'vitest';
import {buildMaceioLaunchSeries,buildMaceioPattern,collectMaceioIntro,launchMonths} from './intro-data';
import {introFixture} from './__tests__/intro-fixture';
import {maceioCities,type MaceioSelection} from './model';
import type {MaceioRequest} from './api';
const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
describe('Maceió · fontes e séries dos slides16–20',()=>{
 it('separa capital/RM, soma três meses no trimestre e12no acumulado sem usar totais do original',()=>{
  const data=introFixture(selection),monthly=buildMaceioLaunchSeries(19,selection,data),rolling=buildMaceioLaunchSeries(20,selection,data);
  expect(monthly.capital).toHaveLength(25);expect(monthly.capital.at(-1)).toBe(280);expect(monthly.rm.at(-1)).toBe(390);
  expect(rolling.capital).toHaveLength(39);expect(rolling.capital.at(-1)).toBe(Array.from({length:12},(_,i)=>280-i*3).reduce((a,b)=>a+b,0));
  const quarterly={...selection,periodicity:'quarterly' as const,position:2};
  const quarter=buildMaceioLaunchSeries(19,quarterly,introFixture(quarterly));
  expect(quarter.labels).toHaveLength(17);expect(quarter.labels.at(-1)).toBe('2T/26');expect(quarter.capital.at(-1)).toBe(280+277+274);
 });
 it('distingue zero explícito de ausência e bloqueia duplicação, booleano e subtotal',()=>{
  for(const mutation of ['missing','duplicate','boolean','subtotal']){
   const data=introFixture(selection),rows=data.cities[0].units;
   if(mutation==='missing')rows.pop();if(mutation==='duplicate')rows.push({...rows.at(-1)!});if(mutation==='boolean')rows[0].releases_in_period=true;if(mutation==='subtotal')rows[0].group='Total';
   expect(buildMaceioLaunchSeries(19,selection,data).issue).toBeTruthy();
  }
  const data=introFixture(selection);data.cities.forEach(city=>city.units.forEach(row=>row.releases_in_period=0));
  expect(buildMaceioLaunchSeries(19,selection,data).capital.every(n=>n===0)).toBe(true);
 });
 it('não converte padrões desconhecidos e não duplica empreendimento',()=>{
  const data=introFixture(selection);expect(buildMaceioPattern(selection,data).issue).toBeNull();
  data.cities[0].buildings[60].standard='Econômico';expect(buildMaceioPattern(selection,data).issue).toMatch(/correspondência/);
  data.cities[0].buildings.push({...data.cities[0].buildings[60]});expect(buildMaceioLaunchSeries(16,selection,data).issue).toBeTruthy();
 });
 it('consulta fontes independentes, sanitiza erros e não guarda token',async()=>{
  const request:MaceioRequest=async options=>{
   const city=String(options.query!.city),units=options.url.includes('temporal-analysis-city');
   if(units)throw new Error('private provider details');
   return {ok:true,status:200,data:{data:[{city,state:'AL',building_type:'Vertical',building_id:city,release_date:'2026-05-01',standard:'Luxo'}],meta:{current_page:1,last_page:1,total:1}}} as unknown as Awaited<ReturnType<MaceioRequest>>;
  };
  const result=await collectMaceioIntro(selection,[...maceioCities('monthly')],{token:'private-token',request});
  expect(result.cities.every(city=>!city.unitsComplete&&city.buildingsComplete)).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(/private/);expect(buildMaceioLaunchSeries(16,selection,result).issue).toBeNull();
 });
 it('rejeita recorte incompleto, paginação divergente e cancelamento',async()=>{
  await expect(collectMaceioIntro(selection,['Maceió'],{token:'x'})).rejects.toThrow(/recorte/);
  const controller=new AbortController();controller.abort();await expect(collectMaceioIntro(selection,[...maceioCities('monthly')],{token:'x',signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
  const request:MaceioRequest=async()=>({ok:true,status:200,data:{data:[],meta:{current_page:1,last_page:1,total:1}}} as Awaited<ReturnType<MaceioRequest>>);
  const result=await collectMaceioIntro(selection,[...maceioCities('monthly')],{token:'x',request});expect(result.cities.every(city=>!city.unitsComplete&&!city.buildingsComplete)).toBe(true);
  expect(launchMonths(selection,61).at(-1)).toBe('2026-05');
 });
});
