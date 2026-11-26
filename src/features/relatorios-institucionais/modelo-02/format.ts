export const formatValue=(v:unknown,f='count')=>v===null?'—':typeof v!=='number'?String(v):new Intl.NumberFormat('pt-BR',{maximumFractionDigits:f==='count'?0:f==='percent'?1:2}).format(v)+(f==='percent'?'%':'');
/** Fixed-precision number for chart labels (same digits as the native data-label format). */
export const formatDigits=(v:number,digits=0)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(v);
const rounded=(v:number)=>Math.round(v*10)/10;
/** Direction as displayed (one decimal): a value shown as 0% is neither growth nor decline. */
export const direction=(v:number|null|undefined):'up'|'down'|'flat'|null=>typeof v!=='number'||!Number.isFinite(v)?null:rounded(v)===0?'flat':v>0?'up':'down';
export const signedPercent=(v:number|null|undefined)=>typeof v!=='number'||!Number.isFinite(v)?'—':rounded(v)===0?'0%':`${v>0?'+':''}${formatValue(v,'percent')}`;
/** Percent as in the highlight tables of the originals: negative sign only. */
export const plainPercent=(v:number|null|undefined)=>typeof v!=='number'||!Number.isFinite(v)?'—':rounded(v)===0?'0%':formatValue(v,'percent');
