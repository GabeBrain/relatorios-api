import { normalizeMarketText } from './market';

/** Analyst's list supplied by Lucas, 19/11/2026. Exact normalized name AND
 * source neighborhood; no fuzzy/prefix match or geographic guess. */
export const FORTALEZA_BEIRA_MAR_PROJECTS=[
  ['Edge','Meireles'],['Diagonal By Pininfarina','Mucuripe'],['Edifício Sabatini','Meireles'],
  ['Wave','Meireles'],['Ivens Monumental','Meireles'],['Dm 210','Meireles'],
  ['Pier 430','Mucuripe'],['Sky','Mucuripe'],['Mar Del Prado','Meireles'],
  ['Q Tower','Meireles'],['Mansão Seara','Meireles'],['Bm 900','Praia De Iracema'],['Porto 22','Meireles'],
] as const;
const nameKey=(value:unknown)=>normalizeMarketText(value).replace(/[^a-z0-9]/g,'');
export const BEIRA_MAR_RULE='beira-mar-13-projects-name-neighborhood-v1';
export function fortalezaIsBeiraMar(building:Record<string,unknown>) {
  if(normalizeMarketText(building.city)!=='fortaleza'||normalizeMarketText(building.state??building.uf)!=='ce'||normalizeMarketText(building.building_type)!=='vertical')return false;
  const name=nameKey(building.name??building.building_name),neighborhood=normalizeMarketText(building.neighborhood);
  return FORTALEZA_BEIRA_MAR_PROJECTS.some(([expected,original])=>nameKey(expected)===name&&normalizeMarketText(original)===neighborhood);
}
