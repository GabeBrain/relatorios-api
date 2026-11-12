import observed from './municipal-observed-2026-08.json';
import type { MonthlyMarketData,MonthlyMarketSource,MonthlySegment,MonthlyMetric } from '../monthly-market';
import type { FortalezaSelection } from '../model';
export const observedSelection:FortalezaSelection={...observed.selection,periodicity:'monthly',territory:'capital-rm'};
/** Only municipal aggregate cells, captured AFTER complete stable pagination. */
export function observedMunicipalFixture():MonthlyMarketData{
  const months=Array.from({length:25},(_,index)=>new Date(Date.UTC(2026,7-24+index,1)).toISOString().slice(0,7));
  const sources:MonthlyMarketSource[]=observed.sources.map(source=>{
    const metric=source.metric as MonthlyMetric,segment=source.segment as MonthlySegment;
    return {city:source.city,segment,metric,complete:true,emptyResult:segment==='Comercial'&&source.cells.length===0,openingIncluded:metric==='stock',issue:null,requests:Math.max(1,Math.ceil(source.cells.length/100)),startedAt:'',finishedAt:'',rows:source.cells.map(cell=>({city:source.city,state:'CE',building_type:cell.buildingType,group:cell.group,period:`${cell.month}-01`,[metric==='stock'?'stock':metric==='sales'?'liquid_sales':'releases_in_period']:cell.value,...(metric==='stock'?{}:{[metric==='sales'?'vgv_liquid_sales':'vgv_release']:cell.nominal})}))};
  });
  return {scopeKey:'observed-august-2026-municipal',months,sources,issues:[]};
}
