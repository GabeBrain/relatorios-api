/** Global report equivalence confirmed by Lucas on 24/11/2026. Keep API grades intact. */
export const REPORT_STANDARD_FAMILIES={Compactos:['Compacto'],MCMV:['Econômico'],'Médio Padrão':['Standard','Médio','Médio-Alto'],Luxo:['Alto','Luxo']} as const;
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function reportStandardFamily(value:unknown):string|null{
 const key=normalize(value);return Object.entries(REPORT_STANDARD_FAMILIES).find(([family,values])=>normalize(family)===key||values.some(v=>normalize(v)===key))?.[0]??null;
}
