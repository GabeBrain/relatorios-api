import { syntheticStockSeries } from './launch-series';
import { recordedInput } from './recorded';
import { buildSpTemporalPreview, type SpTemporalInput } from '../temporal';
import { SP_PRICE_STANDARDS } from '../granular-details';
import { SP_API_PATTERNS } from '../segments';
import { shiftSpMonth } from '../project-trends';

const split = (total:number) => { const rows = [.1,.2,.3].map(weight => Math.floor(total*weight)); return [...rows,total-rows.reduce((a,b) => a+b,0)]; };
/** Fully invented histories; current unit totals merely reconcile with their own fixture. */
export function syntheticGranularBuildings(input: SpTemporalInput = recordedInput()): Record<string,unknown>[] {
  const report = buildSpTemporalPreview(input,'3T2026'), stocks = syntheticStockSeries(input), buildings: Record<string,unknown>[] = [];
  const months: string[] = []; for (let month='2021-01';month<=report.throughMonth!;month=shiftSpMonth(month,1)) months.push(month);
  for (const [i,standard] of SP_API_PATTERNS.entries()) {
    const id = i+1;
    const rows = (month:string, stock:number, sales:number, quantities:number[]) => [1,2,3,4].map((bedroom,b) => {
      const area = [30,37,65,120][b], meter = 5000+SP_PRICE_STANDARDS.indexOf(standard)*1000+bedroom*300+(Number(month.slice(0,4))-2021)*120+Number(month.slice(5))*10;
      return { typology_id:id*100+bedroom, period:`${month}-01`, number_bedroom:bedroom, private_area:area, typology_stock:split(stock)[b], sold_in_period:split(sales)[b], qty:quantities[b], sold:quantities[b]-split(stock)[b], building_status:['Planta','Construção','Pronto'][b%3], price:meter*area, price_private_area:meter };
    });
    buildings.push({ building_id:id, city:'São Paulo', state:'SP', building_type:'Vertical', release_date:'2020-01-01', total_units:400000, standard, neighborhood:`Bairro ${i+1}`, name:`Empreendimento simulado ${i+1}`, latitude:-23.5-i*.015, longitude:-46.72+i*.025, period:input.rootPeriod,
      typologies_history: months.flatMap(month => rows(month,Number(stocks.find(row => row.period===`${month}-01`&&row.group===standard)!.stock),Number(input.sales.find(row => row.period===`${month}-01`&&row.group===standard)?.liquid_sales??0),[100000,100000,100000,100000])),
    });
    for (const [index,month] of report.monthly!.entries()) {
      const quantity = Number(input.releases.find(row => row.period===`${month.month}-01`&&row.group===standard)!.releases_in_period);
      buildings.push({ building_id:100+i*3+index,city:'São Paulo',state:'SP',building_type:'Vertical',release_date:`${month.month}-01`,total_units:quantity,standard,neighborhood:`Bairro ${i+1}`,period:input.rootPeriod,typologies_history:months.filter(value=>value>=month.month).flatMap(value=>rows(value,0,0,split(quantity))) });
    }
  }
  return buildings;
}
