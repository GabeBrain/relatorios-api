import data from './population-2022.json';
import {norm} from './model';

/** IBGE Censo 2022 (SIDRA 4714, v93): same product, vintage and revision for municipality and UF. */
export const POPULATION_SOURCE=data.source;
export const POPULATION_LABEL='IBGE, Censo Demográfico 2022 (SIDRA 4714, população residente, data-base 01/08/2022)';
const states=data.states as Record<string,{name:string;population:number}>;
const cities=data.cities as unknown as Record<string,[string,string,number][]>;
const key=(value:string)=>norm(value).replace(/[’`´]/g,"'").replace(/[^a-z0-9]/g,'');
const index=new Map(Object.entries(cities).map(([uf,rows])=>[uf,new Map(rows.map(([code,name,population])=>[key(name),{code,name,population}]))]));

export const statePopulation=(uf:string)=>states[uf]??null;
/** Enriches only an authorised catalogue row; never adds a municipality. Unmatched names return null. */
export const cityPopulation=(uf:string,city:string)=>index.get(uf)?.get(key(city))??null;
