import {describe,it,expect,vi} from 'vitest';
import type {Request} from '../../modelo-03/api';
import type {Row} from '../../modelo-03/types';
import {collect} from '../api';
import {calculateReport} from '../calculate';
import {diagnostic,conferenceCsv} from '../diagnostic';
import {citiesFor,REGIONS} from '../model';
import {fixture,selection,catalogFor} from './fixture';
import {patternRecovery,typologyRecovery,recoveredPatternSource} from '../monetary-recovery';
import realSulGap from './sul-sales-gap-2026-11-27.json';
import incc from '../../fortaleza/incc-di.json';

const catalog={RS:['Santa Cruz do Sul']};
const envelope=(rows:Row[],status=200)=>({ok:status===200,status,data:{data:rows,meta:{current_page:1,last_page:1,total:rows.length}},text:null,contentType:'application/json',latencyMs:0,bytes:0,error:null,requestHeaders:{},requestQuery:{},requestBody:null,url:'',method:'GET' as const});
async function scenario(options:{retryValid?:boolean;alternateUnits?:number;alternateMoney?:number|null;alternateFailure?:boolean;abortRecovery?:boolean}={}){
 const initial=fixture(selection,catalog),sales=initial.find(s=>s.metric==='sales')!;
 const row=sales.rows.find(r=>r.period==='2026-05-01'&&r.group==='Standard')!;row.liquid_sales=0;row.vgv_liquid_sales=null;
 const controller=new AbortController(),calls:Parameters<Request>[0][]=[],progress:{completed:number;total:number;message:string}[]=[];
 const request:Request=async query=>{
  calls.push(query);const q=query.query!,metric=query.url.split('/').at(-1)==='building-with-history-internal'?'details':query.url.split('/').at(-1),group=q.group_by??'Empreendimento';
  if(q.start_period==='2026-05-01'){
   if(options.abortRecovery){controller.abort();return envelope([]);}
   expect(q.end_period).toBe('2026-05-31');expect(q.city).toBe('Santa Cruz do Sul');expect(q.uf).toBe('RS');expect(q['type[]']).toEqual(['Vertical']);
   if(group==='Padrão')return envelope(sales.rows.filter(r=>r.period==='2026-05-01').map(r=>({...r,vgv_liquid_sales:r.group==='Standard'&&options.retryValid?100:r.vgv_liquid_sales})));
   return options.alternateFailure?envelope([],503):envelope([{period:'2026-05-01',group:'2',liquid_sales:options.alternateUnits??1,vgv_liquid_sales:options.alternateMoney===undefined?500000:options.alternateMoney}]);
  }
  const source=initial.find(s=>s.metric===metric&&s.group===group)!;return envelope(source.rows);
 };
 const sources=await collect(selection,catalog,{token:'synthetic',signal:controller.signal,onProgress:p=>progress.push(p),request,wait:async()=>{}});
 const report=calculateReport(selection,citiesFor(selection,catalog),[],sources,'2026-11-27');return {sources,report,calls,progress};
}
describe('Recuperação de VGV pela API',()=>{
 it.each(REGIONS)('$label: recuperação conciliada do total é aplicada ao mesmo motor regional',region=>{
  const s={...selection,region:region.id},catalog=catalogFor(region.id),sources=fixture(s,catalog),source=sources.find(s=>s.metric==='sales')!;
  const row=source.rows.find(r=>r.period==='2026-05-01'&&r.group==='Standard')!;row.liquid_sales=0;row.vgv_liquid_sales=null;
  source.monetaryRecovery=[{month:'2026-05',retry:{...source,rows:source.rows.filter(r=>r.period==='2026-05-01')},alternate:{...source,group:'Tipologia',rows:source.rows.filter(r=>r.period==='2026-05-01').map((r,i)=>({...r,group:String(i+1),vgv_liquid_sales:r.vgv_liquid_sales??0}))}}];
  const report=calculateReport(s,citiesFor(s,catalog),[],sources,'2026-11-27');
  expect(report.slides.find(s=>s.id==='sales-money-quarters')!.tables[0].rows.find(r=>r.label==='2T2026')!.values[0]).toBeTypeOf('number');
  expect(diagnostic(report).sources.find(s=>s.city===source.city&&s.metric==='sales')!.monetaryRecovery[0].scope).toBe('total-only');
 });
 it('aplica os seis agregados reais do Sul e recupera maio zero apenas com zero observado na fonte alternativa',()=>{
  const sources=fixture(selection,catalog),source=sources.find(s=>s.metric==='sales')!;
  source.rows=[...source.rows.filter(r=>String(r.period)<'2026-04'||String(r.period)>'2026-06-30'),...realSulGap.observations.map(r=>({period:`${r.month}-01`,group:r.group,...r.values}))];
  source.monetaryRecovery=[{month:'2026-05',retry:{...source,rows:source.rows.filter(r=>r.period==='2026-05-01')},alternate:{...source,group:'Tipologia',rows:[{period:'2026-05-01',group:'2',liquid_sales:0,vgv_liquid_sales:0}]}}];
  const report=calculateReport(selection,citiesFor(selection,catalog),[],sources,'2026-11-27'),value=report.slides.find(s=>s.id==='sales-money-quarters')!.tables[0].rows.find(r=>r.label==='2T2026')!.values[0];
  expect(value).toBeCloseTo(87896922.77*incc.indices['2026-09']/incc.indices['2026-06']/1e6,8);
  expect(source.rows.find(r=>r.period==='2026-05-01')!.vgv_liquid_sales).toBeNull();
 });
 it('refaz apenas o mês afetado por padrão e usa a resposta corrigida sem alterar a fonte original',async()=>{
  const {sources,report,calls,progress}=await scenario({retryValid:true}),sales=sources.find(s=>s.metric==='sales')!;
  expect(calls).toHaveLength(6);expect(sources).toHaveLength(5);
  expect(sales.rows.find(r=>r.period==='2026-05-01'&&r.group==='Standard')!.vgv_liquid_sales).toBeNull();
  expect(recoveredPatternSource(sales).rows.find(r=>r.period==='2026-05-01'&&r.group==='Standard')!.vgv_liquid_sales).toBe(100);
  expect(report.slides.find(s=>s.id==='sales-money-quarters')!.tables[0].rows.find(r=>r.label==='2T2026')!.values[0]).toBeTypeOf('number');
  expect(diagnostic(report).sources.find(s=>s.metric==='sales')!.monetaryRecovery[0].strategy).toBe('pattern-refetch');
  expect(progress.at(-1)).toMatchObject({completed:6,total:6});
 });
 it('recupera trimestre e acumulado por tipologia conciliada sem distribuir dinheiro entre padrões',async()=>{
  const {sources,report,calls}=await scenario(),audit=diagnostic(report),sales=audit.sources.find(s=>s.metric==='sales')!;
  expect(calls).toHaveLength(7);expect(sources).toHaveLength(5);
  expect(sales.monetaryRecovery[0]).toMatchObject({resolved:true,strategy:'reconciled-typology-total',scope:'total-only',units:1,nominalTotal:500000});
  const slide=report.slides.find(s=>s.id==='sales-money-quarters')!;
  expect(slide.tables[0].rows.find(r=>r.label==='2T2026')!.values[0]).toBeTypeOf('number');
  expect(slide.tables[1].rows.find(r=>r.label==='Jan–Set/2026')!.values[0]).toBeTypeOf('number');
  const composition=report.slides.find(s=>s.id==='sales-money-standards')!.tables[1];
  expect(composition.rows.find(r=>r.label==='2T2026')!.values[composition.columns.indexOf('Médio Padrão')]).toBeNull();
  expect(conferenceCsv(report)).toContain('recuperacao-monetaria');
 });
 it.each([{alternateUnits:2},{alternateMoney:null},{alternateFailure:true}])('recusa recuperação sem prova completa: %j',async options=>{
  const {report}=await scenario(options);
  expect(report.slides.find(s=>s.id==='sales-money-quarters')!.tables[0].rows.find(r=>r.label==='2T2026')!.values[0]).toBeNull();
  expect(diagnostic(report).sources.find(s=>s.metric==='sales')!.monetaryRecovery[0].resolved).toBe(false);
 });
 it('cancela também durante a recuperação',async()=>{
  await expect(scenario({abortRecovery:true})).rejects.toMatchObject({name:'AbortError'});
 });
 it.each([0,-100])('aceita total monetário observado %s sem inferir a partir das unidades',async alternateMoney=>{
  const {report}=await scenario({alternateMoney});
  expect(diagnostic(report).sources.find(s=>s.metric==='sales')!.monetaryRecovery[0]).toMatchObject({resolved:true,nominalTotal:alternateMoney});
  expect(report.slides.find(s=>s.id==='sales-money-quarters')!.tables[0].rows.find(r=>r.label==='2T2026')!.values[0]).toBeTypeOf('number');
 });
 it('não agenda consultas adicionais quando o VGV original é válido',async()=>{
  const sources=fixture(selection,catalog),request=vi.fn<Request>(async o=>envelope(sources.find(s=>s.metric===(o.url.endsWith('building-with-history-internal')?'details':o.url.split('/').at(-1))&&s.group===(o.query?.group_by??'Empreendimento'))!.rows));
  const result=await collect(selection,catalog,{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},request,wait:async()=>{}});
  expect(request).toHaveBeenCalledTimes(5);expect(result.every(s=>!s.monetaryRecovery)).toBe(true);
 });
 it('rejeita refetch que altera unidades ou dinheiro conhecido e alternativa fora do escopo',()=>{
  const source=fixture(selection,catalog).find(s=>s.metric==='sales')!,retry=structuredClone(source),month='2026-05';
  retry.rows.find(r=>r.period==='2026-05-01')!.liquid_sales=900;
  expect(patternRecovery(source,{month,retry})).toBeNull();
  retry.rows=structuredClone(source.rows);retry.rows.find(r=>r.period==='2026-05-01')!.vgv_liquid_sales=900;
  expect(patternRecovery(source,{month,retry})).toBeNull();
  expect(typologyRecovery(source,{month,retry,alternate:{...retry,uf:'SP',group:'Tipologia'}})).toBeNull();
 });
});
