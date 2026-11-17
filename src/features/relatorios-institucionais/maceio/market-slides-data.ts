import { httpRequest } from '@/lib/http-client';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import { marketMonth, normalizeMarketText, type MarketRow } from './market';
import { maceioPeriod, maceioScope, type MaceioSelection } from './model';
import { shiftMonth, type MaceioIntroData, type MaceioSeries } from './intro-data';
import type { MaceioEnvelope, MaceioRequest } from './api';
import incc from '../fortaleza/incc-di.json';

export type MonetaryPolicy='unconfirmed'|'INCC-DI';
export type SlideMetric='releases'|'sales'|'stock'|'details';
export type SlideGroup='Padrão'|'Tipologia'|'Empreendimento';
export interface SlideSource {city:string;metric:SlideMetric;group:SlideGroup;rows:MarketRow[];complete:boolean;issue:string|null;requests:number}
export interface MaceioMarketSlidesData {start:string;end:string;sources:SlideSource[];finishedAt:string}
export interface MaceioChartData {kind:'line'|'area'|'comparison'|'ranking';series:MaceioSeries;groups:string[];values:number[][];years:string[];ranking:{label:string;value:number}[];cities:{label:string;value:number}[];issue:string|null;note:string;money:boolean}
const patterns=['Luxo','Médio Padrão','MCMV','Compactos'];
export const maceioSourceMonths=(selection:MaceioSelection)=>{
 const end=maceioPeriod(selection).end.slice(0,7),count=60+Number(end.slice(5));
 return Array.from({length:count},(_,i)=>shiftMonth(end,i-count+1));
};

export async function collectMaceioMarketSlides(selection:MaceioSelection,authorized:string[],intro:MaceioIntroData,options:{token:string;signal?:AbortSignal;request?:MaceioRequest;onProgress?:(text:string)=>void}):Promise<MaceioMarketSlidesData>{
 const scope=maceioScope(selection,authorized),months=maceioSourceMonths(selection),period=maceioPeriod(selection);
 if(!options.token||!scope.valid)throw new Error('Confirme autenticação e municípios do estudo.');
 const check=()=>{if(options.signal?.aborted)throw new DOMException('Consulta cancelada.','AbortError');};
 const request:MaceioRequest=options.request??(args=>httpRequest<MaceioEnvelope>(args));
 const tasks=scope.cities.flatMap(city=>([
  {city,metric:'releases',group:'Padrão'},{city,metric:'sales',group:'Padrão'},{city,metric:'stock',group:'Padrão'},
  {city,metric:'releases',group:'Tipologia'},{city,metric:'sales',group:'Tipologia'},{city,metric:'stock',group:'Tipologia'},{city,metric:'details',group:'Empreendimento'}
 ] as const));
 const sources:SlideSource[]=new Array(tasks.length);let next=0;
 async function worker(){
  while(next<tasks.length){check();const index=next++,task=tasks[index];
   const source:SlideSource={...task,rows:[],complete:false,issue:null,requests:0};
   const reused=intro.cities.find(item=>normalizeMarketText(item.city)===normalizeMarketText(task.city));
   if(task.metric==='releases'&&task.group==='Padrão'&&reused?.unitsComplete&&new Set(reused.units.map(row=>marketMonth(row.period))).has(months[0])){sources[index]={...source,rows:reused.units,complete:true};continue;}
   try{
    let expectedTotal:number|undefined,expectedLast:number|undefined;
    for(let page=1;page<=100;page++){
     check();options.onProgress?.(`${sources.filter(Boolean).length} de ${tasks.length} fontes · ${task.city} · ${task.metric} · ${task.group} · página ${page}`);
     const url=`https://geobrain.com.br/public-api/${task.metric==='details'?'building-with-history-internal':`temporal-analysis-city/${task.metric}`}`;
     const query={city:task.city,uf:'AL',...(task.metric==='details'?{type:'Vertical'}:{'type[]':['Vertical'],group_by:task.group}),start_period:`${months[0]}-01`,end_period:period.end,page,per_page:100};
     const response=await requestWithRetry(()=>{source.requests++;return request({url,query,headers:{Authorization:`Bearer ${options.token}`},includeAuth:false,signal:options.signal,timeoutMs:20000,cache:'no-store'});},{signal:options.signal,attempts:2});check();
     const data=response.data,meta=data?.meta;
     if(!response.ok||!Array.isArray(data?.data)||!meta||meta.current_page!==page||!Number.isSafeInteger(meta.total)||meta.total!<0||!Number.isSafeInteger(meta.last_page)||meta.last_page!<page||meta.last_page!>100||data.data.length>100)throw new Error();
     expectedTotal??=meta.total;expectedLast??=meta.last_page;
     if(meta.total!==expectedTotal||meta.last_page!==expectedLast||(!data.data.length&&meta.total!>0))throw new Error();
     const link=data.links?.next;if(link){const urlNext=new URL(link,url);if(urlNext.origin!==new URL(url).origin||urlNext.pathname!==new URL(url).pathname||urlNext.searchParams.get('city')!==task.city||Number(urlNext.searchParams.get('page'))!==page+1)throw new Error();}
     for(const row of data.data){if(normalizeMarketText(row.city)!==normalizeMarketText(task.city)||row.state!=='AL'||normalizeMarketText(row.building_type)!=='vertical')throw new Error();if(task.metric!=='details'){const month=marketMonth(row.period);if(!month||month<months[0]||month>period.end.slice(0,7))throw new Error();}}
     source.rows.push(...data.data);
     if(page===expectedLast){if(source.rows.length!==expectedTotal||link)throw new Error();source.complete=true;break;}
    }
    if(!source.complete)throw new Error();
   }catch{check();source.complete=false;source.rows=[];source.issue=`${task.city}: fonte ${task.metric}/${task.group} não concluída. Tente novamente.`;}
   sources[index]=source;
  }
 }
 const outcomes=await Promise.allSettled([worker(),worker()]);check();const failure=outcomes.find(result=>result.status==='rejected');if(failure?.status==='rejected')throw failure.reason;
 return {start:months[0],end:period.end.slice(0,7),sources,finishedAt:new Date().toISOString()};
}

export function readNumber(value:unknown,negative:boolean,money=false):number|null{
 if(!['number','string'].includes(typeof value)||!String(value).trim()||!/^[-+]?\d+(?:\.\d+)?$/.test(String(value)))return null;
 const number=Number(value);return Number.isFinite(number)&&Math.abs(number)<Number.MAX_SAFE_INTEGER/100&&(negative||number>=0)&&(money||Number.isSafeInteger(number))?number:null;
}
const fields={releases:'releases_in_period',sales:'liquid_sales',stock:'stock'} as const;
const moneyFields={releases:'vgv_release',sales:'vgv_liquid_sales',stock:'vgv_stock'} as const;
interface Cell {city:string;month:string;group:string;value:number}
export function readCells(selection:MaceioSelection,data:MaceioMarketSlidesData,metric:Exclude<SlideMetric,'details'>,group:SlideGroup,money:boolean,policy:MonetaryPolicy){
 const scope=maceioScope(selection,[...new Set(data.sources.map(source=>source.city))]),months=maceioSourceMonths(selection),cells:Cell[]=[];
 if(!scope.valid||data.start!==months[0]||data.end!==months.at(-1))return {cells,issue:'O histórico não corresponde ao recorte/período selecionado.'};
 if(money&&policy!=='INCC-DI')return {cells,issue:'A série do INCC de Maceió ainda precisa ser definida pelo analista. Escolha o índice somente após confirmar o critério.'};
 const indices:Record<string,number>=incc.indices,base=indices[months.at(-1)!];
 if(money&&(!base||base<=0))return {cells,issue:'Falta INCC-DI para o fechamento selecionado; nenhuma base anterior é aplicada silenciosamente.'};
 for(const city of scope.cities){
  const source=data.sources.find(item=>item.city===city&&item.metric===metric&&item.group===group);
  if(!source?.complete)return {cells:[],issue:source?.issue??`${city}: fonte ${metric}/${group} ausente.`};
  const seen=new Set<string>(),observed=new Set<string>();
  for(const row of source.rows){const month=marketMonth(row.period),label=typeof row.group==='string'?row.group.trim():'';
   if(!month||!months.includes(month)||!label||/^(total|subtotal)(\b|$)/i.test(label))return {cells:[],issue:`${city}: competência ou grupo inválido no histórico.`};
   const key=`${month}/${normalizeMarketText(label)}`,raw=readNumber(row[money?moneyFields[metric]:fields[metric]],metric==='sales',money);
   if(seen.has(key)||raw===null)return {cells:[],issue:`${city}: duplicação ou quantidade inválida na fonte.`};seen.add(key);observed.add(month);
   if(money&&(!indices[month]||indices[month]<=0))return {cells:[],issue:`Falta INCC-DI para ${month}.`};
   const value=money?raw*base/indices[month]/1e6:raw;
   cells.push({city,month,group:label,value});
  }
  if(months.some(month=>!observed.has(month)))return {cells:[],issue:`${city}: faltam competências no histórico ${metric}/${group}.`};
 }
 return {cells,issue:null};
}
class QuantityRangeError extends Error {}
function checkTotals(values:number[][]){if(values.some(row=>row.some(value=>!Number.isFinite(value)||Math.abs(value)>=Number.MAX_SAFE_INTEGER/100)))throw new QuantityRangeError();}
function sum(items:Cell[]){const value=items.reduce((total,item)=>total+item.value,0);if(!Number.isFinite(value)||Math.abs(value)>=Number.MAX_SAFE_INTEGER/100)throw new QuantityRangeError();return value;}
function calculateMaceioMarketSlide(page:number,selection:MaceioSelection,data:MaceioMarketSlidesData|null,policy:MonetaryPolicy):MaceioChartData{
 const money=[26,27,28,37,38].includes(page),metric=page===40?'stock':page>=30?'sales':'releases';
 const rolling=[27,31,38].includes(page),area=[21,28,32].includes(page),comparison=[23,24,34,35].includes(page),ranking=[25,36].includes(page);
 const kind=area?'area':comparison?'comparison':ranking?'ranking':'line';
 const emptySeries:MaceioSeries={labels:[],capital:[],rm:[],issue:null,note:''};
 const note=money?'Valores em R$ milhões, corrigidos por INCC-DI ao mês do fechamento; série escolhida explicitamente para conferência metodológica.':metric==='stock'?'Oferta no último mês de cada período, sem soma de estoques.':'Fluxos municipais verticais por competência. Vendas líquidas negativas preservadas; ausência não equivale a zero.';
 const result:MaceioChartData={kind,series:emptySeries,groups:[],values:[],years:[],ranking:[],cities:[],issue:null,note,money};
 const block=(issue:string)=>({...result,issue});if(!data)return block('Gere o relatório para consultar as fontes deste bloco.');
 const read=readCells(selection,data,metric,'Padrão',money,policy);if(read.issue)return block(read.issue);
 let cells=read.cells;const months=maceioSourceMonths(selection),end=months.at(-1)!;
 if([22,33].includes(page)){
  if(cells.some(cell=>!patterns.some(name=>normalizeMarketText(name)===normalizeMarketText(cell.group))))return block('A classificação MCMV não foi confirmada nos padrões da fonte.');
  for(const city of maceioScope(selection,data.sources.map(source=>source.city)).cities)if(months.some(month=>!cells.some(cell=>cell.city===city&&cell.month===month&&normalizeMarketText(cell.group)==='mcmv')))return block(`${city}: a série MCMV exige observações explícitas por competência.`);
  cells=cells.filter(cell=>normalizeMarketText(cell.group)==='mcmv');
 }
 const periodMonths=(year:number)=>maceioPeriod({...selection,year}).months;
 if(area){
  result.groups=patterns;result.years=Array.from({length:6},(_,i)=>String(selection.year-5+i));result.values=result.years.map(()=>patterns.map(()=>0));
  for(const cell of cells){const index=patterns.findIndex(name=>normalizeMarketText(name)===normalizeMarketText(cell.group));if(index<0)return block('Padrão sem correspondência explícita com Luxo, Médio Padrão, MCMV e Compactos.');result.values[result.years.indexOf(cell.month.slice(0,4))][index]+=cell.value;}
  checkTotals(result.values);if(result.values.some(row=>row.some(value=>value<0)))return block('Há vendas líquidas negativas por padrão no acumulado anual. Os valores não foram convertidos em participações positivas.');
  return result;
 }
 if(comparison){
  const typology=page===23||page===34,groups=typology?['1 dorm','2 dorm','3 dorm','4 dorm']:['Compactos','MCMV','Médio Padrão','Luxo'];
  const input=typology?readCells(selection,data,metric,'Tipologia',false,policy):read;
  if(input.issue)return block(input.issue);result.groups=groups;result.years=[selection.year-1,selection.year].map(year=>selection.periodicity==='monthly'?`${end.slice(5)}/${year}`:`${selection.position}T/${year}`);
  result.values=[selection.year-1,selection.year].map(year=>groups.map(()=>0));
  for(const [index,year] of [selection.year-1,selection.year].entries()){
   const window=periodMonths(year),values=input.cells.filter(cell=>window.includes(cell.month));
   for(const cell of values){const raw=normalizeMarketText(cell.group),match=typology?/^([1-4])(?:\s+(?:dorm|dormitorio|dormitorios|quarto|quartos))?$/.exec(raw):null;
    const groupIndex=typology?match?Number(match[1])-1:-1:groups.findIndex(name=>normalizeMarketText(name)===raw);
    if(groupIndex<0)return block('Categoria da fonte sem correspondência comprovada com os grupos do original.');result.values[index][groupIndex]+=cell.value;
   }
   if(typology){for(const city of maceioScope(selection,data.sources.map(source=>source.city)).cities){const expected=sum(read.cells.filter(cell=>cell.city===city&&window.includes(cell.month))),actual=sum(values.filter(cell=>cell.city===city));if(expected!==actual)return block(`${city}: total por tipologia diverge do total municipal no período comparado.`);}}
  }
  checkTotals(result.values);if(result.values.some(row=>row.some(value=>value<0)))return block('Participações por categoria contêm vendas líquidas negativas; revise o recorte antes de interpretar os percentuais.');return result;
 }
 if(ranking)return buildRanking(result,selection,data,read.cells,metric,page===36);
 const keys=rolling?months.slice(-38):selection.periodicity==='monthly'?months.slice(-25):months.slice(-51).filter((_,i)=>i%3===2);
 result.series={labels:keys.map(month=>selection.periodicity==='quarterly'&&!rolling?`${Math.ceil(Number(month.slice(5))/3)}T/${month.slice(2,4)}`:`${new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`)).replace('.','')}/${month.slice(2,4)}`),capital:[],rm:[],issue:null,note};
 for(const month of keys){const count=metric==='stock'?1:rolling?12:selection.periodicity==='monthly'?1:3,window=Array.from({length:count},(_,i)=>shiftMonth(month,i-count+1));result.series.capital.push(sum(cells.filter(cell=>normalizeMarketText(cell.city)==='maceio'&&window.includes(cell.month))));result.series.rm.push(sum(cells.filter(cell=>normalizeMarketText(cell.city)!=='maceio'&&window.includes(cell.month))));}
 return result;
}

export function buildMaceioMarketSlide(page:number,selection:MaceioSelection,data:MaceioMarketSlidesData|null,policy:MonetaryPolicy='unconfirmed'):MaceioChartData{
 try{return calculateMaceioMarketSlide(page,selection,data,policy);}catch(error){if(!(error instanceof QuantityRangeError))throw error;return {...calculateMaceioMarketSlide(page,selection,null,policy),issue:'Os totais excedem a precisão numérica segura; o gráfico permanece em conferência.'};}
}

function buildRanking(result:MaceioChartData,selection:MaceioSelection,data:MaceioMarketSlidesData,cells:Cell[],metric:'releases'|'sales'|'stock',includeCities:boolean):MaceioChartData{
 const period=maceioPeriod(selection),map=new Map<string,number>(),scope=maceioScope(selection,data.sources.map(source=>source.city)),cityValues:typeof result.cities=[];
 for(const city of scope.cities){
  const expected=sum(cells.filter(cell=>cell.city===city&&period.months.includes(cell.month)));cityValues.push({label:city,value:expected});
  if(normalizeMarketText(city)!=='maceio')continue;
  const source=data.sources.find(source=>source.city===city&&source.metric==='details');if(!source?.complete)return {...result,issue:source?.issue??'Histórico por empreendimento indisponível para o ranking de bairros.'};
  let actual=0;const ids=new Set<string>();
  for(const building of source.rows){const id=String(building.building_id??building.id??''),neighborhood=typeof building.neighborhood==='string'?building.neighborhood.trim():'';
   if(!id||ids.has(id))return {...result,issue:'Empreendimento sem ID ou duplicado no ranking.'};ids.add(id);
   if(!Array.isArray(building.typologies_history))return {...result,issue:'Histórico de tipologias ausente no ranking.'};
   const seen=new Set<string>();
   for(const row of building.typologies_history as MarketRow[]){const month=marketMonth(row.period);if(!month)return {...result,issue:'Competência inválida no histórico de bairros.'};if(!period.months.includes(month))continue;
    const typology=String(row.typology_id??''),key=`${month}/${typology}`;if(!typology||seen.has(key))return {...result,issue:'Tipologia sem ID ou repetida no ranking.'};seen.add(key);
    const value=readNumber(row[metric==='releases'?'releases_in_period':'sold_in_period'],metric==='sales');if(value===null)return {...result,issue:'O histórico não forneceu fluxo explícito por tipologia para o ranking. Não usamos capacidade ou estoque como substituto.'};
    if(value!==0&&!neighborhood)return {...result,issue:'Há fluxo sem bairro identificado.'};actual+=value;map.set(neighborhood,(map.get(neighborhood)??0)+value);
   }
  }
  if(actual!==expected)return {...result,issue:'A soma dos bairros diverge do total municipal; o ranking permanece em conferência.'};
 }
 result.ranking=[...map].map(([label,value])=>({label,value})).filter(row=>row.value!==0).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'pt-BR'));
 result.cities=includeCities?cityValues.sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'pt-BR')):[];
 if(result.ranking.some(row=>row.value<0)||result.cities.some(row=>row.value<0))return {...result,issue:'Ranking com vendas líquidas negativas: valores preservados, sem conversão em participação positiva.'};
 return result;
}
