import { checkMaceioNext, scopeMaceioRow, MaceioSourceError, sourceFailure } from './source-contract';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import { httpRequest } from '@/lib/http-client';
import { marketMonth, normalizeMarketText, type MarketRow } from './market';
import { maceioPeriod, maceioScope, type MaceioSelection } from './model';
import type { MaceioEnvelope, MaceioRequest } from './api';
import type { MaceioMarketSlidesData } from './market-slides-data';
import {cagedIssue,type CagedSource} from './caged';

export interface LaunchCitySource { city:string; units:MarketRow[]; buildings:MarketRow[]; unitsComplete:boolean; buildingsComplete:boolean; issues:string[]; failures?:{source:string;code:string;httpStatus:number|null}[] }
export interface MaceioIntroData { cities:LaunchCitySource[]; collectedAt:string; slides?:MaceioMarketSlidesData; caged?:CagedSource }
export interface MaceioSeries { labels:string[]; capital:number[]; rm:number[]; issue:string|null; note:string }
export function maceioSlideIssue(page:number,selection:MaceioSelection,data:MaceioIntroData|null){
  if(page>=9&&page<=14)return cagedIssue(selection,data?.caged);
  if(page===17)return buildMaceioPattern(selection,data).issue;
  if(page>=16&&page<=20)return buildMaceioLaunchSeries(page,selection,data).issue;
  return null;
}
export function shiftMonth(month:string, delta:number) {
  const [year,position]=month.split('-').map(Number);
  return new Date(Date.UTC(year,position-1+delta,1)).toISOString().slice(0,7);
}
export const launchMonths=(selection:MaceioSelection,count:number)=>{
  const end=maceioPeriod(selection).end.slice(0,7);
  return Array.from({length:count},(_,i)=>shiftMonth(end,i-count+1));
};

/** Independent of the short-window stock balance: these sources serve slides16–20. */
export async function collectMaceioIntro(selection:MaceioSelection,authorized:string[],options:{token:string;signal?:AbortSignal;request?:MaceioRequest;onProgress?:(message:string)=>void}):Promise<MaceioIntroData> {
  const scope=maceioScope(selection,authorized);
  if(!options.token||!scope.valid)throw new Error('Confirme a autenticação e o recorte completo.');
  const check=()=>{if(options.signal?.aborted)throw new DOMException('Consulta cancelada.','AbortError');};
  const end=maceioPeriod(selection).end,months=launchMonths(selection,Math.max(61,60+Number(end.slice(5,7)))),cities:LaunchCitySource[]=[];
  const request:MaceioRequest=options.request??(args=>httpRequest<MaceioEnvelope>(args));
  for(const city of scope.cities){
    const source:LaunchCitySource={city,units:[],buildings:[],unitsComplete:false,buildingsComplete:false,issues:[]};
    for(const kind of ['units','buildings'] as const){
      try{
        let expectedTotal:number|undefined,expectedLast:number|undefined;
        const rows:MarketRow[]=[];
        for(let page=1;page<=100;page++){
          check();options.onProgress?.(`${city} · ${kind==='units'?'histórico de unidades lançadas':'cadastro de lançamentos'} · página ${page}`);
          const url=`https://geobrain.com.br/public-api/${kind==='units'?'temporal-analysis-city/releases':'building'}`;
          const query={city,uf:'AL',...(kind==='units'?{'type[]':['Vertical'],group_by:'Padrão',start_period:`${months[0]}-01`,end_period:end}:{type:'Vertical'}),per_page:100,page};
          const result=await requestWithRetry(()=>request({url,query,headers:{Authorization:`Bearer ${options.token}`},includeAuth:false,signal:options.signal,timeoutMs:60000,cache:'no-store'}),{signal:options.signal,attempts:2});
          check();
          if(!result.ok)throw new MaceioSourceError(result.status===null?'NETWORK':'HTTP',result.status);
          const data=result.data,meta=data?.meta;
          if(!Array.isArray(data?.data)||!meta||meta.current_page!==page||!Number.isSafeInteger(meta.total)||meta.total!<0||!Number.isSafeInteger(meta.last_page)||meta.last_page!<page||meta.last_page!>100||data.data.length>100)throw new Error('Paginação incompleta');
          expectedTotal??=meta.total;expectedLast??=meta.last_page;
          if(expectedTotal!==meta.total||expectedLast!==meta.last_page)throw new Error('Fonte mudou durante a consulta');
          checkMaceioNext(data.links?.next,url,query,page,expectedLast,true);
          const scoped=data.data.map(row=>scopeMaceioRow(row,city,'Vertical',kind==='units'));
          for(const row of scoped){if(kind==='units'){const month=marketMonth(row.period);if(!month||month<months[0]||month>end.slice(0,7))throw new MaceioSourceError('PERIOD');}}
          rows.push(...scoped);
          if(page===expectedLast){if(rows.length!==expectedTotal)throw new Error('Fonte parcial');break;}
          if(!data.data.length)throw new Error('Página vazia');
        }
        source[kind]=rows;source[kind==='units'?'unitsComplete':'buildingsComplete']=true;
      }catch(error){check();(source.failures??=[]).push({source:kind,...sourceFailure(error)});source.issues.push(`${city}: ${kind==='units'?'histórico de unidades':'cadastro de empreendimentos'} não concluído. Tente novamente.`);}
    }
    cities.push(source);
  }
  return {cities,collectedAt:new Date().toISOString()};
}

export function buildMaceioLaunchSeries(page:number,selection:MaceioSelection,data:MaceioIntroData|null):MaceioSeries {
  const buildings=page===16||page===18,rolling=page===18||page===20;
  const note=buildings?'Empreendimentos distintos pelo ID e mês de lançamento do cadastro atual; revisões cadastrais podem alterar o histórico.':'Unidades lançadas por competência e padrão da fonte municipal vertical; ausência de mês não representa zero.';
  const empty=(issue:string):MaceioSeries=>({labels:[],capital:[],rm:[],issue,note});
  if(!data)return empty('Gere o relatório para consultar as fontes de lançamentos.');
  const scope=maceioScope(selection,data.cities.map(item=>item.city));
  if(!scope.valid||data.cities.length!==scope.cities.length)return empty('O conjunto municipal de lançamentos está incompleto.');
  const months=launchMonths(selection,61),totals=new Map<string,{capital:number;rm:number}>(months.map(month=>[month,{capital:0,rm:0}]));
  for(const source of data.cities){
    if(!(buildings?source.buildingsComplete:source.unitsComplete))return empty(source.issues.join(' ')||'Fonte de lançamentos incompleta.');
    const seen=new Set<string>(),observed=new Set<string>();
    for(const row of buildings?source.buildings:source.units){
      const month=marketMonth(buildings?row.release_date:row.period);
      if(!month)return empty('Há lançamentos sem competência válida na fonte.');
      if(!totals.has(month))continue;
      const group=String(row.group??'').trim();
      const id=buildings?String(row.building_id??row.id??''):`${month}/${normalizeMarketText(group)}`;
      const value=buildings?1:Number(row.releases_in_period);
      if(!id||(!buildings&&(!group||/^(total|subtotal)(\b|$)/i.test(group)||!['number','string'].includes(typeof row.releases_in_period)||!/^\d+$/.test(String(row.releases_in_period))||!Number.isSafeInteger(value)||value<0))||seen.has(id))return empty('Fonte com identificadores duplicados ou quantidades inválidas.');
      seen.add(id);observed.add(month);
      const bucket=totals.get(month)!;bucket[normalizeMarketText(source.city)==='maceio'?'capital':'rm']+=value;
      if(!Number.isSafeInteger(bucket.capital)||!Number.isSafeInteger(bucket.rm))return empty('Quantidade fora do limite seguro.');
    }
    if(!buildings&&months.some(month=>!observed.has(month)))return empty(`${source.city}: faltam competências no histórico de unidades lançadas.`);
  }
  const keys=rolling?months.slice(-39):selection.periodicity==='monthly'?months.slice(-25):months.slice(-51).filter((_,index)=>index%3===2);
  const values=keys.map(month=>{
    const size=rolling?12:selection.periodicity==='monthly'?1:3;
    const chunk=Array.from({length:size},(_,i)=>totals.get(shiftMonth(month,i-size+1))!);
    return {capital:chunk.reduce((sum,next)=>sum+next.capital,0),rm:chunk.reduce((sum,next)=>sum+next.rm,0)};
  });
  const labels=keys.map(month=>!rolling&&selection.periodicity==='quarterly'?`${Math.ceil(Number(month.slice(5))/3)}T/${month.slice(2,4)}`:`${new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`)).replace('.','')}/${month.slice(2,4)}`);
  return {labels,capital:values.map(value=>value.capital),rm:values.map(value=>value.rm),issue:null,note:rolling?`${note} Soma de 12 competências; 39 fechamentos mensais completos.`:note};
}

export function buildMaceioPattern(selection:MaceioSelection,data:MaceioIntroData|null){
  const years=Array.from({length:6},(_,i)=>selection.year-5+i),names=['Luxo','Médio Padrão','MCMV','Compactos'];
  const values=years.map(()=>names.map(()=>0));
  if(!data||!maceioScope(selection,data.cities.map(item=>item.city)).valid||data.cities.some(item=>!item.buildingsComplete))return {years,names,values,issue:'Cadastro completo de empreendimentos ainda não disponível.'};
  const end=maceioPeriod(selection).end.slice(0,7);
  for(const source of data.cities){
    const seen=new Set<string>();
    for(const row of source.buildings){
      const month=marketMonth(row.release_date),id=String(row.building_id??row.id??'');
      if(!month||!id||seen.has(id))return {years,names,values,issue:'Cadastro sem identificação ou data de lançamento confiável.'};
      seen.add(id);const year=years.indexOf(Number(month.slice(0,4)));if(year<0||month>end)continue;
      const pattern=names.findIndex(name=>normalizeMarketText(name)===normalizeMarketText(row.standard));
      if(pattern<0)return {years,names,values,issue:'A correspondência entre os padrões da API e Luxo, Médio Padrão, MCMV e Compactos precisa de confirmação.'};
      values[year][pattern]++;
    }
  }
  return {years,names,values,issue:null};
}
