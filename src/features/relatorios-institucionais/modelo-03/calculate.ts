import {CoverageError,expectedObservations,surveyCadence} from './coverage';
import {rentalSlide} from './rentals';
import {standardFamily,STANDARD_GROUPS} from './classification';
import indicesFile from '../fortaleza/incc-di.json';
import {historyFingerprint} from '@/features/panorama-secovi-fiergs/domain/building-history';
import {DEFINITIONS_FOR,type Definition} from './blueprint';
import {norm,period,shift,location,isPairStudy,studyLabel,geographyMode,regionalPreset,type Selection} from './model';
import {sourceKey,type Cell,type Row,type Slide,type Source,type Table} from './types';

export const num=(v:unknown,signed=false):number|null=>{if(typeof v!=='number'&&(typeof v!=='string'||!v.trim()))return null;const n=Number(v);return Number.isFinite(n)&&Math.abs(n)<Number.MAX_SAFE_INTEGER/100&&(signed||n>=0)?n:null;};
const required=(v:unknown,signed=false)=>{const n=num(v,signed);if(n===null)throw new Error('Campo numérico necessário ausente ou inválido.');return n;};
const integer=(v:unknown,signed=false)=>{const n=required(v,signed);if(!Number.isSafeInteger(n))throw new Error('Quantidade sem precisão inteira.');return n;};
const sum=(xs:number[])=>{const n=xs.reduce((a,b)=>a+b,0);if(!Number.isFinite(n)||Math.abs(n)>=Number.MAX_SAFE_INTEGER/100)throw new Error('Total excede a precisão numérica segura.');return n;};
const month=(v:unknown)=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])(?:-|$)/.test(v)?v.slice(0,7):null;
const months=(a:string,b:string)=>{const out:string[]=[];for(let m=a;m<=b;m=shift(m,1))out.push(m);return out;};
const ratio=(n:number,d:number)=>d>0?n/d*100:null;
const pctChange=(now:number|null,before:number|null)=>now!==null&&before!==null&&before>0?(now-before)/before*100:null;
interface Detail {id:string;city:string;release:string;standard:string;beds:string;area:number|null;price:number|null;meter:number|null;stock:number;qty:number|null;sales:number|null;launches:number|null;product:string;stage:string;mcmv:boolean|null;raw:Row}
const table=(columns:string[],rows:Table['rows'],formats:Table['formats'],unit='unidades'):Table=>({columns,rows,formats,unit});
const rawStandards=['Compacto','Econômico','Standard','Médio','Médio-Alto','Alto','Luxo','Super Luxo'];
const standards=[...Object.keys(STANDARD_GROUPS),'Super Luxo'];
const bedroom=(v:unknown)=>{const n=num(v);return n!==null&&Number.isInteger(n)&&n>=1?`${Math.min(4,n)}${n>=4?' ou mais':''} dormitórios`:'Sem dormitórios informados';};
const areaBand=(area:number|null)=>area===null?'Área não informada':area<=34?'Até 34 m²':area<40?'35–39 m²':area<45?'40–44 m²':area<50?'45–49 m²':area<=70?'50–70 m²':area<=99?'71–99 m²':area<=150?'100–150 m²':area<=200?'151–200 m²':area<=250?'201–250 m²':'Acima de 250 m²';
function horizontal(b:Row,r:Row):string {
 const values=[b.building_subtype,b.subtype,b.product_type,b.horizontal_type,b.standard].map(norm);
 if(values.includes('loteamento aberto'))return 'Loteamento Aberto';if(values.includes('loteamento fechado'))return 'Loteamento Fechado';if(values.includes('condominio de chacaras'))return 'Condomínio de Chácaras';
 if(values.some(v=>['condominio de casas/sobrados','condominio de casas','condominio de casas e sobrados','casas em condominio','casas em condominio fechado'].includes(v)))return 'Condomínio de Casas/Sobrados';
 if(values.some(v=>rawStandards.some(s=>norm(s)===v))||(num(r.number_bedroom)??0)>0)return 'Condomínio de Casas/Sobrados';
 return 'Sem classificação';
}
export function createCalculator(s:Selection,sources:Source[],indices:Readonly<Record<string,number>>=indicesFile.indices){
 const p=period(s),cache=new Map<string,Detail[]>(),snapshotWarnings=new Map<string,string[]>(),warnings=new Set<string>();
 function get(city:string,segment:Source['segment'],metric:Source['metric'],group:Source['group']='Padrão'){
  const target=location(city,s.uf),matches=sources.filter(x=>norm(x.city)===norm(target.city)&&x.uf===target.uf&&x.segment===segment&&x.metric===metric&&x.group===group);
  if(matches.length!==1||!matches[0].complete)throw new CoverageError(`${city}/${segment}/${metric}/${group}: fonte não concluída.`);return matches[0];
 }
 const used=new Set<string>();
 function source(city:string,segment:Source['segment'],metric:Source['metric'],group:Source['group']='Padrão'){const target=location(city,s.uf);used.add(sourceKey({...target,segment,metric,group}));return get(city,segment,metric,group);}
 function snapshot(city:string,segment:Source['segment'],m:string):Detail[]{
  const src=source(city,segment,'details','Empreendimento'),key=`${city}/${segment}/${m}`;if(cache.has(key)){for(const w of snapshotWarnings.get(key)??[])warnings.add(w);return cache.get(key)!;}
  const out:Detail[]=[],projects=new Map<string,string>(),excluded=new Map<string,number>();let excludedStock=0;
  for(const b of src.rows){
   const before=out.length;try{
   const id=String(b.building_id??b.id??'').trim(),release=month(b.release_date);if(!id||!release)throw new Error(`${city}: empreendimento sem ID ou data de lançamento.`);
   const fingerprint=historyFingerprint(b);if(projects.has(id)){if(projects.get(id)!==fingerprint)throw new Error(`${city}: empreendimento duplicado conflitante.`);continue;}projects.set(id,fingerprint);if(release>m)continue;
   if(!Array.isArray(b.typologies_history))throw new Error(`${city}: histórico de tipologias ausente.`);
   const histories=b.typologies_history as Row[],established=new Set(histories.filter(r=>month(r.period)&&month(r.period)!<=m).map(r=>String(r.typology_id??''))),seen=new Map<string,string>();
   const frame=histories.filter(r=>month(r.period)===m);if(!frame.length)throw new Error(`${city}: fotografia histórica ausente em ${m}; não usamos estoque cadastral atual.`);
   for(const r of frame){const tid=String(r.typology_id??'');if(!tid)throw new Error(`${city}: tipologia sem ID.`);const signature=historyFingerprint(r);if(seen.has(tid)){if(seen.get(tid)!==signature)throw new Error(`${city}: tipologia duplicada conflitante.`);continue;}seen.set(tid,signature);
    const stock=integer(r.typology_stock),area=num(r.private_area),price=num(r.price),explicit=num(r.price_private_area),qty=num(r.qty),launch=num(r.releases_in_period),sales=num(r.sold_in_period,true);
    const hasMcmv=r.is_mcmv??b.is_mcmv;
    out.push({id:`${city}/${id}/${tid}`,city,release,standard:standardFamily(r.pattern??b.standard??'Sem padrão'),beds:bedroom(r.number_bedroom),area,price,meter:explicit!==null?explicit:price!==null&&area!==null&&area>0?price/area:null,stock,qty,sales,launches:launch,product:segment==='Horizontal'?horizontal(b,r):segment,stage:String(r.estagio_empreendimento??r.building_status??''),mcmv:typeof hasMcmv==='boolean'?hasMcmv:norm(r.standard_family??b.standard_family??r.pattern??b.standard)==='mcmv'?true:null,raw:{neighborhood:b.neighborhood}});
   }
   if([...established].some(id=>!seen.has(id)))throw new Error(`${city}: fotografia incompleta por tipologia em ${m}.`);
   }catch(error){const reason=error instanceof Error?error.message:'Fotografia inválida';excluded.set(reason,(excluded.get(reason)??0)+1);excludedStock+=out.slice(before).reduce((n,r)=>n+r.stock,0);out.splice(before);if(reason.includes('duplicado conflitante')){const prefix=`${city}/${String(b.building_id??b.id)}/`;for(let i=out.length-1;i>=0;i--)if(out[i].id.startsWith(prefix)){excludedStock+=out[i].stock;out.splice(i,1);}}}
  }
  const notices=[...excluded].map(([reason,count])=>`${city}, ${m}: ${count} empreendimento(s) excluído(s) da base detalhada: ${reason} Estoque observado excluído ${excludedStock}; base parcial, sem preencher ausências.`);
  for(const notice of notices)warnings.add(notice);snapshotWarnings.set(key,notices);
  if(excluded.size&&!out.length)throw new CoverageError(`${city}, ${m}: nenhum empreendimento com fotografia válida; base indisponível, não oferta zero.`);
  cache.set(key,out);return out;
 }
 function temporal(city:string,metric:'releases'|'sales'|'stock',a:string,b:string,group:'Padrão'|'Tipologia'='Padrão',money=false,filter?:(r:Row)=>boolean){
  const src=source(city,'Vertical',metric,group),rows=src.rows.filter(r=>month(r.period)!>=a&&month(r.period)!<=b),seen=new Set<string>(),observed=new Set<string>();
  let total=0;
  for(const r of rows){const m=month(r.period),label=String(r.group??'').trim();if(!m||!label||/^(total|subtotal)(\b|$)/i.test(label)||seen.has(`${m}/${norm(label)}`))throw new Error(`${city}: competência/grupo duplicado ou inválido.`);seen.add(`${m}/${norm(label)}`);observed.add(m);
   if(filter&&!filter(r))continue;
   const n=money?required(r[metric==='releases'?'vgv_release':metric==='sales'?'vgv_liquid_sales':'vgv_stock'],metric==='sales'):integer(r[metric==='releases'?'releases_in_period':metric==='sales'?'liquid_sales':'stock'],metric==='sales');
   if(money&&n!==0){if(!indices[m]||!indices[p.end])throw new Error(`INCC-DI indisponível para ${!indices[p.end]?p.end:m}. Nenhuma base substituída.`);total+=n*indices[p.end]/indices[m]/1e6;}else total+=n;
  }
  const missing=expectedObservations(src,a,b,metric==='stock').filter(m=>!observed.has(m));
  for(const m of missing){
   const frame=snapshot(city,'Vertical',m);
   const verified=metric==='stock'?frame.every(r=>r.stock===0):metric==='sales'?frame.every(r=>r.sales===0):frame.every(r=>r.launches===0||r.launches===null&&r.release<m);
   if(!verified||snapshotWarnings.get(`${city}/Vertical/${m}`)?.length)throw new CoverageError(`${city}: competências ausentes em ${metric} (${m}); ausência não equivale a zero.`);
   warnings.add(`${city}, ${m}: ${metric} zero confirmado no histórico detalhado completo; agregado municipal sem linha. Nenhum estoque/preço atual utilizado.`);
  }
  return sum([total]);
 }
 function checkedSnapshot(city:string,segment:Source['segment'],m:string){
  const rows=snapshot(city,segment,m);
  if(segment==='Vertical'){
   const expected=temporal(city,'stock',m,m),actual=sum(rows.map(r=>r.stock));
   if(expected!==actual)warnings.add(`${city}, ${m}: estoque detalhado ${actual} versus municipal ${expected}. Este quadro usa o detalhamento completo; divergência preservada.`);
  }
  return rows;
 }
 const groupKey=(d:Detail,group:Definition['group'])=>group==='standard'?d.standard:group==='beds'?d.beds:group==='year'?Number(d.release.slice(0,4))<=s.year-5?`Até ${s.year-5}`:d.release.slice(0,4):group==='product'?d.product:group==='neighborhood'?String(d.raw.neighborhood??'Bairro não informado'):areaBand(d.area);
 function weighted(rows:Detail[],field:'price'|'meter'|'area',capacity=false){const included=rows.filter(r=>(capacity?r.qty??0:r.stock)>0),weight=sum(included.map(r=>capacity?required(r.qty):r.stock));if(!weight)return null;if(included.some(r=>r[field]===null||r[field]!<=0)){warnings.add(`Média ${field} indisponível: há unidades contribuintes sem preço/área positivo no histórico. Quantidades preservadas; nenhum preço cadastral utilizado.`);return null;}return sum(included.map(r=>r[field]!*(capacity?required(r.qty):r.stock)))/weight;}
 function capacity(rows:Detail[]){const active=new Set(rows.filter(r=>r.stock>0).map(r=>r.id.split('/').slice(0,-1).join('/')));return rows.filter(r=>active.has(r.id.split('/').slice(0,-1).join('/')));}
 function bucketDefinitions(d:Definition){
  if(d.group||['ticket','meter','distribution','capacity','range','area','age','availability','vgv'].includes(d.role!))return [];
  if(d.window==='year'||d.window==='rolling')return Array.from({length:5},(_,i)=>{const y=s.year-4+i,end=`${y}${p.end.slice(4)}`,start=d.window==='rolling'?shift(end,-11):`${y}-01`;return {start,end,label:d.window==='rolling'?`${end} · 12m`:`${y} · até ${p.end.slice(5)}`};}).filter(b=>b.start>='2021-01');
  const count=Math.min(s.periodicity==='monthly'?13:s.periodicity==='quarterly'?17:11,Math.floor(((s.year-2021)*12+Number(p.end.slice(5)))/p.size));
  return Array.from({length:count},(_,i)=>{const end=shift(p.end,(i-count+1)*p.size);return {start:shift(end,1-p.size),end,label:p.size===1?end:p.size===3?`${Math.ceil(Number(end.slice(5))/3)}T${end.slice(0,4)}`:`${Math.ceil(Number(end.slice(5))/6)}S${end.slice(0,4)}`};});
 }
 function flowDetail(city:string,d:Definition,a:string,b:string){
  const rows:Detail[]=[],src=source(city,'Vertical','details','Empreendimento'),cadence=surveyCadence(src,b).months;
  for(const m of expectedObservations(src,a,b)){
   const frame=snapshot(city,'Vertical',m),start=shift(m,1-cadence),metric=d.role==='sales'?'sales':'releases',expected=temporal(city,metric,start,m);let derived=false;
   const values=frame.map(r=>{let v=metric==='sales'?r.sales:r.launches;if(v===null&&metric==='releases'){v=r.release>=start&&r.release<=m?r.qty:0;derived=true;}if(v===null||!Number.isSafeInteger(v)||metric==='releases'&&v<0)throw new Error('Fluxo histórico por tipologia ausente ou inválido.');return {...r,stock:v};});
   const actual=sum(values.map(r=>r.stock));
   if(actual!==expected){
    if(derived)throw new CoverageError(`${city}, ${m}: lançamentos derivados ${actual} versus municipal ${expected}; não há reconciliação para comprovar a derivação.`);
    warnings.add(`${city}, ${m}: ${metric==='sales'?'vendas':'lançamentos'} detalhados ${actual} versus municipal ${expected} (diferença ${actual-expected}). Este quadro usa o fluxo detalhado observado; série municipal preservada, sem redistribuir a diferença entre categorias.`);
   }
   if(derived)warnings.add('Lançamentos sem fluxo explícito: capacidade histórica da coorte do período pesquisado, reconciliada ao total municipal.');rows.push(...values);
  }return rows;
 }
 function evaluate(d:Definition):Slide {
  warnings.clear();used.clear();if(['paired-cities','combined-cities','named-cities'].includes(geographyMode(s)))d={...d,title:d.title.replace(/RM/g,studyLabel(s))};const result:Slide={definition:d,status:d.kind==='editorial'?'editorial':'waiting-source',issue:null,warnings:[],tables:[],sourceKeys:[],note:'Fonte: Geobrain. INCC-DI aplicado aos fluxos de VGV; preços ponderados pelo estoque elegível. Dados não homologados.'};
  if(d.kind==='editorial'){
   if(d.sourcePage===7){const locations=[{uf:s.uf,city:s.city},...s.includeRm?s.rmCities.map(c=>location(c,s.uf)):[]];result.tables=[table(['UF','Faixa'],locations.map((l,i)=>({label:l.city,values:[l.uf,i===0?'Cidade principal':geographyMode(s)!=='city-and-rm'?'Município do estudo':'RM']})),['text','text'],'Municípios selecionados')];}
   if(d.sourcePage>=144&&d.sourcePage<=153)result.issue='Texto prospectivo depende da revisão do analista; não reutilizamos previsões de 2025.';
   if([2,3,4,5,6,156,157,158].includes(d.sourcePage))result.note='Arte institucional preservada da referência ADEMI-PR 2T2026; números institucionais e equipe não são atualizados pela API. Imagem substituível no PowerPoint, sujeita à revisão editorial.';
   return result;
  }
  if(d.role?.startsWith('rental-'))return rentalSlide(d,s,sources);
  if(d.rmOnly&&!s.includeRm)return {...result,status:'not-applicable',issue:'Região metropolitana não selecionada.'};
  try{
   const mode=geographyMode(s),allCities=[s.city,...s.includeRm?s.rmCities:[]];
   const referenceId=regionalPreset(s.uf,s.city)?.id,combinedDetail=d.localOnly&&d.segment==='Vertical'&&((referenceId==='teresina'&&!['ivv','meter'].includes(d.role!))||(referenceId==='natal'&&d.group==='neighborhood'));
   const territories=combinedDetail?[{label:studyLabel(s),cities:allCities}]:mode==='combined-cities'&&!(d.group&&['ticket','meter'].includes(d.role!))?[{label:studyLabel(s),cities:allCities}]:isPairStudy(s)||mode==='named-cities'&&!d.localOnly||mode==='combined-cities'?[s.city,...s.rmCities].map(city=>({label:location(city,s.uf).city,cities:[city]})):d.localOnly?[{label:s.city,cities:[s.city]}]:d.rmOnly?[{label:'RM',cities:s.rmCities}]:[{label:s.city,cities:[s.city]},...s.includeRm?[{label:'RM',cities:s.rmCities}]:[]];
   const monetary=d.role==='vgv-release'||d.role==='vgv-sales',buckets=bucketDefinitions(d).filter(bucket=>d.role!=='ivv'||shift(bucket.start,-1)>='2021-01');
   if(buckets.length){
    const metric=d.role==='stock'?'stock':d.role==='sales'||d.role==='vgv-sales'?'sales':'releases';
    const values=buckets.map(bucket=>({label:bucket.label,values:territories.map(t=>{try{
     if(d.role==='ivv'){let opening=0,launch=0,sales=0,closing=0;for(const city of t.cities){opening+=temporal(city,'stock',shift(bucket.start,-1),shift(bucket.start,-1));launch+=temporal(city,'releases',bucket.start,bucket.end);sales+=temporal(city,'sales',bucket.start,bucket.end);closing+=temporal(city,'stock',bucket.end,bucket.end);}if(opening+launch-sales!==closing)warnings.add(`${bucket.label}: ajuste de base no balanço IVV de ${closing-(opening+launch-sales)} unidades. Índice calculado com vendas e oferta inicial + lançamentos retornados pela API; estoques preservados.`);return ratio(sales,opening+launch);}
     return sum(t.cities.map(city=>{
     if(d.role==='projects'){const src=source(city,'Vertical','details','Empreendimento'),ids=new Set<string>(),seen=new Map<string,string>();for(const b of src.rows){const rel=month(b.release_date),id=String(b.building_id??b.id??'');if(!rel||!id)throw new Error('Cadastro de lançamento sem ID/data.');const fp=historyFingerprint(b);if(seen.has(id)&&seen.get(id)!==fp)throw new Error('Cadastro duplicado conflitante no histórico de lançamentos.');seen.set(id,fp);if(rel>=bucket.start&&rel<=bucket.end)ids.add(id);}return ids.size;}
     if(d.mcmv){warnings.add('MCMV corresponde ao padrão Econômico da API, conforme agrupamento confirmado para o Modelo 03.');return temporal(city,metric,bucket.start,bucket.end,'Padrão',monetary,r=>standardFamily(r.group)==='MCMV');}
     return temporal(city,metric,metric==='stock'?bucket.end:bucket.start,bucket.end,'Padrão',monetary);
    }));}catch(error){if(!(error instanceof CoverageError))throw error;warnings.add(error.message+' Valor sem cobertura apresentado como ausente, nunca zero.');return null;}})}));
    result.tables=[table(territories.map(t=>t.label),values,territories.map(()=>d.role==='ivv'?'percent':monetary?'decimal':'count'),d.role==='ivv'?'%':monetary?'R$ milhões · INCC-DI':d.role==='projects'?'empreendimentos':'unidades')];
    const last=values.at(-1),before=values.at(-2);if(last&&before)result.tables.push(table(territories.map(t=>t.label),[{label:'Variação sobre período anterior',values:last.values.map((v,i)=>pctChange(v as number,before.values[i] as number))}],territories.map(()=>'percent'),'%'));
   }else if(d.role==='meter'&&!d.group){
    const bins=Array.from({length:13},(_,i)=>shift(p.end,(i-12)*p.size)).filter(m=>m>='2021-01');result.tables=[table(territories.map(t=>t.label),bins.map(m=>({label:m,values:territories.map(t=>{try{const rows=t.cities.flatMap(city=>checkedSnapshot(city,'Vertical',m)).filter(r=>!d.bed||r.beds.startsWith(String(d.bed)));return weighted(rows,'meter');}catch(error){if(!(error instanceof CoverageError))throw error;warnings.add(error.message);return null;}})})),territories.map(()=>'money'),'R$/m²')];
   }else if(d.role==='ivv'){
    for(const t of territories){
    const start=d.window==='rolling'?shift(p.end,-11):p.start,groupSources=t.cities.map(city=>source(city,'Vertical','stock')),labels=[...new Set(groupSources.flatMap(src=>src.rows.map(r=>standardFamily(r.group))))].sort();
    result.tables.push(table(['Oferta inicial','Lançamentos','Vendas líquidas','Oferta final','IVV'],labels.map(label=>{const f=(r:Row)=>standardFamily(r.group)===label,value=(metric:'releases'|'sales'|'stock',a:string,b:string)=>sum(t.cities.map(city=>temporal(city,metric,a,b,'Padrão',false,f))),a=value('stock',shift(start,-1),shift(start,-1)),l=value('releases',start,p.end),v=value('sales',start,p.end),z=value('stock',p.end,p.end);if(a+l-v!==z)warnings.add(`IVV ${label}: ajuste de base ${z-(a+l-v)} unidades; balanço divergente mantido no diagnóstico, índice = vendas / (oferta inicial + lançamentos).`);return {label,values:[a,l,v,z,ratio(v,a+l)]};}),['count','count','count','count','percent'],t.label+' | unidades / %'));
    }
   }else{
    for(const t of territories){
     const segment=d.segment??'Vertical';
     let coveragePartial=false;const covered=(city:string,segment:Source['segment'])=>{try{return d.role==='sales'||d.role==='launches'?flowDetail(city,d,p.start,p.end):checkedSnapshot(city,segment,p.end);}catch(error){if(!(error instanceof CoverageError))throw error;coveragePartial=true;warnings.add(error.message+' Território sem cobertura excluído do quadro parcial.');return [];}};
     let rows=t.cities.flatMap(city=>covered(city,segment));
     if(d.role==='vgv'&&d.rmOnly)rows=t.cities.flatMap(city=>(['Vertical','Horizontal','Comercial'] as const).flatMap(seg=>covered(city,seg)));
     if(['capacity','availability','vgv','age'].includes(d.role!))rows=capacity(rows);else if(!['sales','launches'].includes(d.role!))rows=rows.filter(r=>r.stock>0);
     coveragePartial ||= t.cities.some(city=>!!snapshotWarnings.get(`${city}/${segment}/${p.end}`)?.length);
     const keyOf=(r:Detail)=>d.group==='neighborhood'&&t.cities.length>1?`${location(r.city,s.uf).city}: ${groupKey(r,d.group)}`:groupKey(r,d.group);
     const groups=[...new Set(rows.map(keyOf))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));
     if(d.group==='standard')groups.sort((a,b)=>{const ia=standards.findIndex(x=>norm(x)===norm(a)),ib=standards.findIndex(x=>norm(x)===norm(b));return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b,'pt-BR');});
     if(rows.some(r=>r.product==='Sem classificação')&&segment==='Horizontal')warnings.add('Produtos horizontais não identificados mantidos em Sem classificação; não convertidos em loteamento.');
     let columns=['Oferta final'],formats:Table['formats']=['count'];let values:(rs:Detail[])=>Cell[]=rs=>[sum(rs.map(r=>r.stock))];
     if(d.role==='ticket'||d.role==='meter'){columns=[d.role==='ticket'?'Ticket médio (R$)':'Preço médio (R$/m²)','Unidades'];formats=['money','count'];values=rs=>[weighted(rs,d.role==='ticket'?'price':'meter'),sum(rs.map(r=>r.stock))];}
     if(d.role==='distribution'||d.role==='sales'||d.role==='launches'||d.role==='stock'){columns=[d.role==='sales'?'Vendas líquidas':d.role==='launches'?'Lançamentos':'Oferta final','Participação (%)'];formats=['count','percent'];const total=sum(rows.map(r=>r.stock));values=rs=>{const n=sum(rs.map(r=>r.stock));return[n,ratio(n,total)];};}
     if(d.role==='capacity'||d.role==='availability'){columns=['Empreendimentos','Oferta lançada','Oferta final','Vendas acumuladas','Disponibilidade (%)'];formats=['count','count','count','count','percent'];values=rs=>{const qty=sum(rs.map(r=>integer(r.qty))),stock=sum(rs.map(r=>r.stock));if(stock>qty)throw new Error('Estoque maior que capacidade histórica.');return[new Set(rs.map(r=>r.id.split('/').slice(0,-1).join('/'))).size,qty,stock,qty-stock,ratio(stock,qty)];};}
     if(d.role==='age'){columns=['Idade média oferta lançada (meses)','Idade média oferta final (meses)'];formats=['decimal','decimal'];values=rs=>{const age=(r:Detail)=>(Number(p.end.slice(0,4))-Number(r.release.slice(0,4)))*12+Number(p.end.slice(5))-Number(r.release.slice(5));const calc=(cap:boolean)=>{const weight=sum(rs.map(r=>cap?integer(r.qty):r.stock));return weight?sum(rs.map(r=>age(r)*(cap?integer(r.qty):r.stock)))/weight:null;};return[calc(true),calc(false)];};warnings.add('Tempo de oferta calculado como idade desde o lançamento, ponderada pela capacidade/estoque; não é prazo de escoamento.');}
     if(d.role==='range'){columns=['Área mín.','Área média','Área máx.','R$/m² mín.','R$/m² médio','R$/m² máx.','Oferta'];formats=['decimal','decimal','decimal','money','money','money','count'];values=rs=>{const areas=rs.map(r=>required(r.area)),meters=rs.map(r=>required(r.meter));if(areas.some(x=>x<=0)||meters.some(x=>x<=0))throw new Error('Área/preço sem base positiva.');return[rs.length?Math.min(...areas):null,weighted(rs,'area'),rs.length?Math.max(...areas):null,rs.length?Math.min(...meters):null,weighted(rs,'meter'),rs.length?Math.max(...meters):null,sum(rs.map(r=>r.stock))];};}
     if(d.role==='area'){columns=['1 dormitório','2 dormitórios','3 dormitórios','4 ou mais','Sem informação','Total'];formats=columns.map(()=>'count');values=rs=>[...['1','2','3','4','Sem'].map(b=>sum(rs.filter(r=>r.beds.startsWith(b)).map(r=>r.stock))),sum(rs.map(r=>r.stock))];}
     if(d.role==='vgv'){columns=['Ticket médio','Oferta lançada','Oferta final','VGV lançado (R$ mi)','VGV vendido acumulado (R$ mi)','VGV final (R$ mi)'];formats=['money','count','count','decimal','decimal','decimal'];values=rs=>{const q=sum(rs.map(r=>integer(r.qty))),stock=sum(rs.map(r=>r.stock));if(stock>q)throw new Error('Capacidade menor que estoque.');const launched=sum(rs.map(r=>required(r.price)*integer(r.qty)))/1e6,final=sum(rs.map(r=>required(r.price)*r.stock))/1e6;return[weighted(rs,'price'),q,stock,launched,launched-final,final];};warnings.add('VGV do universo ativo valorizado ao preço histórico do fechamento; vendido acumulado = capacidade menos estoque. Não equivale ao fluxo de VGV vendido no período.');}
     const checkedValues=(rs:Detail[])=>{try{return values(rs);}catch(error){warnings.add(`${t.label}: campo indisponível neste grupo: ${error instanceof Error?error.message:'base inválida'}`);return columns.map(()=>null);}};
     const tableRows=groups.map(label=>({label,values:checkedValues(rows.filter(r=>keyOf(r)===label))}));
     if(!groups.length)tableRows.push({label:coveragePartial?'Sem cobertura válida':'Sem oferta no recorte',values:columns.map((_,i)=>!coveragePartial&&formats[i]==='count'?0:null)});
     else tableRows.push({label:'Total',values:checkedValues(rows)});
     result.tables.push(table(columns,tableRows,formats,coveragePartial?`${t.label} (base parcial)`:t.label));
    }
   }
   result.status='available';
   const hasNumbers=result.tables.some(t=>t.rows.some(r=>r.values.some(v=>typeof v==='number')));
   const unavailable=[...warnings].find(w=>/sem cobertura|fonte não concluída|nenhum empreendimento com fotografia válida|indisponível|competências ausentes|não há reconciliação|não há decomposição/i.test(w));
   if(!hasNumbers&&unavailable){result.status='waiting-source';result.issue=unavailable;}
  }catch(error){result.status='waiting-source';result.issue=error instanceof Error?error.message:'Não foi possível calcular este slide.';result.tables=[];}
  result.sourceKeys=[...used];result.warnings=[...warnings];return result;
 }
 return {evaluate,snapshot,temporal,notices:()=>[...warnings]};
}
export function calculateSlides(s:Selection,sources:Source[]){const c=createCalculator(s,sources);return DEFINITIONS_FOR(s.includeRm).map(d=>c.evaluate(d));}
