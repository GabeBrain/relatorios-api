import { describe,expect,it,vi } from 'vitest';
import type { RequestOptions } from '@/lib/http-client';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { spDefaultQuarter,spPeriodOptions,spQuarterInYear,spHistoryStartMonth,spHistoryWindows } from './periods';
import { buildSpTemporalPreview,monthEnd,priorMonth,quarterMonths,type SpTemporalRow } from './temporal';
import { SP_API_PATTERNS } from './segments';
import { shiftSpMonth } from './project-trends';
import { fetchSpLaunchSeriesRows,fetchSpSalesSeriesRows,fetchSpStockSeriesRows } from './api';
import { buildSpLaunchSeries,buildSpSalesSeries } from './launch-series';
import { buildSpStockSeries } from './stock-series';
import { SpReadError,spReadFailure } from './read-errors';
import { buildSpVglSeries } from './vgl-series';

function rows(start:string,end:string):SpTemporalRow[]{
  const values:SpTemporalRow[]=[];
  for(let month=start;month<=end;month=shiftSpMonth(month,1))for(const [i,group] of SP_API_PATTERNS.entries())values.push({period:`${month}-01`,group,building_type:'Vertical',releases_in_period:20+i,liquid_sales:10+i,stock:100+i,vgv_release:(20+i)*100000,vgv_liquid_sales:(10+i)*100000});
  return values;
}
function baseline(quarter:Quarter,through=quarterMonths(quarter)[2]){
  const start=quarterMonths(quarter)[0];
  return buildSpTemporalPreview({origin:'api',uf:'SP',city:'São Paulo',groupBy:'Padrão',rootPeriod:'2026-08-01',sampledBuildings:1,totalBuildings:5229,releases:rows(start,through),sales:rows(start,through),stock:rows(priorMonth(start),through),complete:{sales:true,releases:true,stock:true}},quarter);
}
function response(data:SpTemporalRow[],page=1,total=data.length,last=1){return {ok:true,status:200,data:{data,meta:{current_page:page,last_page:last,total},links:{next:page<last?'https://untrusted.invalid/no-filters':null}},text:null,contentType:'application/json',latencyMs:1,bytes:1,error:null,requestHeaders:{},requestQuery:{},requestBody:null,url:'',method:'GET'};}

describe('SP — ano, trimestre e janela histórica geral',()=>{
  it('passa de2026 para2027 sem manter período fixo ou oferecer trimestre futuro',()=>{
    const before=new Date('2026-12-31T12:00:00Z'),after=new Date('2027-01-02T12:00:00Z');
    expect(spPeriodOptions(before).years[0]).toBe('2026');
    expect(spPeriodOptions(after).years[0]).toBe('2027');
    expect(spDefaultQuarter(before)).toBe('3T2026');expect(spDefaultQuarter(after)).toBe('4T2026');
    expect(spQuarterInYear('4T2026','2027',after)).toBe('1T2027');
    expect(spQuarterInYear('2T2026','2025',before)).toBe('2T2025');
    expect(spPeriodOptions(after).quarters.filter(q=>q.endsWith('2027'))).toEqual(['1T2027']);
    expect(spPeriodOptions(new Date('2027-01-01T01:00:00Z')).years[0]).toBe('2026');
    expect(spPeriodOptions(new Date('2027-01-01T04:00:00Z')).years[0]).toBe('2027');
  });
  it.each(['1T2025','2T2026','3T2026','4T2025','1T2027','4T2027'] as Quarter[])('consulta e reconcilia as três séries para%s, com paginação pequena e sem teto fixo global',async quarter=>{
    const report=baseline(quarter),calls:RequestOptions[]=[];
    const request=vi.fn(async(options:RequestOptions)=>{
      calls.push(options);const start=String(options.query?.start_period).slice(0,7),end=String(options.query?.end_period).slice(0,7);
      expect(start.slice(0,4)).toBe(end.slice(0,4));
      const values=rows(start,end),page=Number(options.query?.page),size=10,last=Math.ceil(values.length/size);
      return response(values.slice((page-1)*size,page*size),page,values.length,last);
    });
    const launches=await fetchSpLaunchSeriesRows(report,{request}),sales=await fetchSpSalesSeriesRows(report,{request}),stock=await fetchSpStockSeriesRows(report,{request});
    expect(buildSpLaunchSeries(launches,report).status).toBe('ready');
    expect(buildSpSalesSeries(sales,report).status).toBe('ready');expect(buildSpStockSeries(stock,report).status).toBe('ready');
    expect(launches).toEqual(rows(spHistoryStartMonth(report),report.throughMonth!));
    if(quarter==='1T2025'){
      expect(spHistoryStartMonth(report)).toBe('2021-01');
      expect(spHistoryStartMonth(report,true)).toBe('2020-12');
      expect(buildSpVglSeries(launches,report).status).toBe('ready');
    }
    for(const call of calls){expect(call.query).toMatchObject({city:'São Paulo',uf:'SP','type[]':['Vertical'],group_by:'Padrão'});expect(String(call.query?.end_period)<=monthEnd(report.throughMonth!)).toBe(true);}
    const windows=spHistoryWindows(report);expect(windows[0].start).toBe(spHistoryStartMonth(report));
    expect(calls.length).toBeGreaterThan(6);
  });
  it.each(['2026-04','2026-05'])('respeita parcial do2T até%s e não consulta junho futuro',async through=>{
    const report=baseline('2T2026',through),calls:RequestOptions[]=[];
    const values=await fetchSpLaunchSeriesRows(report,{request:async options=>{calls.push(options);return response(rows(String(options.query?.start_period).slice(0,7),String(options.query?.end_period).slice(0,7)));}});
    expect(report.status).toBe('partial');expect(values[values.length-1].period).toBe(`${through}-01`);
    expect(calls.every(call=>String(call.query?.end_period)<=monthEnd(through))).toBe(true);
  });
  it('respeita Retry-After, identifica janela e mantém o erro seguro de autorização/limite',async()=>{
    const report=baseline('2T2026'),sleep=vi.fn(async(_ms:number,_signal?:AbortSignal)=>{});
    const request=vi.fn(async()=>({...response([]),ok:false,status:429,retryAfterMs:9000}));
    await expect(fetchSpSalesSeriesRows(report,{request,sleep})).rejects.toThrow(/2021-01 a 2021-12:.*HTTP 429/);
    expect(sleep.mock.calls[0][0]).toBe(9000);
    const auth=vi.fn(async()=>({...response([]),ok:false,status:403}));
    await expect(fetchSpStockSeriesRows(report,{request:auth,sleep})).rejects.toThrow('autenticação');expect(auth).toHaveBeenCalledOnce();
    expect(spReadFailure(new Error('private token body'),'Seguro')).toBe('Seguro');
    expect(spReadFailure(new SpReadError('HTTP 429'),'Seguro')).toBe('HTTP 429');
  });
});
