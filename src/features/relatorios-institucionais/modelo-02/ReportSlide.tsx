import {period,regionOf,type Selection} from './model';
import {physicalPages} from './calculate';
import {MapContent} from './MapContent';
import {Chart} from './Chart';
import {formatValue} from './format';
import {StateComparison} from './StateComparison';
import {cityColumns} from './presentation';
import type {Table} from './types';
import logo from './assets/brain-logo.png';
const covers=import.meta.glob('./assets/cover-*.jpg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const arts=import.meta.glob('./assets/editorial/*.jpg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const GREEN='#577832',DARK='#273f1c';
const wrap=(text:string,max:number)=>{const lines:string[]=[];for(const word of text.split(/\s+/)){if(!lines.length||lines.at(-1)!.length+word.length+1>max)lines.push(word);else lines[lines.length-1]+=' '+word;}return lines;};
function DataTable({table,color=GREEN}:{table:Table;color?:string}){
 const widths=[340,...table.columns.map(()=>812/table.columns.length)],height=table.rows.length<5?52:28,headerHeight=table.columns.length>8?56:40,top=table.rows.length<5?295:245;
 const rows=[['Categoria',...table.columns],...table.rows.map(r=>[r.label,...r.values.map((v,j)=>formatValue(v,table.formats[j]))])];
 return <g data-native-table="true">{rows.map((row,i)=>row.map((value,j)=>{const x=64+widths.slice(0,j).reduce((a,b)=>a+b,0),y=top+(i===0?0:headerHeight+(i-1)*height),cellHeight=i===0?headerHeight:height;return <g data-native-cell={`${i}:${j}`} key={`${i}-${j}`}><rect x={x} y={y} width={widths[j]} height={cellHeight} fill={i===0?color:i%2?'#eef0eb':'#dde3d4'}/><foreignObject x={x} y={y} width={widths[j]} height={cellHeight}><div style={{display:'flex',alignItems:'center',justifyContent:j?'center':'flex-start',height:'100%',padding:'0 10px',textAlign:j?'center':'left',fontFamily:'Arial, sans-serif',fontSize:table.columns.length>6?12:16,color:i===0?(color==='#ffcf00'?DARK:'white'):'#292e24',fontWeight:i===0?700:400}}><span title={value}>{i===0&&table.columns.length>8?value.replace('Variação trimestre anterior','Var. trim. ant.').replace('Variação anual do trimestre','Var. anual trim.').replace('Variação acumulado','Var. acum.'):value}</span></div></foreignObject></g>;}))}</g>;
}
function Cities({table}:{table:Table}){
 const columns=cityColumns(table),width=384;
 return <g>{columns.map((column,j)=>{let y=225;return <g key={j}>{column.map((group,k)=>{const top=y;y+=group.rows.length*12+42;return <g key={k}><rect x={64+j*width} y={top} width={width-14} height="28" fill={GREEN}/><text x={78+j*width} y={top+21} fill="white" fontSize="18" fontWeight="700">{group.uf}</text>{group.rows.map((row,i)=><text key={i} x={78+j*width} y={top+46+i*12} fontSize="13" fill="#333">{row.label}</text>)}</g>;})}</g>;})}</g>;
}
export function ReportSlide({page,selection,exporting=false}:{page:ReturnType<typeof physicalPages>[number];selection:Selection;exporting?:boolean}){
 const {slide,table,part,parts,charts}=page,region=regionOf(selection),p=period(selection),cover=slide.kind==='cover',section=slide.kind==='section',closing=slide.kind==='closing',presentation=slide.presentation;
 const art=arts[`./assets/editorial/${presentation?.asset??`${selection.region}-${slide.id}`}.jpg`],institution=presentation?.kind==='institutional';
 return <svg viewBox="0 0 1280 720" className="block h-auto w-full" role="img" aria-label={`${slide.title} · ${p.label}`} data-modelo02-slide={slide.id} style={{fontFamily:'Arial, sans-serif'}}>
  <rect width="1280" height="720" fill="white"/>
  {cover?<><image href={covers[`./assets/cover-${selection.region}.jpg`]} width="1280" height="720"/><image href={logo} x="510" y="472" width="260" height="260"/><text x="632" y="174" textAnchor="middle" fontSize="24" fill="white">{selection.quarter}º TRIMESTRE/{selection.year}</text>{['Mercado','Imobiliário da',`Região ${region?.label??''}`].map((line,i)=><text key={line} x="606" y={290+i*57} fontSize={line.length>17?36:44} fontWeight="700" fill="#476039">{line}</text>)}</>:<>
   {art&&(section||institution)?<image href={art} width="1280" height="720"/>:<><path d="M0 0 H120 V20 Q100 50 70 50 H0Z" fill={GREEN}/><path d="M1280 694 H1180 Q1150 694 1140 720 H1280Z" fill={GREEN}/></>}
   {section?<>
    {art?<rect x="0" y="180" width="650" height="325" fill="white"/>:<rect x="820" width="460" height="720" fill={GREEN}/>}
    {wrap(slide.title.toLocaleUpperCase('pt-BR'),27).map((line,i)=><text key={i} x="64" y={305+i*44} fontSize="34" fontWeight="700" fill={DARK}>{line}</text>)}
    <rect x="64" y="475" width="100" height="9" rx="4" fill="#ffcf00"/><text x="64" y="544" fontSize="24" fill={GREEN}>REGIÃO {region?.label.toLocaleUpperCase('pt-BR')}</text><text x="64" y="584" fontSize="19" fill="#333">{p.label}</text>
   </>:slide.kind==='map'&&slide.map&&slide.status==='available'?<MapContent key={slide.id} data={slide.map}/>:closing&&art?<image href={art} width="1280" height="720"/>:closing?<><rect width="1280" height="720" fill={DARK}/><image href={logo} x="400" y="190" width="480" height="380"/></>:institution&&art?null:<>
    <text x="64" y="100" fontSize={Math.min(34,1120/Math.max(1,slide.title.length)*1.7)} fontWeight="700" fill="#252c21">{slide.title}</text><rect x="64" y="122" width="80" height="8" fill="#ffcf00"/>
    <text x="64" y="177" fontSize="16" fill="#555">{p.label} · Residencial vertical{parts>1?` · ${part}/${parts}`:''}</text>
    {slide.status==='waiting-source'&&<><text x="64" y="330" fontSize="26" fill={GREEN}>Aguardando cobertura para este quadro</text><text x="64" y="375" fontSize="18" fill="#555">Consulte os detalhes e o diagnóstico da geração.</text></>}
    {slide.map&&slide.status==='available'&&<MapContent key={slide.id} data={slide.map}/>}
    {presentation?.paragraphs?.map((paragraph,i)=>wrap(paragraph,98).map((line,j)=><text key={`${i}-${j}`} x="72" y={255+i*112+j*30} fontSize="23" fill="#333">{line}</text>))}
    {slide.id.startsWith('highlights-')&&<><rect x="925" y="45" width="290" height="32" rx="12" fill={slide.id==='highlights-MCMV'?'#ffcf00':slide.id==='highlights-Luxo'?'#eb6751':GREEN}/><text x="1070" y="66" textAnchor="middle" fontSize="13" fontWeight="700" fill={slide.id==='highlights-MCMV'?DARK:'white'}>{slide.id==='highlights-MCMV'?'RESIDENCIAL VERTICAL MCMV':slide.id==='highlights-Luxo'?'RESIDENCIAL VERTICAL LUXO':'RESIDENCIAL VERTICAL'}</text></>}
    {table&&slide.status==='available'&&(presentation?.kind==='state-comparison'?<StateComparison table={table} region={selection.region}/>:presentation?.kind==='cities'?<Cities table={table}/>:<DataTable table={table} color={slide.id==='highlights-MCMV'?'#ffcf00':slide.id==='highlights-Luxo'?'#eb6751':GREEN}/>)}
    {!!charts.length&&slide.status==='available'&&!exporting&&charts.map((chart,i)=><Chart key={i} chart={chart}/>)}
    {presentation?.annotation&&wrap(presentation.annotation,140).map((line,i)=><text key={i} x="64" y={626+i*20} fontSize="13" fill="#555">{line}</text>)}
    {(table||charts.length>0)&&<text x="64" y="210" fontSize="14" fill="#555">{(table??charts[0].table).unit}</text>}
   </>}
   {!section&&!closing&&slide.kind!=='map'&&!(institution&&art)&&<><text x="64" y="687" fontSize="11" fill="#555">FONTE: GEOBRAIN · ELABORAÇÃO: BRAIN</text><text x="1216" y="687" textAnchor="end" fontSize="12" fill={GREEN}>Região {region?.label} · {p.label}</text></>}
  </>}
 </svg>;
}
