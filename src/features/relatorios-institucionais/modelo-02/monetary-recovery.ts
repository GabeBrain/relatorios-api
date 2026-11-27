import indices from '../fortaleza/incc-di.json';
import {num} from '../modelo-03/calculate';
import {sourceKey,type Row,type Source as BaseSource} from '../modelo-03/types';
import {norm} from './model';
import type {Source,MonetaryRecovery} from './types';

const monthOf=(row:Row)=>String(row.period??'').slice(0,7);
const field=(source:BaseSource)=>source.metric==='sales'?'vgv_liquid_sales':'vgv_release';
const countField=(source:BaseSource)=>source.metric==='sales'?'liquid_sales':'releases_in_period';
const amount=(row:Row,source:BaseSource)=>num(row[field(source)],source.metric==='sales');
function frame(source:BaseSource,month:string){
 if(!source.complete)return null;
 const rows=source.rows.filter(row=>monthOf(row)===month),seen=new Set<string>();
 if(!rows.length)return null;
 for(const row of rows){const label=norm(row.group),units=num(row[countField(source)],source.metric==='sales');
  if(!label||/^(total|subtotal)(\b|$)/i.test(label)||seen.has(label)||units===null||!Number.isSafeInteger(units))return null;
  seen.add(label);
 }return rows;
}
function sameScope(a:BaseSource,b:BaseSource,group:BaseSource['group']){
 return a.uf===b.uf&&norm(a.city)===norm(b.city)&&a.metric===b.metric&&a.segment===b.segment&&b.group===group;
}
/** Fresh pattern query must preserve every group, count and already-known monetary value. */
export function patternRecovery(source:Source,recovery:MonetaryRecovery){
 const retry=recovery.retry;if(!sameScope(source,retry,'Padrão'))return null;
 const original=frame(source,recovery.month),fresh=frame(retry,recovery.month);
 if(!original||!fresh||original.length!==fresh.length)return null;
 for(const row of original){const other=fresh.find(x=>norm(x.group)===norm(row.group));
  if(!other||num(row[countField(source)],true)!==num(other[countField(source)],true)||amount(other,source)===null)return null;
  const known=amount(row,source);if(known!==null&&Math.abs(known-amount(other,source)!)>.005)return null;
 }return fresh;
}
/** Alternative grouping proves only the monthly total, never its pattern distribution. */
export function typologyRecovery(source:Source,recovery:MonetaryRecovery){
 const alternate=recovery.alternate;if(!alternate||!sameScope(source,alternate,'Tipologia'))return null;
 const original=frame(source,recovery.month),other=frame(alternate,recovery.month);
 if(!original||!other||other.some(row=>amount(row,source)===null))return null;
 const units=(rows:Row[])=>rows.reduce((sum,row)=>sum+num(row[countField(source)],true)!,0);
 if(!Number.isSafeInteger(units(original))||units(original)!==units(other))return null;
 const nominal=other.reduce((sum,row)=>sum+amount(row,source)!,0);
 return Number.isFinite(nominal)&&Math.abs(nominal)<Number.MAX_SAFE_INTEGER/100?{units:units(other),nominal}:null;
}
export function recoveredPatternSource(source:Source):Source {
 const replacements=new Map((source.monetaryRecovery??[]).flatMap(recovery=>{const rows=patternRecovery(source,recovery);return rows?[[recovery.month,rows] as const]:[];}));
 if(!replacements.size)return source;
 return {...source,rows:source.rows.map(row=>replacements.get(monthOf(row))?.find(other=>norm(other.group)===norm(row.group))??row)};
}
/** Uses the regular calculator to establish unit coverage, then values the reconciled monthly API totals. */
export function recoveredMonetaryTotal(source:Source,start:string,end:string,baseMonth:string,verifyCoverage:()=>unknown){
 const recoveries=(source.monetaryRecovery??[]).filter(r=>r.month>=start&&r.month<=end&&!patternRecovery(source,r));
 if(!recoveries.some(r=>typologyRecovery(source,r)))return null;
 verifyCoverage();
 const effective=recoveredPatternSource(source),rows=effective.rows.filter(row=>monthOf(row)>=start&&monthOf(row)<=end);
 const months=[...new Set(rows.map(monthOf))],index=indices.indices as Record<string,number>;let total=0;
 for(const month of months){const current=rows.filter(row=>monthOf(row)===month),missing=current.some(row=>amount(row,source)===null);
  const recovery=missing?recoveries.find(r=>r.month===month):undefined,alternate=recovery?typologyRecovery(source,recovery):null;
  if(missing&&!alternate)return null;
  const nominal=alternate?alternate.nominal:current.reduce((sum,row)=>sum+amount(row,source)!,0);
  if(nominal!==0&&(!index[month]||!index[baseMonth]))throw new Error(`INCC-DI indisponível para ${!index[baseMonth]?baseMonth:month}. Nenhuma base substituída.`);
  total+=nominal===0?0:nominal*index[baseMonth]/index[month]/1e6;
 }if(!Number.isFinite(total)||Math.abs(total)>=Number.MAX_SAFE_INTEGER/100)throw new Error('Total excede a precisão numérica segura.');return total;
}
export function recoveryAudit(source:Source){return (source.monetaryRecovery??[]).map(recovery=>{
 const pattern=patternRecovery(source,recovery),typology=pattern?null:typologyRecovery(source,recovery);
 const describe=(s:BaseSource)=>({key:sourceKey(s),group:s.group,complete:s.complete,httpStatus:s.httpStatus,requests:s.requests,failure:s.failure,records:s.rows.length,finishedAt:s.finishedAt});
 return {month:recovery.month,resolved:!!pattern||!!typology,strategy:pattern?'pattern-refetch':typology?'reconciled-typology-total':'unresolved',scope:pattern?'patterns-and-total':typology?'total-only':'none',units:typology?.units??null,nominalTotal:typology?.nominal??null,retry:describe(recovery.retry),alternate:recovery.alternate?describe(recovery.alternate):null};
});}
