import { marketMonth, normalizeMarketText, type MarketRow } from './market';
import type { MaceioMarketSlidesData } from './market-slides-data';
import { auditMaceioStock } from './stock-audit';

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
export function maceioDetailedClosingCells(data:MaceioMarketSlidesData,city:string,month:string,group:'Padrão'|'Tipologia') {
  if(month!==data.end||!maceioUsesDetailedStock(city,'Vertical'))return null;
  const audit=auditMaceioStock(data.sources,[city],month)[0];
  if(audit.comparison==='unavailable')throw new Error(`${city}: detalhamento de fechamento incompleto ou inválido para a fonte adotada.`);
  const source=data.sources.find(item=>item.city===city&&item.metric==='details')!;
  const totals=new Map<string,number>();
  for(const building of source.rows){
    const release=marketMonth(building.release_date);if(!release||release>month)continue;
    for(const row of building.typologies_history as MarketRow[]){
      if(marketMonth(row.period)!==month)continue;
      const label=group==='Padrão'?String(building.standard??''):String(row.number_bedroom??'');
      if(!label.trim())throw new Error(`${city}: grupo ausente no estoque detalhado de fechamento.`);
      const value=(totals.get(label)??0)+Number(row.typology_stock);
      if(!Number.isSafeInteger(value))throw new Error('Estoque detalhado fora da precisão segura.');totals.set(label,value);
    }
  }
  return [...totals].map(([label,value])=>({city,month,group:label,value}));
}
