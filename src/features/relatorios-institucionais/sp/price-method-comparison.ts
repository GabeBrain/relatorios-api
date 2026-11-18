import type { SpObservation } from './granular-details';

export interface SpPriceMethodComparison {
  slide:number; month:string; coverageIssue:string|null;
  population:{typologies:number;positiveStock:number;zeroStock:number;negativeStock:number;unknownStock:number};
  methods:{method:'stock-positive'|'quantity-all'|'simple-all';value:number|null;included:number;missing:number;weight:number|null}[];
}
/** Diagnostic alternatives only. Never selected automatically for a slide. */
export function compareSpPriceMethods(rows:SpObservation[],month:string,slide:number,coverageIssue:string|null):SpPriceMethodComparison {
  const bedroom=slide===55?1:slide===57?2:null;
  const selected=rows.filter(row=>(bedroom===null||row.bedrooms===bedroom)&&(bedroom===null||row.standard!=='Econômico'));
  const population={typologies:selected.length,positiveStock:0,zeroStock:0,negativeStock:0,unknownStock:0};
  for(const row of selected)population[row.stock===null?'unknownStock':row.stock>0?'positiveStock':row.stock===0?'zeroStock':'negativeStock']++;
  const methods=(['stock-positive','quantity-all','simple-all'] as const).map(method=>{
    const input=method==='stock-positive'?selected.filter(row=>row.stock!==null&&row.stock>0):selected;
    let numerator=0,weight=0,missing=0;
    for(const row of input){
      const w=method==='stock-positive'?row.stock:method==='quantity-all'?row.qty:1;
      if(w===null||!Number.isSafeInteger(w)||w<0){missing++;continue;}
      if(w===0)continue;
      if(row.meter===null||!Number.isFinite(row.meter)||row.meter<=0){missing++;continue;}
      numerator+=row.meter*w;weight+=w;
    }
    const safe=Number.isSafeInteger(weight)&&weight>0&&Number.isFinite(numerator)&&numerator<=Number.MAX_SAFE_INTEGER/100;
    return {method,value:!missing&&safe?numerator/weight:null,included:input.length,missing,weight:safe?weight:null};
  });
  return {slide,month,coverageIssue,population,methods};
}
