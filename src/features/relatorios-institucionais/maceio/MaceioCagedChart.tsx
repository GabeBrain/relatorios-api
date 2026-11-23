import type {CagedSlideModel,CagedTableRow} from './caged';

const colors=['#98B854','#FFC000','#829667','#C5D6AB','#C74B4B','#8CA9D3','#D28D8D'];
const number=(v:number|null,percent=false)=>v===null?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:percent?1:0})+(percent?'%':'');
function Table({rows,labels,top=150,height=470,labelWidth=85}:{rows:CagedTableRow[];labels:string[];top?:number;height?:number;labelWidth?:number}){
  const left=30,width=1220,rowHeight=height/(rows.length+1),cell=(width-labelWidth)/labels.length;
  return <g data-caged-table fontSize={Math.min(14,rowHeight*.7)}><rect x={left} y={top} width={width} height={rowHeight} fill="#D9D9D9"/>
    {labels.map((label,i)=><text key={i} x={left+labelWidth+(i+.5)*cell} y={top+rowHeight*.72} textAnchor="middle" fontWeight={700}>{label}</text>)}
    {rows.map((row,r)=><g key={row.label}>
      <rect x={left} y={top+(r+1)*rowHeight} width={width} height={rowHeight} fill={r%2?'white':'#F0F3EB'} stroke={row.label==='AL'||row.label.startsWith('AL ·')?'#5B7537':'#DDD'} strokeWidth={row.label.startsWith('AL')?2:.5}/>
      <text x={left+labelWidth-8} y={top+(r+1.72)*rowHeight} textAnchor="end" fontWeight={row.label.startsWith('AL')?700:400}>{row.label}</text>
      {row.values.map((v,i)=><text key={i} x={left+labelWidth+(i+.5)*cell} y={top+(r+1.72)*rowHeight} textAnchor="middle" fill={v!==null&&v<0?'#C00000':'#262626'}>{number(v,row.percent||labels[i]==='Variação %')}</text>)}
    </g>)}
  </g>;
}
function Summary({model}:{model:CagedSlideModel}){
  const series=model.rows.slice(0,2),labels=model.labels.slice(0,-1),values=series.flatMap(row=>row.values.slice(0,-1)).filter((v):v is number=>v!==null),max=Math.max(1,...values),min=Math.min(0,...values),y=(v:number)=>420-(v-min)/(max-min)*285,step=850/labels.length,left=210;
  return <g><line x1={left} x2={left+850} y1={y(0)} y2={y(0)} stroke="#999"/>
    {labels.map((label,i)=><g key={i}>
      {series.map((row,k)=>{const v=row.values[i],x=left+i*step+k*step*.34+step*.1;return <g key={row.label}>
        {v!==null&&<rect x={x} y={Math.min(y(v),y(0))} width={step*.3} height={Math.max(1,Math.abs(y(v)-y(0)))} fill={colors[k]}/>}
        <text x={x+step*.15} y={v===null?y(0)-8:v>=0?y(v)+12:y(v)-10} transform={`rotate(-90 ${x+step*.15} ${v===null?y(0)-8:v>=0?y(v)+12:y(v)-10})`} textAnchor={v!==null&&v<0?'start':'end'} fontSize={12} fill={v!==null&&v<0?'#C00000':'#262626'}>{number(v)}</text>
      </g>;})}
      <text x={left+(i+.45)*step} y={475} textAnchor="middle" fontSize={13} fontWeight={700}>{label}</text>
    </g>)}
    {series.map((row,i)=><g key={row.label}><rect x={470+i*180} y={498} width={10} height={10} fill={colors[i]}/><text x={486+i*180} y={507} fontSize={13}>{row.label}</text></g>)}
    <Table rows={model.rows} labels={model.labels} top={535} height={92} labelWidth={160}/>
  </g>;
}
function Sectors({model}:{model:CagedSlideModel}){
  const values=model.rows.flatMap(row=>row.values).filter((v):v is number=>v!==null),max=Math.max(1,...values),min=Math.min(0,...values),y=(v:number)=>510-(v-min)/(max-min)*330,left=110,step=1050/5,width=150/7;
  return <g><line x1={left} x2={1180} y1={y(0)} y2={y(0)} stroke="#AAA"/>
    {model.rows.map((row,r)=><g key={row.label}>{row.values.map((v,i)=>{const x=left+r*step+i*width,labelY=v===null?y(0)-6:v>=0?y(v)-8:y(v)-6;return <g key={i}>{v!==null&&<rect x={x} y={Math.min(y(0),y(v))} width={width-1} height={Math.max(1,Math.abs(y(v)-y(0)))} fill={colors[i]}/>}<text x={x+width/2} y={labelY} transform={`rotate(-90 ${x+width/2} ${labelY})`} fontSize={11} textAnchor="start" fill={v!==null&&v<0?'#C00000':'#262626'}>{number(v)}</text></g>;})}<text x={left+r*step+75} y={555} textAnchor="middle" fontSize={16}>{row.label==='Indústria de transformação'?'Ind. transformação':row.label}</text></g>)}
    {model.labels.map((label,i)=><g key={i}><rect x={350+i*88} y={594} width={11} height={11} fill={colors[i]}/><text x={367+i*88} y={605} fontSize={15}>{label}</text></g>)}
  </g>;
}
export default function MaceioCagedChart({model}:{model:CagedSlideModel}){
  return <g data-maceio-chart data-maceio-caged>
    {model.kind==='summary'?<Summary model={model}/>:model.kind==='sectors'?<Sectors model={model}/>:model.kind==='northeast'?<><text x={640} y={145} textAnchor="middle" fontSize={17} fill="#425428" fontWeight={700}>SALDO TOTAL</text><Table rows={model.rows.slice(0,9).map(row=>({...row,label:row.label.split(' · ')[0]}))} labels={model.labels} top={155} height={215}/><text x={640} y={400} textAnchor="middle" fontSize={17} fill="#425428" fontWeight={700}>CONSTRUÇÃO CIVIL</text><Table rows={model.rows.slice(9).map(row=>({...row,label:row.label.split(' · ')[0]}))} labels={model.labels} top={410} height={215}/></>:<Table rows={model.rows} labels={model.labels}/>}
    {model.warning&&<text x={30} y={646} fontSize={12} fill="#425428">{model.warning}</text>}
  </g>;
}
