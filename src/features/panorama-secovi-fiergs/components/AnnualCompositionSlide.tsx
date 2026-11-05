import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LabelList } from 'recharts';
import type { AnnualComposition } from '../report/annual-composition';
import '../print/territorial-comparison.css';
const COLORS=['#5d7737','#ffc000','#4472c4','#a9c18b','#999999','#bf9000','#70ad47','#666666'];
export function AnnualCompositionSlide({block}:{block:AnnualComposition}) {
  const rows=block.years.filter((y)=>y.status==='ready').map((y)=>({year:y.from.startsWith('1T')&&y.through.startsWith('4T')?String(y.year):`${y.year} (${y.from.slice(0,2)}–${y.through.slice(0,2)})`,
    ...Object.fromEntries(y.values.map((v,i)=>[`c${i}`,v.share]))}));
  return <div className="panorama-territorial-slide"><header><h2>{block.title}</h2><i/></header><div className="panorama-territorial-price-plot"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{top:25,left:0,right:15,bottom:10}}>
    <XAxis dataKey="year" tickLine={false} interval={0}/><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`}/><Tooltip formatter={(v)=>`${Number(v).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`}/><Legend/>
    {block.categories.map((label,i)=><Bar key={label} dataKey={`c${i}`} name={label} stackId="annual" fill={COLORS[i%COLORS.length]} isAnimationActive={false}><LabelList dataKey={`c${i}`} position="center" fontSize={12} fill={i%3===1?'#20231d':'#fff'} formatter={(v:number)=>v>4?`${Math.round(v)}%`:''}/></Bar>)}
  </BarChart></ResponsiveContainer></div><footer>Fonte: Brain Inteligência Estratégica · Geobrain · Participação no total observado de cada ano</footer></div>;
}
