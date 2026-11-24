import {norm} from './model';

/** Grouping explicitly confirmed by Lucas on 24/11/2026 for Modelo 03. */
export const STANDARD_GROUPS={Compactos:['Compacto'],MCMV:['Econômico','MCMV'],'Médio Padrão':['Standard','Médio','Médio-Alto'],Luxo:['Alto','Luxo']};
export function standardFamily(value:unknown){const key=norm(value);return Object.entries(STANDARD_GROUPS).find(([family,values])=>norm(family)===key||values.some(v=>norm(v)===key))?.[0]??String(value??'Sem padrão');}
