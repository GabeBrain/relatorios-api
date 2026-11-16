import type {MaceioChartData} from './market-slides-data';
const palette=['#DFE9CF','#236489','#FFC000','#5B7537'];
const percent=(value:number,total:number)=>total===0?'—':`${(value/total*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
export default function MaceioGroupedChart({model}:{model:MaceioChartData}){
 if(model.kind==='area'){
  const x=(i:number)=>100+i*216,base=540,height=325;
  const shares=model.values.map(values=>{const total=values.reduce((a,b)=>a+b,0);return values.map(v=>total?v/total:0);});
  const cumulative=(i:number,k:number)=>shares[i].slice(0,k).reduce((a,b)=>a+b,0);
  const labelY=shares.map((row,i)=>{const positions:number[]=[];row.forEach((v,k)=>{const desired=base-(cumulative(i,k)+v/2)*height;positions.push(Math.max(220+(3-k)*30,Math.min(k?positions[k-1]-30:530,desired)));});return positions;});
  return <g data-maceio-chart>{model.groups.map((name,k)=><polygon key={name} fill={palette[k]} points={[...shares.map((_,i)=>`${x(i)},${base-cumulative(i,k+1)*height}`),...shares.map((_,i)=>i).reverse().map(i=>`${x(i)},${base-cumulative(i,k)*height}`)].join(' ')}/>)}{shares.map((row,i)=><g key={i}>{row.map((v,k)=>v>0&&<g key={k}><rect x={x(i)-37} y={labelY[i][k]-18} width={74} height={29} fill={palette[k]}/><text x={x(i)} y={labelY[i][k]+6} fontSize={21} fontWeight={700} textAnchor="middle" fill={k===1||k===3?'white':'#262626'}>{percent(v,1)}</text></g>)}<text x={x(i)} y={570} textAnchor="middle" fontSize={22} fontWeight={700}>{model.years[i]}{i===5?'*':''}</text></g>)}{model.groups.map((name,i)=><g key={name}><rect x={220+i*230} y={604} width={16} height={16} fill={palette[i]}/><text x={243+i*230} y={619} fontSize={20} fontWeight={700}>{name}</text></g>)}</g>;
 }
 if(model.kind==='comparison'){
  const colors=['#5B7537','#FFC000','#236489','#CBD5C1'];
  return <g data-maceio-chart><line x1={100} x2={1200} y1={530} y2={530} stroke="#D4D4D4"/>{model.values.map((row,index)=>{const total=row.reduce((a,b)=>a+b,0);return <g key={index}>{row.map((value,k)=>{const h=total?value/total*300:0,x=140+index*620+k*105;return <g key={k}><rect x={x} y={530-h} width={100} height={h} fill={colors[k]}/><text x={x+50} y={516-h} textAnchor="middle" fontSize={26} fontWeight={700} fill="#262626">{percent(value,total)}</text></g>})}<text x={350+index*620} y={573} textAnchor="middle" fontSize={25} fontWeight={700} fill="#262626">{model.years[index]}</text></g>})}{model.groups.map((name,i)=><g key={name}><rect x={220+i*230} y={604} width={16} height={16} fill={colors[i]}/><text x={243+i*230} y={619} fontSize={20} fontWeight={700} fill="#262626">{name}</text></g>)}</g>;
 }
 const paired=model.cities.length>0;
 const chart=(rows:{label:string;value:number}[],x:number,width:number,title:string,limit:number)=>{
  const total=rows.reduce((sum,row)=>sum+row.value,0),visible=rows.slice(0,limit),max=Math.max(1,...visible.map(row=>row.value)),step=340/Math.max(1,visible.length);
  return <g><text x={x+width/2} y={213} textAnchor="middle" fontSize={23} fontWeight={700} fill="#262626">{title}</text>{visible.map((row,i)=>{const bar=row.value/max*(width-210),y=244+i*step;const words=row.label.split(/\s+/),lines:string[]=[];for(const word of words){if(!lines.length||`${lines.at(-1)} ${word}`.length>21)lines.push(word);else lines[lines.length-1]+=` ${word}`;}return <g key={row.label}><text x={x+165} y={y+12} textAnchor="end" fontSize={16} fill="#777" fontWeight={700}>{lines.slice(0,3).map((line,k)=><tspan key={k} x={x+165} dy={k?18:0}>{line}</tspan>)}</text><rect x={x+180} y={y} width={bar} height={Math.min(45,step-12)} fill={i===0?'#FFC000':i===1?'#5B7537':'#829667'}/><text x={x+188+bar} y={y+24} fontSize={19} fontWeight={700} fill="#262626">{percent(row.value,total)}</text></g>})}{rows.length>limit&&<text x={x+width/2} y={602} textAnchor="middle" fontSize={13} fill="#777">{rows.length-limit} grupo(s) adicional(is) fora do ranking; percentuais sobre o total integral.</text>}{!rows.length&&<text x={x+width/2} y={380} textAnchor="middle" fontSize={20} fill="#425428">Sem movimentação observada no período</text>}</g>;
 };
 return <g data-maceio-chart>{chart(model.ranking,paired?25:220,paired?670:840,'Bairros de Maceió',9)}{paired&&chart(model.cities,730,500,'Maceió e RM',7)}</g>;
}
