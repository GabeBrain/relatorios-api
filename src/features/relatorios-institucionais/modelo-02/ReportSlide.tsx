import type {ReactElement} from 'react';
import {period,regionOf,type Selection} from './model';
import type {PhysicalPage} from './calculate';
import {MapContent} from './MapContent';
import {Chart} from './Chart';
import {formatValue,plainPercent,direction} from './format';
import {StateComparison} from './StateComparison';
import {NativeTable} from './NativeTable';
import {TrendMarks} from './TrendMarks';
import {StateTable,ShareTable,ComparisonPanel,DeviationMarks} from './TableFamilies';
import {sectionLines,HIGHLIGHT_COLORS,cityChunkHeight,type CityChunk} from './presentation';
import {textWidth,wrapByWidth} from './text-metrics';
import {POPULATION_LABEL} from './population';
import type {Slide,Table} from './types';
import logo from './assets/brain-logo.png';
const covers=import.meta.glob('./assets/cover-*.jpg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const arts=import.meta.glob('./assets/editorial/*.jpg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const GREEN='#577832',DARK='#273f1c',INK='#25352e',TABLE_GREEN='#5b7536',BAR='#ffd500';
const wrap=(text:string,max:number)=>{const lines:string[]=[];for(const word of text.split(/\s+/)){if(!lines.length||lines.at(-1)!.length+word.length+1>max)lines.push(word);else lines[lines.length-1]+=' '+word;}return lines;};

function DataTable({table,color=GREEN}:{table:Table;color?:string}){
 const widths=[340,...table.columns.map(()=>812/table.columns.length)],height=table.rows.length<5?52:28,headerHeight=table.columns.length>8?56:40,top=table.rows.length<5?295:245;
 const rows=[['Categoria',...table.columns],...table.rows.map(r=>[r.label,...r.values.map((v,j)=>formatValue(v,table.formats[j]))])];
 return <g data-native-table="true">{rows.map((row,i)=>row.map((value,j)=>{const x=64+widths.slice(0,j).reduce((a,b)=>a+b,0),y=top+(i===0?0:headerHeight+(i-1)*height),cellHeight=i===0?headerHeight:height;return <g data-native-cell={`${i}:${j}`} key={`${i}-${j}`}><rect x={x} y={y} width={widths[j]} height={cellHeight} fill={i===0?color:i%2?'#eef0eb':'#dde3d4'}/><foreignObject x={x} y={y} width={widths[j]} height={cellHeight}><div style={{display:'flex',alignItems:'center',justifyContent:j?'center':'flex-start',height:'100%',padding:'0 10px',textAlign:j?'center':'left',fontFamily:'Arial, sans-serif',fontSize:table.columns.length>6?12:16,color:i===0?(color==='#ffcf00'?DARK:'white'):'#292e24',fontWeight:i===0?700:400}}><span title={value}>{i===0&&table.columns.length>8?value.replace('Variação trimestre anterior','Var. trim. ant.').replace('Variação anual do trimestre','Var. anual trim.').replace('Variação acumulado','Var. acum.'):value}</span></div></foreignObject></g>;}))}</g>;
}

/** Title in the originals' hierarchy: 36px bold, wrapped (preferably at " - "), yellow bar below. Returns bottom y. */
function titleLines(title:string,maxWidth:number){
 const size=36;
 if(textWidth(title,size,true)<=maxWidth)return {size,lines:[title]};
 const dash=title.indexOf(' - ');
 if(dash>0){const lines=[`${title.slice(0,dash)} -`,title.slice(dash+3)];if(lines.every(l=>textWidth(l,size,true)<=maxWidth))return {size,lines};}
 const lines=wrapByWidth(title,size,maxWidth,true);
 return lines.length<=2?{size,lines}:{size:30,lines:wrapByWidth(title,30,maxWidth,true)};
}
function SlideTitle({title,maxWidth=1150}:{title:string;maxWidth?:number}){
 const {size,lines}=titleLines(title,maxWidth),first=lines.length>1?96:92,step=size+10,bar=first+(lines.length-1)*step+20;
 return <g>{lines.map((line,i)=><text key={i} x="70" y={first+i*step} fontSize={size} fontWeight="700" fill={INK}>{line}</text>)}<rect x="64" y={bar} width="86" height="13" rx="6.5" fill={BAR}/></g>;
}

const STATE_PREPOSITION:Record<string,string>={PB:'da',BA:'da',AL:'de',GO:'de',MG:'de',PE:'de',RO:'de',RR:'de',SC:'de',SE:'de',SP:'de',MT:'de',MS:'de'};
const coverageSentence=(row:Table['rows'][number]|undefined)=>{
 if(!row)return 'Cobertura populacional indisponível para esta UF.';
 const [name,,covered,share,missing]=row.values as [string,number|null,number|null,number|null,number];
 const where=row.label==='DF'?'da população do Distrito Federal':`da população do estado ${STATE_PREPOSITION[row.label]??'do'} ${name}`;
 if(covered===null||share===null)return `População das cidades sem correspondência no IBGE; cobertura ${where} indisponível.`;
 return missing?`Cidades com população identificada: ${formatValue(share,'percent')} ${where} (cobertura parcial; ${missing} sem dado IBGE)`:`As cidades somadas representam ${formatValue(share,'percent')} ${where}`;
};
/** Original "Cidades analisadas": per-UF table (Cidade · População · % Part. Total UF) + coverage pill. */
function Cities({columns,coverage}:{columns:CityChunk[][];coverage?:Table}){
 const widths=[166,96,104],width=366,gap=30;
 return <g>{columns.map((column,j)=>{let y=150;const x=64+j*(width+gap);return <g key={j}>{column.map(chunk=>{
  const top=y;y+=cityChunkHeight(chunk);
  const header=[chunk.continued?'Cidade (cont.)':'Cidade','População',`% Part. Total ${chunk.uf}`].map(text=>({text,fill:TABLE_GREEN,color:'#ffffff',bold:true,size:13,padding:[4,4] as [number,number]}));
  const cells=[header,...chunk.rows.map(r=>[{text:r.label,fill:'#ffffff',size:12.5,padding:[4,4] as [number,number]},{text:formatValue(r.values[1],'count'),fill:'#ffffff',size:12.5},{text:formatValue(r.values[2],'percent'),fill:'#ffffff',size:12.5}])];
  const sentence=coverageSentence(coverage?.rows.find(r=>r.label===chunk.uf)),lines=wrapByWidth(sentence,14,width-24),pillTop=top+34+chunk.rows.length*16+8;
  return <g key={`${chunk.uf}-${chunk.continued}`}><NativeTable x={x} y={top} widths={widths} heights={[34,...chunk.rows.map(()=>16)]} cells={cells} label={`Cidades analisadas ${chunk.uf}`}/>
   {chunk.last&&<g><rect x={x} y={pillTop} width={width} height={Math.max(44,lines.length*17+10)} rx={10} fill={TABLE_GREEN}/>{lines.map((line,i)=><text key={i} x={x+width/2} y={pillTop+(lines.length>1?18+i*17:27)} textAnchor="middle" fontSize="14" fill="#ffffff">{line}</text>)}</g>}</g>;
 })}</g>;})}</g>;
}

function Badge({text,color}:{text:string;color:string}){
 const width=textWidth(text,20,true)+56;
 return <g><rect x={1240-width} y="52" width={width} height="48" rx="24" fill={color}/><text x={1240-width/2} y="83" textAnchor="middle" fontSize="20" fontWeight="700" fill="#ffffff">{text}</text></g>;
}
function Arrow({x,y,up}:{x:number;y:number;up:boolean}){
 const s=up?-1:1;
 return <polygon points={`${x},${y+17*s} ${x+15},${y+2*s} ${x+7},${y+2*s} ${x+7},${y-17*s} ${x-7},${y-17*s} ${x-7},${y+2*s} ${x-15},${y+2*s}`} fill={up?'#6aa040':'#ff0000'}/>;
}
/** Original highlights: family badge, compact comparison table with editable arrows, data-derived headline. */
function Highlights({slide,table}:{slide:Slide;table:Table}){
 const color=HIGHLIGHT_COLORS[slide.id]??TABLE_GREEN,badge=slide.id==='highlights-MCMV'?'RESIDENCIAL VERTICAL MCMV':slide.id==='highlights-Luxo'?'RESIDENCIAL VERTICAL LUXO':'RESIDENCIAL VERTICAL';
 const widths=[322,240,200],x=258,y=270,h=50;
 const cells=[[{text:'',fill:color},...table.columns.map(c=>({text:c.toLocaleUpperCase('pt-BR'),fill:color,color:'#ffffff',bold:true,size:21}))],...table.rows.map(r=>[{text:r.label,fill:'#d9d9d9',bold:true,size:r.label.length>18?17:21,color:'#262626'},...r.values.map(v=>({text:plainPercent(v as number|null),fill:'#ffffff',size:21,align:'right' as const,padding:[8,76] as [number,number]}))])];
 const presentation=slide.presentation,headline=presentation?.headline?wrapByWidth(presentation.headline,21,1000,true):[];
 let line=532+headline.length*28+14;
 const bullets=(presentation?.bullets??[]).flatMap((bullet,i)=>wrapByWidth(bullet,19,1020).map((text,k,all)=>{const at=line;line+=k===all.length-1?40:27;return <g key={`b${i}-${k}`}>{k===0&&<text x="150" y={at} fontSize="19" fill="#262626">•</text>}<text x="172" y={at} fontSize="19" fill="#262626">{text}</text></g>;}));
 return <g>
  <Badge text={badge} color={color}/>
  <NativeTable x={x} y={y} widths={widths} heights={[h,h,h,h]} cells={cells} label="Comparativos de lançamentos e vendas"/>
  {table.rows.map((r,i)=>r.values.map((v,j)=>{const d=direction(v as number|null);return d==='up'||d==='down'?<Arrow key={`${i}-${j}`} x={x+widths.slice(0,j+2).reduce((a,b)=>a+b,0)-40} y={y+h*(i+1)+h/2} up={d==='up'}/>:null;}))}
  {headline.map((text,i)=><text key={`h${i}`} x="150" y={532+i*28} fontSize="21" fontWeight="700" fill={DARK}>{text}</text>)}
  {bullets}
 </g>;
}

/** Summary paragraphs as in the originals: bullet, bold lead ("Lançamentos:") and continuous text. */
function Narrative({paragraphs}:{paragraphs:string[]}){
 const size=22,left=106,right=1210,step=44,elements:ReactElement[]=[];let y=200;
 paragraphs.forEach((paragraph,p)=>{
  const match=paragraph.match(/^([^:]{3,40}):\s(.*)$/),lead=match?`${match[1]}:`:'',rest=match?match[2]:paragraph,leadWidth=lead?textWidth(lead,size,true)*1.12+10:0;// PPTX renders Tahoma bold, wider than the Arial measured here.
  const capacity=(line:number)=>right-left-(line===0?leadWidth:0),lines:string[]=[];
  for(const word of rest.split(/\s+/).filter(Boolean)){const candidate=lines.length?`${lines.at(-1)} ${word}`:word;if(lines.length&&textWidth(candidate,size)<=capacity(lines.length-1))lines[lines.length-1]=candidate;else lines.push(word);}
  elements.push(<circle key={`dot${p}`} cx="76" cy={y-7} r="3" fill={GREEN}/>);
  if(lead)elements.push(<text key={`lead${p}`} x={left} y={y} fontSize={size} fontWeight="700" fill="#1f1f1f">{lead}</text>);
  lines.forEach((text,i)=>{elements.push(<text key={`${p}-${i}`} x={i===0?left+leadWidth:left} y={y} fontSize={size} fill="#1f1f1f">{text}</text>);y+=step;});
  y+=20;
 });
 return <g>{elements}</g>;
}

function Section({slide,selection,art}:{slide:Slide;selection:Selection;art?:string}){
 const region=regionOf(selection),lines=sectionLines(slide.id,region?.label??'');
 if(!art||!lines){const p=period(selection);return <><rect x="820" width="460" height="720" fill={GREEN}/>{wrap(slide.title.toLocaleUpperCase('pt-BR'),27).map((line,i)=><text key={i} x="64" y={305+i*44} fontSize="34" fontWeight="700" fill={DARK}>{line}</text>)}<rect x="64" y="475" width="100" height="9" rx="4" fill="#ffcf00"/><text x="64" y="544" fontSize="24" fill={GREEN}>REGIÃO {region?.label.toLocaleUpperCase('pt-BR')}</text><text x="64" y="584" fontSize="19" fill="#333">{p.label}</text></>;}
 const fit=(size:number,max:number)=>Math.min(size,...lines.map(l=>size*max/Math.max(1,textWidth(l,size,true))));
 if(slide.id==='regional-opening'){const size=fit(42,560);return <g><text x="96" y="233" fontSize="37" fontWeight="700" fill={INK}>{selection.quarter}º TRIMESTRE {selection.year}</text><rect x="88" y="256" width="86" height="15" rx="7.5" fill={BAR}/>{lines.map((line,i)=><text key={i} x="92" y={330+i*45} fontSize={size} fontWeight="700" fill={INK}>{line}</text>)}</g>;}
 const size=fit(46,600),step=Math.round(size*1.28),first=318-lines.length*step/2+size*.95;
 return <g>{lines.map((line,i)=><text key={i} x="66" y={first+i*step} fontSize={size} fontWeight="700" fill={INK}>{line}</text>)}<rect x="60" y={first+(lines.length-1)*step+28} width="120" height="20" rx="10" fill={BAR}/></g>;
}

export function ReportSlide({page,selection,exporting=false}:{page:PhysicalPage;selection:Selection;exporting?:boolean}){
 const {slide,table,part,parts,charts}=page,region=regionOf(selection),p=period(selection),cover=slide.kind==='cover',section=slide.kind==='section',closing=slide.kind==='closing',presentation=slide.presentation;
 const art=arts[`./assets/editorial/${presentation?.asset??`${selection.region}-${slide.id}`}.jpg`],institution=presentation?.kind==='institutional';
 const highlights=presentation?.kind==='highlights',cities=presentation?.kind==='cities',narrative=presentation?.kind==='narrative'||(institution&&!art);
 const footnote=[presentation?.note,cities?null:(table??charts[0]?.table)?.unit].filter(Boolean).join(' · ');
 return <svg viewBox="0 0 1280 720" className="block h-auto w-full" role="img" aria-label={`${slide.title} · ${p.label}`} data-modelo02-slide={slide.id} style={{fontFamily:'Arial, sans-serif'}}>
  <rect width="1280" height="720" fill="white"/>
  {cover?<><image href={covers[`./assets/cover-${selection.region}.jpg`]} width="1280" height="720"/><image href={logo} x="510" y="472" width="260" height="260"/><text x="632" y="174" textAnchor="middle" fontSize="24" fill="white">{selection.quarter}º TRIMESTRE/{selection.year}</text>{['Mercado','Imobiliário da',`Região ${region?.label??''}`].map((line,i)=><text key={line} x="606" y={290+i*57} fontSize={line.length>17?36:44} fontWeight="700" fill="#476039">{line}</text>)}</>:<>
   {art&&(section||institution)?<image href={art} width="1280" height="720"/>:<><path d="M0 0 H120 V20 Q100 50 70 50 H0Z" fill={GREEN}/><path d="M1280 694 H1180 Q1150 694 1140 720 H1280Z" fill={GREEN}/></>}
   {section?<Section slide={slide} selection={selection} art={art}/>:slide.kind==='map'&&slide.map&&slide.status==='available'?<MapContent key={slide.id} data={slide.map}/>:closing&&art?<image href={art} width="1280" height="720"/>:closing?<><rect width="1280" height="720" fill={DARK}/><image href={logo} x="400" y="190" width="480" height="380"/></>:institution&&art?null:<>
    <SlideTitle title={`${slide.title}${parts>1?` (${part}/${parts})`:''}`} maxWidth={highlights||presentation?.badge||presentation?.calloutPlacement==='top'?820:1150}/>
    {cities&&<text x="1216" y="138" textAnchor="end" fontSize="12" fill="#555">População: {POPULATION_LABEL}</text>}
    {slide.status==='waiting-source'&&<><text x="64" y="330" fontSize="26" fill={GREEN}>Aguardando cobertura para este quadro</text><text x="64" y="375" fontSize="18" fill="#555">Consulte os detalhes e o diagnóstico da geração.</text></>}
    {slide.map&&slide.status==='available'&&<MapContent key={slide.id} data={slide.map}/>}
    {narrative&&!!presentation?.paragraphs?.length&&<Narrative paragraphs={presentation.paragraphs}/>}
    {presentation?.badge&&<Badge text={presentation.badge} color={TABLE_GREEN}/>}
    {table&&slide.status==='available'&&(presentation?.kind==='state-comparison'?<StateComparison table={table} region={selection.region} captions={presentation.captions}/>:cities&&page.cityColumns?<Cities columns={page.cityColumns} coverage={slide.tables[1]}/>:highlights?<Highlights slide={slide} table={table}/>:presentation?.kind==='state-table'?<StateTable table={table} presentation={presentation}/>:presentation?.kind==='share-table'?<ShareTable table={table} presentation={presentation} firstHeader={slide.id.includes('Tipologia')?'Tipologia/ Estado':'Padrão/ Estado'}/>:<DataTable table={table}/>)}
    {!!charts.length&&slide.status==='available'&&!exporting&&charts.map((chart,i)=><Chart key={i} chart={chart}/>)}
    {presentation?.kind==='comparison'&&slide.status==='available'&&<ComparisonPanel presentation={presentation}/>}
    {presentation?.deviation&&charts[0]&&slide.status==='available'&&<DeviationMarks chart={charts[0]} mean={presentation.deviation.mean}/>}
    {presentation?.trend&&slide.status==='available'&&<TrendMarks charts={charts} trend={presentation.trend}/>}
    {presentation?.annotation&&wrap(presentation.annotation,140).map((line,i)=><text key={i} x="64" y={626+i*20} fontSize="13" fill="#555">{line}</text>)}
   </>}
   {!section&&!closing&&!cities&&slide.kind!=='map'&&!(institution&&art)&&<><text x="10" y="707" fontSize="11" fontWeight="700" fill="#333">FONTE: GEOBRAIN | ELABORAÇÃO: BRAIN</text>{footnote&&<text x="262" y="707" fontSize="11" fill="#555">{footnote.length>120?`${footnote.slice(0,117)}…`:footnote}</text>}<text x="1090" y="687" textAnchor="end" fontSize="12" fill={GREEN}>Região {region?.label} · {p.label}</text></>}
  </>}
 </svg>;
}
