import type { SpObservation, SpPriceValue } from './granular-details';
import type { SpPreview } from './model';
import { SP_SEGMENT_RULE } from './segments';

export const SP_MARKET_SLIDES = [63,64,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80] as const;
export const SP_MARKET_STANDARDS = ['Compacto','Econômico','Standard','Médio','Médio-Alto','Alto','Luxo'] as const;
export const SP_STAGES = ['Planta','Construção','Pronto'] as const;
export const SP_STOCK_AREAS = ['Até 34m²','35–39m²','40–44m²','45–49m²','50–59m²','60–69m²','70–84m²','85–99m²','100–150m²','151–200m²','201–250m²','251m² ou mais'] as const;
export interface SpStockRow { label:string; units:number; share:number|null }
export interface SpMapProject { id:string; name:string; standard:string; latitude:number|null; longitude:number|null; stock:number; meter:number|null; vgv:number|null; ticket:number|null }
export interface SpStageGroup { label:string; values:Record<typeof SP_STAGES[number],number>; total:number }
export interface SpVgvRow { label:string; qty:number; sold:number; stock:number; ticket:number|null; offeredVgv:number|null; soldVgv:number|null; stockVgv:number|null }
export interface SpMarketDetails {
  status:'ready'|'blocked'; issues:string[]; total:number;
  prices:(SpPriceValue&{bedroom:number; mcmv:SpPriceValue; map:SpPriceValue})[];
  cohorts:SpStockRow[]; recentShare:number|null; standards:SpStockRow[]; bedrooms:SpStockRow[];
  matrix:{status:'ready'|'blocked';issues:string[];columns:string[];rows:{label:string;values:number[];total:number}[];totals:number[]}; smallAreaShare:number|null;
  stages:{launched:{ready:boolean;issues:string[];typologies:SpStageGroup[];segments:SpStageGroup[]}; final:{ready:boolean;issues:string[];typologies:SpStageGroup[];segments:SpStageGroup[]}};
  vgv:{ready:boolean;issues:string[];rows:SpVgvRow[];total:SpVgvRow|null}; projects:SpMapProject[]; priceBandShare:number|null;
}
const norm=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const number=(value:unknown)=>typeof value==='number'||typeof value==='string'&&value.trim()?Number(value):NaN;
const stage=(value:unknown):typeof SP_STAGES[number]|null=>{
  const raw=norm(value); if(['planta','na planta','em planta'].includes(raw))return 'Planta';
  if(['construcao','em construcao','em obras','obras'].includes(raw))return 'Construção';
  return ['pronto','pronta','concluido','concluida','entregue','finalizado'].includes(raw)?'Pronto':null;
};
const bedroom=(value:number|null)=>value===1?'1 dormitório':value===2?'2 dormitórios':value===3?'3 dormitórios':value!==null&&value>=4?'4 ou mais dormitórios':value===0?'Studio / 0 dormitórios':'Não informado';
function price(rows:SpObservation[]):SpPriceValue {
  const selected=rows.filter(row=>row.stock!>0),units=selected.reduce((s,r)=>s+r.stock!,0);
  const average=(field:'price'|'meter')=>{if(!Number.isSafeInteger(units)||units<=0||!selected.every(row=>row[field]!==null&&row[field]!>0))return null;const weighted=selected.reduce((s,r)=>s+r.stock!*r[field]!,0);return Number.isFinite(weighted)&&weighted<=Number.MAX_SAFE_INTEGER/100?weighted/units:null;};
  const ticket=average('price'),meter=average('meter'); return {units,ticket,meter,issues:ticket===null||meter===null?['Sem oferta ou medição completa para esta média.']:[]};
}
export function buildSpMarketDetails(rows:SpObservation[], buildings:Record<string,unknown>[],report:SpPreview,problem:string|null):SpMarketDetails {
  const total=report.metrics.stock??0, share=(value:number)=>total>0?value/total*100:null;
  const emptyStage={ready:false,issues:['Falta estágio ou quantidade na fotografia.'],typologies:[],segments:[]};
  const result:SpMarketDetails={status:problem?'blocked':'ready',issues:problem?[problem]:[],total,prices:[],cohorts:[],recentShare:null,standards:[],bedrooms:[],matrix:{status:'blocked',issues:['Há oferta sem área privativa válida.'],columns:[],rows:[],totals:[]},smallAreaShare:null,stages:{launched:{...emptyStage},final:{...emptyStage}},vgv:{ready:false,issues:['Falta capacidade, venda acumulada ou preço compatível na fotografia.'],rows:[],total:null},projects:[],priceBandShare:null};
  if(problem)return result;
  const available=rows.filter(row=>row.stock!>0), year=Number(report.throughMonth!.slice(0,4));
  result.prices=[1,2,3,4].map(value=>({bedroom:value,...price(rows.filter(row=>row.bedrooms===value)),mcmv:price(rows.filter(row=>row.bedrooms===value&&row.standard==='Econômico')),map:price(rows.filter(row=>row.bedrooms===value&&row.standard!=='Econômico'))}));
  if(available.some(row=>row.bedrooms===null))for(const item of result.prices){item.ticket=null;item.meter=null;item.mcmv.ticket=null;item.mcmv.meter=null;item.map.ticket=null;item.map.meter=null;}
  result.cohorts=[{label:`Até ${year-3}`,test:(r:SpObservation)=>Number(r.release.slice(0,4))<=year-3},...[year-2,year-1,year].map(y=>({label:String(y),test:(r:SpObservation)=>Number(r.release.slice(0,4))===y}))].map(item=>{const units=available.filter(item.test).reduce((s,r)=>s+r.stock!,0);return {label:item.label,units,share:share(units)};});
  result.recentShare=share(available.filter(row=>Number(row.release.slice(0,4))>=year-1).reduce((s,r)=>s+r.stock!,0));
  result.standards=SP_MARKET_STANDARDS.map(label=>{const units=available.filter(row=>row.standard===label).reduce((s,r)=>s+r.stock!,0);return {label,units,share:share(units)};});
  const labels=['1 dormitório','2 dormitórios','3 dormitórios','4 ou mais dormitórios',...(['Studio / 0 dormitórios','Não informado'].filter(label=>available.some(row=>bedroom(row.bedrooms)===label)))];
  result.bedrooms=labels.map(label=>{const units=available.filter(row=>bedroom(row.bedrooms)===label).reduce((s,r)=>s+r.stock!,0);return {label,units,share:share(units)};});
  if(available.every(row=>row.area!==null&&row.area>0)){
    const limits=[35,40,45,50,60,70,85,100,151,201,251,Infinity];
    const matrix=SP_STOCK_AREAS.map((label,i)=>{const values=labels.map(bed=>available.filter(row=>bedroom(row.bedrooms)===bed&&row.area!>= (i===0?0:limits[i-1])&&row.area!<limits[i]).reduce((s,r)=>s+r.stock!,0));return {label,values,total:values.reduce((a,b)=>a+b,0)};});
    const totals=labels.map((_,i)=>matrix.reduce((s,r)=>s+r.values[i],0));
    if(totals.reduce((a,b)=>a+b,0)===total){result.matrix={status:'ready',issues:[],columns:labels,rows:matrix,totals};result.smallAreaShare=share(matrix[0].total+matrix[1].total);}
  }
  for(const key of ['launched','final'] as const){
    const field=key==='launched'?'qty':'stock';
    if(rows.some(row=>row[field]===null||row[field]!<0||row[field]!>0&&!stage(row.stage)))continue;
    const selected=rows.filter(row=>row[field]!>0);
    const group=(label:string,test:(row:SpObservation)=>boolean):SpStageGroup=>{const values={Planta:0,Construção:0,Pronto:0};for(const row of selected.filter(test))values[stage(row.stage)!]+=row[field]!;return {label,values,total:Object.values(values).reduce((a,b)=>a+b,0)};};
    const stageLabels=[...new Set([...labels,...selected.map(row=>bedroom(row.bedrooms))])];
    const typologies=stageLabels.map(label=>group(label,row=>bedroom(row.bedrooms)===label)),segments=Object.entries(SP_SEGMENT_RULE.groups).map(([label,standards])=>group(label,row=>(standards as readonly string[]).includes(row.standard)));
    if([...typologies,...segments].some(row=>!Number.isSafeInteger(row.total)))continue;
    result.stages[key]={ready:true,issues:[],typologies,segments};
  }
  const meta=new Map(buildings.map(building=>[String(building.building_id??building.id),building]));
  const byProject=new Map<string,SpObservation[]>();for(const row of available){const group=byProject.get(row.project)??[];group.push(row);byProject.set(row.project,group);}
  for(const [id,list] of byProject){const p=price(list),building=meta.get(id)!;const stock=list.reduce((s,r)=>s+r.stock!,0),lat=number(building.latitude),lon=number(building.longitude);const geographic=Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-34&&lat<=6&&lon>=-74&&lon<=-34;result.projects.push({id,name:String(building.name??`Empreendimento ${id}`),standard:list[0].standard,latitude:geographic?lat:null,longitude:geographic?lon:null,stock,meter:p.meter,ticket:p.ticket,vgv:p.ticket===null?null:p.ticket*stock});}
  if(result.projects.every(project=>project.ticket!==null))result.priceBandShare=share(result.projects.filter(project=>project.ticket!>=400000&&project.ticket!<=500000).reduce((s,p)=>s+p.stock,0));
  const safeCapacity=rows.every(row=>row.qty!==null&&row.sold!==null&&row.qty===row.sold+row.stock!&&Number.isSafeInteger(row.qty)&&row.qty>=0&&row.sold>=0&&(row.qty===0||row.price!==null&&row.price>0));
  if(safeCapacity){
    const aggregate=(label:string,list:SpObservation[]):SpVgvRow=>({label,qty:list.reduce((s,r)=>s+r.qty!,0),sold:list.reduce((s,r)=>s+r.sold!,0),stock:list.reduce((s,r)=>s+r.stock!,0),ticket:price(list).ticket,offeredVgv:list.reduce((s,r)=>s+r.qty!*(r.price??0),0),soldVgv:list.reduce((s,r)=>s+r.sold!*(r.price??0),0),stockVgv:list.reduce((s,r)=>s+r.stock!*(r.price??0),0)});
    const entries=SP_MARKET_STANDARDS.map(label=>aggregate(label,rows.filter(row=>row.standard===label))), sum=aggregate('Total residenciais',rows);
    if([sum,...entries].every(row=>[row.qty,row.sold,row.stock].every(Number.isSafeInteger)&&[row.offeredVgv,row.soldVgv,row.stockVgv].every(value=>value!==null&&Number.isFinite(value)&&value<=Number.MAX_SAFE_INTEGER/100)))result.vgv={ready:true,issues:[],rows:entries,total:sum};
  }
  return result;
}
