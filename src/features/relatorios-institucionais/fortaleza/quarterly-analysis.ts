import { buildPriceSlide,type PriceCollection,type PriceSlideData } from './monthly-prices';
import { buildMonthlyIvv } from './monthly-ivv';
import type { MonthlyMarketData } from './monthly-market';
import type { FortalezaSelection } from './model';
export const QUARTERLY_PRICE_PAGES:Record<number,number>={42:37,43:38,45:40,46:41,47:42,48:43};
export function buildQuarterlyPrice(page:number,prices:PriceCollection|null,selection:FortalezaSelection,cities:string[]){
  return buildPriceSlide(QUARTERLY_PRICE_PAGES[page],prices,selection,cities);
}
export function buildQuarterlyIvv(data:MonthlyMarketData|null,selection:FortalezaSelection,cities:string[],rm=false):PriceSlideData{
  const checked=buildMonthlyIvv(data,selection,cities,rm);if(checked.status!=='ready')return checked;
  // The original quarterly deck's slides54/72 still contain 25 MONTHLY
  // observations. Keep their cadence; the 27-month harvest also serves flows.
  const points=checked.series[0].points.slice(-25);
  return {...checked,series:[{label:'IVV residencial vertical mensal',points}],average:points.reduce((sum,point)=>sum+point.value!,0)/points.length};
}
