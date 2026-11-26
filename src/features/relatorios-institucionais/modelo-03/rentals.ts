import {period,selectedCities,location} from './model';
import type {Selection} from './model';
import {rentalOffer,type RentalOffer} from './rental-contract';
import type {Definition} from './blueprint';
import {sourceKey,type Source,type Slide,type Table} from './types';

export function rentalSample(source:Source,start:string,end:string){
 const offers=new Map<string,RentalOffer>(),excluded:Record<string,number>={};let duplicates=0;
 const exclude=(reason:string)=>{excluded[reason]=(excluded[reason]??0)+1;};
 for(const row of source.rows){
  const offer=rentalOffer(row,source.city,source.uf);
  if(!offer.collectedAt){exclude('missing-collection-date');continue;}
  const month=offer.collectedAt.slice(0,7);if(month<start||month>end){exclude('outside-collection-period');continue;}
  const old=offers.get(offer.id);if(old){if(JSON.stringify(old)!==JSON.stringify(offer))throw new Error('Anúncio duplicado conflitante na fonte de locação.');duplicates++;continue;}
  offers.set(offer.id,offer);
 }
 return {offers:[...offers.values()],excluded,duplicates};
}
const mean=(rows:RentalOffer[],field:'price'|'area'|'meter')=>{const values=rows.map(r=>r[field]).filter((v):v is number=>v!==null);return values.length?values.reduce((n,v)=>n+v,0)/values.length:null;};
export function rentalSlide(definition:Definition,selection:Selection,sources:Source[]):Slide{
 const p=period(selection),result:Slide={definition,status:'waiting-source',issue:null,warnings:[],tables:[],sourceKeys:[],note:'Fonte: anúncios Geobrain. Apartamentos de ALUGUEL coletados no período; médias simples dos anúncios com valor válido, sem INCC-DI. Não são contratos fechados nem fotografia histórica da oferta ativa. Um anúncio não comprova um imóvel único entre portais.'};
 try{
  for(const city of selectedCities(selection)){
   const scope=location(city,selection.uf),matches=sources.filter(s=>s.city===scope.city&&s.uf===scope.uf&&s.metric==='rentals');
   if(matches.length!==1||!matches[0].complete)throw new Error(`${scope.city}: fonte de anúncios de aluguel não concluída.`);
   const source=matches[0];result.sourceKeys.push(sourceKey(source));const sample=rentalSample(source,p.start,p.end),rows=sample.offers;
   result.warnings.push(`${scope.city}: amostra de ${rows.length} anúncios de apartamentos para aluguel coletados entre ${p.start} e ${p.end}; sem comprovação de estoque ativo histórico ou locações efetivadas.`);
   result.warnings.push(`${scope.city}: os preços são os recebidos na consulta, sem série histórica de preço do anúncio. O período seleciona a coleta, não comprova o preço vigente naquele fechamento.`);
   const laterUpdates=rows.filter(r=>r.updatedAt&&r.updatedAt.slice(0,7)>p.end).length;
   if(laterUpdates)result.warnings.push(`${scope.city}: ${laterUpdates} anúncio(s) com atualização posterior a ${p.end}; preço histórico não comprovado.`);
   if(sample.duplicates)result.warnings.push(`${scope.city}: ${sample.duplicates} repetição(ões) do mesmo ID descartada(s).`);
   for(const [reason,count] of Object.entries(sample.excluded))result.warnings.push(`${scope.city}: ${count} anúncio(s) excluído(s): ${reason}.`);
   const labels=definition.role==='rental-neighborhood'?[...new Set(rows.map(r=>r.neighborhood))].sort():definition.role==='rental-summary'?['Total da amostra']:[...new Set(rows.map(r=>r.bedrooms===null?'Sem quartos informados':`${r.bedrooms} dormitório(s)`))].sort();
   const columns=['Anúncios','R$/mês','m² úteis','R$/m²','N preço','N área','N R$/m²'];
   const table:Table={columns,unit:`${scope.city} | Anúncios coletados no período · Médias: aluguel, área e R$/m² · N = base válida`,formats:['count','money','decimal','money','count','count','count'],rows:labels.map(label=>{const items=definition.role==='rental-summary'?rows:rows.filter(r=>(definition.role==='rental-neighborhood'?r.neighborhood:r.bedrooms===null?'Sem quartos informados':`${r.bedrooms} dormitório(s)` )===label);return {label,values:[items.length,mean(items,'price'),mean(items,'area'),mean(items,'meter'),items.filter(r=>r.price!==null).length,items.filter(r=>r.area!==null).length,items.filter(r=>r.meter!==null).length]};})};
   if(!rows.length){table.rows=[{label:Object.keys(sample.excluded).length?'Sem amostra válida':'Nenhum anúncio coletado no período',values:[Object.keys(sample.excluded).length?null:0,null,null,null,0,0,0]}];}
   const missing=rows.filter(r=>r.price===null||r.area===null||r.meter===null).length;if(missing)result.warnings.push(`${scope.city}: ${missing} anúncio(s) com preço/área ausente; médias usam apenas valores válidos e exibem o tamanho de cada base.`);
   result.tables.push(table);
  }
  result.status='available';
 }catch(e){result.issue=e instanceof Error?e.message:'Falha na fonte de locação.';result.tables=[];}
 return result;
}
