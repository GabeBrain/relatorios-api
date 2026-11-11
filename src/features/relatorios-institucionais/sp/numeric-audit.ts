import type { SpPreview } from './model';
import type { SpProjectTrends } from './project-trends';
import { spDisplayPrices, spDisplayMarket } from './municipal-prices';

/** Aggregated values only: no raw histories, tokens, individual coordinates or map names. */
export function spNumericAudit(report:SpPreview) {
  const sources=[{base:13,data:report.projects,unit:'projects'},{base:18,data:report.launchSeries,unit:'units'},{base:26,data:report.vglSeries,unit:'BRL'},{base:32,data:report.salesSeries,unit:'units'},{base:40,data:report.vgvSeries,unit:'BRL'}];
  const trendSlides=sources.flatMap(({base,data,unit})=>{
    if(data?.status!=='ready')return [];
    const values=(trend:SpProjectTrends|undefined,rolling:boolean)=>!trend?[]:rolling?trend.rolling.map(row=>({period:row.month,value:row.value})):trend.quarterly.map(row=>({period:row.label,value:row.value}));
    const annual=data.breakdown?.annual??[],names=annual[0]?.segments.map(row=>row.name)??[];
    return [0,1,2,3,4].map(index=>({slide:base+index,unit:index===4?'percentage':unit,series:index===4?names.map(name=>({name,points:annual.map(row=>({period:String(row.year),value:row.segments.find(segment=>segment.name===name)!.share}))})):[{name:index>=2?'MCMV':'Total',points:values(index>=2?data.breakdown?.mcmv:data.trends,index===1||index===3)}]}));
  });
  const market=spDisplayMarket(report);
  return {schema:'sp-numeric-audit-v1',quarter:report.quarter,throughMonth:report.throughMonth,trendSlides,
    municipal:{metrics:report.metrics,monthly:report.monthly,patterns:report.patterns,typologies:report.typologies},
    comparisons:{launches:report.launchSeries?.comparison,sales:report.salesSeries?.comparison,stock:report.stockSeries?.comparison},
    details:{area:report.granularDetails?.area,prices:spDisplayPrices(report),priceSource:report.municipalPrices,granularPriceBaseline:report.municipalPrices?report.granularDetails?.prices:undefined,granularBedroomPriceBaseline:report.municipalPrices?report.granularDetails?.market?.prices:undefined,market:market?{status:market.status,total:market.total,prices:market.prices,cohorts:market.cohorts,standards:market.standards,bedrooms:market.bedrooms,matrix:market.matrix,stages:market.stages,vgv:market.vgv,priceBand:market.priceBand,priceBandShare:market.priceBandShare,capacityUniverse:market.capacityUniverse}:null}};
}
