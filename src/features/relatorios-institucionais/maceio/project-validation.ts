import {marketMonth,normalizeMarketText,type MarketRow} from './market';
import {readNumber} from './market-slides-data';
import {partialNotice} from './partial-data';

const id=(value:unknown)=>typeof value==='number'||typeof value==='string'?String(value).trim():'';
/** A broken project is isolated; a foreign municipality/segment is a source error. */
export function projectsForSnapshot(buildings:MarketRow[],city:string,segment:string,month:string,warnings:string[],excluded?:Set<string>){
 const counts=new Map<string,number>();for(const building of buildings){const key=id(building.building_id??building.id);if(key)counts.set(key,(counts.get(key)??0)+1);}
 const rows:MarketRow[]=[],rejected=new Set<string>();let excludedStock=0;
 for(const [index,building] of buildings.entries()){
  if(normalizeMarketText(building.city)!==normalizeMarketText(city)||building.state!=='AL'||normalizeMarketText(building.building_type)!==normalizeMarketText(segment))throw new Error('Histórico fora do município, UF ou segmento solicitado.');
  const project=id(building.building_id??building.id),release=marketMonth(building.release_date),history=Array.isArray(building.typologies_history)?building.typologies_history as MarketRow[]:[];
  let reason=!project?'ID de empreendimento inválido':counts.get(project)!>1?'empreendimento duplicado':!release?'data de lançamento inválida':!Array.isArray(building.typologies_history)?'histórico de tipologias ausente':'';
  if(!reason&&release!==null&&release<=month){
   const seen=new Set<string>();
   for(const row of history){
    if(!row||typeof row!=='object'){reason='registro histórico inválido';break;}
    const period=marketMonth(row.period),typology=id(row.typology_id),key=`${period}/${typology}`;
    if(!period||!typology){reason='competência ou ID de tipologia inválido';break;}
    if(seen.has(key)){reason='tipologia duplicada na mesma competência';break;}seen.add(key);
   }
  }
  if(!reason){rows.push(building);continue;}
  rejected.add(project||`sem-id/${index}`);if(project)excluded?.add(`${city}/${project}`);
  const stock=history.filter(row=>row&&marketMonth(row.period)===month).reduce((sum,row)=>sum+(readNumber(row.typology_stock,false)??0),0);
  excludedStock+=stock;
  partialNotice(warnings,`${city}, ${month}: empreendimento desconsiderado por ${reason}. Estoque válido observado nos registros descartados: ${stock}; quantidades ausentes não foram estimadas.`);
 }
 return {rows,excludedCount:rejected.size,excludedStock};
}
