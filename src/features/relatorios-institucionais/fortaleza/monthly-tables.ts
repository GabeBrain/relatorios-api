import { FORTALEZA_CITIES,fortalezaPeriod,type FortalezaSelection } from './model';
import { monthlyMarketMonths,monthlyMarketSourceIssue,readMonthlyNumber,type MonthlyMarketData } from './monthly-market';
import { marketMonth,normalizeMarketText } from './market';
import { productOf,type PriceCollection } from './monthly-prices';
import { historyFingerprint } from '@/features/panorama-secovi-fiergs/domain/building-history';
export interface OfferRow { label:string; opening:number; stock:number; launches:number; sales:number; projects:number; capacity:number; weighted:number; priceUnits:number }
export interface OfferTable { status:'ready'|'blocked'; issue:string|null; rows:OfferRow[]; total:OfferRow; warnings:string[]; pages:number }
const blank=(label:string):OfferRow=>({label,opening:0,stock:0,launches:0,sales:0,projects:0,capacity:0,weighted:0,priceUnits:0});
const keys=['opening','stock','launches','sales','projects','capacity','weighted','priceUnits'] as const;
export function totalOffer(rows:OfferRow[]) { const total=blank('Total');for(const row of rows)for(const key of keys){total[key]+=row[key];if(!Number.isFinite(total[key])||Math.abs(total[key])>Number.MAX_SAFE_INTEGER/100)throw new Error('A agregação excede a precisão segura.');}return total; }
export const offerRatio=(numerator:number,denominator:number)=>denominator>0?numerator/denominator*100:null;
const blocked=(issue:string):OfferTable=>({status:'blocked',issue,rows:[],total:blank('Total'),warnings:[],pages:1});
const horizontal=['Loteamento Aberto','Loteamento Fechado','Casas em Condomínio'];
function productLabel(group:unknown) {const text=normalizeMarketText(group);if(text==='loteamento aberto')return horizontal[0];if(text==='loteamento fechado')return horizontal[1];return ['economico','compacto','standard','medio','medio-alto','alto','luxo','condominio de casas/sobrados','condominio de casas e sobrados','condominio de casas','casas em condominio','casas em condominio fechado'].includes(text)?horizontal[2]:null;}
export function buildOfferTable(page:number,market:MonthlyMarketData|null,prices:PriceCollection|null,selection:FortalezaSelection,cities:string[]):OfferTable {
  const rm=[47,49,51].includes(page),required=rm?FORTALEZA_CITIES.filter(city=>city!=='Fortaleza'):['Fortaleza'];
  if(required.some(city=>!cities.some(value=>normalizeMarketText(value)===normalizeMarketText(city))))return blocked('O recorte não inclui todos os municípios desta tabela.');
  const closing=fortalezaPeriod(selection).end.slice(0,7),[year,month]=closing.split('-').map(Number),opening=new Date(Date.UTC(year,month-2,1)).toISOString().slice(0,7),warnings:string[]=[];
  try {
    let rows:OfferRow[];
    if(page<=49) {
      rows=(page===47?required:horizontal).map(blank);
      for(const city of required)for(const metric of ['stock','releases','sales'] as const){
        const matches=market?.sources.filter(source=>normalizeMarketText(source.city)===normalizeMarketText(city)&&source.segment===(page===47?'Vertical':'Horizontal')&&source.metric===metric)??[];
        if(matches.length!==1)throw new Error(`${city}/${metric}: fonte municipal ausente.`);
        const source=matches[0],issue=monthlyMarketSourceIssue(source,monthlyMarketMonths(selection));if(issue)throw new Error(`${city}/${metric}: ${issue}`);

        for(const raw of source.rows){const period=marketMonth(raw.period);if(period!==closing&&!(metric==='stock'&&period===opening))continue;
          const label=page===47?city:productLabel(raw.group);if(!label)continue;
          const row=rows.find(row=>row.label===label)!,field=metric==='stock'?(period===opening?'opening':'stock'):metric==='releases'?'launches':'sales';
          const value=readMonthlyNumber(raw[metric==='stock'?'stock':metric==='releases'?'releases_in_period':'liquid_sales'],metric==='sales',true);if(value===null)throw new Error('Quantidade municipal inválida.');row[field]+=value;
        }

      }
    } else {
      const grouped=new Map<string,OfferRow>();const capacityPage=page===50||page===51;
      for(const city of required){
        const matches=prices?.sources.filter(source=>normalizeMarketText(source.city)===normalizeMarketText(city)&&source.segment===(capacityPage?'Horizontal':'Vertical'))??[];
        if(matches.length!==1||!matches[0].complete)throw new Error(`${city}: coleta detalhada não concluída.`);
        const seen=new Set<string>();
        for(const building of matches[0].records){
          const id=String(building.building_id??'').trim();
          if(!id||seen.has(id)||normalizeMarketText(building.city)!==normalizeMarketText(city)||normalizeMarketText(building.state??building.uf)!=='ce'||normalizeMarketText(building.building_type)!==normalizeMarketText(capacityPage?'Horizontal':'Vertical'))throw new Error('Identidade duplicada ou empreendimento fora do recorte.');seen.add(id);
          const release=marketMonth(building.release_date);if(!release)throw new Error('Empreendimento sem data de lançamento válida.');if(release>closing)continue;
          const product=productOf(building);if(capacityPage&&!product){if([building.standard,building.subtype,building.building_subtype].map(normalizeMarketText).some(label=>['condominio de chacaras','terreno','loteamento comercial'].includes(label)))continue;throw new Error('Produto horizontal não identificado.');}
          let label=capacityPage?product==='houses'?horizontal[2]:product==='open-lots'?horizontal[0]:product==='closed-lots'?horizontal[1]:null:typeof building.neighborhood==='string'?building.neighborhood.trim():null;
          if(!label||['-','—','nao informado','sem bairro'].includes(normalizeMarketText(label))){if(capacityPage)throw new Error(`Empreendimento ${building.building_id}: produto ausente.`);label='Bairro não informado';}
          const missingNeighborhood=!capacityPage&&label==='Bairro não informado';
          const raw=building.typologies_history;if(!Array.isArray(raw))throw new Error(`Empreendimento ${building.building_id}: histórico ausente.`);
          const identities=new Map<string,{signature:string;row:Record<string,unknown>}>();
          for(const item of raw){if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('Linha histórica inválida.');const value=item as Record<string,unknown>,period=marketMonth(value.period);if(!period)throw new Error('Competência histórica inválida.');if(period>closing||period<release)continue;const id=String(value.typology_id??'').trim();if(!id)throw new Error('Tipologia sem identidade.');const key=`${period}/${id}`,signature=historyFingerprint(value),previous=identities.get(key);if(previous&&previous.signature!==signature)throw new Error('Tipologia/mês conflitante.');identities.set(key,{signature,row:value});}
          const snapshot=(period:string)=>{if(period<release)return [];
            const all=[...identities.values()].map(item=>item.row),selected=all.filter(item=>marketMonth(item.period)===period),roster=new Set(all.filter(item=>marketMonth(item.period)!<=period).map(item=>String(item.typology_id)));
            if(!selected.length||[...roster].some(id=>!selected.some(item=>String(item.typology_id)===id)))throw new Error(`Empreendimento ${building.building_id}: fotografia ${period} incompleta.`);return selected;};
          const current=snapshot(closing),before=capacityPage?[]:snapshot(opening),project=blank(label);
          const quantity=(value:unknown,signed=false)=>{const number=readMonthlyNumber(value,signed,true);if(number===null)throw new Error(`Empreendimento ${building.building_id}: quantidade histórica ausente ou inválida.`);return number;};
          for(const item of current){const stock=quantity(item.typology_stock);project.stock+=stock;
            if(capacityPage||release===closing){const capacity=quantity(item.qty);if(stock>capacity)throw new Error('Estoque excede a oferta lançada histórica.');project.capacity+=capacity;}
            if(!capacityPage){project.sales+=quantity(item.sold_in_period,true);if(stock>0){const explicit=item.price_private_area,price=readMonthlyNumber(item.price),area=readMonthlyNumber(item.private_area),meter=explicit==null||explicit===''?price!==null&&area!==null&&area>0?price/area:null:readMonthlyNumber(explicit);if(meter===null||meter<=0)throw new Error(`Empreendimento ${building.building_id}: preço histórico inválido.`);project.weighted+=meter*stock;project.priceUnits+=stock;}}
          }
          if(capacityPage&&project.stock===0)continue;
          for(const item of before)project.opening+=quantity(item.typology_stock);
          if(!capacityPage&&release===closing)project.launches=project.capacity;
          if(!capacityPage&&project.opening===0&&project.stock===0&&project.launches===0&&project.sales===0)continue;
          if(missingNeighborhood)warnings.push(`Empreendimento ${building.building_id}: bairro não informado; valores preservados no grupo Bairro não informado.`);
          project.projects=1;const key=normalizeMarketText(label),aggregate=grouped.get(key)??blank(label);for(const field of keys)aggregate[field]+=project[field];grouped.set(key,aggregate);
        }
      }
      rows=capacityPage?horizontal.map(label=>grouped.get(normalizeMarketText(label))??blank(label)):[...grouped.values()].sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
      if(!rows.length)throw new Error('Não há fotografias elegíveis para esta tabela.');
      if(!capacityPage&&rows.length>56)throw new Error(`Há ${rows.length} bairros; as quatro páginas oficiais comportam56. É necessária continuação antes de apresentar a tabela completa.`);
      if(!capacityPage){const source=market?.sources.find(source=>normalizeMarketText(source.city)==='fortaleza'&&source.segment==='Vertical'&&source.metric==='sales');if(source?.complete){const municipal=source.rows.filter(row=>marketMonth(row.period)===closing).reduce((sum,row)=>sum+Number(row.liquid_sales),0),granular=totalOffer(rows).sales;if(municipal!==granular)warnings.push(`Vendas detalhadas ${granular}; municipal ${municipal}. Diferença ${granular-municipal}, causa não confirmada. Tabela utiliza o universo detalhado completo, sem ajuste aos totais municipais.`);}}
    }
    const total=totalOffer(rows);return {status:'ready',issue:null,rows,total,warnings,pages:page>=52?4:1};
  } catch(error){return blocked(error instanceof Error?error.message:'Tabela indisponível.');}
}
