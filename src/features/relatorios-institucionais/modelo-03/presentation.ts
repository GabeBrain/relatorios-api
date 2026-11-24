import type {Slide,Table} from './types';
export interface PresentationPage {slide:Slide;table:Table|null;supplement?:Table;part:number;parts:number}
export function presentationPages(slides:Slide[]):PresentationPage[]{
 return slides.flatMap(slide=>{
  if(!slide.tables.length)return [{slide,table:null,part:1,parts:1}];
  if(slide.tables.length===2&&chartable(slide.tables[0])&&slide.tables[1].rows.length===1&&slide.tables[1].rows[0].label.startsWith('Variação'))return [{slide,table:slide.tables[0],supplement:slide.tables[1],part:1,parts:1}];
  const tables=slide.tables.flatMap(t=>chartable(t)?[t]:Array.from({length:Math.max(1,Math.ceil(t.rows.length/14))},(_,i)=>({...t,rows:t.rows.slice(i*14,(i+1)*14)})));
  return tables.map((table,i)=>({slide,table,part:i+1,parts:tables.length}));
 });
}
export const fmt=(value:number|string|null,format:Table['formats'][number]='count')=>value===null?'—':typeof value==='string'?value:new Intl.NumberFormat('pt-BR',{minimumFractionDigits:format==='percent'||format==='decimal'?1:0,maximumFractionDigits:format==='percent'||format==='decimal'?1:0}).format(value)+(format==='percent'?'%':'');
export function chartable(t:Table|null){return !!t&&t.columns.length<=2&&new Set(t.formats).size===1&&t.rows.length>1&&t.rows.length<=20&&t.rows.every(r=>r.values.every(v=>typeof v==='number'&&v>=0));}
