import layouts from './intro-layout.json';

interface Font { family: string; size: number; bold: boolean; italic: boolean; color: string }
interface Line { x: number; y: number; width: number; height: number; align: number; font: Font; text?: string; binding?: string; format?: string }
interface Cell { row: number; column: number; x: number; y: number; width: number; height: number; font: Font; text?: string; align: number; marginLeft: number; marginRight: number }
interface Shape { slot: string; x: number; y: number; width: number; height: number; lines?: Line[]; cells?: Cell[]; rows?: number; columns?: number }
export interface IntroLayout { number: number; shapes: Shape[] }
export const INTRO_LAYOUTS = layouts as unknown as Record<'junho' | 'julho', IntroLayout[]>;

/** Conservative glyph-width estimate; browser QA verifies the final font. */
export function introCellFont(text:string,width:number,height:number,maximum:number){
  if(!text)return maximum;
  for(let size=maximum;size>=6;size-=.5){
    const columns=Math.max(1,Math.floor(width/(size*.68)));let lines=0;
    for(const paragraph of text.split('\n')){
      let used=0;lines++;
      for(const word of paragraph.split(/\s+/).filter(Boolean)){
        if(used&&used+word.length+1>columns){lines++;used=0;}
        if(word.length>columns){lines+=Math.floor((word.length-1)/columns);used=(word.length-1)%columns+1;}
        else used+=word.length+(used?1:0);
      }
    }
    if(lines*size*1.15<=height)return size;
  }
  return 6;
}

export function introTablePlan(model:'junho'|'julho',page:number,total=0){
  const first=page<5?3:5,last=page<5?4:7;
  const native=INTRO_LAYOUTS[model].filter(layout=>layout.number>=first&&layout.number<=last).map(layout=>(layout.shapes.find(shape=>shape.slot==='table')?.rows??1)-1);
  const expanded=total>native.reduce((sum,value)=>sum+value,0),counts=expanded?native.map(()=>Math.min(24,Math.ceil(total/native.length))):native,index=page-first;
  return {expanded,rows:counts[index],offset:counts.slice(0,index).reduce((sum,value)=>sum+value,0),capacity:counts.reduce((sum,value)=>sum+value,0)};
}
export function introTableOffset(model: 'junho' | 'julho', page: number,total=0) {
  if(total)return introTablePlan(model,page,total).offset;
  const first = page < 5 ? 3 : 5;
  return INTRO_LAYOUTS[model].filter(layout => layout.number >= first && layout.number < page).reduce((sum, layout) => sum + (layout.shapes.find(shape => shape.slot === 'table')?.rows ?? 1) - 1, 0);
}
