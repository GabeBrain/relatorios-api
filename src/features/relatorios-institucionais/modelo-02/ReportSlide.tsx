import {period,regionOf,type Selection} from './model';
import {physicalPages} from './calculate';
import {MapContent} from './MapContent';
import logo from './assets/brain-logo.png';
const covers=import.meta.glob('./assets/cover-*.jpg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const GREEN='#5b7638',DARK='#273f1c';
const format=(v:unknown,f:string)=>v===null?'—':typeof v!=='number'?String(v):new Intl.NumberFormat('pt-BR',{maximumFractionDigits:f==='count'?0:f==='percent'?1:2}).format(v)+(f==='percent'?'%':'');
export function ReportSlide({page,selection}:{page:ReturnType<typeof physicalPages>[number];selection:Selection}){
 const {slide,table,part,parts}=page,region=regionOf(selection),p=period(selection),dark=['cover','closing','section'].includes(slide.kind);
 const cover=slide.kind==='cover',chart=table&&table.columns.length===1&&table.rows.length>0&&table.rows.length<=10&&table.rows.every(r=>typeof r.values[0]==='number'&&r.values[0]>=0),max=chart?Math.max(1,...table!.rows.map(r=>Number(r.values[0]))):1;
 return <svg viewBox="0 0 1280 720" className="block h-auto w-full" role="img" aria-label={`${slide.title} · ${p.label}`} data-modelo02-slide={slide.id} style={{fontFamily:'Montserrat, Arial, sans-serif'}}>
  <rect width="1280" height="720" fill={dark?DARK:'#fafafa'}/>
  {cover?<><image href={covers[`./assets/cover-${selection.region}.jpg`]} x="0" y="0" width="1280" height="720"/><image href={logo} x="510" y="472" width="260" height="260"/><text x="632" y="174" textAnchor="middle" fontSize="24" fill="white">{selection.quarter}º TRIMESTRE/{selection.year}</text>{['Mercado','Imobiliário da',`Região ${region?.label??''}`].map((line,i)=><text key={line} x="606" y={290+i*57} fontSize={line.length>17?36:44} fontWeight="700" fill="#476039">{line}</text>)}</>:<>
   <text x="64" y="57" fontSize="18" fill={dark?'white':GREEN}>BRAIN · INSTITUCIONAL</text><text x="1216" y="57" textAnchor="end" fontSize="17" fill={dark?'white':'#666'}>Região {region?.label}</text>
   <text x="64" y={dark?280:120} fontSize={Math.min(dark?46:34,1120/Math.max(1,slide.title.length)*1.55)} fontWeight="700" fill={dark?'white':'#333'}>{slide.title.toLocaleUpperCase('pt-BR')}</text><rect x="64" y={dark?310:147} width="85" height="8" rx="4" fill={dark?'#ffcf00':GREEN}/>
   {dark&&<><text x="64" y="390" fontSize="31" fill="white">{p.label}</text><image href={logo} x="960" y="455" width="220" height="220"/></>}
   {!dark&&<text x="64" y="189" fontSize="17" fill="#555">{p.label} · Residencial vertical{parts>1?` · ${part}/${parts}`:''}</text>}
   {slide.status==='waiting-source'&&<><text x="64" y="330" fontSize="26" fill={GREEN}>Aguardando cobertura para este quadro</text><text x="64" y="375" fontSize="18" fill="#555">Consulte os detalhes e o diagnóstico da geração.</text></>}
   {slide.map&&slide.status==='available'&&<MapContent key={slide.id} data={slide.map}/>}
   {table&&slide.status==='available'&&(chart?<>
    <text x="64" y="234" fontSize="16" fill="#555">{table.unit}</text><line x1="85" x2="1200" y1="520" y2="520" stroke="#ccc"/>
    {table.rows.map((row,i)=>{const width=1080/table.rows.length,x=100+i*width,height=Number(row.values[0])/max*240;return <g key={i}><rect x={x} y={510-height} width={Math.min(70,width*.65)} height={height} fill={GREEN}/><text x={x+Math.min(70,width*.65)/2} y={496-height} textAnchor="middle" fontSize="17" fontWeight="700" fill="#333">{format(row.values[0],table.formats[0])}</text><text x={x} y="549" fontSize="14" fill="#333">{row.label.length>16?row.label.slice(0,15)+'…':row.label}</text></g>;})}
   </>:<>
    <text x="64" y="226" fontSize="14" fill="#555">{table.unit.length>135?table.unit.slice(0,132)+'…':table.unit}</text><rect x="64" y="245" width="1152" height="40" fill={GREEN}/>
    {['Categoria',...table.columns].map((label,j)=><text key={j} x={j?380+(j-.5)*836/table.columns.length:80} y="270" textAnchor={j?'middle':'start'} fontSize={table.columns.length>4?12:16} fill="white" fontWeight="700">{label}</text>)}
    {table.rows.map((row,i)=><g key={i}><rect x="64" y={285+i*26} width="1152" height="26" fill={i%2?'#dfe5d7':'#edf1e7'}/><text x="80" y={303+i*26} fontSize="13" fill="#333">{row.label.length>39?row.label.slice(0,37)+'…':row.label}</text>{row.values.map((value,j)=><text key={j} x={380+(j+.5)*836/table.columns.length} y={303+i*26} textAnchor="middle" fontSize={table.columns.length>5?11:13} fill="#333">{format(value,table.formats[j])}</text>)}</g>)}
   </>)}
   {!dark&&<><text x="64" y="650" fontSize="12" fill="#555">Fonte: Geobrain · {slide.warnings.length?'Ressalvas disponíveis nos detalhes e no diagnóstico.':'Municípios monitorados autorizados.'}</text><rect x="0" y="674" width="1280" height="46" fill={GREEN}/><text x="64" y="703" fontSize="14" fill="white">Panorama regional · {p.label}</text><text x="1216" y="704" textAnchor="end" fontSize="20" fontWeight="700" fill="white">BRAIN</text></>}
  </>}
 </svg>;
}
