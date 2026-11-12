import { buildOfferTable,offerRatio } from './monthly-tables';
import type { FortalezaSlideProps } from './FortalezaReportSlide';
import { FORTALEZA_STANDARDS } from './monthly-launches';
import { FORTALEZA_CITIES,fortalezaPeriod,type FortalezaSelection } from './model';
import { marketMonth,normalizeMarketText } from './market';
import { productOf,type PriceCollection } from './monthly-prices';
import { readMonthlyNumber } from './monthly-market';
import { historyFingerprint } from '@/features/panorama-secovi-fiergs/domain/building-history';
export interface QuarterlyDetailRow {label:string;values:(number|string|null)[]}
export interface QuarterlyDetailTable {status:'ready'|'blocked';issue:string|null;warnings:string[];columns:string[];rows:QuarterlyDetailRow[];percentages?:boolean;points?:{id:string;city:string;latitude:number;longitude:number;meter:number;stock:number}[]}
interface Detail {id:string;city:string;label:string;standard:string;year:number;age:number;bedroom:number|null;qty:number;stock:number;area:number|null;ticket:number|null;meter:number|null;latitude:number|null;longitude:number|null}
const number=(raw:unknown)=>readMonthlyNumber(raw),quantity=(raw:unknown)=>{const value=readMonthlyNumber(raw,false,true);if(value===null)throw new Error('Quantidade histórica ausente ou inválida.');return value;};
const ratio=(part:number,total:number)=>total>0?part/total*100:null;
/** Closing snapshot of active projects; no current qty, stage, or price fills a historical field. */
function observations(prices:PriceCollection|null,selection:FortalezaSelection,rm:boolean,horizontal:boolean,cities:string[]):Detail[]{
  const required=rm?FORTALEZA_CITIES.filter(city=>city!=='Fortaleza'):['Fortaleza'],closing=fortalezaPeriod(selection).end.slice(0,7),result:Detail[]=[];
  if(required.some(city=>!cities.some(value=>normalizeMarketText(value)===normalizeMarketText(city))))throw new Error('Faltam municípios autorizados para este recorte.');
  for(const city of required){
    const sources=prices?.sources.filter(source=>normalizeMarketText(source.city)===normalizeMarketText(city)&&source.segment===(horizontal?'Horizontal':'Vertical'))??[];
    if(sources.length!==1||!sources[0].complete)throw new Error(`${city}: histórico detalhado não concluído.`);
    const frame=sources[0].frames[closing];if(!frame||frame.issues.length||Object.values(frame.productIssues).some(issues=>issues?.length))throw new Error(`${city}: fotografia de fechamento incompleta.`);
    const projects=new Set<string>();
    for(const building of sources[0].records){
      if(normalizeMarketText(building.city)!==normalizeMarketText(city)||normalizeMarketText(building.state??building.uf)!=='ce'||normalizeMarketText(building.building_type)!==normalizeMarketText(horizontal?'Horizontal':'Vertical'))throw new Error('Empreendimento fora do recorte autorizado.');
      const id=String(building.building_id??'').trim(),release=marketMonth(building.release_date);if(!id||!release||projects.has(id))throw new Error('Identidade ou data de empreendimento ausente/duplicada.');projects.add(id);
      if(release>closing)continue;
      const product=productOf(building);if(horizontal&&!product){if(['condominio de chacaras','terreno','loteamento comercial'].includes(normalizeMarketText(building.standard)))continue;throw new Error('Produto horizontal não identificado.');}
      if(!Array.isArray(building.typologies_history))throw new Error('Histórico por tipologia ausente.');
      const roster=new Set<string>(),current=new Map<string,Record<string,unknown>>();
      for(const raw of building.typologies_history){
        if(!raw||typeof raw!=='object')throw new Error('Linha histórica inválida.');const row=raw as Record<string,unknown>,month=marketMonth(row.period),typology=String(row.typology_id??'');
        if(!month||!typology)throw new Error('Identidade histórica inválida.');if(month>closing||month<release)continue;roster.add(typology);
        if(month!==closing)continue;const before=current.get(typology);if(before&&historyFingerprint(before)!==historyFingerprint(row))throw new Error('Tipologia duplicada conflitante.');current.set(typology,row);
      }
      if(!current.size||[...roster].some(id=>!current.has(id)))throw new Error(`Empreendimento ${id}: fotografia incompleta no fechamento.`);
      if([...current.values()].reduce((sum,row)=>sum+quantity(row.typology_stock),0)===0)continue;
      for(const row of current.values()){
        const qty=quantity(row.qty),stock=quantity(row.typology_stock);if(stock>qty)throw new Error('Estoque maior que a capacidade histórica.');
        const area=number(row.private_area),ticket=number(row.price),explicit=number(row.price_private_area),meter=explicit&&explicit>0?explicit:area&&ticket?ticket/area:null;
        const [year,month]=release.split('-').map(Number),[endYear,endMonth]=closing.split('-').map(Number);
        result.push({id,city,label:product==='houses'?'Casas em Condomínio':product==='closed-lots'?'Loteamento Fechado':product==='open-lots'?'Loteamento Aberto':'Vertical',standard:String(building.standard??''),year,age:(endYear-year)*12+endMonth-month,bedroom:readMonthlyNumber(row.number_bedroom,false,true),qty,stock,area:area&&area>0?area:null,ticket:ticket&&ticket>0?ticket:null,meter:meter&&meter>0?meter:null,latitude:numberSigned(building.latitude??building.lat),longitude:numberSigned(building.longitude??building.lng??building.lon)});
      }
    }
  }
  if(!result.length)throw new Error('Não há empreendimentos ativos com fotografia histórica completa.');
  return result;
}
const numberSigned=(raw:unknown)=>readMonthlyNumber(raw,true);
const bedroom=(value:number|null)=>{if(value===null)throw new Error('Dormitórios históricos não informados.');return value>=4?'4 ou + Dormitórios':value===0?'Studio / sem dormitório':`${value} Dormitório${value===1?'':'s'}`;};
function weighted(rows:Detail[],field:'area'|'ticket'|'meter'){
  const active=rows.filter(row=>row.stock>0),units=active.reduce((sum,row)=>sum+row.stock,0);
  if(!units||active.some(row=>row[field]===null))return null;
  const total=active.reduce((sum,row)=>sum+row[field]!*row.stock,0);return Number.isFinite(total)&&total<=Number.MAX_SAFE_INTEGER/100?total/units:null;
}
export function buildQuarterlyDetailTable(page:number,prices:PriceCollection|null,selection:FortalezaSelection,cities:string[]):QuarterlyDetailTable{
  const warnings=['Universo: empreendimentos com estoque positivo no fechamento; capacidade histórica qty de todas as tipologias desses empreendimentos. Critério candidato, sujeito à homologação.'],blocked=(issue:string):QuarterlyDetailTable=>({status:'blocked',issue,warnings,columns:[],rows:[]});
  const rm=page>=71,horizontal=[66,67,68,69,81,82,83,84].includes(page),maps=[49,50,51,52,53,71].includes(page);
  try{
    let all=observations(prices,selection,rm,horizontal,cities);
    if([60,75].includes(page))all=all.filter(row=>normalizeMarketText(row.standard)!=='economico');
    if(maps){
      const grouped=new Map<string,Detail[]>();for(const row of all){const key=`${row.city}/${row.id}`,rows=grouped.get(key)??[];rows.push(row);grouped.set(key,rows);}
      const points=[...grouped.values()].flatMap(rows=>{const row=rows[0],meter=weighted(rows,'meter'),stock=rows.reduce((sum,row)=>sum+row.stock,0);if(row.latitude===null||row.longitude===null||row.latitude< -90||row.latitude>90||row.longitude< -180||row.longitude>180||meter===null)return [];return [{id:row.id,city:row.city,latitude:row.latitude,longitude:row.longitude,meter,stock}];});
      if(!points.length)return blocked('Coordenadas e preço histórico não estão disponíveis para localizar os empreendimentos.');
      if(points.length<grouped.size)warnings.push(`${grouped.size-points.length} empreendimentos sem coordenadas/preço não aparecem na localização; totais não foram ajustados.`);
      return {status:'ready',issue:null,warnings,columns:[],rows:[],points};
    }
    const age=[61,62,63,64,76,77,78,79].includes(page),byBedroom=[59,60,63,64,74,75,78,79].includes(page),shares=[62,64,77,79].includes(page),byYear=page===67||page===82,price=[68,69,83,84].includes(page),range=page===69||page===84;
    const grouped=new Map<string,Detail[]>();
    for(const row of all){const label=byBedroom?bedroom(row.bedroom):age?row.standard:byYear?row.year<=selection.year-5?`Até ${selection.year-5}`:String(row.year):row.label;if(!label.trim())throw new Error('Classificação histórica não informada.');const values=grouped.get(label)??[];values.push(row);grouped.set(label,values);}
    const ensure=(label:string)=>{if(!grouped.has(label))grouped.set(label,[]);};
    if(byBedroom)for(const value of [1,2,3,4])ensure(bedroom(value));
    else if(age)for(const standard of FORTALEZA_STANDARDS)ensure(standard);
    else if(byYear){ensure(`Até ${selection.year-5}`);for(let year=selection.year-4;year<=selection.year;year++)ensure(String(year));}
    else if(horizontal)for(const label of ['Loteamento Aberto','Loteamento Fechado','Casas em Condomínio'])ensure(label);
    const qty=all.reduce((sum,row)=>sum+row.qty,0),stock=all.reduce((sum,row)=>sum+row.stock,0),projects=new Set(all.map(row=>`${row.city}/${row.id}`)).size;
    const columns=age?['Grupo','O.L. ≤6m','O.L. 7–42m','O.L. >42m','O.L. total','O.F. ≤6m','O.F. 7–42m','O.F. >42m','O.F. total']:price?range?['Tipo','Área mín.','Área média','Área máx.','R$/m² mín.','R$/m² médio','R$/m² máx.','Oferta final','%']:['Tipo','Preço médio','Área média','R$/m²']:byBedroom?['Tipologia','Oferta lançada','%','Oferta final','%','Disp. s/ O.L.']:['Grupo','Empreend.','%','Oferta lançada','%','Oferta final','%','% vendidas','Disp. s/ O.L.'];
    const calculate=(label:string,rows:Detail[]):QuarterlyDetailRow=>{
      const capacity=rows.reduce((sum,row)=>sum+row.qty,0),offer=rows.reduce((sum,row)=>sum+row.stock,0);
      if(age){const buckets=[0,1,2].map(index=>rows.filter(row=>(row.age<=6?0:row.age<=42?1:2)===index));const values=[...buckets.map(rows=>rows.reduce((sum,row)=>sum+row.qty,0)),capacity,...buckets.map(rows=>rows.reduce((sum,row)=>sum+row.stock,0)),offer];return {label,values:shares?values.map((value,index)=>ratio(value,index<4?capacity:offer)):values};}
      if(price){const active=rows.filter(row=>row.stock>0),areas=active.map(row=>row.area),meters=active.map(row=>row.meter);const limits=(values:(number|null)[],max=false)=>!values.length||values.some(value=>value===null)?null:max?Math.max(...values as number[]):Math.min(...values as number[]);return {label,values:range?[limits(areas),weighted(rows,'area'),limits(areas,true),limits(meters),weighted(rows,'meter'),limits(meters,true),offer,ratio(offer,stock)]:[weighted(rows,'ticket'),weighted(rows,'area'),weighted(rows,'meter')]};}
      if(byBedroom)return {label,values:[capacity,ratio(capacity,qty),offer,ratio(offer,stock),ratio(offer,capacity)]};
      const count=new Set(rows.map(row=>`${row.city}/${row.id}`)).size;return {label,values:[count,ratio(count,projects),capacity,ratio(capacity,qty),offer,ratio(offer,stock),ratio(capacity-offer,capacity),ratio(offer,capacity)]};
    };
    const productOrder=['Loteamento Aberto','Loteamento Fechado','Casas em Condomínio'];
    const rows=[...grouped].sort(([a],[b])=>horizontal&&!byYear?productOrder.indexOf(a)-productOrder.indexOf(b):byYear?(a.startsWith('Até ')?-1:b.startsWith('Até ')?1:a.localeCompare(b,'pt-BR',{numeric:true})):a.localeCompare(b,'pt-BR',{numeric:true})).map(([label,rows])=>calculate(label,rows));
    if(byYear)rows.push(calculate(`A partir de ${selection.year-2}`,all.filter(row=>row.year>=selection.year-2)));
    if(price&&horizontal){const lots=all.filter(row=>row.label!=='Casas em Condomínio');if(lots.length)rows.push(calculate('Média Loteamento',lots));}
    rows.push(calculate(shares?'Total / participação':'Total',all));
    if(rows.length>18)throw new Error('As linhas excedem a capacidade da lâmina original.');
    if(rows.some(row=>row.values.some(value=>typeof value==='number'&&(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER/100))))throw new Error('Agregado fora da precisão numérica segura.');
    if(price&&rows.some(row=>row.values.some(value=>value===null)))warnings.push('Há preços ou áreas históricos ausentes; células sem informação permanecem como —.');
    if(age)warnings.push('Faixas de idade calculadas da data de lançamento até o fechamento: ≤6, 7–42 e >42 meses; não são o status atual da obra.');
    return {status:'ready',issue:null,warnings,columns,rows,percentages:shares};
  }catch(error){return blocked(error instanceof Error?error.message:'Fonte detalhada indisponível.');}
}

export function quarterlyTableForPage(page:number,props:FortalezaSlideProps):QuarterlyDetailTable{
  const {selection,cities,monthlyLaunches}=props;
  if(page>=55&&page<=58||page===73){
    const source=buildOfferTable(page===73?47:52,monthlyLaunches?.market??null,monthlyLaunches?.prices??null,selection,cities);
    const columns=page===73?['Município','Oferta anterior','Oferta final','%','Lançamentos','%','Vendas líquidas','%','IVV (%)']:['Bairro','Oferta anterior','Oferta final','%','Lançamentos','%','Vendas líquidas','%','IVV (%)','Preço R$/m²'];
    const visible=page===73?source.rows:source.rows.slice((page-55)*14,(page-54)*14);
    return {...source,columns,rows:[...visible,source.total].map(row=>({label:row.label,values:[row.opening,row.stock,offerRatio(row.stock,source.total.stock),row.launches,offerRatio(row.launches,source.total.launches),row.sales,offerRatio(row.sales,source.total.sales),offerRatio(row.sales,row.opening+row.launches),...(page===73?[]:[row.priceUnits?row.weighted/row.priceUnits:null])]}))};
  }
  return buildQuarterlyDetailTable(page,monthlyLaunches?.prices??null,selection,cities);
}
