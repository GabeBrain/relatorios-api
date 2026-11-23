import { marketMonth, normalizeMarketText, type MarketRow } from './market';
import type { MaceioMarketSlidesData } from './market-slides-data';
import { auditMaceioStock } from './stock-audit';
import {partialNotice} from './partial-data';

/** Lucas explicitly chose the detailed API for Marechal after matching the
 * GeoBrain screen. Never fixes a quantity or waives other data checks. */
export function maceioUsesDetailedStock(city:string,segment:string) {
  return normalizeMarketText(city)==='marechal deodoro' && normalizeMarketText(segment)==='vertical';
}

export function maceioStockDecision(city:string,segment:string,actual:number,expected:number,warnings:string[]) {
  if(!maceioUsesDetailedStock(city,segment))return false;
  const notice=`${city}: usado estoque detalhado da API (${actual}); agregado municipal retorna ${expected}, diferença ${actual-expected}. Fonte detalhada adotada por decisão de Lucas em 19/11/2026, após conferência da tela GeoBrain. A divergência permanece registrada, sem ajustar unidades.`;
  if(!warnings.includes(notice))warnings.push(notice);
  return true;
}

/** Only the selected closing month is replaced in municipal stock views.
 * Original source rows remain intact for audit and earlier historical periods. */
export function maceioDetailedClosingCells(data:MaceioMarketSlidesData,city:string,month:string,group:'Padrão'|'Tipologia',warnings:string[]=[]) {
  if(month!==data.end||!maceioUsesDetailedStock(city,'Vertical'))return null;
  const audit=auditMaceioStock(data.sources,[city],month)[0];
  const invalidCore=Object.entries(audit.invalid).some(([key,count])=>!['missingEstablishedSnapshots','missingSnapshotProjects'].includes(key)&&count>0);
  if(!audit.complete||invalidCore||audit.granularEligible.value===null||audit.municipal.value===null||audit.municipal.invalidGroups)throw new Error(`${city}: detalhamento de fechamento incompleto ou inválido para a fonte adotada.`);
  const source=data.sources.find(item=>item.city===city&&item.metric==='details')!;
  const totals=new Map<string,number>();
  let excluded=0,excludedStock=0;
  for(const building of source.rows){
    const release=marketMonth(building.release_date);if(!release||release>month)continue;
    const history=building.typologies_history as MarketRow[],observed=history.filter(row=>marketMonth(row.period)===month),seen=new Set(observed.map(row=>String(row.typology_id)));
    const established=history.filter(row=>{const period=marketMonth(row.period);return period!==null&&period<=month;}).map(row=>String(row.typology_id));
    if(!observed.length||established.some(id=>!seen.has(id))){excluded++;excludedStock+=observed.reduce((sum,row)=>sum+Number(row.typology_stock),0);continue;}
    for(const row of building.typologies_history as MarketRow[]){
      if(marketMonth(row.period)!==month)continue;
      const label=group==='Padrão'?String(building.standard??''):String(row.number_bedroom??'');
      if(!label.trim())throw new Error(`${city}: grupo ausente no estoque detalhado de fechamento.`);
      const value=(totals.get(label)??0)+Number(row.typology_stock);
      if(!Number.isSafeInteger(value))throw new Error('Estoque detalhado fora da precisão segura.');totals.set(label,value);
    }
  }
  if(excluded)partialNotice(warnings,`${city}, ${month}: ${excluded} empreendimento(s) com fotografia incompleta fora do estoque por ${group}. Estoque observado excluído ${excludedStock}; auditoria bruta preservada.`);
  if(excluded&&!totals.size)throw new Error(`${city}: nenhum empreendimento com fotografia válida para o estoque de fechamento.`);
  return [...totals].map(([label,value])=>({city,month,group:label,value}));
}
