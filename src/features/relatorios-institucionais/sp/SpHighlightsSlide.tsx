import { spSlidePeriod, type SpPreview } from './model';
import { spFlowWindow } from './launch-series';
import { quarterMonths } from './temporal';
const count=(value:number)=>value.toLocaleString('pt-BR');
const pct=(value:number|null)=>value===null?'indisponível':`${value.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
function wrap(text:string,limit=82){const lines=[''];for(const word of text.split(' ')){if(`${lines.at(-1)} ${word}`.length>limit)lines.push('');lines[lines.length-1]+=`${lines.at(-1)?' ':''}${word}`;}return lines;}
const monthName=(value:string)=>new Date(`${value}-01T12:00:00Z`).toLocaleDateString('pt-BR',{month:'long',timeZone:'UTC'});
const period=(start:string,end:string)=>start===end?`em ${monthName(end)} de ${end.slice(0,4)}`:`entre ${monthName(start)} e ${monthName(end)} de ${end.slice(0,4)}`;
export function SpHighlightsSlide({report,slide}:{report:SpPreview;slide:number}){
  const launches=report.launchSeries,sales=report.salesSeries, mcmv=launches?.breakdown?.mcmv, salesMcmv=sales?.breakdown?.mcmv;
  let title='', paragraphs:string[]=[];
  const end=report.throughMonth!,year=spFlowWindow(launches,`${end?.slice(0,4)}-01`,end);
  if(slide===9&&launches?.status==='ready'&&mcmv&&year){
    const rolling=mcmv.rolling.at(-1)!.value,allRolling=launches.trends!.rolling.at(-1)!.value;
    title=year.share===null?'Lançamentos do MCMV no acumulado do ano':`MCMV representa ${pct(year.share)} dos lançamentos no acumulado do ano`;
    paragraphs=[`O MCMV soma ${count(year.mcmv)} unidades lançadas ${period(year.start,year.end)}, de um total de ${count(year.total)} unidades na capital paulista.`, `Nos 12 meses encerrados em ${monthName(end)} de ${end.slice(0,4)}, foram ${count(rolling)} lançamentos MCMV e ${count(allRolling-rolling)} dos demais segmentos.`];
  }else if(slide===10&&sales?.status==='ready'&&salesMcmv){const current=salesMcmv.quarterly.at(-1)!.value,previous=salesMcmv.quarterlyComparisons.at(-1)!,rolling=salesMcmv.rolling.at(-1)!.value,allRolling=sales.trends!.rolling.at(-1)!.value;const variation=previous.variation===null?'':previous.variation===0?' O volume ficou estável frente ao mesmo período do ano anterior.':` O volume teve ${previous.variation>0?'alta':'queda'} de ${pct(Math.abs(previous.variation))} frente ao mesmo período do ano anterior.`;title=`MCMV soma ${count(current)} vendas líquidas no ${report.monthly?.length===3?'trimestre':'período'}`;paragraphs=[`Foram ${count(current)} unidades MCMV vendidas ${period(quarterMonths(report.quarter)[0],end)}, ante ${count(previous.previous)} no mesmo período de ${Number(end.slice(0,4))-1}.${variation}`,`Nos 12 meses encerrados em ${monthName(end)} de ${end.slice(0,4)}, o mercado totalizou ${count(allRolling)} vendas líquidas, das quais ${count(rolling)} foram de unidades MCMV.`];
  }else if(slide===11&&launches?.status==='ready'){
    const rolling=launches.trends!.rolling.at(-1)!,comparison=launches.trends!.rollingComparisons.at(-1)!,max=Math.max(...launches.trends!.rolling.slice(0,-1).map(row=>row.value)),record=rolling.value>max;
    title=record?'Maior volume de lançamentos na janela móvel consultada':'Lançamentos acumulados nos últimos 12 meses';
    paragraphs=[`O mercado soma ${count(rolling.value)} unidades lançadas nos 12 meses encerrados em ${monthName(rolling.month)} de ${rolling.month.slice(0,4)}${comparison.variation===null?'':`, com variação de ${pct(comparison.variation)} sobre os 12 meses anteriores`}.`,...(report.projects?.status==='ready'&&report.projects.trends?[`Foram lançados ${count(report.projects.trends!.rolling.at(-1)!.value)} empreendimentos nesse período.`]:[])];
  }else{title='Destaque em conferência';paragraphs=['As séries municipais e os recortes MCMV preencherão este destaque quando estiverem conferidos.'];}
  const lines=paragraphs.flatMap((text,i)=>[...(i?['']:[]),...wrap(text)]);
  return <svg role="img" aria-label={`Destaque dinâmico ${slide}`} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full"><rect width="1280" height="640" fill="#f8f8f8"/><rect x="1070" width="210" height="55" fill="#bf5a0a"/><text x="1175" y="34" textAnchor="middle" fontSize="19" fill="white" fontWeight="bold">SÃO PAULO</text><text x="62" y="76" fontSize="34" fontWeight="bold">DESTAQUES DO ESTUDO</text><rect x="62" y="100" width="85" height="11" rx="5" fill="#ffcf00"/><text x="62" y="150" fontSize="18">{spSlidePeriod(report)}</text>{wrap(title,64).map((line,i)=><g key={i}><rect x="62" y={190+i*43} width={Math.min(1150,line.length*18)} height="36" fill="#ffcf00"/><text x="62" y={217+i*43} fontSize="28" fontWeight="bold">{line}</text></g>)}{lines.map((line,i)=><text key={i} x="62" y={330+i*29} fontSize="22" fill="#666">{line}</text>)}</svg>;
}
