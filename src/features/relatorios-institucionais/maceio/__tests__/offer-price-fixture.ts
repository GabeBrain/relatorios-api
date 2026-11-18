import {maceioCities,type MaceioSelection} from '../model';
import {maceioSourceMonths,type MaceioMarketSlidesData,type SlideSource} from '../market-slides-data';
export function offerPriceFixture(selection:MaceioSelection):MaceioMarketSlidesData {
  const months=maceioSourceMonths(selection),sources:SlideSource[]=[],families=['Luxo','Médio Padrão','MCMV','Compactos'],standards=['Luxo','Médio','Econômico','Compacto'];
  for(const [c,city] of maceioCities(selection.periodicity).entries()){
    for(const metric of ['releases','sales','stock'] as const)for(const group of ['Padrão','Tipologia'] as const){
      sources.push({city,metric,group,complete:true,issue:null,requests:1,rows:months.flatMap(month=>families.map((name,k)=>({city,state:'AL',building_type:'Vertical',period:`${month}-01`,group:group==='Padrão'?name:`${k+1} dorm`,vgv_release:(c+1)*(k+1)*80000,vgv_liquid_sales:(c+1)*(k+1)*80000,[metric==='stock'?'stock':metric==='sales'?'liquid_sales':'releases_in_period']:(c+1)*(k+1)*(metric==='stock'?100:1)})))});
    }
    sources.push({city,metric:'details',group:'Empreendimento',complete:true,issue:null,requests:1,rows:standards.map((standard,k)=>({city,state:'AL',building_type:'Vertical',building_id:`synthetic/${c}/${k}`,standard,neighborhood:'Bairro de conferência',release_date:'2010-01-01',typologies:[{id:1,type_of_typology:'Padrão'}],typologies_history:months.map((month,i)=>({period:`${month}-01`,typology_id:1,number_bedroom:k+1,private_area:30+k*20,price:(30+k*20)*(5000+i*10+k*100),typology_stock:(c+1)*(k+1)*100,sold_in_period:(c+1)*(k+1),releases_in_period:(c+1)*(k+1)}))}))});
  }
  return {start:months[0],end:months.at(-1)!,sources,finishedAt:'2026-11-17T12:00:00Z'};
}
