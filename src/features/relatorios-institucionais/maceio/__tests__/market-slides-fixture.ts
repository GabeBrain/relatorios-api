import {maceioCities,type MaceioSelection} from '../model';
import {maceioSourceMonths,type MaceioMarketSlidesData,type SlideSource} from '../market-slides-data';
export function marketSlidesFixture(selection:MaceioSelection):MaceioMarketSlidesData{
 const months=maceioSourceMonths(selection),sources:SlideSource[]=[],names=['Luxo','Médio Padrão','MCMV','Compactos'];
 maceioCities(selection.periodicity).forEach((city,c)=>{
  for(const metric of ['releases','sales','stock'] as const){
   const rows=months.flatMap((month,i)=>names.map((group,k)=>{const qty=(c+1)*(i+1)*(k+1),value=metric==='stock'?2000+qty:metric==='sales'?qty-1:qty;return {city,state:'AL',building_type:'Vertical',period:`${month}-01`,group,[metric==='releases'?'releases_in_period':metric==='sales'?'liquid_sales':'stock']:value,vgv_release:qty*80000,vgv_liquid_sales:(qty-1)*85000};}));
   sources.push({city,metric,group:'Padrão',rows,complete:true,issue:null,requests:1});
   if(metric!=='stock')sources.push({city,metric,group:'Tipologia',rows:rows.map((row,i)=>({...row,group:`${i%4+1} dorm`})),complete:true,issue:null,requests:1});
  }
  sources.push({city,metric:'details',group:'Empreendimento',complete:true,issue:null,requests:1,rows:[0,1].map(n=>({city,state:'AL',building_type:'Vertical',building_id:`synthetic/${c}/${n}`,neighborhood:n===0?'Bairro com nome extenso de conferência':'Outro bairro',typologies_history:months.map((month,i)=>({period:`${month}-01`,typology_id:1,releases_in_period:(c+1)*(i+1)*(n===0?6:4),sold_in_period:(c+1)*(i+1)*(n===0?6:4)-2}))}))});
 });
 return {start:months[0],end:months.at(-1)!,sources,finishedAt:'2026-11-16T18:00:00Z'};
}
