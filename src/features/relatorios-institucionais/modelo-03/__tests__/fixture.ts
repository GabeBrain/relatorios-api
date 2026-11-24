import {shift,selectedCities,location,type Selection} from '../model';
import type {Row,Source} from '../types';
export const selection:Selection={uf:'PR',city:'Curitiba',entity:'ADEMI-PR',periodicity:'quarterly',year:2026,position:2,includeRm:true,rmCities:['PR|Araucária']};
export function fixture(s:Selection=selection):Source[]{
 const end=`${s.year}-${String(s.position*(s.periodicity==='monthly'?1:s.periodicity==='quarterly'?3:6)).padStart(2,'0')}`,months:string[]=[];for(let m='2021-01';m<=end;m=shift(m,1))months.push(m);
 const sources:Source[]=[];
 for(const value of selectedCities(s)){const {city,uf}=location(value,s.uf);
  for(const segment of ['Vertical','Horizontal','Comercial'] as const){
   const rows:Row[]=[{building_id:'private-id',name:'Private project name',address:'Private address',city,state:uf,building_type:segment,release_date:'2021-01-01',neighborhood:'Centro',standard:segment==='Horizontal'?'Condomínio de Casas':'Standard',typologies_history:months.flatMap(m=>[1,2].map(i=>({period:`${m}-01`,typology_id:i,number_bedroom:i,typology_stock:40,qty:50,price:500000,private_area:50,releases_in_period:1,sold_in_period:1,pattern:i===1?'Standard':'MCMV'})))}];
   sources.push({city,uf,segment,metric:'details',group:'Empreendimento',rows,complete:true,requests:1,httpStatus:200,failure:null,endpoint:'https://app.geobrain.com.br/public-api/v2/building-with-history-internal',finishedAt:'2026-11-24T12:00:00Z'});
  }
  for(const metric of ['releases','sales','stock'] as const)for(const group of ['Padrão','Tipologia'] as const)sources.push({city,uf,segment:'Vertical',metric,group,rows:months.flatMap(m=>(group==='Padrão'?['Standard','MCMV']:['1','2']).map(label=>({period:`${m}-01`,group:label,building_type:'Vertical',city,state:uf,releases_in_period:1,liquid_sales:1,stock:40,vgv_release:500000,vgv_liquid_sales:500000,vgv_stock:20000000}))),complete:true,requests:1,httpStatus:200,failure:null,endpoint:`https://geobrain.com.br/public-api/temporal-analysis-city/${metric}`,finishedAt:'2026-11-24T12:00:00Z'});
 }
 return sources;
}
