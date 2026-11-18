import { launchMonths, type MaceioIntroData } from '../intro-data';
import { maceioCities, type MaceioSelection } from '../model';
export function introFixture(selection:MaceioSelection):MaceioIntroData{
  const months=launchMonths(selection,61);
  return {collectedAt:'2026-11-16T12:00:00Z',cities:maceioCities(selection.periodicity).map((city,index)=>({city,issues:[],unitsComplete:true,buildingsComplete:true,
    units:months.map((month,i)=>({city,state:'AL',building_type:'Vertical',group:'Médio Padrão',period:`${month}-01`,releases_in_period:index===0?100+i*3:5+i})),
    buildings:months.map((month,i)=>({city,state:'AL',building_type:'Vertical',building_id:`fixture/${index}/${i}`,release_date:`${month}-01`,standard:['Luxo','Médio Padrão','MCMV','Compactos'][i%4]}))
  }))};
}
