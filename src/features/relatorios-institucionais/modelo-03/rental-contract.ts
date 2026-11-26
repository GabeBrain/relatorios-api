import {norm,shift} from './model';
import {num} from './calculate';
import type {Row} from './types';

/** Script supplied 24/11; live endpoint verified 26/11: GET=405/Allow POST, POST=401 without auth. */
export const RENTAL_ENDPOINT='https://app.geobrain.com.br/public-api/rent-resale-property';
export const RENTAL_METHOD='POST' as const;
export type RentalBasis='collected-in-period'|'current-offers';
export function rentalQuery(city:string,uf:string,basis:RentalBasis,start:string,end:string,page:number){
 return {cidade:city,uf,tipo:'Apartamento',tipo_negocio:'ALUGUEL',page,per_page:100,...basis==='collected-in-period'?{coletado_em_gt:`${shift(start,-1)}-${new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5))-1,0)).getUTCDate()}`,coletado_em_lt:`${shift(end,1)}-01`}:{}};
}
export interface RentalOffer {id:string;neighborhood:string;bedrooms:number|null;area:number|null;price:number|null;meter:number|null;collectedAt:string|null;updatedAt:string|null}
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(v)?v:null;
/** No address, title, advertiser, portal contact or payload retained in normalized offers. */
export function rentalOffer(row:Row,city:string,uf:string):RentalOffer{
 if(norm(row.cidade)!==norm(city)||norm(row.estado)!==norm(uf)||norm(row.tipo_negocio)!=='aluguel'||norm(row.tipo)!=='apartamento')throw new Error('Rental response outside requested geography/business/property type.');
 const id=String(row.id??'').trim();if(!id)throw new Error('Rental listing without ID.');
 const area=num(row.area_util),price=num(row.preco),meter=num(row.preco_metro),bedrooms=num(row.quartos);
 return {id,neighborhood:String(row.bairro??'').trim()||'Sem bairro informado',bedrooms:bedrooms!==null&&Number.isSafeInteger(bedrooms)?bedrooms:null,area:area!==null&&area>0?area:null,price:price!==null&&price>0?price:null,meter:meter!==null&&meter>0?meter:null,collectedAt:date(row.coletado_em),updatedAt:date(row.atualizado_em)};
}
