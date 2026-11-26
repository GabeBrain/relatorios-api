import {createCalculator,num} from '../modelo-03/calculate';
import {shift} from '../modelo-03/model';
import {sourceKey} from '../modelo-03/types';
import {reportStandardFamily,REPORT_STANDARD_FAMILIES} from '../shared/standard-families';
import {citySelection,keyOf,norm,period,regionOf,type Selection,type City} from './model';
import type {Report,Source,Slide,Table,MapPoint} from './types';

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
 const quarters=Array.from({length:8},(_,i)=>shift(p.end,(i-7)*3)).filter(m=>m>='2021-03');
 const family=(value:unknown,label:string)=>reportStandardFamily(value)===label;
 add('cover',`Mercado imobiliário da Região ${region.label}`,[],[],'cover');
 add('scope','Municípios analisados',[table(['UF'],cities.map(c=>({label:c.city,values:[c.uf]})),['text'],'Recorte autorizado do Geobrain')],[], 'data','A amostra inclui somente municípios monitorados retornados para o token, nas UFs da região. Não representa automaticamente todo o mercado da região nem todo o território de cada UF.');
 for(const group of [{label:'Residencial vertical',filter:undefined},{label:'MCMV',filter:(r:Record<string,unknown>)=>family(r.group,'MCMV')},{label:'Luxo',filter:(r:Record<string,unknown>)=>family(r.group,'Luxo')}]){
  const rows=[{start:p.start,end:p.end,label:`${selection.quarter}T${selection.year}`},{start:shift(p.start,-3),end:shift(p.end,-3),label:'Trimestre anterior'},{start:shift(p.start,-12),end:shift(p.end,-12),label:'Mesmo trimestre do ano anterior'}].filter(v=>v.start>='2021-01').map(w=>({label:w.label,values:[aggregate(cities,'releases',w.start,w.end,'Padrão',false,group.filter),aggregate(cities,'sales',w.start,w.end,'Padrão',false,group.filter),aggregate(cities,'stock',w.end,w.end,'Padrão',false,group.filter)]}));
  add(`highlights-${group.label}`,`Destaques · ${group.label}`,[table(['Lançamentos','Vendas líquidas','Oferta final'],rows,['count','count','count'],'Unidades')],[...provenance('releases'),...provenance('sales'),...provenance('stock')],'data',group.filter?'Equivalência global: MCMV = Econômico; Luxo = Alto e Luxo. Padrões brutos são preservados nos quadros detalhados.':'Fluxos do trimestre e estoque no fechamento, conforme calendário de pesquisa de cada município.');
 }
 for(const metric of ['releases','sales'] as const){
  const title=metric==='releases'?'Lançamentos':'Vendas',moneyTitle=metric==='releases'?'VGL':'VGV vendido';
  add(`section-${metric}`,title,[],[],'section');
  for(const money of [false,true]){
   add(`${metric}-${money?'money':'units'}-quarters`,money?`${moneyTitle} por trimestre`:`Unidades ${metric==='releases'?'lançadas':'vendidas'} por trimestre`,[table(['Região'],quarters.map(end=>({label:`${Math.ceil(Number(end.slice(5))/3)}T${end.slice(0,4)}`,values:[aggregate(cities,metric,shift(end,-2),end,'Padrão',money)]})),[money?'decimal':'count'],money?'R$ milhões · corrigidos pelo INCC-DI do fechamento':'Unidades')],provenance(metric));
   const total=aggregate(cities,metric,p.start,p.end,'Padrão',money);
   add(`${metric}-${money?'money':'units'}-standards`,`${money?moneyTitle:'Unidades'} por padrão`,[table([money?'R$ milhões':'Unidades','Participação (%)'],standards.length?standards.map(label=>{const n=aggregate(cities,metric,p.start,p.end,'Padrão',money,r=>norm(r.group)===norm(label));return {label,values:[n,ratio(n,total)]};}):[{label:'Sem movimento observado',values:[total,null]}],[money?'decimal':'count','percent'],money?'INCC-DI do fechamento':'Padrões brutos da API')],provenance(metric));
  }
  add(`${metric}-states`,`${title} por UF`,[table(['Trimestre','Acumulado no ano'],ufs.map(uf=>{const scope=cities.filter(c=>c.uf===uf);return {label:uf,values:[aggregate(scope,metric,p.start,p.end),aggregate(scope,metric,`${selection.year}-01`,p.end)]};}),['count','count'],'Unidades · cidades monitoradas de cada UF')],provenance(metric));
 }
 add('section-comparison','Comparativo de lançamentos, vendas e estoque',[],[],'section');
 add('comparison','Lançamentos, vendas e estoque',[table(['Lançamentos','Vendas líquidas','Oferta final'],quarters.map(end=>({label:`${Math.ceil(Number(end.slice(5))/3)}T${end.slice(0,4)}`,values:[aggregate(cities,'releases',shift(end,-2),end),aggregate(cities,'sales',shift(end,-2),end),aggregate(cities,'stock',end,end)]})),['count','count','count'],'Unidades')],[...provenance('releases'),...provenance('sales'),...provenance('stock')]);
 add('section-analysis','Análise geral',[],[],'section');
 for(const dimension of [{name:'padrão',key:'Padrão' as const,labels:standards},{name:'tipologia',key:'Tipologia' as const,labels:beds}]){
  const total=aggregate(cities,'stock',p.end,p.end,dimension.key);
  add(`stock-${dimension.key}`,`Oferta final por ${dimension.name}`,[table(['Oferta final','Participação (%)'],dimension.labels.length?dimension.labels.map(label=>{const n=aggregate(cities,'stock',p.end,p.end,dimension.key,false,r=>norm(r.group)===norm(label));return {label,values:[n,ratio(n,total)]};}):[{label:'Sem oferta observada',values:[total,null]}],['count','percent'],'Unidades no fechamento')],provenance('stock',dimension.key));
  add(`stock-${dimension.key}-states`,`Oferta final por ${dimension.name} e UF`,[table(ufs,dimension.labels.length?dimension.labels.map(label=>({label,values:ufs.map(uf=>aggregate(cities.filter(c=>c.uf===uf),'stock',p.end,p.end,dimension.key,false,r=>norm(r.group)===norm(label)))})):[{label:'Sem oferta observada',values:ufs.map(uf=>aggregate(cities.filter(c=>c.uf===uf),'stock',p.end,p.end,dimension.key))}],ufs.map(()=>'count'),'Unidades no fechamento')],provenance('stock',dimension.key));
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
 add('meter-states','Preço médio por m² privativo por UF',[table(['R$/m² atual','R$/m² ano anterior','Variação (%)','Oferta atual'],ufs.map(uf=>{const scope=cities.filter(c=>c.uf===uf),now=weightedMeter(scope),before=weightedMeter(scope,shift(p.end,-12));return {label:uf,values:[now,before,variation(now,before),aggregate(scope,'stock',p.end,p.end)]};}),['money','money','percent','count'],'Médias ponderadas pelas unidades em oferta no fechamento')],provenance('details','Empreendimento'),'data','Preço nominal do histórico da competência, ponderado pelo estoque. Sem atualização por preço cadastral ou média simples entre municípios.');
 add('annual-state-comparison','Lançamentos, vendas e oferta · comparação anual',[table(['Lançamentos atual','Lançamentos anterior','Vendas atual','Vendas anterior','Estoque atual','Estoque anterior'],ufs.map(uf=>{const scope=cities.filter(c=>c.uf===uf);return {label:uf,values:[aggregate(scope,'releases',`${selection.year}-01`,p.end),aggregate(scope,'releases',`${selection.year-1}-01`,shift(p.end,-12)),aggregate(scope,'sales',`${selection.year}-01`,p.end),aggregate(scope,'sales',`${selection.year-1}-01`,shift(p.end,-12)),aggregate(scope,'stock',p.end,p.end),aggregate(scope,'stock',shift(p.end,-12),shift(p.end,-12))]};}),Array(6).fill('count'),'Acumulado até o mês de encerramento; estoque no fechamento')],[...provenance('releases'),...provenance('sales'),...provenance('stock')]);
 for(const label of ['Luxo','MCMV']){
  const rows=cities.map(c=>({label:formatCity(c),values:[temporal(c,'releases',`${selection.year}-01`,p.end,'Padrão',false,r=>family(r.group,label))]})).sort((a,b)=>(b.values[0]??-Infinity)-(a.values[0]??-Infinity));
  add(`ranking-${label}`,`Ranking de lançamentos · ${label}`,[table(['Unidades'],rows,['count'],'Acumulado do ano · todos os municípios, em continuações')],provenance('releases'));
 }
 const meters=cities.map(c=>({label:formatCity(c),values:[weightedMeter([c]),temporal(c,'stock',p.end,p.end)]})).sort((a,b)=>(b.values[0]??-Infinity)-(a.values[0]??-Infinity));
 add('ranking-meter','Ranking de preço médio por m²',[table(['R$/m²','Oferta final'],meters,['money','count'],'Oferta no fechamento')],provenance('details','Empreendimento'));
 if(['norte','centro-oeste'].includes(selection.region))add('ranking-variation','Ranking de valorização do m²',[table(['Variação (%)','Oferta final'],cities.map(c=>({label:formatCity(c),values:[variation(weightedMeter([c]),weightedMeter([c],shift(p.end,-12))),temporal(c,'stock',p.end,p.end)]})).sort((a,b)=>(b.values[0]??-Infinity)-(a.values[0]??-Infinity)),['percent','count'],'Fechamento atual versus mesmo mês do ano anterior')],provenance('details','Empreendimento'));
 for(const c of cities){const pattern=temporal(c,'stock',p.end,p.end),typology=temporal(c,'stock',p.end,p.end,'Tipologia');if(pattern!==null&&typology!==null&&pattern!==typology)warnings.add(`${formatCity(c)}: estoque por padrão ${pattern} versus por tipologia ${typology}; valores da API preservados.`);}
 add('coverage','Conferência de cobertura',[table(['Fontes concluídas','Fontes previstas'],cities.map(c=>({label:formatCity(c),values:[sources.filter(src=>src.city===c.city&&src.uf===c.uf&&src.complete).length,5]})),['count','count'],'Coleta não equivale à validação dos campos históricos')],sources.map(sourceKey));
 add('section-maps','Localização dos empreendimentos nas capitais',[],[],'section');
 for(const [uf,capital] of region.capitals){
  const city=cities.find(c=>c.uf===uf&&norm(c.city)===norm(capital)),keys=provenance('details','Empreendimento',[city??{uf,city:capital}]);
  if(!city){slides.push({id:`map-${uf}-missing`,title:`Localização dos empreendimentos · ${capital}`,kind:'map',status:'waiting-source',tables:[],warnings:['Capital ausente no catálogo autorizado. Não consultamos outro município como substituto.'],sourceKeys:keys,note:'Mapas restritos à capital da UF, sem cidades da RM.'});continue;}
  const rows=snapshot(city),src=sources.find(s=>s.uf===uf&&s.city===city.city&&s.metric==='details');
  if(rows===null||!src?.complete){slides.push({id:`map-${uf}-failed`,title:`Localização dos empreendimentos · ${capital}`,kind:'map',status:'waiting-source',tables:[],warnings:['Fotografia histórica da capital não concluída.'],sourceKeys:keys,note:'Não usamos estoque cadastral atual.'});continue;}
  if(!rows.length&&(temporal(city,'stock',p.end,p.end)??0)>0){slides.push({id:`map-${uf}-inconsistent`,title:`Localização dos empreendimentos · ${capital}`,kind:'map',status:'waiting-source',tables:[],warnings:['Agregado municipal tem oferta positiva, mas o detalhamento não retornou fotografias. Ausência não foi convertida em zero.'],sourceKeys:keys,note:'Não há como localizar o estoque sem os empreendimentos da fotografia.'});continue;}
  const projects=new Map<string,{stock:number;families:Set<string>}>();
  for(const r of rows.filter(r=>r.stock>0)){const id=r.id.slice(city.city.length+1,r.id.lastIndexOf('/')),old=projects.get(id)??{stock:0,families:new Set<string>()};old.stock+=r.stock;old.families.add(reportStandardFamily(r.standard)??r.standard);projects.set(id,old);}
  const points:MapPoint[]=[];let missingCoordinates=0;
  for(const [id,project] of projects){const raw=src.rows.find(b=>String(b.building_id??b.id)===id),latitude=num(raw?.latitude,true),longitude=num(raw?.longitude,true);
   if(latitude===null||longitude===null||latitude < -34||latitude>6||longitude < -74||longitude > -32){missingCoordinates++;continue;}
   points.push({id,name:String(raw?.name??raw?.building_name??`Empreendimento ${id}`),latitude,longitude,stock:project.stock,family:project.families.size===1?[...project.families][0]:'Múltiplos padrões'});
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
 return {schema:'modelo-02-report-v1',selection,cities,missingUfs,startedAt,finishedAt:new Date().toISOString(),sources,slides,homologated:false};
}
export function physicalPages(slides:Slide[]){return slides.flatMap(slide=>slide.tables.length?slide.tables.flatMap((table,tableIndex)=>{const parts=Math.max(1,Math.ceil(table.rows.length/12));return Array.from({length:parts},(_,i)=>({slide,table:{...table,rows:table.rows.slice(i*12,(i+1)*12)},part:i+1,parts,tableIndex}));}):[{slide,table:null,part:1,parts:1,tableIndex:0}]);}
export const criteria={families:REPORT_STANDARD_FAMILIES,scope:'Municípios autorizados e monitorados nas UFs da região. Sem fallback IBGE.',flows:'Somados no calendário de pesquisa municipal; estoques são fotografias no fechamento.',money:'VGL/VGV de fluxo corrigidos pelo INCC-DI do fechamento antes da soma, em milhões.',prices:'Preços históricos por m² ponderados pelo estoque positivo, sem substituição cadastral.',maps:'Somente capitais, oferta positiva no fechamento. Até 60 empreendimentos por continuação, sem descarte de pontos válidos.',limitations:'Coordenadas são cadastrais atuais, não comprovação de georreferenciamento histórico. Não foi feita validação por polígono municipal. Apresentações adaptadas, sem copiar populações, projeções ou números institucionais antigos.'};
