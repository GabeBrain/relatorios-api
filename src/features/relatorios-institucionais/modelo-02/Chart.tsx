import type {ChartPanel} from './presentation';
import {formatValue} from './format';

/** Geometry is driven solely by the same chart panel sent to the PPTX writer. */
export function Chart({chart}:{chart:ChartPanel}){
 const {table,box,kind,colors}=chart,{x,y,w,h}=box,rows=table.rows,n=Math.max(1,rows.length),series=table.columns.length;
 const values=rows.flatMap(r=>r.values.filter((v):v is number=>typeof v==='number'));
 const min=Math.min(0,...values),max=chart.percent?100:Math.max(1,...(chart.stacked?rows.map(r=>r.values.reduce<number>((a,v)=>a+Number(v),0)):values)),range=max-min||1,py=(v:number)=>y+h-(v-min)/range*h,zero=py(0);
 const color=(j:number)=>colors[j%colors.length];
 const segments:number[][]=[];let current:number[]=[];
 rows.forEach((row,i)=>{if(row.values.some(v=>v===null)){if(current.length)segments.push(current);current=[];}else current.push(i);});if(current.length)segments.push(current);
 if(kind==='pie'){
  const total=rows.reduce((n,r)=>n+Math.max(0,Number(r.values[0])),0),radius=Math.min(w,h)/2,cx=x+w/2,cy=y+h/2;let angle=-Math.PI/2;
  return <g data-modelo02-chart="true">{total>0?rows.map((row,i)=>{const value=Math.max(0,Number(row.values[0])),a=angle,b=a+value/total*Math.PI*2;angle=b;const end=b-a>=Math.PI*2?b-.00001:b,mid=(a+b)/2;return <g key={i}><path d={`M ${cx} ${cy} L ${cx+radius*Math.cos(a)} ${cy+radius*Math.sin(a)} A ${radius} ${radius} 0 ${b-a>Math.PI?1:0} 1 ${cx+radius*Math.cos(end)} ${cy+radius*Math.sin(end)} Z`} fill={color(i)} stroke="white"/>{value/total>=.05&&<text x={cx+radius*.66*Math.cos(mid)} y={cy+radius*.66*Math.sin(mid)} textAnchor="middle" fontSize="11" fill="white">{formatValue(value,'percent')}</text>}</g>;}):<text x={cx} y={cy} textAnchor="middle" fontSize="14" fill="#555">Sem base para participação</text>}</g>;
 }
 return <g data-modelo02-chart="true">
  <line x1={x} x2={x+w} y1={zero} y2={zero} stroke="#bbb"/>
  {kind==='stacked-area'?<>
   {Array.from({length:series},(_,j)=>segments.map((indexes,k)=>{
    const upper=indexes.map(i=>[x+i*w/Math.max(1,n-1),py(rows[i].values.slice(0,j+1).reduce<number>((a,v)=>a+Number(v),0))]);
    const lower=[...indexes].reverse().map(i=>[x+i*w/Math.max(1,n-1),py(rows[i].values.slice(0,j).reduce<number>((a,v)=>a+Number(v),0))]);
    return <polygon key={`${j}-${k}`} points={[...upper,...lower].map(p=>p.join(',')).join(' ')} fill={color(j)}/>;
   }))}
   {rows.map((r,i)=><g key={i}>{r.values.map((v,j)=>typeof v==='number'&&v>=8?<text key={j} x={x+i*w/Math.max(1,n-1)} y={py(r.values.slice(0,j).reduce<number>((a,n)=>a+Number(n),0)+v/2)+4} textAnchor="middle" fontSize="12" fill={color(j)==='#206082'?'white':'#333'}>{formatValue(v,'percent')}</text>:null)}<text x={x+i*w/Math.max(1,n-1)} y={y+h+24} fontSize="13" textAnchor="middle" fill="#444">{r.label}</text>{r.values.some(v=>v===null)&&<text x={x+i*w/Math.max(1,n-1)} y={y+h/2} fontSize="12" textAnchor="middle" fill="#555">Sem dado</text>}</g>)}
  </>:kind==='bars'?rows.map((row,i)=>{
   const value=row.values[0],height=h/n,bx=x+260,bw=w-300,barZero=bx+(0-min)/range*bw;
   return <g key={i}><text x={x+250} y={y+(i+.6)*height} textAnchor="end" fontSize="15" fill="#333">{row.label}</text>{typeof value==='number'&&<rect x={Math.min(barZero,bx+(value-min)/range*bw)} y={y+i*height+4} width={Math.abs(value)/range*bw} height={Math.max(4,height-10)} fill={color(0)}/>}<text x={bx+bw+8} y={y+(i+.6)*height} fontSize="14" fill="#333">{formatValue(value,table.formats[0])}</text></g>;
  }):rows.map((row,i)=>{
   const group=w/n,bw=group*.75/Math.max(1,chart.stacked?1:series-(chart.lineSeries?.length??0));
   return <g key={i}>{row.values.map((value,j)=>{if(chart.lineSeries?.includes(j))return null;const cx=x+i*group+group*.12+(chart.stacked?0:j)*bw,base=chart.stacked?row.values.slice(0,j).reduce<number>((a,v)=>a+Number(v),0):0,top=typeof value==='number'?base+value:0;return <g key={j}>{typeof value==='number'&&<rect x={cx} y={Math.min(py(top),py(base))} width={bw*.85} height={Math.max(.5,Math.abs(py(base)-py(top)))} fill={color(series===1?i:j)}/>}<text x={cx+bw*.4} y={typeof value==='number'?chart.stacked?py(base+value/2)+4:py(value)+(value>=0?-8:20):zero-12} textAnchor="middle" fontSize={series>1?11:14} fill="#333">{formatValue(value,table.formats[j])}</text></g>;})}<text x={x+(i+.5)*group} y={y+h+24} textAnchor="middle" fontSize="13" fill="#444">{row.label}</text></g>;
  })}
  {chart.lineSeries?.map(j=>segments.map((indexes,k)=><polyline key={`${j}-${k}`} points={indexes.map(i=>`${x+(i+.5)*w/n},${py(Number(rows[i].values[j]))}`).join(' ')} fill="none" stroke={color(j)} strokeWidth="4"/>))}
  {kind!=='bars'&&series>1&&table.columns.map((name,j)=><g key={name}><rect x={x+j*w/series} y={y+h+48} width="12" height="12" fill={color(j)}/><text x={x+j*w/series+18} y={y+h+59} fontSize="13" fill="#444">{name}</text></g>)}
 </g>;
}
