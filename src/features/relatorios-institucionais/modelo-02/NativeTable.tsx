/** SVG table that the PPTX exporter turns into an editable DrawingML table (data-native-table contract). */
export interface NativeCell {text:string;fill:string;color?:string;bold?:boolean;align?:'left'|'center'|'right';size?:number;padding?:[number,number]}
export function NativeTable({x,y,widths,heights,cells,label}:{x:number;y:number;widths:number[];heights:number[];cells:NativeCell[][];label?:string}){
 const offset=(values:number[],i:number)=>values.slice(0,i).reduce((a,b)=>a+b,0);
 return <g data-native-table="true" aria-label={label}>{cells.map((row,i)=>row.map((cell,j)=>{
  const cx=x+offset(widths,j),cy=y+offset(heights,i),[left,right]=cell.padding??[8,8];
  return <g data-native-cell={`${i}:${j}`} key={`${i}-${j}`}><rect x={cx} y={cy} width={widths[j]} height={heights[i]} fill={cell.fill}/><foreignObject x={cx} y={cy} width={widths[j]} height={heights[i]}><div style={{display:'flex',alignItems:'center',justifyContent:cell.align==='left'?'flex-start':cell.align==='right'?'flex-end':'center',height:'100%',padding:`0 ${right}px 0 ${left}px`,boxSizing:'border-box',textAlign:cell.align??'center',fontFamily:'Arial, sans-serif',fontSize:cell.size??14,lineHeight:1.1,color:cell.color??'#262626',fontWeight:cell.bold?700:400}}><span title={cell.text}>{cell.text}</span></div></foreignObject></g>;
 }))}</g>;
}
