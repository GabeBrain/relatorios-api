import type { OfferPriceSlide } from './offer-price-data';

const palette = ['#5B7537', '#FFC000'];
const format = (value: number | null, unit: OfferPriceSlide['unit']) => value === null ? '—' : value.toLocaleString('pt-BR', {maximumFractionDigits:unit==='count'||unit==='money'?0:1}) + (unit==='percent'?'%':'');
function segments(values:(number|null)[],point:(value:number,index:number)=>string){
  const result:string[][]=[];let current:string[]=[];
  values.forEach((value,index)=>{if(value===null){if(current.length)result.push(current);current=[];}else current.push(point(value,index));});
  if(current.length)result.push(current);
  return result.map(points=>points.join(' '));
}
export default function MaceioOfferPriceChart({model}:{model:OfferPriceSlide}) {
  if(model.kind==='editorial')return null;
  if(model.emptyOffer)return <g data-maceio-chart data-maceio-empty><text x={640} y={360} textAnchor="middle" fontSize={25} fill="#425428">Sem oferta nos registros válidos dos fechamentos exibidos</text><text x={640} y={403} textAnchor="middle" fontSize={19} fill="#777">Este número de dormitórios não tem preço calculável na base coberta.</text></g>;
  if(model.kind==='shares'){
    const colors=['#425428','#829667','#FFC000','#B9CBA8'];
    return <g data-maceio-chart>{model.series.map((series,s)=><g key={series.label}>
      {series.values.map((value,i)=>{const height=(value??0)*3.5,before=series.values.slice(0,i).reduce<number>((sum,v)=>sum+(v??0),0)*3.5;return <g key={i}><rect x={340+s*420} y={530-before-height} width={170} height={height} fill={colors[i]}/>{height>20&&<text x={425+s*420} y={530-before-height/2+7} textAnchor="middle" fontSize={23} fill={i<2?'white':'#262626'}>{format(value,'percent')}</text>}</g>})}
      <text x={425+s*420} y={570} textAnchor="middle" fontSize={24}>{series.label}</text>
    </g>)}{model.groups.map((group,i)=><g key={group} transform={`translate(${160+i*270} 610)`}><rect y={-15} width={18} height={18} fill={colors[i]}/><text x={25} fontSize={18}>{group}</text></g>)}</g>;
  }
  if(model.unit==='months'){
    const max=Math.max(1,...model.series[0].values.filter((v):v is number=>v!==null));
    return <g data-maceio-chart>{model.groups.map((group,i)=>{const value=model.series[0].values[i],length=value===null?0:value/max*650;return <g key={group}><text x={320} y={220+i*55} textAnchor="end" fontSize={20}>{group}</text><rect x={335} y={201+i*55} height={22} width={length} fill={palette[0]}/><text x={347+length} y={220+i*55} fontSize={20} fontWeight={700}>{format(value,'months')}</text></g>})}</g>;
  }
  if(model.kind==='table'){
    const history=model.tableKind==='calendar',first=history?148:172,left=48,width=1184,labelWidth=history?142:180,cell=(width-labelWidth)/model.columns.length;
    const height=Math.min(38,420/(model.rows.length+1));
    return <g data-maceio-chart data-maceio-table>
      <rect x={left} y={first} width={width} height={height} fill="#D9D9D9"/>
      <text x={left+labelWidth/2} y={first+height*.65} textAnchor="middle" fontSize={15} fontWeight={700}>{history?'Mês':'Área útil'}</text>
      {model.columns.map((column,i)=><text key={column} x={left+labelWidth+cell*(i+.5)} y={first+height*.65} textAnchor="middle" fontSize={Math.min(15,cell/Math.max(1,column.length)*1.65)} fontWeight={700}>{column}</text>)}
      {model.rows.map((row,r)=><g key={row.label}>
        <rect x={left} y={first+height*(r+1)} width={width} height={height} fill={r===model.rows.length-1?'#D9D9D9':r%2?'#EDF2E6':'#FFF'} stroke="#D4D4D4" strokeWidth={.5}/>
        <text x={left+10} y={first+height*(r+1.68)} fontSize={history?14:17} fontWeight={r===model.rows.length-1?700:400}>{row.label}</text>
        {row.values.map((value,c)=><text key={c} x={left+labelWidth+cell*(c+.5)} y={first+height*(r+1.68)} textAnchor="middle" fontSize={history?14:17} fontWeight={r===model.rows.length-1?700:400}>{format(value,history||[2,4,6,7].includes(c)?'percent':'count')}</text>)}
      </g>)}
    </g>;
  }
  const values=model.series.flatMap(series=>series.values.filter((value):value is number=>value!==null)),min=Math.min(0,...values),max=Math.max(1,...values),top=230,bottom=520,left=80,right=1210;
  const y=(value:number)=>bottom-(value-min)/(max-min)*(bottom-top),step=(right-left)/model.groups.length;
  const seriesCount=model.series.length,bar=Math.min(72,step*.7/seriesCount),line=model.kind==='series';
  const variation=line&&model.price?model.series[0].values.map((v,i,all)=>i&&v!==null&&all[i-1]!==null&&all[i-1]!==0?(v/all[i-1]!-1)*100:null):[];
  const variationMax=Math.max(1,...variation.filter((v):v is number=>v!==null).map(Math.abs));
  return <g data-maceio-chart>
    <line x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="#D4D4D4"/>
    {model.series.map((series,s)=><g key={series.label}>
      {line&&!model.price&&segments(series.values,(v,i)=>`${left+step*(i+.5)},${y(v)}`).map((points,i)=><polyline key={i} fill="none" stroke={palette[s%2]} strokeWidth={4} points={points}/>)}
      {series.values.map((v,i)=>{const x=left+step*(i+.5)+(s-(seriesCount-1)/2)*bar;return <g key={i}>
        {v!==null&&(!line||model.price)&&<rect x={x-bar*.45} y={Math.min(y(v),y(0))} width={bar*.9} height={Math.max(1,Math.abs(y(v)-y(0)))} fill={palette[s%2]}/>}
        <text x={x} y={v===null?bottom-8:v>=0?y(v)-12:y(v)+20} textAnchor="middle" fontSize={line?14:Math.min(17,bar*.85/Math.max(1,format(v,model.unit).length)*1.6)} fill="#425428" fontWeight={700}>{format(v,model.unit)}</text>
      </g>})}
    </g>)}
    {model.averages?.map((average,i)=>average.value!==null&&<g key={average.label}><line x1={left} x2={right} y1={y(average.value)} y2={y(average.value)} stroke={i?'#856700':'#425428'} strokeWidth={3}/><rect x={right-90} y={y(average.value)-23-i*25} width={90} height={23} fill={i?'#856700':'#425428'}/><text x={right-45} y={y(average.value)-6-i*25} textAnchor="middle" fill="white" fontSize={17}>{format(average.value,model.unit)}</text></g>)}
    {variation.length>0&&<g data-maceio-price-variation>
      {segments(variation,(v,i)=>`${left+step*(i+.5)},${365-v/variationMax*80}`).map((points,i)=><polyline key={i} fill="none" stroke="#FFC000" strokeWidth={3} points={points}/>)}
      {variation.map((v,i)=>v!==null&&<text key={i} x={left+step*(i+.5)} y={355-v/variationMax*80} textAnchor="middle" fontSize={13} fill="#6B5300">{format(v,'percent')}</text>)}
    </g>}
    {model.groups.map((group,i)=><text key={group} x={left+step*(i+.5)} y={555} textAnchor={line?'end':'middle'} transform={line?`rotate(-45 ${left+step*(i+.5)} 555)`:undefined} fontSize={line?15:17}>{group}</text>)}
    <g transform="translate(210 610)" fontSize={18}>{model.series.map((series,s)=><g key={series.label} transform={`translate(${s*380} 0)`}><rect y={-15} width={20} height={18} fill={palette[s%2]}/><text x={30}>{series.label}</text></g>)}{variation.length>0&&<text x={430}>Variação entre fechamentos (%)</text>}</g>
  </g>;
}
