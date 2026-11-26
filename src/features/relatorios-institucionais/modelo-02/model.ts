import {norm,shift,period as cityPeriod,periodIssue as cityPeriodIssue,type Selection as CitySelection} from '../modelo-03/model';
export {norm};
export interface Selection {region:string;quarter:number;year:number}
export interface City {uf:string;city:string}
export interface Region {id:string;label:string;sourceId:string;referenceSlides:number;capitals:readonly (readonly [string,string])[]}
export const REGIONS:readonly Region[]=[
 {id:'sul',label:'Sul',sourceId:'1qyf-cxVGI8f4Sqoup5EAlyyhZbaxgqal',referenceSlides:53,capitals:[['PR','Curitiba'],['SC','Florianópolis'],['RS','Porto Alegre']]},
 {id:'sudeste',label:'Sudeste',sourceId:'1MN2kQn2bvK_LIbocVlY1fD4zngdwjJDW',referenceSlides:55,capitals:[['ES','Vitória'],['MG','Belo Horizonte'],['RJ','Rio de Janeiro'],['SP','São Paulo']]},
 {id:'nordeste',label:'Nordeste',sourceId:'1D1jTzwL7AH5-lAmfBeZCtK-Gi_EUkbs-',referenceSlides:66,capitals:[['AL','Maceió'],['BA','Salvador'],['CE','Fortaleza'],['MA','São Luís'],['PB','João Pessoa'],['PE','Recife'],['PI','Teresina'],['RN','Natal'],['SE','Aracaju']]},
 {id:'norte',label:'Norte',sourceId:'1-s28txxkUxixx0q0lZZ3nEfxy4bJtPoB',referenceSlides:54,capitals:[['AC','Rio Branco'],['AP','Macapá'],['AM','Manaus'],['PA','Belém'],['RO','Porto Velho'],['RR','Boa Vista'],['TO','Palmas']]},
 {id:'centro-oeste',label:'Centro-Oeste',sourceId:'1DrL5mGdBRKOrTajMNe8PyHD1nOGAmYzX',referenceSlides:52,capitals:[['DF','Brasília'],['GO','Goiânia'],['MT','Cuiabá'],['MS','Campo Grande']]},
] as const;
export const regionOf=(s:Selection)=>REGIONS.find(r=>r.id===s.region);
export const citySelection=(s:Selection,c:City):CitySelection=>({...c,entity:'Brain',periodicity:'quarterly',position:s.quarter,year:s.year,includeRm:false,rmCities:[]});
export const period=(s:Selection)=>cityPeriod(citySelection(s,{uf:'',city:''}));
export function historyStart(s:Selection){const start=[shift(period(s).end,-26),`${s.year-1}-01`].sort()[0];return start<'2021-01'?'2021-01':start;}
export const periodIssue=(s:Selection,now=new Date())=>!regionOf(s)?'Selecione a região do Brasil.':cityPeriodIssue(citySelection(s,{uf:'',city:''}),now);
export const keyOf=(c:City)=>`${c.uf}|${c.city}`;
export const citiesFor=(s:Selection,catalog:Record<string,string[]>|null):City[]=>regionOf(s)?.capitals.flatMap(([uf])=>[...new Set(catalog?.[uf]??[])].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(city=>({uf,city})))??[];
export const missingUfs=(s:Selection,catalog:Record<string,string[]>|null)=>regionOf(s)?.capitals.filter(([uf])=>!catalog?.[uf]?.length).map(([uf])=>uf)??[];
export const scopeIssue=(s:Selection,catalog:Record<string,string[]>|null)=>!catalog?'Carregue o catálogo autorizado do Geobrain.':!citiesFor(s,catalog).length?'Seu acesso não retornou municípios monitorados para esta região.':null;
export const selectionKey=(s:Selection)=>`${s.region}/${s.year}/${s.quarter}`;
export const filename=(s:Selection)=>`institucionais-imprensa-${s.region}-${s.year}-${s.quarter}T`;
export function initialSelection(now=new Date()):Selection {const previous=new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3-1,1);return {region:'',year:previous.getFullYear(),quarter:Math.ceil((previous.getMonth()+1)/3)};}
