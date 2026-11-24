import {reportStandardFamily} from '../shared/standard-families';
import { marketMonth, normalizeMarketText, type MarketRow } from './market';

/** Explicit bedroom counts; four or more share the report's final bucket. */
export function maceioBedroomIndex(value:unknown):number|null {
  const raw=normalizeMarketText(value),numeric=/^\d+(?:\.0+)?$/.test(raw);
  const match=/^(\d+)(?:\s*(ou\s*(?:\+|mais)|\+))?(?:\s+(?:dorm|dormitorio|dormitorios|quarto|quartos))?$/.exec(raw);
  const count=numeric?Number(raw):match?Number(match[1]):NaN;
  if(!Number.isSafeInteger(count)||count<1||match?.[2]&&count<4)return null;
  return Math.min(4,count)-1;
}

/** Grouping explicitly confirmed by Lucas on 17/11/2026, for both editions. */
export function maceioPatternFamily(value: unknown): string | null {
  return reportStandardFamily(value);
}

export const MACEIO_PRODUCT_FIELDS = ['building_subtype', 'subtype', 'product_type', 'horizontal_type', 'work', 'standard'] as const;

/** Ten specific confirmations retained by Lucas on 19/11/2026; no editable overrides. */
export const MACEIO_CONFIRMED_CLOSED_HOUSES: Readonly<Record<string,string>> = {
  '7980':'Barra de São Miguel','12692':'Maceió','20502':'Maceió','7984':'Marechal Deodoro','425':'Marechal Deodoro',
  '28486':'Marechal Deodoro','21639':'Marechal Deodoro','21640':'Marechal Deodoro','422':'Marechal Deodoro','28491':'Rio Largo',
};

/** Analyst confirmation relayed by Lucas on 18/11/2026; exclusion wins over other labels. */
export function maceioExcludedHorizontal(building: Record<string, unknown>): boolean {
  return MACEIO_PRODUCT_FIELDS.some(field => ['condominio de chacara', 'condominio de chacaras'].includes(normalizeMarketText(building[field])));
}

/** Explicit products first, then the rules authorized for the selected study. */
export function maceioHorizontalProduct(building: Record<string, unknown>,month?:string): string {
  if (maceioExcludedHorizontal(building)) return 'Condomínio de Chácaras';
  const values = MACEIO_PRODUCT_FIELDS.map(field => building[field]);
  for (const value of values) {
    const name = normalizeMarketText(value);
    const product = ({ 'condominio de casas': 'Condomínio de Casas', 'condominio de casas/sobrados': 'Condomínio de Casas',
      'loteamento fechado': 'Loteamento Fechado', 'loteamento aberto': 'Loteamento Aberto',
      'condominio de chacaras': 'Condomínio de Chácaras' } as Record<string, string>)[name];
    if (product) return product;
  }
  const city=MACEIO_CONFIRMED_CLOSED_HOUSES[String(building.building_id??building.id??'').trim()];
  if(city&&normalizeMarketText(building.building_type)==='horizontal'&&normalizeMarketText(building.state??building.uf)==='al'
    &&normalizeMarketText(building.city)===normalizeMarketText(city)&&values.some(value=>normalizeMarketText(value)==='fechado'))return 'Condomínio de Casas';
  if(maceioHorizontalPatternInference(building,month)||maceioHorizontalBedroomInference(building,month))return 'Condomínio de Casas';
  return '';
}

/** GeoBrain head confirmation relayed by Lucas: lots have no price standard. */
export function maceioHorizontalPatternInference(building:Record<string,unknown>,month?:string):boolean {
  if(!month||normalizeMarketText(building.building_type)!=='horizontal'||normalizeMarketText(building.state??building.uf)!=='al')return false;
  const release=marketMonth(building.release_date);if(!release||release>month)return false;
  const standards=['compacto','compactos','economico','standard','medio','medio-alto','medio alto','alto','luxo','super luxo'];
  return [building.standard,building.work].some(value=>standards.includes(normalizeMarketText(value)));
}

/** Lucas authorized on 19/11/2026. Only the selected historical photograph;
 * never current catalog bedrooms or future observations for an older report. */
export function maceioHorizontalBedroomInference(building:Record<string,unknown>,month?:string):boolean {
  if(!month||normalizeMarketText(building.building_type)!=='horizontal'||normalizeMarketText(building.state??building.uf)!=='al')return false;
  const release=marketMonth(building.release_date);if(!release||release>month)return false;
  return (Array.isArray(building.typologies_history)?building.typologies_history as MarketRow[]:[]).some(row=>{
    if(!row||marketMonth(row.period)!==month)return false;
    const raw=row.number_bedroom;if(typeof raw!=='number'&&(typeof raw!=='string'||!/^\d+(?:\.\d+)?$/.test(raw.trim())))return false;
    const rooms=Number(raw);return Number.isSafeInteger(rooms)&&rooms>0;
  });
}
