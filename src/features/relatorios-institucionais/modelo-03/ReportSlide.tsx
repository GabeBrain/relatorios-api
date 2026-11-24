import {period,type Selection} from './model';
import {chartable,fmt,type PresentationPage} from './presentation';
import curitibaCover from './assets/cover-curitiba.jpg';
const GREEN='#5c7736',DARK='#203619',YELLOW='#ffcc00';
const artworks=import.meta.glob('./assets/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export function ReportSlide({page,selection}:{page:PresentationPage;selection:Selection}){
 const {slide,table}=page,p=period(selection),n=slide.definition.sourcePage,cover=n===1,closing=n===158,editorial=slide.definition.kind==='editorial',title=slide.definition.title;
 const dark=cover||closing||editorial&&![6,7,155].includes(n),foreground=dark?'#ffffff':'#333333';
 const lines=cover?['PANORAMA DO MERCADO',selection.city?`IMOBILIÁRIO DE ${selection.city.toLocaleUpperCase('pt-BR')}`:'IMOBILIÁRIO · MODELO 03']:closing?['A inteligência que transforma','informação em decisões']:title.toLocaleUpperCase('pt-BR').split(' · ');
 const chart=chartable(table),max=chart&&table?Math.max(1,...table.rows.flatMap(r=>r.values as number[])):1;
 const artwork=artworks[`./assets/editorial-${n}.png`];
 if(cover&&selection.city==='Curitiba'&&selection.entity==='ADEMI-PR')return <svg viewBox="0 0 1280 720" role="img" aria-label={`${title} · Curitiba · ${p.label}`} className="block h-auto w-full" data-modelo03-slide={n} style={{fontFamily:'Montserrat, Arial, sans-serif'}}><image href={curitibaCover} x="0" y="0" width="1280" height="720"/><rect x="60" y="42" width="80" height="40" fill={DARK}/><text x="72" y="70" fontSize="18" fill="#ffffff">{selection.year}</text><text x="640" y="260" textAnchor="middle" fontSize="48" fontWeight="700" fill="#ffffff">PANORAMA DO MERCADO</text><text x="640" y="322" textAnchor="middle" fontSize="48" fontWeight="700" fill="#ffffff">IMOBILIÁRIO DE CURITIBA</text><text x="640" y="434" textAnchor="middle" fontSize="38" fontWeight="700" fill={YELLOW}>{p.label}</text></svg>;
 if(artwork)return <svg viewBox="0 0 1280 720" role="img" aria-label={`${title} · arte institucional da referência`} className="block h-auto w-full" data-modelo03-slide={n}><image href={artwork} x="0" y="0" width="1280" height="720"/>{n===158&&<text x="640" y="552" textAnchor="middle" fontFamily="Montserrat, Arial, sans-serif" fontSize="22" fill="#ffffff">{selection.entity}</text>}</svg>;
 return <svg viewBox="0 0 1280 720" role="img" aria-label={`${title} · ${selection.city} · ${p.label}`} className="block h-auto w-full" data-modelo03-slide={n} style={{fontFamily:'Montserrat, Arial, sans-serif'}}>
  <rect width="1280" height="720" fill={dark?DARK:'#f9f9f9'}/>
  {dark&&<><path d="M0 640 L1280 80 L1280 720 L0 720Z" fill="#44632c" opacity=".35"/><path d="M800 0 L1280 0 L1280 450Z" fill="#6b873e" opacity=".2"/></>}
  <text x="72" y="68" fontSize={cover?18:Math.min(18,640/(Math.max(1,selection.entity.length)*.6))} fill={dark?'#ffffff':GREEN}>{cover?selection.year:selection.entity}</text>
  <text x="1208" y="68" textAnchor="end" fontSize="16" fill={dark?'#ffffff':'#666666'}>{selection.includeRm?`${selection.city} + RM`:selection.city}</text>
  {lines.map((line,i)=><text key={i} x={cover||closing?640:64} y={(cover?250:closing?290:125)+i*(cover?64:48)} textAnchor={cover||closing?'middle':'start'} fontWeight="700" fontSize={cover?Math.min(48,1030/(Math.max(1,line.length)*.61)):closing?44:Math.min(34,1120/(Math.max(1,line.length)*.6))} fill={foreground}>{line}</text>)}
  {!dark&&<rect x="64" y={lines.length>1?194:150} width="84" height="8" rx="4" fill={GREEN}/>}
  {cover&&<><text x="640" y="420" textAnchor="middle" fontSize="38" fontWeight="700" fill={YELLOW}>{p.label}</text><text x="640" y="474" textAnchor="middle" fontSize={Math.min(22,1080/(Math.max(1,selection.entity.length)*.6))} fill="#ffffff">{selection.entity}</text></>}
  {closing&&<><text x="640" y="450" textAnchor="middle" fontSize="25" fill="#ffffff">{selection.entity}</text><text x="640" y="505" textAnchor="middle" fontSize="22" fill="#ffffff">www.brain.srv.br</text></>}
  {!cover&&!closing&&editorial&&n!==7&&<>
   <text x="64" y="310" fontSize="30" fill={foreground}>{p.label}</text>
   {n===6&&['Lançamentos · Vendas · Oferta final','Velocidade de vendas · Evolução dos preços','Mercado atual · Horizontal · Comercial'].map((line,i)=><text key={line} x="64" y={380+i*55} fontSize="25" fill={foreground}>{line}</text>)}
   {slide.issue&&<text x="64" y="425" fontSize="20" fill={foreground}>Conteúdo em revisão editorial pelo analista.</text>}
   {n===155&&<text x="64" y="425" fontSize="24" fill={foreground}>Equipe responsável · {selection.entity}</text>}
  </>}
  {!editorial&&slide.status!=='available'&&<><text x="64" y="320" fontSize="29" fill={GREEN}>Aguardando fonte para este indicador</text><text x="64" y="368" fontSize="18" fill="#555555">Consulte os detalhes e o diagnóstico desta geração.</text></>}
  {table&&!editorial&&chart&&<>
   <text x="64" y="216" fontSize="18" fill="#555555">{table.unit}</text>
   <line x1="90" y1="485" x2="1190" y2="485" stroke="#cccccc"/>
   {!slide.definition.group&&table.columns.map((_,j)=><polyline key={j} points={table.rows.map((r,i)=>`${100+i*1080/Math.max(1,table.rows.length-1)},${475-Number(r.values[j])/max*220}`).join(' ')} fill="none" stroke={j?'#b8c99e':GREEN} strokeWidth="4"/>)}
   {table.rows.map((r,i)=>{const groupWidth=1080/table.rows.length;return <g key={i}>{r.values.map((v,j)=>{const w=Math.min(60,groupWidth/(table.columns.length+1)),h=(Number(v)/max)*220,x=slide.definition.group?100+i*groupWidth+j*w:100+i*1080/Math.max(1,table.rows.length-1),y=475-h;return <g key={j}>{slide.definition.group?<rect x={x} y={y} width={w-4} height={h} fill={j?'#b8c99e':GREEN}/>:<circle cx={x} cy={y} r="4" fill={j?'#b8c99e':GREEN}/>}<text x={slide.definition.group?x+(w-4)/2:x} y={j&&!slide.definition.group?y+22:y-12} textAnchor="middle" fontSize={table.rows.length>9?12:16} fontWeight="600" fill="#333333">{fmt(v,table.formats[j])}</text></g>;})}<text x={slide.definition.group?100+i*groupWidth+groupWidth*.3:100+i*1080/Math.max(1,table.rows.length-1)} y="510" textAnchor="middle" fontSize={table.rows.length>9?11:16} fill="#333333">{r.label.length>20?r.label.slice(0,18)+'…':r.label}</text></g>;})}
   {table.columns.map((col,i)=><g key={col}><rect x={80+i*380} y="532" width="14" height="14" fill={i?'#b8c99e':GREEN}/><text x={104+i*380} y="545" fontSize="17" fill="#444444">{col}</text></g>)}
   {page.supplement&&<><rect x="64" y="566" width="1152" height="46" fill="#e4ead9"/><text x="80" y="595" fontSize="14" fill="#333333">Variação sobre o período anterior</text>{page.supplement.rows[0].values.map((v,i)=><text key={i} x={620+i*300} y="595" textAnchor="middle" fontSize="18" fontWeight="700" fill="#333333">{page.supplement!.columns[i]}: {fmt(v,'percent')}</text>)}</>}
  </>}
  {table&&(!editorial||n===7)&&!chart&&<>
   <text x="64" y="211" fontSize="17" fill="#555555">{table.unit}</text>
   <rect x="64" y="230" width="1152" height="44" fill={GREEN}/>
   {['Categoria',...table.columns].map((col,j)=><text key={j} x={j?64+320+(j-.5)*832/table.columns.length:82} y="257" textAnchor={j?'middle':'start'} fontSize={Math.max(10,Math.min(17,110/table.columns.length))} fontWeight="700" fill="#ffffff">{col.length>29?col.slice(0,27)+'…':col}</text>)}
   {table.rows.map((r,i)=>{const height=Math.min(32,330/Math.max(1,table.rows.length)),y=274+i*height;return <g key={i}><rect x="64" y={y} width="1152" height={height} fill={i%2?'#dce2d1':'#edf0e5'}/><text x="82" y={y+height*.7} fontSize="14" fill="#333333">{r.label.length>35?r.label.slice(0,33)+'…':r.label}</text>{r.values.map((v,j)=><text key={j} x={64+320+(j+.5)*832/table.columns.length} y={y+height*.7} textAnchor="middle" fontSize={table.columns.length>6?11:14} fill="#333333">{fmt(v,table.formats[j])}</text>)}</g>;})}
  </>}
  {!dark&&<><rect x="0" y="652" width="1280" height="68" rx="22" fill={GREEN}/><text x="64" y="692" fontSize="14" fill="#ffffff">Panorama de {selection.city} · {p.label}</text></>}
  <text x="1208" y="695" textAnchor="end" fontSize="22" fontWeight="700" fill="#ffffff">BRAIN</text>
  {cover&&<text x="72" y="650" fontSize="36" fontWeight="700" fill="#ffffff">BRAIN</text>}
  {!editorial&&<text x="64" y="639" fontSize="12" fill="#555555">Fonte: Geobrain{['vgv-release','vgv-sales'].includes(slide.definition.role??'')?' · Valores corrigidos pelo INCC-DI':''} · {p.label} · {page.part}/{page.parts}</text>}
 </svg>;
}
