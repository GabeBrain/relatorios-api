import catalog from './survey-cadence.json';
import {norm,shift} from './model';
import type {Source} from './types';

export class CoverageError extends Error {}
const observedCache=new WeakMap<Source,string[]>();
export function observedMonths(source:Source){
 const cached=observedCache.get(source);if(cached)return cached;
 const rows=source.metric==='details'?source.rows.flatMap(b=>Array.isArray(b.typologies_history)?b.typologies_history:[]):source.rows;
 const months=[...new Set(rows.map(r=>String(r.period??'').slice(0,7)).filter(m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m)))].sort();observedCache.set(source,months);return months;
}
export function surveyCadence(source:Source,end?:string){
 const entries=catalog.cities as Record<string,{months:number;since:string}>;
 const entry=Object.entries(entries).find(([key])=>norm(key)===norm(`${source.uf}|${source.city}`));
 let size=entry?.[1].months??1;
 // A genuinely monthly history takes precedence over the dated reference registry.
 const observed=observedMonths(source).filter(month=>!end||month<=end),last=observed.at(-1);
 if(last&&Array.from({length:12},(_,i)=>shift(last,-i)).every(m=>observed.includes(m)))size=1;
 return {months:size,since:entry?.[1].since??null,source:catalog.source};
}
export function expectedObservations(source:Source,start:string,end:string,stock=false){
 const size=surveyCadence(source,end).months;
 if(stock)return [end];
 if((Number(start.slice(5))-1)%size!==0||Number(end.slice(5))%size!==0)throw new CoverageError(`${source.city}: a fonte é pesquisada a cada ${size} meses; não há decomposição mensal para ${start} a ${end}.`);
 const result:string[]=[];for(let m=start;m<=end;m=shift(m,1))if(Number(m.slice(5))%size===0)result.push(m);
 return result;
}
export function scheduledObservations(source:Source,start:string,end:string){const size=surveyCadence(source,end).months,result:string[]=[];for(let m=start;m<=end;m=shift(m,1))if(Number(m.slice(5))%size===0)result.push(m);return result;}
