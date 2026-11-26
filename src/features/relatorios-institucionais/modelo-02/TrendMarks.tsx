import type {ReactElement} from 'react';
import {columnGeometry,type ChartPanel,type Trend} from './presentation';
import {signedPercent} from './format';
import {textWidth} from './text-metrics';

const INK='#7f6000';
/** Horizontal block arrow with the variation inside, as in the originals (always left→right). */
function BlockArrow({from,to,y,label}:{from:number;to:number;y:number;label:string}){
 const head=26,body=15,wing=25,neck=to-head;
 return <g aria-label={`Variação ${label}`}><polygon points={`${from},${y-body} ${neck},${y-body} ${neck},${y-wing} ${to},${y} ${neck},${y+wing} ${neck},${y+body} ${from},${y+body}`} fill={INK}/><text x={(from+neck)/2} y={y+6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#ffffff">{label}</text></g>;
}
/**
 * Comparisons over the quarterly family. Values come from the same cells as CSV/JSON; a mark is drawn
 * only when both bases are valid (trend value not null). Missing quarters are labelled, never drawn as zero.
 * Painted after the native charts in the PPTX (data-modelo02-overlay).
 */
export function TrendMarks({charts,trend}:{charts:ChartPanel[];trend:Trend}){
 const [quarters,accumulated]=charts;if(!quarters)return null;
 const g=columnGeometry(quarters),values=quarters.table.rows.map(r=>r.values[0]),n=values.length;
 const marks:ReactElement[]=[];
 const panels:[ChartPanel,ReturnType<typeof columnGeometry>][]=[[quarters,g],...accumulated?[[accumulated,columnGeometry(accumulated)] as [ChartPanel,ReturnType<typeof columnGeometry>]]:[]];
 for(const [chart,geometry] of panels)
  chart.table.rows.forEach((row,i)=>{if(typeof row.values[0]!=='number')marks.push(<text key={`gap-${chart.box.x}-${i}`} x={geometry.center(i)} y={geometry.bottom-12} textAnchor="middle" fontSize="13" fontStyle="italic" fill="#767676">Sem dado</text>);});
 if(trend.annual!==null&&n>=5&&typeof values[n-5]==='number'&&typeof values[n-1]==='number'){
  const a=n-5,b=n-1,left=g.center(a),right=g.center(b),topA=g.valueY(values[a] as number),topB=g.valueY(values[b] as number);
  const peak=Math.min(...values.slice(a,b+1).map(v=>typeof v==='number'?g.valueY(v):g.bottom));
  const line=Math.max(g.top-28,peak-44),label=signedPercent(trend.annual),width=Math.max(84,textWidth(label,19,true)+30),mid=(left+right)/2;
  marks.push(<g key="annual" aria-label={`Variação anual ${label}`}><polyline points={`${left},${topA-10} ${left},${line} ${right},${line} ${right},${topB-16}`} fill="none" stroke={INK} strokeWidth="2"/><polygon points={`${right-7},${topB-18} ${right+7},${topB-18} ${right},${topB-6}`} fill={INK}/><rect x={mid-width/2} y={line-15} width={width} height={30} rx={5} fill={INK}/><text x={mid} y={line+7} textAnchor="middle" fontSize="19" fontWeight="700" fill="#ffffff">{label}</text></g>);
 }
 if(trend.quarter!==null&&n>=2)marks.push(<BlockArrow key="quarter" from={g.center(n-2)-g.bar*.25} to={g.center(n-1)+g.bar/2+18} y={g.bottom-30} label={signedPercent(trend.quarter)}/>);
 if(accumulated&&trend.accumulated!==null){const h=columnGeometry(accumulated);marks.push(<BlockArrow key="accumulated" from={h.center(0)-h.bar*.25} to={h.center(1)+h.bar/2+18} y={h.bottom-30} label={signedPercent(trend.accumulated)}/>);}
 return <g data-modelo02-overlay="true">{marks}</g>;
}
