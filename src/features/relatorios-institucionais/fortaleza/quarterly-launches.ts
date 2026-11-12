import type { FortalezaSelection } from './model';
import { FORTALEZA_CITIES,fortalezaPeriod } from './model';
import type { IntroData } from './intro-data';
import { monthlyProjectLaunches,monthlyUnitLaunches } from './monthly-launches';
import { buildMonthlySlide,blockedMonthlySlide,monthlyMarketMonths,monthlyMarketSourceIssue,monthlyProduct,readMonthlyNumber,type MonthlyBin,type MonthlyMarketData,type MonthlySlideData } from './monthly-market';
import { normalizeMarketText,marketMonth } from './market';

const mappedPages:Record<number,number>={12:12,14:14,17:16,18:17,21:19,22:20,24:22,25:23,26:24,27:25,28:26,29:27,30:28,34:30,35:31,37:33,38:34,39:35};
export interface QuarterlyMunicipalTable {status:'ready'|'blocked';issue:string|null;warnings:string[];unit:'unidades'|'milhões';month:string;rows:{label:string;values:number[];total:number}[]}
export function quarterlyBins(rows:MonthlyBin[]):MonthlyBin[]{
  const result:MonthlyBin[]=[];
  for(let index=0;index<rows.length;index+=3){
    const window=rows.slice(index,index+3),last=window.at(-1)!;
    result.push({month:last.month,label:`${Math.ceil(Number(last.month.slice(5))/3)}T/${last.month.slice(0,4)}`,first:window.reduce((sum,row)=>sum+row.first,0),second:window.reduce((sum,row)=>sum+row.second,0),total:window.reduce((sum,row)=>sum+row.total,0)});
  }
  return result;
}
const difference=(now:number,before:number)=>before<=0?null:(now-before)/before*100;
/** Same monthly source contracts; flows are summed only after monthly validation and INCC correction. */
export function buildQuarterlyLaunchSlide(page:number,data:MonthlyMarketData|null,intro:IntroData|null,selection:FortalezaSelection,cities:string[]):MonthlySlideData{
  if(selection.periodicity!=='quarterly')return blockedMonthlySlide('Selecione um trimestre.');
  let source:MonthlySlideData;
  if([11,13,15].includes(page)){
    const projects=page===11?monthlyProjectLaunches(intro,selection,cities):monthlyUnitLaunches(data?{sources:data.sources.filter(item=>item.segment==='Vertical'&&item.metric==='releases').map(item=>({...item})),issues:data.issues}:null,selection,cities,page===13?'capital':'rm');
    source={...blockedMonthlySlide(projects.issue??''),status:projects.status,issue:projects.issue,labels:['Padrão Econômico','Demais Padrões'],history:projects.history.map(row=>({...row,first:row.economic,second:row.other})),accumulated:projects.accumulated.map(row=>({...row,first:row.economic,second:row.other}))};
  }else{
    const mapped=mappedPages[page];if(!mapped)return blockedMonthlySlide('Lâmina trimestral sem contrato de cálculo.');
    // 13/15 are vertical units by standard, not VGV or sales.
    source=buildMonthlySlide(mapped,data,selection,cities);
  }
  if(source.status!=='ready')return source;
  if(source.rolling)return source; // The original 26/28 show 13 monthly rolling-12-month windows.
  const history=source.stockChanges?source.history.filter((_,index)=>index%3===2).map(row=>({...row,label:`${Math.ceil(Number(row.month.slice(5))/3)}T/${row.month.slice(0,4)}`})):quarterlyBins(source.history);
  if(source.stockChanges)return {...source,history,stockChanges:{twoYears:difference(history.at(-1)!.total,history[0].total),year:difference(history.at(-1)!.total,history.at(-2)!.total)}};
  return {...source,history,changes:{total:difference(history.at(-1)!.total,history.at(-5)!.total),first:difference(source.accumulated[1].first,source.accumulated[0].first),second:difference(source.accumulated[1].second,source.accumulated[0].second)}};
}

/** These two original tables are explicitly closing-month snapshots of launches. */
export function buildQuarterlyMunicipalTable(page:number,data:MonthlyMarketData|null,selection:FortalezaSelection,cities:string[]):QuarterlyMunicipalTable{
  const month=fortalezaPeriod(selection).end.slice(0,7),money=page===19||page===32,sales=page===31||page===32;
  const block=(issue:string):QuarterlyMunicipalTable=>({status:'blocked',issue,warnings:[],unit:money?'milhões':'unidades',month,rows:[]});
  if(selection.periodicity!=='quarterly'||![16,19,31,32].includes(page))return block('Tabela sem contrato trimestral.');
  if(FORTALEZA_CITIES.some(city=>!cities.some(value=>normalizeMarketText(value)===normalizeMarketText(city))))return block('A tabela exige os cinco municípios autorizados.');
  const cells=Array.from({length:4},()=>Array<number>(5).fill(0));
  for(const [index,city] of FORTALEZA_CITIES.entries())for(const segment of ['Vertical','Horizontal','Comercial'] as const){
    const sources=data?.sources.filter(source=>normalizeMarketText(source.city)===normalizeMarketText(city)&&source.segment===segment&&source.metric===(sales?'sales':'releases'))??[];
    if(sources.length!==1)return block(`${city}/${segment}: fonte de lançamentos não concluída.`);
    const issue=monthlyMarketSourceIssue(sources[0],monthlyMarketMonths(selection));if(issue)return block(`${city}/${segment}: ${issue}`);

    for(const row of sources[0].rows){
      if(marketMonth(row.period)!==month)continue;
      const product=monthlyProduct(segment,row.group);if(product==='excluded'||product==='lots')continue;
      const value=readMonthlyNumber(row[money?(sales?'vgv_liquid_sales':'vgv_release'):sales?'liquid_sales':'releases_in_period'],sales,!money);if(value===null)return block(`${city}: valor ausente no mês de fechamento.`);
      const group=segment==='Vertical'?(normalizeMarketText(row.group)==='economico'?0:1):segment==='Horizontal'?2:3;
      cells[group][index]+=value/(money?1_000_000:1);
    }
  }
  const row=(label:string,values:number[])=>({label,values,total:values.reduce((sum,value)=>sum+value,0)});
  const rows=[row('Econômico',cells[0]),row('Demais Padrões',cells[1]),row('Subtotal Res. Vertical',cells[0].map((value,i)=>value+cells[1][i])),row('Horizontal',cells[2]),row('Comercial',cells[3]),row('Total',cells[0].map((_,i)=>cells.reduce((sum,values)=>sum+values[i],0)))];
  if(rows.some(row=>!Number.isFinite(row.total)||row.total>Number.MAX_SAFE_INTEGER/100))return block('O total excede a precisão numérica segura.');
  return {status:'ready',issue:null,warnings:[],unit:money?'milhões':'unidades',month,rows};
}

/** Provider standards stay named as delivered; no invented equivalence to editorial price bands. */
export function buildQuarterlyStockTable(data:MonthlyMarketData|null,selection:FortalezaSelection,cities:string[]):QuarterlyMunicipalTable{
  const month=fortalezaPeriod(selection).end.slice(0,7),output:QuarterlyMunicipalTable={status:'blocked',issue:null,warnings:['Padrões conforme classificação da API; faixas editoriais de valor não são inferidas.'],unit:'unidades',month,rows:[]};
  const fail=(issue:string)=>({...output,issue});
  if(FORTALEZA_CITIES.some(city=>!cities.some(value=>normalizeMarketText(value)===normalizeMarketText(city))))return fail('A tabela exige os cinco municípios autorizados.');
  const rows=new Map<string,number[]>();
  for(const segment of ['Vertical','Horizontal','Comercial'] as const){
    const subtotal=Array<number>(5).fill(0);
    for(const [index,city] of FORTALEZA_CITIES.entries()){
      const sources=data?.sources.filter(source=>normalizeMarketText(source.city)===normalizeMarketText(city)&&source.segment===segment&&source.metric==='stock')??[];
      if(sources.length!==1)return fail(`${city}/${segment}: fonte de estoque não concluída.`);
      const issue=monthlyMarketSourceIssue(sources[0],monthlyMarketMonths(selection));if(issue)return fail(`${city}/${segment}: ${issue}`);
      for(const raw of sources[0].rows){
        if(marketMonth(raw.period)!==month||monthlyProduct(segment,raw.group)==='excluded')continue;
        const label=segment==='Comercial'?'Comercial':`${segment} · ${String(raw.group)}`,values=rows.get(label)??Array<number>(5).fill(0),value=readMonthlyNumber(raw.stock,false,true);
        if(value===null)return fail('Estoque ausente ou inválido.');values[index]+=value;subtotal[index]+=value;rows.set(label,values);
      }
    }
    if(segment!=='Comercial')rows.set(`Subtotal ${segment}`,subtotal);
  }
  const total=Array<number>(5).fill(0);
  for(const [label,values] of rows)if(!label.startsWith('Subtotal'))values.forEach((value,index)=>total[index]+=value);
  rows.set('Total',total);
  if(rows.size>24||total.some(value=>!Number.isSafeInteger(value)))return fail('Quantidade de linhas ou total excede o limite desta lâmina.');
  return {...output,status:'ready',issue:null,rows:[...rows].map(([label,values])=>({label,values,total:values.reduce((sum,value)=>sum+value,0)}))};
}
