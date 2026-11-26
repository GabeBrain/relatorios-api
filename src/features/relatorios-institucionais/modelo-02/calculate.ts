import {editorialSequence,panel,FAMILY_COLORS,FAMILY_ORDER,QUARTER_COLORS,quarterLabel,cityColumns,type Trend,type ChartPanel,type CityChunk} from './presentation';
import {createCalculator,num} from '../modelo-03/calculate';
import {shift} from '../modelo-03/model';
import {sourceKey} from '../modelo-03/types';
import {reportStandardFamily,REPORT_STANDARD_FAMILIES} from '../shared/standard-families';
import {citySelection,keyOf,norm,period,regionOf,type Selection,type City} from './model';
import {cityPopulation,statePopulation,POPULATION_LABEL} from './population';
import {direction,signedPercent,formatValue} from './format';
import type {Report,Source,Slide,Table,MapPoint} from './types';

const MONTHS=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const titleMonth=(m:string)=>MONTHS[Number(m)-1].charAt(0)+MONTHS[Number(m)-1].slice(1).toLowerCase();
/** Accumulated label: the full year only when the window really is January–December. */
export const accumulatedLabel=(year:number,endMonth:string,upper=false)=>endMonth==='12'?String(year):`${upper?'JAN':'Jan'}–${upper?MONTHS[Number(endMonth)-1]:titleMonth(endMonth)}/${year}`;
type Dir=ReturnType<typeof direction>;
const NOUN={up:'aumento',down:'queda',flat:'estabilidade'} as const,VERB={up:'avançam',down:'recuam',flat:'ficam estáveis'} as const;
const pairPhrase=(r:Dir,s:Dir)=>r&&s?(r===s?`${NOUN[r]} nos lançamentos e nas vendas`:`${NOUN[r]} nos lançamentos e ${NOUN[s]} nas vendas`):r?`${NOUN[r]} nos lançamentos; vendas sem base comparável`:s?`${NOUN[s]} nas vendas; lançamentos sem base comparável`:null;
/** Deterministic news-style headline and bullets; only valid comparisons speak, gaps never imply a trend. */
export function highlightText(region:string,segment:string,cur:string,annualRef:string,prevRef:string,annual:(number|null)[],previous:(number|null)[]){
 const [ar,as]=annual.map(direction),[qr,qs]=previous.map(direction),a=pairPhrase(ar,as),q=pairPhrase(qr,qs);
 const [r,s]=ar||as?[ar,as]:[qr,qs],basis=ar||as?annualRef:prevRef,where=`na Região ${region} frente ao ${basis}`;
 const headline=r&&s?(r===s?`Lançamentos e vendas${segment} ${VERB[r]} ${where}`:`Lançamentos${segment} ${VERB[r]} e vendas ${VERB[s]} ${where}`):r?`Lançamentos${segment} ${VERB[r]} ${where}`:s?`Vendas${segment} ${VERB[s]} ${where}`:undefined;
 const bullets=a&&q&&a===q?[`Comparando o ${cur} com o ${annualRef} e com o ${prevRef}, nota-se ${a}.`]:[a?`Comparando o ${cur} com o ${annualRef}, nota-se ${a}.`:`Sem base comparável entre o ${cur} e o ${annualRef}.`,q?`Na comparação com o trimestre anterior (${prevRef}), nota-se ${q}.`:`Sem base comparável com o trimestre anterior (${prevRef}).`];
 return {headline,bullets};
}

export const MAX_MAP_POINTS=60;
/** Stable spatial continuations: no coordinate is discarded or moved. */
export function mapPartitions(points:MapPoint[]):MapPoint[][] {
 const spatial=(group:MapPoint[]):MapPoint[][]=>{
  if(group.length<12)return [group];
  const lat=group.map(p=>p.latitude),lon=group.map(p=>p.longitude),latSpan=(Math.max(...lat)-Math.min(...lat))*111,lonSpan=(Math.max(...lon)-Math.min(...lon))*111*Math.cos(lat.reduce((a,b)=>a+b,0)/lat.length*Math.PI/180);
  if(Math.max(latSpan,lonSpan)<=20)return [group];
  const sorted=[...group].sort((a,b)=>(latSpan>lonSpan?a.latitude-b.latitude:a.longitude-b.longitude)||a.id.localeCompare(b.id)),middle=Math.ceil(sorted.length/2);
  return [...spatial(sorted.slice(0,middle)),...spatial(sorted.slice(middle))];
 };
 if(!points.length)return [[]];
 return Array.from({length:Math.ceil(points.length/MAX_MAP_POINTS)},(_,i)=>points.slice(i*MAX_MAP_POINTS,(i+1)*MAX_MAP_POINTS)).flatMap(spatial);
}
const sum=(values:(number|null)[])=>values.some(v=>v===null)?null:values.reduce<number>((a,b)=>a+(b??0),0);
const ratio=(a:number|null,b:number|null)=>a!==null&&b!==null&&b>0?a/b*100:null;
const variation=(a:number|null,b:number|null)=>a!==null&&b!==null&&b>0?(a/b-1)*100:null;
const formatCity=(c:City)=>`${c.city} / ${c.uf}`;
const rankingCity=(c:City)=>`${c.city}-${c.uf}`;
export const RANKING_TOP=10;
const rawGroups=(sources:Source[],group:Source['group'])=>[...new Set(sources.filter(s=>s.group===group).flatMap(s=>s.rows.map(r=>String(r.group??'').trim())).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
export function calculateReport(selection:Selection,cities:City[],missingUfs:string[],sources:Source[],startedAt:string,onProgress?:(completed:number,total:number,message:string)=>void):Report {
 const region=regionOf(selection);if(!region||!cities.length)throw new Error('Recorte regional inválido.');
 const p=period(selection),warnings=new Set<string>(),slides:Slide[]=[],engines=new Map(cities.map(c=>[keyOf(c),createCalculator(citySelection(selection,c),sources)]));
 const milestones=['scope','highlights-Luxo','releases-states','sales-states','comparison','stock-Tipologia-states','coverage','closing'];let completed=0;
 const provenance=(metric:Source['metric'],group:Source['group']='Padrão',scope=cities)=>scope.map(c=>sourceKey({...c,segment:'Vertical',metric,group}));
 const safe=(c:City,f:()=>number|null)=>{try{return f();}catch(error){warnings.add(`${formatCity(c)}: ${error instanceof Error?error.message:'Fonte inválida.'}`);return null;}};
 const temporal=(c:City,metric:'releases'|'sales'|'stock',a:string,b:string,group:Source['group']='Padrão',money=false,filter?:(r:Record<string,unknown>)=>boolean)=>{if(a<'2021-01'){warnings.add(`${formatCity(c)}: comparação ${a} a ${b} anterior à cobertura inicial de 2021, mantida sem valor.`);return null;}return safe(c,()=>engines.get(keyOf(c))!.temporal(c.city,metric,a,b,group==='Tipologia'?'Tipologia':'Padrão',money,filter));};
 const aggregate=(scope:City[],metric:'releases'|'sales'|'stock',a:string,b:string,group:Source['group']='Padrão',money=false,filter?:(r:Record<string,unknown>)=>boolean)=>sum(scope.map(c=>temporal(c,metric,metric==='stock'?b:a,b,group,money,filter)));
 const table=(columns:string[],rows:Table['rows'],formats:Table['formats'],unit:string):Table=>({columns,rows,formats,unit});
 const add=(id:string,title:string,tables:Table[]=[],sourceKeys:string[]=[],kind:Slide['kind']='data',note='')=>{
  if(missingUfs.length)warnings.add(`Recorte regional com acesso parcial: sem municípios autorizados em ${missingUfs.join(', ')}. Os totais não incluem essas UFs.`);
  for(const engine of engines.values())for(const message of engine.notices())warnings.add(message);
  const available=kind!=='data'||id==='scope'||tables.some(t=>t.rows.some(r=>r.values.some(v=>typeof v==='number')));
  slides.push({id,title,kind,status:available?'available':'waiting-source',tables,sourceKeys:[...new Set(sourceKeys)],warnings:[...warnings],note:note||'Mercado residencial vertical dos municípios monitorados autorizados. Ausência de cobertura não é zero.'});warnings.clear();if(milestones.includes(id))completed++;onProgress?.(completed,milestones.length,title);
 };
 const standards=rawGroups(sources,'Padrão'),beds=rawGroups(sources,'Tipologia'),ufs=region.capitals.map(([uf])=>uf).filter(uf=>cities.some(c=>c.uf===uf));
 const quarters=Array.from({length:9},(_,i)=>shift(p.end,(i-8)*3)).filter(m=>m>='2021-03');
 const family=(value:unknown,label:string)=>reportStandardFamily(value)===label;
 add('cover',`Mercado imobiliário da Região ${region.label}`,[],[],'cover');
 add('regional-opening',`Mercado imobiliário comparativo · Região ${region.label}`,[],[],'section');
 // Catalogue owns the list; IBGE only enriches it. Share = municipal / whole-UF population (same census product).
 const unmatched:string[]=[];
 const cityRows=ufs.flatMap(uf=>{const state=statePopulation(uf);return cities.filter(c=>c.uf===uf).map(c=>{const population=cityPopulation(c.uf,c.city)?.population??null;if(population===null)unmatched.push(formatCity(c));return {label:c.city,values:[uf,population,state&&population!==null?population/state.population*100:null]};}).sort((a,b)=>((b.values[2] as number|null)??-Infinity)-((a.values[2] as number|null)??-Infinity)||a.label.localeCompare(b.label,'pt-BR'));});
 const coverage=table(['Estado','População da UF','População das cidades analisadas','Cobertura (%)','Cidades sem população identificada'],ufs.map(uf=>{const state=statePopulation(uf),rows=cityRows.filter(r=>r.values[0]===uf),known=rows.filter(r=>typeof r.values[1]==='number'),covered=known.reduce((n,r)=>n+(r.values[1] as number),0);return {label:uf,values:[state?.name??uf,state?.population??null,known.length?covered:null,state&&known.length?covered/state.population*100:null,rows.length-known.length]};}),['text','count','count','percent','count'],POPULATION_LABEL);
 add('scope','Cidades analisadas',[table(['UF','População','% Part. Total UF'],cityRows,['text','count','percent'],`População: ${POPULATION_LABEL}`),coverage],[], 'data',`Municípios monitorados retornados para o token, nas UFs da região; a população não acrescenta cidades. % Part. Total UF = população municipal ÷ população da UF × 100, mesma fonte e data-base: ${POPULATION_LABEL}. Ordenação pela participação exata; ausência de correspondência aparece ao final, sem virar zero.`);
 slides.at(-1)!.presentation={kind:'cities'};
 if(unmatched.length)slides.at(-1)!.warnings.push(`População não identificada no IBGE para ${unmatched.join(', ')}; cobertura da UF apresentada como parcial, sem atribuir zero.`);
 add('methodology','Objetivos e metodologia',[],[],'institutional');slides.at(-1)!.presentation={kind:'narrative',paragraphs:['Monitoramento do mercado residencial vertical nos municípios autorizados da região.',`Análise de lançamentos e vendas no ${p.label}, com oferta e preços na fotografia de fechamento. Comparativos usam o calendário de pesquisa de cada município.`,'Valores monetários de fluxo corrigidos pelo INCC-DI do fechamento. Acumulados parciais comparam os mesmos meses nos dois anos.','Dados ausentes permanecem sem valor. Cobertura parcial e divergências são identificadas no diagnóstico e na conferência CSV.']};
 add('section-highlights','Destaques',[],[],'section');
 for(const group of [{label:'Residencial vertical',filter:undefined},{label:'MCMV',filter:(r:Record<string,unknown>)=>family(r.group,'MCMV')},{label:'Luxo',filter:(r:Record<string,unknown>)=>family(r.group,'Luxo')}]){
  const rows=[{start:p.start,end:p.end,label:`${selection.quarter}T${selection.year}`},{start:shift(p.start,-3),end:shift(p.end,-3),label:'Trimestre anterior'},{start:shift(p.start,-12),end:shift(p.end,-12),label:'Mesmo trimestre do ano anterior'}].map(w=>({label:w.label,values:[aggregate(cities,'releases',w.start,w.end,'Padrão',false,group.filter),aggregate(cities,'sales',w.start,w.end,'Padrão',false,group.filter),aggregate(cities,'stock',w.end,w.end,'Padrão',false,group.filter)]}));
  add(`highlights-${group.label}`,`Destaques residencial vertical${group.label==='MCMV'?' MCMV':group.label==='Luxo'?' luxo':''} - Lançamentos, vendas, oferta final`,[table(['Lançamentos','Vendas líquidas','Oferta final'],rows,['count','count','count'],'Unidades')],[...provenance('releases'),...provenance('sales'),...provenance('stock')],'data',group.filter?'Equivalência global: MCMV = Econômico; Luxo = Alto e Luxo. Padrões brutos são preservados nos quadros detalhados.':'Fluxos do trimestre e estoque no fechamento, conforme calendário de pesquisa de cada município.');
 }
 for(const metric of ['releases','sales'] as const){
  const title=metric==='releases'?'Lançamentos':'Vendas',moneyTitle=metric==='releases'?'VGL':'VGV';
  add(`section-${metric}`,title,[],[],'section');
  for(const money of [false,true]){
   add(`${metric}-${money?'money':'units'}-quarters`,money?`${moneyTitle} por trimestre (em R$ milhões)`:`Unidades ${metric==='releases'?'lançadas':'vendidas'} por trimestre`,[table(['Região'],quarters.map(end=>({label:`${Math.ceil(Number(end.slice(5))/3)}T${end.slice(0,4)}`,values:[aggregate(cities,metric,shift(end,-2),end,'Padrão',money)]})),[money?'decimal':'count'],money?'R$ milhões · corrigidos pelo INCC-DI do fechamento':'Unidades')],provenance(metric));
   const total=aggregate(cities,metric,p.start,p.end,'Padrão',money);
   add(`${metric}-${money?'money':'units'}-standards`,`${money?moneyTitle:`Unidades ${metric==='releases'?'lançadas':'vendidas'}`} por padrão`,[table([money?'R$ milhões':'Unidades','Participação (%)'],standards.length?standards.map(label=>{const n=aggregate(cities,metric,p.start,p.end,'Padrão',money,r=>norm(r.group)===norm(label));return {label,values:[n,ratio(n,total)]};}):[{label:'Sem movimento observado',values:[total,null]}],[money?'decimal':'count','percent'],money?'INCC-DI do fechamento':'Padrões brutos da API')],provenance(metric));
  }
  for(const money of [false,true]){
   const quarterly=slides.find(s=>s.id===`${metric}-${money?'money':'units'}-quarters`)!;
   const years=table(['Acumulado'],[selection.year-1,selection.year].map(year=>({label:accumulatedLabel(year,p.end.slice(5)),values:[aggregate(cities,metric,`${year}-01`,`${year}-${p.end.slice(5)}`,'Padrão',money)]})),[money?'decimal':'count'],quarterly.tables[0].unit);
   quarterly.tables.push(years);
   const series=quarterly.tables[0].rows.map(r=>r.values[0] as number|null),n=series.length,acc=years.rows.map(r=>r.values[0] as number|null);
   const peak=(values:(number|null)[])=>Math.max(1,...values.filter((v):v is number=>typeof v==='number'));
   const digits=money&&peak(series)<100?1:0;
   const trend:Trend={annual:n>=5?variation(series[n-1],series[n-5]):null,quarter:n>=2?variation(series[n-1],series[n-2]):null,accumulated:variation(acc[1],acc[0]),annualLabel:n>=5?`${quarterLabel(quarters[n-5])} × ${quarterLabel(quarters[n-1])}`:'',quarterLabel:n>=2?`${quarterLabel(quarters[n-2])} × ${quarterLabel(quarters[n-1])}`:'',accumulatedLabel:`${years.rows[0].label} × ${years.rows[1].label}`};
   quarterly.presentation={kind:'columns',trend,charts:[{...panel('columns',quarterly.tables[0],quarters.map(end=>end.startsWith(String(selection.year))?QUARTER_COLORS.current:end.startsWith(String(selection.year-1))?QUARTER_COLORS.previous:QUARTER_COLORS.older),{x:24,y:220,w:890,h:330}),scaleMax:peak(series)*1.42,gapPct:70,labelDigits:digits},{...panel('columns',years,[QUARTER_COLORS.previous,QUARTER_COLORS.current],{x:968,y:220,w:262,h:330}),scaleMax:peak(acc)*1.18,gapPct:70,labelDigits:digits}]};
   const standard=slides.find(s=>s.id===`${metric}-${money?'money':'units'}-standards`)!;
   const rank=(label:string)=>{const i=FAMILY_ORDER.indexOf(label);return i<0?FAMILY_ORDER.length:i;};
   const labels=[...new Set(standards.map(label=>reportStandardFamily(label)??label))].sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b,'pt-BR'));
   const composition=table(labels,quarters.map(end=>{const total=aggregate(cities,metric,shift(end,-2),end,'Padrão',money);return {label:quarterLabel(end),values:labels.map(label=>{const value=aggregate(cities,metric,shift(end,-2),end,'Padrão',money,r=>(reportStandardFamily(r.group)??String(r.group))===label);return total===0&&value===0?0:ratio(value,total);})};}),labels.map(()=>'percent'),'Participação no trimestre (%)');
   standard.tables.push(composition);standard.presentation={kind:'stacked-area',charts:[{...panel('stacked-area',composition,labels.map(label=>{const index=['Compactos','MCMV','Médio Padrão','Luxo'].indexOf(label);return index<0?'#8b7464':FAMILY_COLORS[index];})),percent:true}]};
  }
  add(`${metric}-states`,`Unidades ${metric==='releases'?'lançadas':'vendidas'} - Por estado`,[table([...quarters.slice(-5).map(quarterLabel),`Jan–${p.end.slice(5)}/${selection.year-1}`,`Jan–${p.end.slice(5)}/${selection.year}`,'Variação trimestre anterior (%)','Variação anual do trimestre (%)','Variação acumulado (%)'],ufs.map(uf=>{const scope=cities.filter(c=>c.uf===uf),now=aggregate(scope,metric,`${selection.year}-01`,p.end),before=aggregate(scope,metric,`${selection.year-1}-01`,shift(p.end,-12));return {label:uf,values:[...quarters.slice(-5).map(end=>aggregate(scope,metric,shift(end,-2),end)),before,now,variation(aggregate(scope,metric,p.start,p.end),aggregate(scope,metric,shift(p.start,-3),shift(p.end,-3))),variation(aggregate(scope,metric,p.start,p.end),aggregate(scope,metric,shift(p.start,-12),shift(p.end,-12))),variation(now,before)]};}),[...Array(Math.min(5,quarters.length)+2).fill('count'),'percent','percent','percent'],'Unidades · cidades monitoradas de cada UF')],provenance(metric));
 }
 for(const metric of ['releases','sales']){const slide=slides.find(s=>s.id===`${metric}-states`)!,t=slide.tables[0],count=Math.min(5,quarters.length),sums=t.columns.map((_,j)=>j<count+2?sum(t.rows.map(r=>r.values[j] as number|null)):null);sums[count+2]=variation(sums[count-1],count>=2?sums[count-2]:null);sums[count+3]=variation(sums[count-1],count>=5?sums[count-5]:null);sums[count+4]=variation(sums[count+1],sums[count]);t.rows.push({label:'Total',values:sums});}
 add('section-comparison','Comparativo de lançamentos, vendas e estoque',[],[],'section');
 add('comparison','Lançamentos, vendas e estoque',[table(['Lançamentos','Vendas líquidas','Oferta final'],quarters.map(end=>({label:`${Math.ceil(Number(end.slice(5))/3)}T${end.slice(0,4)}`,values:[aggregate(cities,'releases',shift(end,-2),end),aggregate(cities,'sales',shift(end,-2),end),aggregate(cities,'stock',end,end)]})),['count','count','count'],'Unidades')],[...provenance('releases'),...provenance('sales'),...provenance('stock')]);
 add('section-analysis','Análise geral',[],[],'section');
 for(const dimension of [{name:'padrão',key:'Padrão' as const,labels:standards},{name:'tipologia',key:'Tipologia' as const,labels:beds}]){
  const total=aggregate(cities,'stock',p.end,p.end,dimension.key);
  add(`stock-${dimension.key}`,`Oferta final por ${dimension.name}`,[table(['Oferta final','Participação (%)'],dimension.labels.length?dimension.labels.map(label=>{const n=aggregate(cities,'stock',p.end,p.end,dimension.key,false,r=>norm(r.group)===norm(label));return {label,values:[n,ratio(n,total)]};}):[{label:'Sem oferta observada',values:[total,null]}],['count','percent'],'Unidades no fechamento')],provenance('stock',dimension.key));
  add(`stock-${dimension.key}-states`,`Oferta final por ${dimension.name} e UF`,[table(ufs,dimension.labels.length?dimension.labels.map(label=>({label,values:ufs.map(uf=>aggregate(cities.filter(c=>c.uf===uf),'stock',p.end,p.end,dimension.key,false,r=>norm(r.group)===norm(label)))})):[{label:'Sem oferta observada',values:ufs.map(uf=>aggregate(cities.filter(c=>c.uf===uf),'stock',p.end,p.end,dimension.key))}],ufs.map(()=>'count'),'Unidades no fechamento')],provenance('stock',dimension.key));
 }
 for(const dimension of ['Padrão','Tipologia'] as const){
  const counts=slides.find(s=>s.id===`stock-${dimension}-states`)!,base=counts.tables[0],regional=slides.find(s=>s.id===`stock-${dimension}`)!;
  const totals=ufs.map(uf=>aggregate(cities.filter(c=>c.uf===uf),'stock',p.end,p.end,dimension)),regionTotal=aggregate(cities,'stock',p.end,p.end,dimension);
  const displayed=table([...ufs,'Total','Participação (%)'],base.rows.map(row=>({label:row.label,values:[...row.values,sum(row.values as (number|null)[]),ratio(sum(row.values as (number|null)[]),regionTotal)]})),[...ufs.map(()=>'count' as const),'count','percent'],'Oferta final na fotografia de fechamento');
  displayed.rows.push({label:'Total',values:[...totals,regionTotal,ratio(regionTotal,regionTotal)]});regional.tables.push(displayed);regional.presentation={kind:'table',displayTable:displayed};
  const shares=table([...ufs,'Região'],base.rows.map(row=>({label:row.label,values:[...row.values.map((v,j)=>ratio(v as number|null,totals[j])),ratio(sum(row.values as (number|null)[]),regionTotal)]})),Array(ufs.length+1).fill('percent'),'Participação na oferta final de cada UF (%)');
  shares.rows.push({label:'Total',values:[...totals.map(n=>ratio(n,n)),ratio(regionTotal,regionTotal)]});counts.tables.push(shares);counts.presentation={kind:'table',displayTable:shares};
 }
 const snapshots=new Map<string,ReturnType<ReturnType<typeof createCalculator>['snapshot']>|null>();
 const snapshot=(c:City,m=p.end)=>{const key=`${keyOf(c)}/${m}`;if(!snapshots.has(key)){try{const frame=engines.get(keyOf(c))!.snapshot(c.city,'Vertical',m),municipal=temporal(c,'stock',m,m),detailed=frame.reduce((n,r)=>n+r.stock,0);if(municipal!==null&&municipal!==detailed)warnings.add(`${formatCity(c)}, ${m}: estoque detalhado ${detailed} versus municipal ${municipal}; preços e localizações usam o histórico detalhado, séries usam o agregado municipal, sem ajuste artificial.`);snapshots.set(key,frame);}catch(error){warnings.add(`${formatCity(c)}: ${error instanceof Error?error.message:'Histórico incompleto.'}`);snapshots.set(key,null);}}return snapshots.get(key)!;};
 const weightedMeter=(scope:City[],m=p.end)=>{
  if(m<'2021-01'){warnings.add('Comparativo de preço anterior à cobertura inicial de 2021, mantido sem valor.');return null;}
  const frames=scope.map(c=>snapshot(c,m));if(frames.some(f=>f===null))return null;
  const rows=frames.flatMap(f=>f??[]).filter(r=>r.stock>0),stock=rows.reduce((n,r)=>n+r.stock,0);
  if(!stock){warnings.add(`${scope.map(formatCity).join(', ')}, ${m}: sem oferta positiva para calcular preço médio.`);return null;}
  if(rows.some(r=>r.meter===null||r.meter<=0)){warnings.add('Há oferta contribuinte sem preço por m² válido; preço mantido sem valor, sem excluir unidades silenciosamente.');return null;}
  return rows.reduce((n,r)=>n+r.meter!*r.stock,0)/stock;
 };
 const f=(v:number|null,unit='unidades')=>v===null?'sem valor disponível':`${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(v)} ${unit}`;
 const cur=`${selection.quarter}T${selection.year}`,annualRef=quarterLabel(shift(p.end,-12)),units=(v:number)=>formatValue(v,'count');
 const change=(now:number|null,before:number|null)=>{const v=variation(now,before),d=direction(v);return d===null?`sem base comparável com o ${annualRef}`:d==='flat'?`estabilidade em relação ao ${annualRef}`:`${d==='up'?'um aumento':'uma queda'} de ${formatValue(Math.abs(v!),'percent')} em relação ao ${annualRef}`;};
 const releases=aggregate(cities,'releases',p.start,p.end),sales=aggregate(cities,'sales',p.start,p.end),stock=aggregate(cities,'stock',p.end,p.end);
 const familyStock=FAMILY_ORDER.map(label=>({label,value:aggregate(cities,'stock',p.end,p.end,'Padrão',false,r=>family(r.group,label))})).filter((r):r is {label:string;value:number}=>typeof r.value==='number'&&r.value>0).sort((a,b)=>b.value-a.value);
 const share=(v:number)=>stock?formatValue(v/stock*100,'percent'):'—',familyName=(label:string)=>label==='Compactos'?'compactas':label==='MCMV'?'do segmento MCMV':label==='Luxo'?'de padrão luxo':'de médio padrão';
 const offer=stock===null?`Caracterização da oferta: estoque da região ${region.label} sem valor disponível no fechamento; consulte o diagnóstico.`:`Caracterização da oferta: A região ${region.label} conta com um estoque de ${units(stock)} unidades${familyStock.length?`, sendo ${familyStock.slice(0,2).map(r=>`${units(r.value)} unidades ${familyName(r.label)} (${share(r.value)} do total)`).join(' e ')}`:''}.${familyStock.length>2?` A região possui, ainda, ${units(familyStock[2].value)} unidades ${familyName(familyStock[2].label)}, o que representa ${share(familyStock[2].value)} das unidades disponíveis.`:''}`;
 add('summary','Resumo geral',[],[...provenance('releases'),...provenance('sales'),...provenance('stock')],'institutional');slides.at(-1)!.presentation={kind:'narrative',paragraphs:[releases===null?`Lançamentos: No ${cur}, os lançamentos da região ${region.label} estão sem valor disponível; consulte o diagnóstico.`:`Lançamentos: No ${cur} foram lançadas ${units(releases)} unidades na região ${region.label}, ${change(releases,aggregate(cities,'releases',shift(p.start,-12),shift(p.end,-12)))}.`,sales===null?`Vendas: No ${cur}, as vendas da região ${region.label} estão sem valor disponível; consulte o diagnóstico.`:`Vendas: No ${cur} foram ${units(sales)} unidades vendidas, ${change(sales,aggregate(cities,'sales',shift(p.start,-12),shift(p.end,-12)))}.`,offer]};
 add('summary-prices','Resumo geral · preços e segmentos',[],provenance('details','Empreendimento'),'institutional');slides.at(-1)!.presentation={kind:'narrative',paragraphs:[`Preço médio privativo: ${f(weightedMeter(cities),'R$/m²')}, ponderado pelas unidades em oferta na fotografia de fechamento.`,`VGV vendido: ${f(aggregate(cities,'sales',p.start,p.end,'Padrão',true),'R$ milhões')}, corrigidos pelo INCC-DI do fechamento.`,`MCMV: ${f(aggregate(cities,'releases',p.start,p.end,'Padrão',false,r=>family(r.group,'MCMV')))} lançadas no trimestre. Enquadramento pela equivalência editorial dos padrões.`]};
 add('meter-states','Preço por m² privativo geral (R$/m²) - Residencial vertical',[table(['R$/m² atual','R$/m² ano anterior','Variação (%)','Oferta atual'],ufs.map(uf=>{const scope=cities.filter(c=>c.uf===uf),now=weightedMeter(scope),before=weightedMeter(scope,shift(p.end,-12));return {label:uf,values:[now,before,variation(now,before),aggregate(scope,'stock',p.end,p.end)]};}),['money','money','percent','count'],'Médias ponderadas pelas unidades em oferta no fechamento')],provenance('details','Empreendimento'),'data','Preço nominal do histórico da competência, ponderado pelo estoque. Sem atualização por preço cadastral ou média simples entre municípios.');
 const priceSlide=slides.at(-1)!,priceTable=priceSlide.tables[0],regionMeter=weightedMeter(cities);
 priceSlide.presentation={kind:'columns',charts:[{...panel('columns',table(['Preço médio UF','Preço médio regional'],priceTable.rows.map(row=>({label:row.label,values:[row.values[0],regionMeter]})),['money','money'],'R$/m² · fotografia do fechamento'),['#3f5727','#ffcf00']),lineSeries:[1]}]};
 if(selection.region==='nordeste'){
  const capitals=region.capitals.map(([uf,name])=>cities.find(c=>c.uf===uf&&norm(c.city)===norm(name))),complete=capitals.every(Boolean),scope=capitals.filter((c):c is City=>!!c),mean=complete?weightedMeter(scope):null;
  if(!complete)warnings.add('Preço médio das capitais: capital ausente no catálogo autorizado. Média conjunta mantida sem valor, sem substituição por RM ou municípios restantes.');
  const rows=region.capitals.map(([uf,name],i)=>{const c=capitals[i];return {label:`${name}/${uf}`,values:[c?weightedMeter([c]):null,mean,c?variation(weightedMeter([c]),mean):null,c?temporal(c,'stock',p.end,p.end):null]};}).sort((a,b)=>(b.values[0]??-Infinity)-(a.values[0]??-Infinity));
  add('meter-capitals','Preço médio por m² privativo · capitais do Nordeste',[table(['Preço médio capital','Preço médio das capitais','Desvio da média (%)','Oferta final'],rows,['money','money','percent','count'],'Fotografia do fechamento · somente capitais')],provenance('details','Empreendimento',scope));
  slides.at(-1)!.presentation={kind:'columns',charts:[{...panel('columns',table(['Preço médio capital','Preço médio das capitais'],rows.map(r=>({...r,values:r.values.slice(0,2)})),['money','money'],'R$/m² · somente capitais'),['#3f5727','#ffcf00']),lineSeries:[1]}],annotation:'Desvio da média das capitais (%): '+rows.map(r=>`${r.label}: ${f(r.values[2] as number|null,'%')}`).join('; ')};
 }
 add('annual-state-comparison','Lançamentos, vendas e oferta · comparação anual',[table(['Lançamentos atual','Lançamentos anterior','Vendas atual','Vendas anterior','Estoque atual','Estoque anterior'],ufs.map(uf=>{const scope=cities.filter(c=>c.uf===uf);return {label:uf,values:[aggregate(scope,'releases',`${selection.year}-01`,p.end),aggregate(scope,'releases',`${selection.year-1}-01`,shift(p.end,-12)),aggregate(scope,'sales',`${selection.year}-01`,p.end),aggregate(scope,'sales',`${selection.year-1}-01`,shift(p.end,-12)),aggregate(scope,'stock',p.end,p.end),aggregate(scope,'stock',shift(p.end,-12),shift(p.end,-12))]};}),Array(6).fill('count'),'Acumulado até o mês de encerramento; estoque no fechamento')],[...provenance('releases'),...provenance('sales'),...provenance('stock')]);
 for(const label of ['Luxo','MCMV']){
  const rows=cities.map(c=>({label:rankingCity(c),values:[temporal(c,'releases',`${selection.year}-01`,p.end,'Padrão',false,r=>family(r.group,label))]})).sort((a,b)=>(b.values[0]??-Infinity)-(a.values[0]??-Infinity));
  add(`ranking-${label}`,`Unidades lançadas | ${label} | ${accumulatedLabel(selection.year,p.end.slice(5))}`,[table(['Unidades'],rows,['count'],`Acumulado de janeiro ao fechamento do ${cur} · Top 10 no slide; todos os municípios na conferência CSV`)],provenance('releases'));
 }
 const meters=cities.map(c=>({label:rankingCity(c),values:[weightedMeter([c]),temporal(c,'stock',p.end,p.end)]})).sort((a,b)=>(b.values[0]??-Infinity)-(a.values[0]??-Infinity));
 add('ranking-meter',`Maior R$/m² médio | ${cur}`,[table(['R$/m²','Oferta final'],meters,['money','count'],`Fotografia de ${MONTHS[Number(p.end.slice(5))-1].toLowerCase()}/${selection.year}, último mês do ${cur} · Top 10 no slide; todos na conferência CSV`)],provenance('details','Empreendimento'));
 if(['norte','centro-oeste'].includes(selection.region))add('ranking-variation',`Valorização do R$/m² médio | ${annualRef} × ${cur}`,[table(['Variação (%)','Oferta final'],cities.map(c=>({label:rankingCity(c),values:[variation(weightedMeter([c]),weightedMeter([c],shift(p.end,-12))),temporal(c,'stock',p.end,p.end)]})).sort((a,b)=>(b.values[0]??-Infinity)-(a.values[0]??-Infinity)),['percent','count'],'Fechamento atual versus mesmo mês do ano anterior · Top 10 no slide; todos na conferência CSV')],provenance('details','Empreendimento'));
 for(const c of cities){const pattern=temporal(c,'stock',p.end,p.end),typology=temporal(c,'stock',p.end,p.end,'Tipologia');if(pattern!==null&&typology!==null&&pattern!==typology)warnings.add(`${formatCity(c)}: estoque por padrão ${pattern} versus por tipologia ${typology}; valores da API preservados.`);}
 add('coverage','Conferência de cobertura',[table(['Fontes concluídas','Fontes previstas'],cities.map(c=>({label:formatCity(c),values:[sources.filter(src=>src.city===c.city&&src.uf===c.uf&&src.complete).length,5]})),['count','count'],'Coleta não equivale à validação dos campos históricos')],sources.map(sourceKey));
 add('section-maps','Localização dos empreendimentos nas capitais',[],[],'section');
 for(const [uf,capital] of region.capitals){
  const city=cities.find(c=>c.uf===uf&&norm(c.city)===norm(capital)),keys=provenance('details','Empreendimento',[city??{uf,city:capital}]);
  if(!city){slides.push({id:`map-${uf}-missing`,title:`Localização dos empreendimentos · ${capital}`,kind:'map',status:'waiting-source',tables:[],warnings:['Capital ausente no catálogo autorizado. Não consultamos outro município como substituto.'],sourceKeys:keys,note:'Mapas restritos à capital da UF, sem cidades da RM.'});continue;}
  const rows=snapshot(city),src=sources.find(s=>s.uf===uf&&s.city===city.city&&s.metric==='details');
  if(rows===null||!src?.complete){slides.push({id:`map-${uf}-failed`,title:`Localização dos empreendimentos · ${capital}`,kind:'map',status:'waiting-source',tables:[],warnings:['Fotografia histórica da capital não concluída.'],sourceKeys:keys,note:'Não usamos estoque cadastral atual.'});continue;}
  if(!rows.length&&(temporal(city,'stock',p.end,p.end)??0)>0){slides.push({id:`map-${uf}-inconsistent`,title:`Localização dos empreendimentos · ${capital}`,kind:'map',status:'waiting-source',tables:[],warnings:['Agregado municipal tem oferta positiva, mas o detalhamento não retornou fotografias. Ausência não foi convertida em zero.'],sourceKeys:keys,note:'Não há como localizar o estoque sem os empreendimentos da fotografia.'});continue;}
  const projects=new Map<string,{stock:number;families:Set<string>;meterSum:number;missingPrice:boolean}>();
  for(const r of rows.filter(r=>r.stock>0)){const id=r.id.slice(city.city.length+1,r.id.lastIndexOf('/')),old=projects.get(id)??{stock:0,families:new Set<string>(),meterSum:0,missingPrice:false};old.stock+=r.stock;if(r.meter===null||r.meter<=0)old.missingPrice=true;else old.meterSum+=r.meter*r.stock;old.families.add(reportStandardFamily(r.standard)??r.standard);projects.set(id,old);}
  const points:MapPoint[]=[];let missingCoordinates=0;
  for(const [id,project] of projects){const raw=src.rows.find(b=>String(b.building_id??b.id)===id),latitude=num(raw?.latitude,true),longitude=num(raw?.longitude,true);
   if(latitude===null||longitude===null||latitude < -34||latitude>6||longitude < -74||longitude > -32){missingCoordinates++;continue;}
   points.push({id,name:String(raw?.name??raw?.building_name??`Empreendimento ${id}`),latitude,longitude,stock:project.stock,meter:project.missingPrice?null:project.meterSum/project.stock,family:project.families.size===1?[...project.families][0]:'Múltiplos padrões'});
  }
  points.sort((a,b)=>a.longitude-b.longitude||a.latitude-b.latitude||a.id.localeCompare(b.id));
  const eligible=new Set(src.rows.filter(b=>String(b.release_date??'').slice(0,7)<=p.end).map(b=>String(b.building_id??b.id))),valid=new Set(rows.map(r=>r.id.slice(city.city.length+1,r.id.lastIndexOf('/')))),excludedProjects=Math.max(0,eligible.size-valid.size),partitions=mapPartitions(points),parts=partitions.length;
  for(let part=1;part<=parts;part++){
   add(`map-${uf}-${part}`,`Localização dos empreendimentos · ${capital}${parts>1?` · ${part}/${parts}`:''}`,[],keys,'map','Somente empreendimentos verticais com oferta positiva no fechamento, dentro da capital; coordenadas cadastrais retornadas pela API. Cada empreendimento aparece em uma única continuação. Coordenadas ausentes/inválidas são contadas, sem geocodificação inventada.');
   slides[slides.length-1].map={city,part,parts,points:partitions[part-1],totalProjects:projects.size,locatedProjects:points.length,missingCoordinates,excludedProjects};
   if(missingCoordinates)slides[slides.length-1].warnings.push(`${missingCoordinates} empreendimento(s) com oferta sem coordenadas válidas.`);
   if(excludedProjects)slides[slides.length-1].warnings.push(`${excludedProjects} empreendimento(s) sem fotografia válida excluídos; base parcial.`);
   if(!points.length&&(projects.size>0||excludedProjects>0)){slides[slides.length-1].status='waiting-source';slides[slides.length-1].warnings.push('Não há coordenadas válidas para representar os empreendimentos desta fotografia.');}
   const municipal=temporal(city,'stock',p.end,p.end),detailed=rows.reduce((n,r)=>n+r.stock,0);if(municipal!==null&&municipal!==detailed)slides[slides.length-1].warnings.push(`Oferta municipal ${municipal} versus detalhada ${detailed}; mapa usa o detalhamento, sem ajustar os números.`);
  }
 }
 add('closing','Inteligência para decidir',[],[],'closing');
 for(const slide of slides){
  if(slide.id.startsWith('ranking-')){
   // Editorial cut of the originals: Top 10 with known values. All municipalities stay in tables[0] (CSV/JSON).
   const all=slide.tables[0].rows,ranked=all.filter(r=>typeof r.values[0]==='number'&&(slide.id==='ranking-variation'||(r.values[0] as number)>0)),top=ranked.slice(0,RANKING_TOP);
   slide.presentation={kind:'bars',note:`${top.length} de ${all.length} municípios no slide (${ranked.length} com valor${slide.id==='ranking-variation'?'':' positivo'}); lista completa na conferência CSV.`,charts:[panel('bars',{...slide.tables[0],columns:[slide.tables[0].columns[0]],formats:[slide.tables[0].formats[0]],rows:top.map(row=>({...row,values:[row.values[0]]}))},[slide.id==='ranking-MCMV'||slide.id==='ranking-variation'?'#ffcf00':'#577832'],{x:64,y:205,w:1100,h:420})]};
   if(!top.length)slide.warnings.push('Nenhum município com valor positivo para o ranking nesta competência.');
   if(['sul','nordeste'].includes(selection.region)&&['ranking-Luxo','ranking-MCMV'].includes(slide.id)&&top.length){
    const total=sum(ranked.map(r=>r.values[0] as number)),others=sum(ranked.slice(RANKING_TOP).map(r=>r.values[0] as number));
    const pie=table(['Participação (%)'],[...top,...ranked.length>RANKING_TOP?[{label:'Outros',values:[others]}]:[]].map(row=>({label:row.label,values:[ratio(row.values[0] as number|null,total)]})),['percent'],'Participação no acumulado equivalente');
    slide.tables.push(pie);slide.presentation.charts![0].box={x:64,y:205,w:780,h:420};slide.presentation.charts!.push({...panel('pie',pie,pie.rows.map((_,i)=>i===RANKING_TOP?'#3b5e27':['#4f5779','#ef6144','#66a043','#ffc000','#33939b','#3a3a3a','#2f3349','#9b2b16','#806000','#71898c'][i%10]),{x:900,y:250,w:310,h:310}),firstPageOnly:true});
   }
  }
  if(slide.id==='comparison')slide.presentation={kind:'columns',charts:[{...panel('columns',{...slide.tables[0],rows:slide.tables[0].rows.filter((_,i)=>i===slide.tables[0].rows.length-5||i===slide.tables[0].rows.length-1)}),stacked:true}]};
  if(slide.id==='annual-state-comparison')slide.presentation={kind:'state-comparison',displayTable:slide.tables[0],annotation:`Acumulado janeiro–${p.end.slice(5)} nos dois anos; oferta no fechamento. Cinza = comparação indisponível.`};
  if(slide.id.startsWith('highlights-')){
   const original=slide.tables[0],current=original.rows[0]?.values as (number|null)[],previous=original.rows[1]?.values as (number|null)[],annual=original.rows[2]?.values as (number|null)[];
   const filter=slide.id==='highlights-MCMV'?(r:Record<string,unknown>)=>family(r.group,'MCMV'):slide.id==='highlights-Luxo'?(r:Record<string,unknown>)=>family(r.group,'Luxo'):undefined;
   const prevRef=quarterLabel(shift(p.end,-3)),end=p.end.slice(5);
   const annualValues=[variation(current?.[0]??null,annual?.[0]??null),variation(current?.[1]??null,annual?.[1]??null)],quarterValues=[variation(current?.[0]??null,previous?.[0]??null),variation(current?.[1]??null,previous?.[1]??null)];
   const comparisons=table(['Lançamentos','Vendas'],[
    {label:`${annualRef} X ${cur}`,values:annualValues},
    {label:`${prevRef} X ${cur}`,values:quarterValues},
    {label:`${accumulatedLabel(selection.year-1,end,true)} X ${accumulatedLabel(selection.year,end,true)}`,values:(['releases','sales'] as const).map(metric=>variation(aggregate(cities,metric,`${selection.year}-01`,p.end,'Padrão',false,filter),aggregate(cities,metric,`${selection.year-1}-01`,shift(p.end,-12),'Padrão',false,filter)))}
   ],['percent','percent'],'Variação (%) · mesmo trimestre do ano anterior, trimestre anterior e acumulado com os mesmos meses');
   const text=highlightText(region.label,slide.id==='highlights-MCMV'?' MCMV':slide.id==='highlights-Luxo'?' de luxo':'',cur,annualRef,prevRef,annualValues,quarterValues);
   slide.tables.push(comparisons);slide.presentation={kind:'highlights',displayTable:comparisons,headline:text.headline,bullets:text.bullets,paragraphs:[text.headline,...text.bullets].filter((v):v is string=>!!v)};
  }
 }
 // Partial availability: a flow/stock cell without source is not the same as a complete series.
 for(const slide of slides)if(slide.status==='available'&&slide.kind==='data'){const missing=slide.tables.reduce((n,t)=>n+t.rows.reduce((m,r)=>m+r.values.filter((v,j)=>v===null&&(t.formats[j]==='count'||t.formats[j]==='decimal')).length,0),0);slide.coverage=missing?'partial':'complete';if(missing)slide.warnings.push(`Disponível parcial: ${missing} célula(s) de fluxo/estoque sem valor de fonte; mantidas em branco, sem zero.`);}
 const pricePanel=slides.find(s=>s.id==='meter-states')!;pricePanel.presentation!.annotation='Desvio da média regional (%): '+pricePanel.tables[0].rows.map(row=>`${row.label}: ${f(variation(row.values[0] as number|null,regionMeter),'%')}`).join('; ');
 const ordered=editorialSequence(selection,slides);
 return {schema:'modelo-02-report-v1',selection,cities,missingUfs,startedAt,finishedAt:new Date().toISOString(),sources,slides:ordered,homologated:false};
}
export interface PhysicalPage {slide:Slide;table:Table|null;charts:ChartPanel[];part:number;parts:number;tableIndex:number;cityColumns?:CityChunk[][]}
export function physicalPages(slides:Slide[]):PhysicalPage[]{return slides.flatMap((slide):PhysicalPage[]=>{
 const presentation=slide.presentation;
 if(presentation?.kind==='cities'){
  const table=slide.tables[0],columns=cityColumns(table),parts=Math.max(1,Math.ceil(columns.length/3));
  return Array.from({length:parts},(_,i)=>{const pageColumns=columns.slice(i*3,(i+1)*3);return {slide,table:{...table,rows:pageColumns.flatMap(column=>column.flatMap(block=>block.rows))},charts:[],part:i+1,parts,tableIndex:0,cityColumns:pageColumns};});
 }
 if(presentation?.charts?.length){const rows=presentation.charts[0].table.rows,size=presentation.rowsPerPage??(presentation.kind==='bars'?RANKING_TOP:Math.max(1,rows.length)),parts=Math.max(1,Math.ceil(rows.length/size));return Array.from({length:parts},(_,i)=>({slide,table:null,charts:presentation.charts!.filter(c=>!c.firstPageOnly||i===0).map(c=>({...c,table:{...c.table,rows:c.firstPageOnly?c.table.rows:c.table.rows.slice(i*size,(i+1)*size)}})),part:i+1,parts,tableIndex:0}));}
 const tables=presentation?.displayTable?[presentation.displayTable]:slide.tables;
 return tables.length?tables.flatMap((table,tableIndex)=>{const size=12,parts=Math.max(1,Math.ceil(table.rows.length/size));return Array.from({length:parts},(_,i)=>({slide,table:{...table,rows:table.rows.slice(i*size,(i+1)*size)},charts:[],part:i+1,parts,tableIndex}));}):[{slide,table:null,charts:[],part:1,parts:1,tableIndex:0}];
});}
export const criteria={families:REPORT_STANDARD_FAMILIES,scope:'Municípios autorizados e monitorados nas UFs da região; o IBGE (Censo 2022) só acrescenta população e participação na UF, nunca municípios. Sem fallback IBGE para o catálogo.',flows:'Somados no calendário de pesquisa municipal; estoques são fotografias no fechamento.',money:'VGL/VGV de fluxo corrigidos pelo INCC-DI do fechamento antes da soma, em milhões.',prices:'Preços históricos por m² ponderados pelo estoque positivo, sem substituição cadastral.',maps:'Somente capitais, oferta positiva no fechamento. Cores por faixa de preço histórico por m² ponderado pelo estoque do empreendimento: até 5 mil, até 8 mil, até 12 mil, até 16 mil e acima de 16 mil; cinza sem preço válido. Até 60 empreendimentos por continuação, sem descarte de pontos válidos.',limitations:'Coordenadas são cadastrais atuais, não comprovação de georreferenciamento histórico. Não foi feita validação por polígono municipal. Apresentações adaptadas, sem copiar populações do original 4T2025 (população recalculada pelo Censo 2022), projeções ou números institucionais antigos. Rankings mostram o Top 10 da referência; demais municípios na conferência CSV.'};
