import type { FortalezaSelection } from './model';
import type { PriceSlideData } from './monthly-prices';
import { introMonth } from './intro-view';
import './intro-slides.css';
const quarterlyArtwork=import.meta.glob('./assets/quarterly/*.png',{eager:true,import:'default',query:'?url'}) as Record<string,string>;
const artwork=import.meta.glob('./assets/monthly/*.png',{eager:true,import:'default',query:'?url'}) as Record<string,string>;
const palette=['#3D2055','#42CCA2'];
const format=(value:number,percent=false)=>`${value.toLocaleString('pt-BR',{maximumFractionDigits:percent?1:0})}${percent?'%':''}`;
const change=(value:number|null)=>value===null?'—':`${value>0?'+':''}${format(value,true)}`;
export default function FortalezaMonthlyAnalysisSlide({page,selection,data,originalPage}:{page:number;selection:FortalezaSelection;data:PriceSlideData|null;originalPage?:number}) {
  const divider=[36,39,44].includes(page),ivv=page>=45,bar=page===37 || page>=40&&page<=43;
  const lines=data?.series??[],bars=data?.cities?.map(city=>({label:city.city,value:city.value}))??lines[0]?.points.map(point=>({label:point.label,value:point.value!}))??[];
  const values=data?.cities?.map(city=>city.value)??lines.flatMap(line=>line.points.map(point=>point.value!));
  const min=Math.min(0,...values),max=Math.max(1,...values,data?.average??0),top=270,bottom=535;
  const y=(value:number)=>bottom-(value-min)/(max-min)*230;
  const count=bar?bars.length:lines[0]?.points.length??1,step=1170/count,x=(index:number)=>55+step*(index+.5);
  return <svg className="fortaleza-intro-slide block aspect-video h-auto w-full" viewBox="0 0 1280 720" role="img" aria-label={`Fortaleza · slide ${originalPage??page}`}>
    <image href={originalPage?quarterlyArtwork[`./assets/quarterly/${originalPage}.png`]:artwork[`./assets/monthly/${page}.png`]} width={1280} height={720} aria-hidden="true"/>
    {divider?<text x={1180} y={580} textAnchor="end" fill="white" fontSize={20}>{selection.periodicity==='quarterly'?`${selection.position}º trimestre`:introMonth(selection.position)} de {selection.year}</text>:<>
      {page>=40&&page<=43&&<text x={57} y={57} fontSize={32} fontWeight={700} fill="#1B4059">PREÇO MÉDIO/M²</text>}
      <text x={page>=40&&page<=43?57:43} y={page>=40&&page<=43?86:220} fontSize={16} fill="#1B4059">{page>=40&&page<=43?'Região Metropolitana · ':''}{selection.periodicity==='quarterly'?`${selection.position}º trimestre`:introMonth(selection.position)} de {selection.year}{ivv?' · Residencial vertical':''}</text>
      {data?.status!=='ready'?<text aria-label="Análise mensal pendente" x={640} y={380} fontSize={25} textAnchor="middle" fill="#1B4059">Aguardando conferência da fonte</text>:<g aria-label={ivv?'IVV mensal': 'Preços históricos por m²'}>
        {!ivv&&data.changes.map((item,index)=><g key={index} fontSize={18} fill={palette[index]} fontWeight={700}><text x={100} y={145+index*27}>{change(item.year)} · mesmo {selection.periodicity==='quarterly'?'trimestre':'mês'} de {selection.year-1}</text><text x={1180} y={145+index*27} textAnchor="end">{change(item.month)} · {selection.periodicity==='quarterly'?'trimestre':'mês'} anterior</text></g>)}
        {originalPage===42&&lines[0]?.points[0]?.value&&<text x={640} y={145} textAnchor="middle" fontSize={18} fontWeight={700} fill={palette[0]}>{change((lines[0].points.at(-1)!.value!/lines[0].points[0].value-1)*100)} · mesmo trimestre de {selection.year-2}</text>}
        <line x1={45} x2={1230} y1={bottom} y2={bottom} stroke="#CCD4D7"/>
        {bar?bars.map((item,index)=><g key={item.label}><rect x={x(index)-step*.32} y={y(item.value)} width={step*.64} height={bottom-y(item.value)} fill={index>=bars.length-2&&page===37?'#A8A8A8':palette[0]}/><text x={x(index)} y={y(item.value)-12} fontSize={count>10?15:24} fontWeight={700} textAnchor="middle">{format(item.value)}</text><text x={x(index)} y={bottom+28} textAnchor="end" transform={count>10?`rotate(-45 ${x(index)} ${bottom+28})`:undefined} fontSize={count>10?14:20}>{item.label}</text></g>):lines.map((line,lineIndex)=><g key={line.label}><polyline fill="none" stroke={palette[lineIndex]} strokeWidth={4} points={line.points.map((point,index)=>`${x(index)},${y(point.value!)}`).join(' ')}/>{line.points.map((point,index)=><g key={point.month}><circle cx={x(index)} cy={y(point.value!)} r={4} fill={palette[lineIndex]}/><text x={x(index)} y={y(point.value!)+(lineIndex?22:-12)} textAnchor="middle" fontSize={ivv?12:15} fill={palette[lineIndex]}>{format(point.value!,ivv)}</text>{lineIndex===0&&<text x={x(index)} y={bottom+28} textAnchor="end" transform={`rotate(-50 ${x(index)} ${bottom+28})`} fontSize={13}>{point.label}</text>}</g>)}</g>)}
        {data.average!==undefined&&<g><line x1={45} x2={1230} y1={y(data.average)} y2={y(data.average)} stroke={palette[1]} strokeWidth={3}/><text x={1220} y={top-13} textAnchor="end" fontSize={18} fill="#26765F">{ivv?'Média mensal':'Média regional'}: {format(data.average,ivv)}</text></g>}
        <g fontSize={16}>{(lines.length?lines.map(line=>line.label):['Preço por m² da oferta final']).map((label,index)=><g key={label}><rect x={260+index*430} y={620} width={12} height={12} fill={palette[index]}/><text x={280+index*430} y={632}>{label}</text></g>)}</g>
      </g>}
    </>}
  </svg>;
}
