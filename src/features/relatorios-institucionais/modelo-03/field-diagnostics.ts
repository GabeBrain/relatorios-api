import {num} from './calculate';
import type {Row,Source} from './types';

export function salesFieldReason(row:Row){
 if(!Object.prototype.hasOwnProperty.call(row,'sold_in_period'))return 'missing-field';
 const value=row.sold_in_period;
 if(value===null)return 'null';
 if(value===undefined)return 'undefined';
 if(typeof value==='string'&&!value.trim())return 'empty-string';
 if(typeof value!=='string'&&typeof value!=='number')return 'invalid-type';
 if(!Number.isFinite(Number(value)))return 'not-numeric-or-non-finite';
 if(num(value,true)===null)return 'unsafe-number';
 if(!Number.isSafeInteger(Number(value)))return 'non-integer';
 return null;
}
const scalar=(v:unknown):string|number|null=>typeof v==='string'?v.slice(0,120):typeof v==='number'&&Number.isFinite(v)?v:null;
/** Only problematic sales rows in the selected period. Never exports entire payloads. */
export function salesFieldDiagnostics(source:Source,start:string,end:string){
 const records:{buildingId:string|number|null;buildingName:string|number|null;typologyId:string|number|null;month:string;pattern:string|number|null;field:string;reason:string;valueType:string;rawValue:string|number|null;buildingIndex:number;historyIndex:number;previous:unknown;next:unknown}[]=[];
 const reasons:Record<string,number>={};let total=0;
 if(source.metric==='details')source.rows.forEach((building,buildingIndex)=>{
  const history=Array.isArray(building.typologies_history)?building.typologies_history as Row[]:[];
  history.forEach((row,historyIndex)=>{
   if(!row||typeof row!=='object')return;
   const month=String(row.period??'').slice(0,7);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month<start||month>end)return;
   const reason=salesFieldReason(row);if(!reason)return;total++;reasons[reason]=(reasons[reason]??0)+1;if(records.length>=100)return;
   const same=history.filter(r=>r&&String(r.typology_id??'')===String(row.typology_id??'')&&/^\d{4}-\d{2}/.test(String(r.period??''))).sort((a,b)=>String(a.period).localeCompare(String(b.period)));
   const neighbor=(before:boolean)=>{const candidates=same.filter(r=>before?String(r.period).slice(0,7)<month:String(r.period).slice(0,7)>month&&String(r.period).slice(0,7)<=end);const r=before?candidates.at(-1):candidates[0];return r?{month:String(r.period).slice(0,7),rawValue:scalar(r.sold_in_period),reason:salesFieldReason(r)}:null;};
   records.push({buildingId:scalar(building.building_id??building.id),buildingName:scalar(building.building_name??building.name),typologyId:scalar(row.typology_id),month,pattern:scalar(row.pattern),field:'sold_in_period',reason,valueType:row.sold_in_period===null?'null':typeof row.sold_in_period,rawValue:scalar(row.sold_in_period),buildingIndex,historyIndex,previous:neighbor(true),next:neighbor(false)});
  });
 });
 return {field:'sold_in_period',scope:{start,end},total,reasons,records,returned:records.length,omitted:total-records.length,limit:100,interpretation:'API content diagnostic, not proof of the upstream cause. Negative integer sales are valid. Missing values are not zero. Neighbor observations are context, never imputed.'};
}
