import { normalizeMarketText } from './market';
export const FORTALEZA_STANDARDS = ['Econômico','Compacto','Standard','Médio','Médio-Alto','Alto','Luxo'] as const;
const socioeconomic=new Set(FORTALEZA_STANDARDS.map(normalizeMarketText));
const houses=new Set(['condominio de casas/sobrados','condominio de casas e sobrados','condominio de casas','casas em condominio','casas em condominio fechado']);
export type MonthlyProduct='vertical'|'houses'|'lots'|'commercial'|'excluded'|'unknown';
/** Provider categories remain distinct; Alto + is observed only in Comercial. */
export function monthlyProduct(segment:'Vertical'|'Horizontal'|'Comercial',group:unknown):MonthlyProduct{
  const key=normalizeMarketText(group);
  if(segment==='Vertical')return socioeconomic.has(key)?'vertical':'unknown';
  if(segment==='Comercial')return socioeconomic.has(key)||['alto +','comercial','salas comerciais','lojas'].includes(key)?'commercial':'unknown';
  if(['loteamento aberto','loteamento fechado'].includes(key))return 'lots';
  if(houses.has(key)||socioeconomic.has(key))return 'houses';
  if(['condominio de chacaras','loteamento comercial','terreno'].includes(key))return 'excluded';
  return 'unknown';
}
