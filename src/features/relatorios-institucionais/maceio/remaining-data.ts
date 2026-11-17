import { maceioPatternFamily, maceioHorizontalProduct } from './classification';
import {maceioCities,maceioPeriod,type MaceioSelection} from './model';
import {marketMonth,normalizeMarketText as norm,type MarketRow} from './market';
import {readNumber,type MaceioMarketSlidesData,type SlideSource} from './market-slides-data';
import type {PricePolicy} from './offer-price-data';

type Cell=number|string|null;
export interface RemainingTable {title?:string;columns:string[];rows:{label:string;values:Cell[]}[];formats:('count'|'percent'|'money'|'decimal'|'text')[]}
export interface RemainingSlide {kind:'editorial'|'tables'|'stages';tables:RemainingTable[];groups:string[];stages:{label:string;values:(number|null)[][]}[];issue:string|null;note:string;price:boolean;warnings:string[]}
interface Detail {id:string;city:string;year:number;standard:string;family:string;type:string;bedroom:unknown;area:unknown;price:unknown;stock:number;qty:unknown;stage:unknown}
const number=(value:unknown,decimal=false)=>{const n=readNumber(value,false,decimal);if(n===null)throw new Error('Campo histórico ausente ou inválido. Cadastro atual não substitui a fotografia.');return n;};
const sum=(values:number[])=>{const n=values.reduce((a,b)=>a+b,0);if(!Number.isFinite(n)||Math.abs(n)>=Number.MAX_SAFE_INTEGER/100)throw new Error('Totais fora da precisão segura.');return n;};
const ratio=(a:number,b:number)=>b>0?a/b*100:null;
const standards=['Compacto','Econômico','Standard','Médio','Médio-Alto','Alto','Luxo'];
const rmStandards=['Compacto','Econômico','Standard','Médio','Alto','Luxo','Super Luxo'];
const typologies=['1 Dormitório','2 Dormitórios','3 Dormitórios','4 ou + Dormitórios'];
const families=['Compactos','MCMV','Médio Padrão','Luxo'];
const types=['Condomínio de Casas','Loteamento Fechado','Loteamento Aberto','Condomínio de Chácaras'];
export function remainingRole(page:number,selection:MaceioSelection){
  if(selection.periodicity==='monthly')return ({61:'editorial',62:'years',63:'standards-combined',64:'bedrooms-combined',65:'area',66:'range',67:'stage-bedrooms',68:'stage-standards',69:'vgv',70:'editorial',71:'horizontal-type-capital',72:'horizontal-years-capital',73:'horizontal-prices-capital',74:'editorial',75:'horizontal-type-rm',76:'horizontal-years-rm',77:'horizontal-prices-rm'} as Record<number,string>)[page]??'editorial';
  return ({61:'years',62:'standards-capital',63:'standards-rm',64:'bedrooms-capital',65:'bedrooms-rm',66:'area',67:'range',68:'stage-bedrooms',69:'stage-standards',70:'vgv',71:'editorial',72:'horizontal-type-capital',73:'horizontal-years-capital',74:'horizontal-prices-capital',75:'editorial',76:'horizontal-type-rm',77:'horizontal-years-rm',78:'horizontal-prices-rm',79:'editorial',80:'commercial-type',81:'commercial-years',82:'commercial-prices'} as Record<number,string>)[page]??'editorial';
}
/** Complete closing snapshots, in their own segment. No inferred horizontal product or current stage. */
function details(data:MaceioMarketSlidesData,selection:MaceioSelection,cities:readonly string[],segment:'Vertical'|'Horizontal'|'Comercial'):Detail[]{
  const sources=segment==='Vertical'?data.sources:segment==='Horizontal'?data.horizontal:data.commercial,end=maceioPeriod(selection).end.slice(0,7),result:Detail[]=[];
  if(data.end!==end)throw new Error('A fonte não corresponde ao período selecionado.');
  for(const city of cities){
    const matches=(sources??[]).filter(s=>norm(s.city)===norm(city)&&s.metric==='details');
    if(matches.length!==1||!matches[0].complete)throw new Error(`${city}: histórico ${segment} não concluído. Tente novamente.`);
    const projects=new Set<string>();
    for(const building of matches[0].rows){
      const id=String(building.building_id??building.id??'').trim(),release=marketMonth(building.release_date);
      if(!id||projects.has(id)||!release||norm(building.city)!==norm(city)||building.state!=='AL'||norm(building.building_type)!==norm(segment))throw new Error('Identificação, segmento, município ou data inválida no histórico.');
      projects.add(id);if(release>end)continue;
      if(!Array.isArray(building.typologies_history))throw new Error('Fotografia histórica por tipologia ausente.');
      const histories=building.typologies_history as MarketRow[],established=new Set<string>(),seen=new Set<string>();
      for(const row of histories){
        const month=marketMonth(row.period),tid=String(row.typology_id??'').trim();
        if(!month||!tid)throw new Error('Competência ou ID de tipologia inválido.');
        if(month<=end)established.add(tid);if(month!==end)continue;
        if(seen.has(tid))throw new Error('Tipologia duplicada no fechamento.');seen.add(tid);
        result.push({id:`${city}/${id}`,city,year:Number(release.slice(0,4)),standard:String(row.pattern??building.standard??''),family:String(row.standard_family??building.standard_family??maceioPatternFamily(row.pattern??building.standard)??''),type:maceioHorizontalProduct(building),bedroom:row.number_bedroom,area:row.private_area,price:row.price,stock:number(row.typology_stock),qty:row.qty,stage:row.estagio_empreendimento??row.building_status});
      }
      if(!seen.size||[...established].some(tid=>!seen.has(tid)))throw new Error(`${city}: fotografia de fechamento incompleta; ausência não é estoque zero.`);
    }
    const municipal=(sources??[]).filter(s=>norm(s.city)===norm(city)&&s.metric==='stock'&&s.group==='Padrão');
    if(municipal.length!==1||!municipal[0].complete)throw new Error(`${city}: estoque municipal ${segment} indisponível para reconciliação.`);
    const rows=municipal[0].rows.filter(row=>marketMonth(row.period)===end),groups=new Set<string>();
    const expected=sum(rows.map(row=>{const group=norm(row.group);if(norm(row.city)!==norm(city)||row.state!=='AL'||norm(row.building_type)!==norm(segment)||!group||/^(total|subtotal)(\b|$)/.test(group)||groups.has(group))throw new Error('Estoque municipal duplicado ou fora do universo.');groups.add(group);return number(row.stock);}));
    const actual=sum(result.filter(row=>row.city===city).map(row=>row.stock));
    if(expected!==actual)throw new Error(`${city}: estoque granular diverge do total municipal ${segment} em ${end}: histórico ${actual}, municipal ${expected}, diferença ${actual-expected}.`);
  }
  const active=new Set(result.filter(row=>row.stock>0).map(row=>row.id));
  return result.filter(row=>active.has(row.id));
}
function qty(row:Detail){const value=number(row.qty);if(value<row.stock)throw new Error('Capacidade histórica menor que o estoque.');return value;}
function beds(row:Detail){const value=number(row.bedroom);if(value<1)throw new Error('Tipologia sem correspondência com1–4oumais dormitórios.');return Math.min(4,value)-1;}
function match(value:string,groups:string[]){const i=groups.findIndex(group=>norm(group)===norm(value));if(i<0)throw new Error(`Categoria sem correspondência explícita: ${value||'não informada'}.`);return i;}
const offered=(rows:Detail[])=>rows.filter(row=>row.stock>0);
function weighted(rows:Detail[],field:'area'|'price'|'meter',capacity=false){
  const selected=capacity?rows:offered(rows),units=sum(selected.map(row=>capacity?qty(row):row.stock));if(!units)return null;
  return sum(selected.map(row=>{const area=field!=='price'?number(row.area,true):1,p=field!=='area'?number(row.price,true):1;if(area<=0||p<=0)throw new Error('Preço ou área histórica sem base positiva.');return (field==='area'?area:field==='price'?p:p/area)*(capacity?qty(row):row.stock); }))/units;
}
const amounts=(rows:Detail[])=>({count:new Set(rows.map(row=>row.id)).size,capacity:sum(rows.map(qty)),stock:sum(rows.map(row=>row.stock))});
function capacityTable(groups:string[],rows:Detail[],group:(row:Detail)=>number,projects=false):RemainingTable{
  if(projects){const projectGroups=new Map<string,number>();for(const row of rows){const index=group(row),previous=projectGroups.get(row.id);if(previous!==undefined&&previous!==index)throw new Error('Empreendimento em mais de um grupo; confirme a classificação antes de contar projetos.');projectGroups.set(row.id,index);}}
  rows.forEach(group);const all=amounts(rows),columns=projects?['Empreend.','% empreend.','Oferta lançada','% lançada','Oferta final','% final','Vendidas/OL (%)','Disponível/OL (%)']:['Oferta lançada','% lançada','Oferta final','% final','Disponível/OL (%)'];
  const values=(selected:Detail[])=>{const a=amounts(selected);return projects?[a.count,ratio(a.count,all.count),a.capacity,ratio(a.capacity,all.capacity),a.stock,ratio(a.stock,all.stock),ratio(a.capacity-a.stock,a.capacity),ratio(a.stock,a.capacity)]:[a.capacity,ratio(a.capacity,all.capacity),a.stock,ratio(a.stock,all.stock),ratio(a.stock,a.capacity)];};
  return {columns,formats:projects?['count','percent','count','percent','count','percent','percent','percent']:['count','percent','count','percent','percent'],rows:[...groups.map((label,i)=>({label,values:values(rows.filter(row=>group(row)===i))})),{label:'Total',values:values(rows)}]};
}
export function buildRemainingSlide(page:number,selection:MaceioSelection,data:MaceioMarketSlidesData|null,policy:PricePolicy='unconfirmed'):RemainingSlide{
  const role=remainingRole(page,selection),result:RemainingSlide={kind:'tables',tables:[],groups:[],stages:[],issue:null,note:'Fotografia no fechamento. Universo candidato: empreendimentos com estoque positivo, incluindo as capacidades históricas de suas tipologias. Oferta lançada é capacidade do universo ativo, não lançamentos do mês/trimestre. Critérios em conferência com o analista.',price:/range|prices|vgv/.test(role),warnings:[]};
  if(role==='editorial')return {...result,kind:'editorial',note:'Arte e equipe do modelo de referência, preservadas para revisão editorial da nova edição.'};
  try{
    if(!data)throw new Error('Gere o relatório para consultar as fontes deste bloco.');
    if(result.price&&policy!=='stock-weighted')throw new Error('Confirme o critério de preços para esta prévia; o método do original ainda não foi homologado.');
    const horizontal=role.startsWith('horizontal'),commercial=role.startsWith('commercial'),segment=horizontal?'Horizontal':commercial?'Comercial':'Vertical';
    const cities=role.endsWith('-rm')?maceioCities(selection.periodicity).filter(city=>norm(city)!=='maceio'):role.endsWith('-capital')||commercial||['area','range'].includes(role)?['Maceió']:maceioCities(selection.periodicity);
    const rows=details(data,selection,cities,segment);
    if(!rows.length)throw new Error('Nenhum empreendimento com estoque positivo no fechamento deste recorte.');
    const yearLimit=selection.year-(selection.periodicity==='monthly'?5:4),years=[`Até ${yearLimit}`,...Array.from({length:selection.year-yearLimit},(_,i)=>String(yearLimit+1+i))];
    const yearGroup=(row:Detail)=>row.year<=yearLimit?0:row.year-yearLimit;
    if(role==='years'||role.includes('-years')){
      if(role==='years'){
        const capitals=[true,false].map(capital=>rows.filter(row=>(norm(row.city)==='maceio')===capital)),totals=capitals.map(part=>sum(part.map(row=>row.stock)));
        result.tables=[{columns:['Maceió','% Maceió','RM','% RM'],formats:['count','percent','count','percent'],rows:[...years.map((label,i)=>({label,values:capitals.flatMap((part,c)=>{const stock=sum(part.filter(row=>yearGroup(row)===i).map(row=>row.stock));return [stock,ratio(stock,totals[c])];})})),{label:'Total',values:totals.flatMap(value=>[value,ratio(value,value)])}]}];
      }else result.tables=[capacityTable(years,rows,yearGroup,true)];
      result.warnings.push(`Recorte de lançamentos cadastrais até ${maceioPeriod(selection).end.slice(0,7)}; anos anteriores agrupados sem excluir o histórico.`);
    }else if(role==='standards-combined'||role==='bedrooms-combined'){
      const groups=role.startsWith('standards')?standards:typologies,group=(row:Detail)=>role.startsWith('standards')?match(row.standard,groups):beds(row);rows.forEach(group);
      const parts=[true,false].map(capital=>rows.filter(row=>(norm(row.city)==='maceio')===capital)),totals=parts.map(part=>sum(part.map(row=>row.stock)));
      result.tables=[{columns:['Maceió','% Maceió','RM','% RM'],formats:['count','percent','count','percent'],rows:[...groups.map((label,i)=>({label,values:parts.flatMap((part,c)=>{const stock=sum(part.filter(row=>group(row)===i).map(row=>row.stock));return [stock,ratio(stock,totals[c])];})})),{label:'Total',values:totals.flatMap(value=>[value,ratio(value,value)])}]}];
    }else if(role.startsWith('standards-')||role.startsWith('bedrooms-')){
      const groups=role.startsWith('bedrooms')?typologies:role.endsWith('-rm')?rmStandards:standards;
      result.tables=[capacityTable(groups,rows,row=>role.startsWith('bedrooms')?beds(row):match(row.standard,groups))];
      if(role.startsWith('standards'))result.warnings.push('Padrões seguem o rótulo declarado; faixas de preço do original e a nomenclatura distinta daRM aguardam homologação, sem reclassificação silenciosa.');
    }else if(role==='area'){
      const limits=[44,49,59,69,84,99,150,200,250],labels=['Até 44 m²','44–49 m²','49–59 m²','59–69 m²','69–84 m²','84–99 m²','99–150 m²','150–200 m²','200–250 m²','Acima de 250 m²'];
      const group=(row:Detail)=>{const a=number(row.area,true);if(a<=0)throw new Error('Área histórica inválida.');const i=limits.findIndex(limit=>a<=limit);return i<0?9:i;};
      offered(rows).forEach(row=>{group(row);beds(row);});
      const values=(part:Detail[])=>{const buckets=typologies.map((_,i)=>sum(part.filter(row=>beds(row)===i).map(row=>row.stock)));return [...buckets,sum(buckets)];};
      result.tables=[{columns:[...typologies,'Total'],formats:['count','count','count','count','count'],rows:[...labels.map((label,i)=>({label,values:values(offered(rows).filter(row=>group(row)===i))})),{label:'Total',values:values(offered(rows))}]}];
      result.warnings.push('Faixas contínuas incluem áreas fracionárias; rótulos inteiros do original precisam de homologação.');
    }else if(role==='range'){
      const values=(part:Detail[]):Cell[]=>{const active=offered(part);if(!active.length)return [null,null,null,null,null,null,0];const areas=active.map(row=>number(row.area,true)),meters=active.map(row=>{const area=number(row.area,true);if(area<=0)throw new Error('Área inválida.');return number(row.price,true)/area;});return [Math.min(...areas),weighted(active,'area'),Math.max(...areas),Math.min(...meters),weighted(active,'meter'),Math.max(...meters),sum(active.map(row=>row.stock))];};
      offered(rows).forEach(beds);const overall=values(rows);overall[0]=null;overall[2]=null;overall[3]=null;overall[5]=null;
      result.tables=[{columns:['Área mín.','Área média','Área máx.','R$/m² mín.','R$/m² médio','R$/m² máx.','Oferta final'],formats:['decimal','decimal','decimal','money','money','money','count'],rows:[...typologies.map((label,i)=>({label,values:values(offered(rows).filter(row=>beds(row)===i))})),{label:'Média geral',values:overall}]}];
    }else if(role.startsWith('stage-')){
      const groups=role==='stage-bedrooms'?typologies:families,group=(row:Detail)=>role==='stage-bedrooms'?beds(row):match(row.family,families),names=['Planta','Construção','Pronto'];rows.forEach(group);
      result.kind='stages';result.groups=groups;
      for(const capacity of [true,false])result.stages.push({label:capacity?'OFERTA LANÇADA':'OFERTA FINAL',values:groups.map((_,i)=>{const part=rows.filter(row=>group(row)===i),values=names.map(()=>0);for(const row of part){const value=capacity?qty(row):row.stock;if(!value)continue;const stage=match(String(row.stage??''),names);values[stage]=sum([values[stage],value]);}const base=sum(values);return values.map(value=>ratio(value,base));})});
      result.warnings.push('O original chama estes gráficos de tempo médio, mas mostra participação por estágio de obra. Estágio vem exclusivamente da fotografia histórica, sem usar status cadastral atual.');
    }else if(role==='vgv'){
      const groups=selection.periodicity==='monthly'?standards:rmStandards;rows.forEach(row=>match(row.standard,groups));
      const values=(part:Detail[]):Cell[]=>{const a=amounts(part),ticket=weighted(part,'price',true),sold=a.capacity-a.stock;return [ticket,a.capacity,sold,a.stock,ticket===null?null:ticket*a.capacity/1e6,ticket===null?null:ticket*sold/1e6,ticket===null?null:ticket*a.stock/1e6];};
      result.tables=[{columns:['Ticket médio','Oferta lançada','Vendidas','Oferta final','VGV lançada (mi)','VGV vendida (mi)','VGV final (mi)'],formats:['money','count','count','count','decimal','decimal','decimal'],rows:[...groups.map((label,i)=>({label,values:values(rows.filter(row=>match(row.standard,groups)===i))})),{label:'Total residencial',values:values(rows)}]}];
      result.note+=' VGV de conferência = ticket ponderado pela capacidade histórica do grupo × quantidade. Vendidas = capacidade−estoque, não fluxo da janela. Valores nominais, sem INCC; fórmula e classificação não homologadas.';
    }else{
      const groups=commercial?['Econômico','Standard','Médio','Alto','Alto +']:types;
      const group=(row:Detail)=>{if(!commercial)return match(row.type,types);const area=number(row.area,true),price=number(row.price,true);if(area<=0||price<=0)throw new Error('Área ou preço comercial inválido.');const meter=price/area;return meter<=10000?0:meter<=12000?1:meter<=14000?2:meter<=16000?3:4;};rows.forEach(group);
      if(role.includes('prices')){
        const values=(part:Detail[]):Cell[]=>[weighted(part,'price'),weighted(part,'area'),weighted(part,'meter')];
        result.tables=[{columns:['Preço médio','Área privativa média','R$/m² privativo'],formats:['money','decimal','money'],rows:[...groups.map((label,i)=>({label,values:values(rows.filter(row=>group(row)===i))})),{label:'Média geral',values:values(rows)}]}];
      }else result.tables=[capacityTable(groups,rows,group,true)];
      result.warnings.push(commercial?'Classes comerciais por R$/m² histórico: até10mil,12mil,14mil,16mil e acima; limites e universo a homologar.':'Tipo horizontal exige subtipo explícito: condomínio de casas, loteamento fechado ou aberto. Não deduzimos produto de um padrão de preço.');
    }
    if(role.startsWith('standards')||role==='commercial-type'){
      const ranges=role==='commercial-type'?['Até R$10mil/m²','R$10–12mil/m²','R$12–14mil/m²','R$14–16mil/m²','Acima R$16mil/m²']:['Studio/loft/1quarto','Até R$400mil','R$400mil–1mi','R$1–2mi','R$2–3mi','R$3–5mi','Acima R$5mi'];
      for(const table of result.tables){table.columns.unshift('Faixa da referência');table.formats.unshift('text');table.rows.forEach((row,i)=>row.values.unshift(i<ranges.length?ranges[i]:''));}
    }
    for(const table of result.tables)for(const row of table.rows)for(const value of row.values)if(typeof value==='number'&&(!Number.isFinite(value)||Math.abs(value)>=Number.MAX_SAFE_INTEGER/100))throw new Error('Totais fora da precisão segura.');
    if(result.price)result.note+=' Médias de preços/áreas ponderadas por estoque histórico positivo, salvo o ticket-capacidade do VGV, explicitado acima. Sem correção monetária implícita.';
    return result;
  }catch(error){return {...result,tables:[],stages:[],issue:error instanceof Error?error.message:'Fonte indisponível para este slide.'};}
}
