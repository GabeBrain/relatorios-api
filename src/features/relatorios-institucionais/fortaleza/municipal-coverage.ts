import { marketMonth,normalizeMarketText } from './market';
import { FORTALEZA_STANDARDS } from './monthly-launches';
import { monthlyProduct,readMonthlyNumber,type MonthlyMarketSource } from './monthly-market';
/** Municipal aggregates only. Capture before rejection clears the runtime rows. */
export function monthlySourceCoverage(source:MonthlyMarketSource,months:string[]){
  const expected=source.metric==='stock'&&source.openingIncluded?(()=>{const [year,month]=months[0].split('-').map(Number);return [new Date(Date.UTC(year,month-2,1)).toISOString().slice(0,7),...months];})():months;
  const field=source.metric==='stock'?'stock':source.metric==='sales'?'liquid_sales':'releases_in_period';
  const groups=new Map<string,{group:string|null;buildingType:string|null;rows:number;months:Set<string>;unknownCategory:boolean}>();
  const observed=new Map<string,Set<string>>(),cells=source.rows.map(row=>{
    const group=typeof row.group==='string'?row.group.slice(0,100):null,buildingType=typeof row.building_type==='string'?row.building_type.slice(0,50):null,month=marketMonth(row.period),key=JSON.stringify([group,buildingType]);
    const entry=groups.get(key)??{group,buildingType,rows:0,months:new Set<string>(),unknownCategory:monthlyProduct(source.segment,row.group)==='unknown'};
    entry.rows++;if(month){entry.months.add(month);const names=observed.get(month)??new Set<string>();names.add(normalizeMarketText(group));observed.set(month,names);}groups.set(key,entry);
    return {month,group,buildingType,value:readMonthlyNumber(row[field],source.metric==='sales',true),nominal:source.metric==='stock'?null:readMonthlyNumber(row[source.metric==='sales'?'vgv_liquid_sales':'vgv_release'],source.metric==='sales')};
  });
  const groupNames=[...new Set([...groups.values()].map(row=>normalizeMarketText(row.group)))];
  return {rowsReceived:source.rows.length,expectedMonths:expected,groups:[...groups.values()].map(row=>({...row,months:[...row.months].sort()})),missingMonths:expected.filter(month=>!observed.has(month)),missingCells:expected.flatMap(month=>groupNames.filter(group=>!observed.get(month)?.has(group)).map(group=>({month,group}))),missingStandards:source.segment==='Vertical'?FORTALEZA_STANDARDS.filter(group=>!groupNames.includes(normalizeMarketText(group))):[],cells};
}
export type MonthlySourceCoverage=ReturnType<typeof monthlySourceCoverage>;
