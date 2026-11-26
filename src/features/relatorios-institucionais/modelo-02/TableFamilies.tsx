import type {ReactElement} from 'react';
import {NativeTable,type NativeCell} from './NativeTable';
import {formatValue,signedPercent,direction} from './format';
import {textWidth,wrapByWidth,contrastText} from './text-metrics';
import {columnGeometry,CATEGORY_SPACE,STATE_COLORS,type ChartPanel,type Presentation} from './presentation';
import type {Table} from './types';

const GREEN='#5b7536',GREY='#d9d9d9',LIGHT='#f2f2f2',INK='#262626';
const fit=(text:string,size:number,width:number,bold=true)=>Math.max(9,Math.min(size,size*(width-10)/Math.max(1,textWidth(text,size,bold))));

/** "Unidades lançadas/vendidas - Por estado" as in the originals. */
export function StateTable({table,presentation}:{table:Table;presentation:Presentation}){
 const n=table.columns.length,first=158,variationWidth=124,count=n-3,valueWidth=(1110-first-3*variationWidth)/(count),widths=[first,...Array(count).fill(valueWidth),...Array(3).fill(variationWidth)],x=(1280-widths.reduce((a,b)=>a+b,0))/2,y=table.rows.length>6?172:262;
 const emphasis=new Set(presentation.emphasisColumns??[]);
 const header:NativeCell[]=[{text:'Estado',fill:GREEN,color:'#ffffff',bold:true,size:14},...table.columns.map((c,j)=>({text:c,fill:GREEN,color:'#ffffff',bold:true,size:j>=count?12.5:fit(c,14,widths[j+1]),padding:[3,3] as [number,number]}))];
 const rows=table.rows.map(r=>{const total=r.label==='Total';return [{text:r.label,fill:total?GREY:LIGHT,bold:true,size:fit(r.label,14,first)},...r.values.map((v,j)=>({text:formatValue(v,table.formats[j]),fill:total?GREY:'#ffffff',bold:total||emphasis.has(j),size:14,color:INK}))];});
 const height=table.rows.length>8?30:37,bottom=y+44+table.rows.length*height;
 const lines=(presentation.bullets??[]).flatMap(b=>wrapByWidth(b,19,1050).map((text,k)=>({text,first:k===0})));
 return <g><NativeTable x={x} y={y} widths={widths} heights={[44,...table.rows.map(()=>height)]} cells={[header,...rows]} label="Quadro por estado"/>
  {lines.map((line,i)=><g key={i}>{line.first&&<text x="98" y={bottom+52+i*28} fontSize="19" fill={INK}>•</text>}<text x="124" y={bottom+52+i*28} fontSize="19" fill={INK}>{line.text}</text></g>)}</g>;
}

/** "Oferta final por padrão/tipologia": state columns, total and bordered participation column, data callout. */
export function ShareTable({table,presentation,firstHeader}:{table:Table;presentation:Presentation;firstHeader:string}){
 const color=presentation.headerColor??GREEN,text=contrastText(color),n=table.columns.length,first=Math.max(150,Math.min(230,Math.max(...table.rows.map(r=>textWidth(r.label,14)))+30)),cell=Math.min(118,(1000-first)/n),widths=[first,...Array(n).fill(cell)];
 const total=widths.reduce((a,b)=>a+b,0),placement=presentation.calloutPlacement??'top',x=placement==='right'?Math.max(40,(1000-total)/2):(1280-total)/2,y=placement==='bottom'?172:198,height=table.rows.length>10?28:36;
 const emphasis=new Set(presentation.emphasisColumns??[]);
 const header:NativeCell[]=[{text:firstHeader,fill:color,color:text,bold:true,size:fit(firstHeader,14,first)},...table.columns.map((c,j)=>({text:c,fill:color,color:text,bold:true,size:emphasis.has(j)?13:fit(c,14,cell*1.8),padding:[3,3] as [number,number]}))];
 const rows=table.rows.map(r=>{const sum=r.label==='Total geral';return [{text:r.label,fill:sum?GREY:'#ffffff',bold:sum,size:14,color:INK},...r.values.map((v,j)=>({text:formatValue(v,table.formats[j]),fill:sum?GREY:'#ffffff',bold:sum,size:14,color:INK}))];});
 const heights=[44,...table.rows.map(()=>height)],bottom=y+heights.reduce((a,b)=>a+b,0),columnX=x+widths.slice(0,1+Math.max(...(presentation.emphasisColumns??[n-1]))).reduce((a,b)=>a+b,0);
 const callout=presentation.callout,box=placement==='top'?{x:912,y:46,w:344,size:19}:placement==='right'?{x:x+total+50,y:250,w:Math.max(200,1240-(x+total+50)),size:19}:{x,y:bottom+24,w:total,size:17};
 const lines=callout?wrapByWidth(callout,box.size,box.w-28):[],boxHeight=lines.length*box.size*1.25+22;
 return <g><NativeTable x={x} y={y} widths={widths} heights={heights} cells={[header,...rows]} label="Oferta final"/>
  {presentation.emphasisColumns?.length&&<rect x={columnX} y={y} width={widths[presentation.emphasisColumns[0]+1]} height={bottom-y} fill="none" stroke="#262626" strokeWidth="2.5"/>}
  {callout&&<g><rect x={box.x} y={box.y} width={box.w} height={boxHeight} rx="14" fill={GREEN}/>{lines.map((line,i)=><text key={i} x={box.x+box.w/2} y={box.y+11+box.size*(i+1)*1.18} textAnchor="middle" fontSize={box.size} fill="#ffffff">{line}</text>)}</g>}</g>;
}

/** Simple bar-chart icon with trend arrow, coloured by direction (editable shapes). */
function TrendIcon({x,y,dir}:{x:number;y:number;dir:ReturnType<typeof direction>}){
 const color=dir==='up'?'#6aa040':dir==='down'?'#c00000':'#8c8c8c',bars=dir==='down'?[52,36,20]:[20,36,52];
 return <g><polyline points={`${x},${y} ${x},${y+70} ${x+70},${y+70}`} fill="none" stroke={color} strokeWidth="5"/>{bars.map((h,i)=><rect key={i} x={x+12+i*19} y={y+64-h} width="13" height={h} fill={color}/>)}
  {dir==='down'?<><line x1={x+34} y1={y+4} x2={x+62} y2={y+30} stroke={color} strokeWidth="4"/><polygon points={`${x+66},${y+34} ${x+52},${y+32} ${x+64},${y+20}`} fill={color}/></>:dir==='up'?<><line x1={x+14} y1={y+34} x2={x+56} y2={y+6} stroke={color} strokeWidth="4"/><polygon points={`${x+64},${y} ${x+50},${y+2} ${x+58},${y+14}`} fill={color}/></>:<line x1={x+14} y1={y+14} x2={x+62} y2={y+14} stroke={color} strokeWidth="4"/>}</g>;
}
/** Lançamentos, vendas e estoque: comparison caption and one indicator per series. */
export function ComparisonPanel({presentation}:{presentation:Presentation}){
 return <g><rect x="746" y="140" width="378" height="56" rx="8" fill="#ffffff" stroke="#262626" strokeWidth="1.2"/><text x="935" y="176" textAnchor="middle" fontSize="21" fontWeight="700" fill={INK}>{presentation.caption}</text>
  {presentation.indicators?.map((indicator,i)=>{const dir=direction(indicator.value),color=dir==='up'?'#6aa040':dir==='down'?'#c00000':'#595959',y=242+i*118;return <g key={indicator.label}><TrendIcon x={775} y={y} dir={dir}/><text x="856" y={y+22} fontSize="19" fontWeight="700" fill={INK}>{indicator.label}</text><text x="856" y={y+60} fontSize="20" fontWeight="700" fill={color}>{indicator.value===null?'Sem base comparável':signedPercent(indicator.value).replace(/^([+-])/,'$1 ')}</text></g>;})}</g>;
}

/** Deviation of each bar from the simultaneous mean (not annual appreciation), drawn over the native chart. */
export function DeviationMarks({chart,mean}:{chart:ChartPanel;mean:number|null}){
 const g=columnGeometry(chart),marks:ReactElement[]=[];
 const legendY=g.bottom+CATEGORY_SPACE+24,legendX=chart.box.x+chart.box.w/2-260;
 chart.table.columns.forEach((name,j)=>marks.push(<g key={`legend-${j}`}><rect x={legendX+j*280} y={j?legendY-8:legendY-12} width={j?26:14} height={j?5:14} fill={chart.colors[j]}/><text x={legendX+j*280+(j?32:20)} y={legendY} fontSize="14" fill="#444">{name}</text></g>));
 if(mean===null)return <g data-modelo02-overlay="true">{marks}</g>;
 const lineY=g.valueY(mean),last=g.center(chart.table.rows.length-1);
 marks.push(<text key="mean" x={last+g.bar/2+14} y={lineY+6} fontSize="17" fontWeight="700" fill="#ffc000">{formatValue(mean,'count')}</text>);
 chart.table.rows.forEach((row,i)=>{const value=row.values[0];if(typeof value!=='number'||mean<=0)return;const deviation=(value/mean-1)*100,dir=direction(deviation),cx=g.center(i),top=Math.min(g.valueY(value),lineY)-10,color=dir==='up'?STATE_COLORS.up:STATE_COLORS.down;
  if(dir==='flat'){marks.push(<text key={i} x={cx} y={top-8} textAnchor="middle" fontSize="20" fontWeight="700" fill="#595959">0%</text>);return;}
  const arrow=dir==='up'?`${cx},${top-44} ${cx+13},${top-28} ${cx+6},${top-28} ${cx+6},${top-4} ${cx-6},${top-4} ${cx-6},${top-28} ${cx-13},${top-28}`:`${cx},${top} ${cx+13},${top-16} ${cx+6},${top-16} ${cx+6},${top-40} ${cx-6},${top-40} ${cx-6},${top-16} ${cx-13},${top-16}`;
  marks.push(<g key={i}><polygon points={arrow} fill={color}/><text x={cx} y={top-54} textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{signedPercent(deviation)}</text></g>);});
 return <g data-modelo02-overlay="true">{marks}</g>;
}
