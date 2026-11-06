import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Customized } from 'recharts';
import type { AnnualComposition } from '../report/annual-composition';
import '../print/territorial-comparison.css';
import { territorialHeading } from '../report/editorial-contracts';
const COLORS=['#5d7737','#ffc000','#4472c4','#a9c18b','#999999','#bf9000','#70ad47','#666666'];
type LabelAxes = {
  xAxisMap?: Record<string, { scale: (value: string) => number }>;
  yAxisMap?: Record<string, { scale: (value: number) => number }>;
};
export function AnnualCompositionSlide({block}:{block:AnnualComposition}) {
  // Preserve uncovered years as gaps instead of visually interpolating missing observations.
  const rows=block.years.map((y)=>({year:y.from.startsWith('1T')&&y.through.startsWith('4T')?String(y.year):`${y.year} (${y.from.slice(0,2)}–${y.through.slice(0,2)})`,
    ...Object.fromEntries(block.categories.map((_,i)=>[`c${i}`,y.status==='ready'?y.values[i]?.share??null:null]))}));
  const ready=block.years.filter((year)=>year.status==='ready');
  const single=ready.length===1?ready[0]:null;
  const isolated=block.years.flatMap((year,index)=>year.status==='ready'&&block.years[index-1]?.status!=='ready'&&block.years[index+1]?.status!=='ready'?[index]:[]);
  const labels=({xAxisMap,yAxisMap}:LabelAxes)=>{
    const xScale=xAxisMap?.[0]?.scale,yScale=yAxisMap?.[0]?.scale;
    if(!xScale||!yScale)return null;
    return <g className="panorama-annual-share-labels">{isolated.map((index)=>{
      let cumulative=0;
      return block.years[index].values.map((v,i)=>{
        if(v.share===null)return null;
        const top=yScale(cumulative+v.share),bottom=yScale(cumulative);cumulative+=v.share;
        return <rect key={`${index}-${i}`} data-isolated-year={block.years[index].year} x={xScale(rows[index].year)-5} y={top} width={10} height={Math.max(0,bottom-top)} fill={COLORS[i%COLORS.length]}/>;
      });
    })}{rows.flatMap((row,index)=>{
      let cumulative=0;
      return block.categories.map((_,i)=>{
        const share=row[`c${i}` as keyof typeof row];
        if(typeof share!=='number')return null;
        const center=cumulative+share/2;cumulative+=share;
        if(share<=4)return null;
        return <text key={`${index}-${i}`} x={xScale(row.year)} y={yScale(center)} textAnchor={index===0||block.years[index-1]?.status!=='ready'?'start':index===rows.length-1||block.years[index+1]?.status!=='ready'?'end':'middle'} dominantBaseline="middle" stroke={isolated.includes(index)?'#fff':undefined} strokeWidth={isolated.includes(index)?3:undefined} paintOrder="stroke" style={{fontSize:'1.1cqw',fontWeight:700,fill:isolated.includes(index)||[1,3,4,6].includes(i%COLORS.length)?'#20231d':'#fff'}}>{Math.round(share)}%</text>;
      });
    })}</g>;
  };
  return <div className="panorama-territorial-slide"><header><h2>{territorialHeading(block.title).title}<span>{territorialHeading(block.title).subtitle}</span></h2></header><div className="panorama-territorial-price-plot">{single ? <div className="panorama-annual-single" data-annual-single-year={single.year}>
    <h3>{rows[block.years.indexOf(single)].year}</h3>
    <div className="panorama-annual-single-band">{single.values.map((v,i)=><div key={v.label} title={`${v.label}: ${v.share?.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`} style={{width:`${v.share??0}%`,background:COLORS[i%COLORS.length],color:[1,3,4,6].includes(i%COLORS.length)?'#20231d':'#fff'}}>{(v.share??0)>4?`${Math.round(v.share!)}%`:''}</div>)}</div>
    <div className="panorama-annual-single-legend">{single.values.map((v,i)=><span key={v.label}><i style={{background:COLORS[i%COLORS.length]}}/>{v.label}: {v.share?.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</span>)}</div>
  </div> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={rows} margin={{top:25,left:0,right:15,bottom:10}}>
    <XAxis dataKey="year" tickLine={false} interval={0} padding={{left:10,right:10}} tick={({x,y,index,payload})=><text x={x} y={Number(y)+15} textAnchor={index===0?'start':index===rows.length-1?'end':'middle'} fill="#5f625c" style={{fontSize:'.95cqw'}}>{payload.value}</text>}/><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`}/><Tooltip formatter={(v)=>`${Number(v).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`}/><Legend iconType="square"/>
    {block.categories.map((label,i)=><Area key={label} type="linear" dataKey={`c${i}`} name={label} stackId="annual" fill={COLORS[i%COLORS.length]} fillOpacity={1} stroke="none" legendType="square" connectNulls={false} isAnimationActive={false}/>)}
    <Customized component={labels}/>
  </AreaChart></ResponsiveContainer>}</div><footer>Fonte: Brain Inteligência Estratégica · Geobrain · Participação no total observado de cada ano</footer></div>;
}
