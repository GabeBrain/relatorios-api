import monthly from './assets/monthly/layout.json';
import quarterly from './assets/quarterly/layout.json';
import { buildMaceioLaunchSeries, buildMaceioPattern, maceioSlideIssue, type MaceioIntroData, type MaceioSeries } from './intro-data';
import { maceioCities, maceioPeriod, type MaceioSelection } from './model';

const artworks=import.meta.glob('./assets/*/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
interface TextLine {text:string;x:number;y:number;size:number;bold:boolean;italic:boolean;color:string}
interface Layout {texts:TextLine[];slots:{kind:string;x:number;y:number;width:number;height:number}[]}
const colors=['#5B7537','#FFC000'];
function Pending({message}:{message:string}){
  return <g data-maceio-pending><rect x={290} y={290} width={700} height={150} rx={16} fill="#EDF2E6"/><text x={640} y={346} textAnchor="middle" fill="#425428" fontSize={25} fontWeight={700}>Aguardando conferência da fonte</text><text x={640} y={388} textAnchor="middle" fill="#425428" fontSize={18}>{message}</text></g>;
}
const number=(value:number)=>value.toLocaleString('pt-BR');
function LineChart({series,rolling,selection,page}:{series:MaceioSeries;rolling:boolean;selection:MaceioSelection;page:number}){
  const values=[series.capital,series.rm],max=Math.max(1,...values.flat()),min=Math.min(0,...values.flat());
  const quarterly=selection.periodicity==='quarterly'&&!rolling;
  const left=64,right=quarterly?985:1230,top=230,bottom=510,x=(i:number)=>left+(right-left)*i/Math.max(1,series.labels.length-1),y=(v:number)=>bottom-(v-min)/(max-min)*(bottom-top);
  const first=0,last=series.labels.length-1,prior=rolling?last-12:last-(series.labels.length===17?4:12);
  const delta=(now:number,before:number)=>before===0?'—':`${now>=before?'+':''}${((now-before)/before*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
  const yearStep=series.labels.length===17?4:12;
  const columns=rolling?3:2,cell=445/columns;
  const annual=quarterly?[1,0].map(back=>values.map(items=>Array.from({length:selection.position},(_,i)=>items[last-back*4-i]).reduce((a,b)=>a+b,0))):[];
  const annualMax=Math.max(1,...annual.map(items=>items[0]+items[1]));
  return <g data-maceio-chart>
    <g transform="translate(780 70)" fontSize={13} textAnchor="middle">
      <rect width={445} height={120} fill="#F9F9F9" stroke="#262626"/><text x={222.5} y={23} fill="#262626">VARIAÇÕES | {page===16||page===18?'EMPREENDIMENTOS':'UNIDADES'} LANÇADOS</text>
      {Array.from({length:columns},(_,i)=><g key={i}><rect x={i*cell} y={32} width={cell} height={28} fill="#B5B5B5" stroke="#262626"/><text x={cell/2+i*cell} y={52} fill="#262626">{series.labels[last-(columns-i)*yearStep]} × {series.labels[last-(columns-1-i)*yearStep]}</text></g>)}
      {values.map((items,k)=><g key={k}>{Array.from({length:columns},(_,i)=><g key={i}><rect x={i*cell} y={60+k*30} width={cell} height={30} fill={colors[k]} stroke="#262626"/><text x={cell/2+i*cell} y={81+k*30} fill={k?'#262626':'white'} fontSize={19} fontWeight={700}>{delta(items[last-(columns-1-i)*yearStep],items[last-(columns-i)*yearStep])}</text></g>)}</g>)}
    </g>
    <line x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="#D4D4D4"/>
    {values.map((items,k)=><g key={k} fill={colors[k]}>
      <polyline points={items.map((v,i)=>`${x(i)},${y(v)}`).join(' ')} stroke={colors[k]} strokeWidth={4} fill="none"/>
      {items.map((value,i)=>{const close=Math.abs(y(values[0][i])-y(values[1][i]))<70;const labelY=close?(k?Math.max(y(values[0][i]),y(values[1][i]))+28:Math.min(y(values[0][i]),y(values[1][i]))-12):y(value)+(k?22:-12);return <g key={i}>{[first,last,prior].includes(i)?<><line x1={x(i)} x2={x(i)} y1={y(value)} y2={labelY-8} stroke={colors[k]}/><rect x={x(i)-25} y={labelY-20} width={50} height={28} fill={colors[k]}/><text x={x(i)} y={labelY} textAnchor="middle" fontWeight={700} fontSize={Math.min(18,75/number(value).length)} fill={k?'#262626':'white'}>{number(value)}</text></>:(!rolling||i%2===0)&&<text x={x(i)} y={labelY} textAnchor="middle" fill="#777" fontSize={rolling?11:13}>{number(value)}</text>}</g>;})}
    </g>)}
    {series.labels.map((label,i)=><text key={i} x={x(i)} y={548} transform={quarterly?undefined:`rotate(-48 ${x(i)} 548)`} textAnchor={quarterly?'middle':'end'} fill="#262626" fontSize={rolling?12:16}>{label}</text>)}
    <g fontSize={20} fontWeight={700}><line x1={quarterly?240:380} x2={quarterly?270:410} y1={610} y2={610} stroke={colors[0]} strokeWidth={4}/><text x={quarterly?278:418} y={616}>Maceió</text><line x1={quarterly?440:580} x2={quarterly?470:610} y1={610} y2={610} stroke={colors[1]} strokeWidth={4}/><text x={quarterly?478:618} y={616}>Região Metropolitana</text></g>
    {quarterly&&<g data-maceio-accumulated><text x={1135} y={215} textAnchor="middle" fontSize={19} fontWeight={700}>ACUMULADO NO ANO</text>{annual.map((items,i)=>{const cap=items[0]/annualMax*250,rm=items[1]/annualMax*250;return <g key={i}><rect x={1050+i*110} y={540-cap} width={70} height={cap} fill={colors[0]}/><rect x={1050+i*110} y={540-cap-rm} width={70} height={rm} fill={colors[1]}/><text x={1085+i*110} y={540-cap/2+6} textAnchor="middle" fontSize={17} fontWeight={700} fill="white">{number(items[0])}</text><text x={1085+i*110} y={540-cap-rm/2+6} textAnchor="middle" fontSize={17} fontWeight={700} fill="#262626">{number(items[1])}</text><text x={1085+i*110} y={570} textAnchor="middle" fontSize={17}>{selection.position===2?'1S':''}{selection.year-1+i}</text></g>})}</g>}
  </g>;
}
function PatternChart({selection,data}:{selection:MaceioSelection;data:MaceioIntroData|null}){
  const pattern=buildMaceioPattern(selection,data),palette=['#425428','#829667','#FFC000','#B9CBA8'];
  if(pattern.issue)return <Pending message="Confira os padrões e o cadastro de empreendimentos."/>;
  const x=(i:number)=>140+i*198,base=540,height=310;
  const shares=pattern.values.map(values=>{const total=values.reduce((a,b)=>a+b,0);return values.map(v=>total?v/total:0);});
  const cumulative=(i:number,k:number)=>shares[i].slice(0,k).reduce((a,b)=>a+b,0);
  return <g data-maceio-chart>{pattern.names.map((name,k)=><polygon key={name} fill={palette[k]} points={[...shares.map((_,i)=>`${x(i)},${base-cumulative(i,k+1)*height}`),...shares.map((_,i)=>i).reverse().map(i=>`${x(i)},${base-cumulative(i,k)*height}`)].join(' ')}/>)}{shares.map((values,i)=><g key={i}>{values.map((v,k)=>v>.05&&<text key={k} x={x(i)} y={base-(cumulative(i,k)+v/2)*height+6} textAnchor="middle" fontSize={18} fill={k<2?'white':'#262626'}>{Math.round(v*100)}%</text>)}<text x={x(i)} y={572} textAnchor="middle" fontSize={21}>{pattern.years[i]}{i===5?'*':''}</text></g>)}{pattern.names.map((name,i)=><g key={name}><rect x={230+i*220} y={604} width={16} height={16} fill={palette[i]}/><text x={253+i*220} y={618} fontSize={17}>{name}</text></g>)}</g>;
}
export default function MaceioReportSlide({page,selection,data}:{page:number;selection:MaceioSelection;data:MaceioIntroData|null}){
  const kind=selection.periodicity,layouts=(kind==='monthly'?monthly:quarterly) as Record<string,Layout>,layout=layouts[String(page)];
  const period=maceioPeriod(selection),month=period.end.slice(0,7);
  const date=kind==='monthly'?new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`)):period.label;
  const issue=maceioSlideIssue(page,selection,data),series=page>=16&&page!==17?buildMaceioLaunchSeries(page,selection,data):null;
  return <svg viewBox="0 0 1280 720" role="img" aria-label={`Maceió · slide ${page}`} style={{fontFamily:'Tahoma, sans-serif',background:'white',colorScheme:'light'}} className="block aspect-video h-auto w-full">
    <image href={artworks[`./assets/${kind}/${page}.png`]} width={1280} height={720}/>
    {layout.texts.map((line,i)=><g key={i}>{page===6&&line.x>100&&line.y>150&&line.size>=20&&<circle cx={line.x-24} cy={line.y+line.size*.6} r={2.5} fill={line.color}/>}<text x={line.x} y={Math.max(0,line.y)} dominantBaseline="text-before-edge" fontSize={line.size} fontWeight={line.bold?700:400} fontStyle={line.italic?'italic':undefined} fill={line.color}>{[...line.text].filter(char=>char.charCodeAt(0)>=32).join('')}</text></g>)}
    {layout.slots.map(slot=><g key={slot.kind}>{slot.kind==='period'?<text x={slot.x+10} y={slot.y+12} dominantBaseline="text-before-edge" fontSize={page===2?20:32} fontWeight={700} fill={page===2?'#385723':'#262626'}>{date}</text>:<><text x={slot.x+24} y={slot.y+25} dominantBaseline="text-before-edge" fill="white" fontSize={25} fontWeight={700}>{maceioCities(kind).length} municípios no recorte do estudo</text><text x={slot.x+24} y={slot.y+78} dominantBaseline="text-before-edge" fill="white" fontSize={20}>Maceió e Região Metropolitana · Alagoas</text></>}</g>)}
    {page>=9&&page<=14&&<Pending message="CAGED · competência selecionada"/>}
    {page===17&&<PatternChart selection={selection} data={data}/>}
    {series&&(issue?<Pending message="Histórico completo de lançamentos necessário"/>:<LineChart series={series} rolling={page===18||page===20} selection={selection} page={page}/>)}
  </svg>;
}
