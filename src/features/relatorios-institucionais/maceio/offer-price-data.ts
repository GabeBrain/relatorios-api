import { maceioHistoricalLaunch, historicalLaunchNotice } from './historical-launch';
import { maceioStockDecision, maceioDetailedClosingCells } from './stock-policy';
import { maceioPatternFamily } from './classification';
import { maceioCities, maceioPeriod, type MaceioSelection } from './model';
import { marketMonth, normalizeMarketText, type MarketRow } from './market';
import { shiftMonth } from './intro-data';
import { readCells, readNumber, type MaceioMarketSlidesData } from './market-slides-data';

export type PricePolicy = 'unconfirmed' | 'stock-weighted';
export interface OfferPriceSlide {
  kind: 'editorial' | 'bars' | 'series' | 'table' | 'shares';
  groups: string[];
  series: { label: string; values: (number | null)[] }[];
  columns: string[];
  rows: { label: string; values: (number | null)[] }[];
  unit: 'percent' | 'months' | 'money' | 'ticket' | 'count';
  issue: string | null;
  note: string;
  warnings: string[];
  price: boolean;
  averages?: {label:string;value:number|null}[];
}
const standards = ['Compacto', 'Econômico', 'Standard', 'Médio', 'Médio-Alto', 'Alto', 'Luxo'];
const bands = ['Até 35 m²', 'De 35 a 40 m²', 'De 40 a 50 m²', 'De 50 a 60 m²', 'De 60 a 70 m²', 'De 70 a 80 m²', 'De 80 a 85 m²', 'Acima de 85 m²'];
const total = (values: number[]) => {
  const value = values.reduce((sum, item) => sum + item, 0);
  if (!Number.isFinite(value) || Math.abs(value) >= Number.MAX_SAFE_INTEGER / 100) throw new Error('O cálculo excede a precisão numérica segura.');
  return value;
};
const requiredNumber = (value: unknown, signed = false, decimal = false) => {
  const number = readNumber(value, signed, decimal);
  if (number === null) throw new Error('Há valor histórico ausente ou inválido; ausência não representa zero.');
  return number;
};
const labelMonth = (month: string) => new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`)).replace('.', '') + '/' + month.slice(2,4);
const bedroom = (value: unknown) => {
  const match = /^([1-4])(?:\s+(?:dorm|dormitorio|dormitorios|quarto|quartos))?$/.exec(normalizeMarketText(value));
  if (!match) throw new Error('Tipologia sem correspondência explícita com 1–4 dormitórios.');
  return Number(match[1]) - 1;
};
function source(data: MaceioMarketSlidesData, city: string, metric: 'stock' | 'sales' | 'releases', group = 'Padrão') {
  const matches = data.sources.filter(item => normalizeMarketText(item.city) === normalizeMarketText(city) && item.metric === metric && item.group === group);
  if (matches.length !== 1 || !matches[0].complete) throw new Error(`${city}: fonte ${metric}/${group} incompleta. Tente novamente.`);
  return matches[0].rows;
}
function quantity(data: MaceioMarketSlidesData, city: string, metric: 'stock' | 'sales' | 'releases', month: string, useSelected=true) {
  if(metric==='stock'&&useSelected){const selected=maceioDetailedClosingCells(data,city,month,'Padrão');if(selected)return total(selected.map(row=>row.value));}
  const rows = source(data, city, metric).filter(row => marketMonth(row.period) === month), seen = new Set<string>();
  return total(rows.map(row => {
    const key = normalizeMarketText(row.group);
    if (!key || /^(total|subtotal)(\b|$)/.test(key) || seen.has(key)) throw new Error('Grupo ausente, subtotal ou duplicação na fonte municipal.');
    seen.add(key);
    return requiredNumber(row[metric === 'stock' ? 'stock' : metric === 'sales' ? 'liquid_sales' : 'releases_in_period'], metric === 'sales');
  }));
}
function ivv(data: MaceioMarketSlidesData, month: string) {
  const opening = quantity(data, 'Maceió', 'stock', shiftMonth(month, -1));
  const releases = quantity(data, 'Maceió', 'releases', month), sales = quantity(data, 'Maceió', 'sales', month);
  if (opening + releases <= 0) throw new Error('IVV sem oferta inicial e lançamentos positivos no denominador.');
  if (opening + releases - sales !== quantity(data, 'Maceió', 'stock', month)) throw new Error(`Balanço municipal não reconciliado em ${month}; confira as fontes do IVV.`);
  return sales / total([opening, releases]) * 100;
}
interface Snapshot { city: string; standard: string; bedroom: unknown; area: unknown; price: unknown; stock: number; releases: unknown; sales: unknown; derivedLaunch: boolean }
/** No root prices/stock fill historical observations. Every established typology needs a snapshot. */
function snapshots(data: MaceioMarketSlidesData, cities: readonly string[], month: string, resolveLaunches = false, warnings:string[]=[]): Snapshot[] {
  const result: Snapshot[] = [];
  for (const city of cities) {
    const sources = data.sources.filter(item => normalizeMarketText(item.city) === normalizeMarketText(city) && item.metric === 'details');
    if (sources.length !== 1 || !sources[0].complete) throw new Error(`${city}: histórico granular incompleto.`);
    const ids = new Set<string>();
    for (const building of sources[0].rows) {
      const id = String(building.building_id ?? building.id ?? '').trim(), release = marketMonth(building.release_date);
      if (!id || ids.has(id) || !release || normalizeMarketText(building.city) !== normalizeMarketText(city) || building.state !== 'AL' || normalizeMarketText(building.building_type) !== 'vertical') throw new Error('Histórico sem identificação, data ou universo vertical municipal confiável.');
      ids.add(id);
      if (release > month) continue;
      if (!Array.isArray(building.typologies_history)) throw new Error('Histórico por tipologia ausente.');
      const history = building.typologies_history as MarketRow[], seen = new Set<string>(), established = new Set<string>();
      let observed = false;
      for (const row of history) {
        const period = marketMonth(row.period), typology = String(row.typology_id ?? '').trim();
        if (!period || !typology) throw new Error('Competência ou identificador de tipologia inválido.');
        if (period <= month) established.add(typology);
        if (period !== month) continue;
        if (seen.has(typology)) throw new Error('Tipologia repetida na mesma competência.');
        seen.add(typology); observed = true;
        const launch = resolveLaunches ? maceioHistoricalLaunch(row, release, month) : null;
        result.push({ derivedLaunch: launch?.origin === 'historical-launch-cohort', city, standard: String(building.standard ?? ''), bedroom: row.number_bedroom, area: row.private_area, price: row.price, stock: requiredNumber(row.typology_stock), releases: launch ? launch.value : row.releases_in_period, sales: row.sold_in_period });
      }
      if (!observed || [...established].some(id => !seen.has(id))) throw new Error(`${city}: fotografia ${month} incompleta; não usamos cadastro atual ou estoque zero como substitutos.`);
    }
    const actual = total(result.filter(row => row.city === city).map(row => row.stock)), expected = quantity(data, city, 'stock', month,false);
    if (actual !== expected && !maceioStockDecision(city,'Vertical',actual,expected,warnings)) throw new Error(`${city}: estoque granular diverge do estoque municipal em ${month} (${actual} versus ${expected}, diferença ${actual-expected}).`);
  }
  return result;
}
function price(rows: Snapshot[], meter: boolean) {
  const offered = rows.filter(row => row.stock > 0), units = total(offered.map(row => row.stock));
  if (!units) return null;
  return total(offered.map(row => {
    const value = requiredNumber(row.price, false, true), area = meter ? requiredNumber(row.area, false, true) : 1;
    if (value <= 0 || area <= 0) throw new Error('Preço ou área histórica sem base positiva.');
    return value / area * row.stock;
  })) / units;
}
export const offerPricePage = (page: number, selection: MaceioSelection) => selection.periodicity === 'quarterly' ? page + 1 : page;
export function buildOfferPriceSlide(page: number, selection: MaceioSelection, data: MaceioMarketSlidesData | null, policy: PricePolicy = 'unconfirmed'): OfferPriceSlide {
  const logical = offerPricePage(page, selection), end = maceioPeriod(selection).end.slice(0, 7);
  const result: OfferPriceSlide = { kind: 'bars', groups: [], series: [], columns: [], rows: [], unit: 'count', issue: null, note: '', warnings: [], price: logical >= 50 && logical !== 55 && logical <= 60 };
  if ([44,49,55,61].includes(logical)) return { ...result, kind: 'editorial' };
  try {
    if (!data) throw new Error('Gere o relatório para consultar as fontes deste bloco.');
    if (data.end !== end || data.sources.some(item => item.rows.some(row => normalizeMarketText(row.city) !== normalizeMarketText(item.city) || row.state !== 'AL' || normalizeMarketText(row.building_type) !== 'vertical'))) throw new Error('As fontes não correspondem ao período e universo selecionados.');
    if (logical === 42 || logical === 43) {
      const comparisonMonths=[`${selection.year-1}${end.slice(4)}`,end];
      const typology = logical === 42, read = readCells(selection, data, 'stock', typology ? 'Tipologia' : 'Padrão', false, 'unconfirmed',comparisonMonths);
      if (read.issue) throw new Error(read.issue);
      result.kind='shares';result.unit = 'percent'; result.groups = typology ? ['1 dorm', '2 dorm', '3 dorm', '4 dorm'] : ['Compactos', 'MCMV', 'Médio Padrão', 'Luxo'];
      for (const year of [selection.year - 1, selection.year]) {
        const month = `${year}${end.slice(4)}`, values = result.groups.map(() => 0);
        for (const city of maceioCities(selection.periodicity)) {
          const rows = read.cells.filter(cell => cell.city === city && cell.month === month);
          if (total(rows.map(row => row.value)) !== quantity(data, city, 'stock', month)) throw new Error(`${city}: participação da oferta sem reconciliação municipal.`);
          for (const row of rows) {
            const index = typology ? bedroom(row.group) : result.groups.findIndex(group => normalizeMarketText(group) === normalizeMarketText(maceioPatternFamily(row.group)));
            if (index < 0) throw new Error('Padrão sem correspondência explícita com as categorias do original.');
            values[index] = total([values[index], row.value]);
          }
        }
        const sum = total(values); if (!sum) throw new Error('Oferta sem base positiva para participação.');
        result.series.push({ label: selection.periodicity === 'monthly' ? labelMonth(month) : `${selection.position}T/${year}`, values: values.map(value => value / sum * 100) });
      }
      result.note = 'Participação no estoque do mês de fechamento e do mesmo fechamento do ano anterior; estoques trimestrais não são somados. O rótulo abril do original mensal43 é inconsistente com a edição de maio e segue pendente de confirmação.';
    } else if (logical === 41) {
      const months = Array.from({length:12}, (_, i) => shiftMonth(end, i-11));
      const current = snapshots(data, ['Maceió'], end), history = months.flatMap(month => snapshots(data, ['Maceió'], month));
      for(const month of months)if(total(snapshots(data,['Maceió'],month).map(row=>requiredNumber(row.sales,true)))!==quantity(data,'Maceió','sales',month))throw new Error('Vendas granulares do escoamento divergem do total municipal.');
      result.groups = ['Econômico', 'Alto', 'Compacto', 'Luxo', 'Médio', 'Médio-Alto', 'Standard', 'Super Luxo']; result.unit = 'months';
      if ([...current, ...history].some(row => !result.groups.some(group => normalizeMarketText(group) === normalizeMarketText(row.standard)))) throw new Error('Padrão sem correspondência explícita com o escoamento do original.');
      result.series = [{ label: 'Meses', values: result.groups.map(group => {
        const matches = (row: Snapshot) => normalizeMarketText(row.standard) === normalizeMarketText(group);
        const stock = total(current.filter(matches).map(row => row.stock)), sales = total(history.filter(matches).map(row => requiredNumber(row.sales, true)));
        return sales > 0 ? stock / (sales / 12) : null;
      }) }];
      if(result.series[0].values.some(value=>value===null))result.warnings.push('— indica padrão sem média de vendas líquidas positiva nos12meses; não há estimativa de escoamento para esse grupo.');
      result.note = 'Critério de conferência: estoque final ÷ média mensal das vendas líquidas dos últimos12meses. Sem vendas positivas, escoamento fica sem base (—). Método do original aguarda homologação.';
    } else if (logical === 45 || logical === 46) {
      result.unit = 'percent'; result.note = 'IVV mensal = vendas líquidas ÷ (estoque anterior + lançamentos) ×100, com balanço reconciliado. Vendas negativas são preservadas. Método em conferência com o analista.';
      if (logical === 45) {
        const months = Array.from({length:25}, (_,i) => shiftMonth(end,i-24));
        result.kind = 'series'; result.groups = months.map(labelMonth); result.series = [{label:'Vertical',values:months.map(month => ivv(data,month))}];
      } else {
        result.kind = 'table'; const years = Array.from({length:Math.max(1,selection.year-2012)},(_,i)=>2013+i);
        result.columns = years.map(String);
        result.rows = Array.from({length:12},(_,i)=>({label:new Intl.DateTimeFormat('pt-BR',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2020,i,1))),values:years.map(year=>{
          const month = `${year}-${String(i+1).padStart(2,'0')}`;
          if (month > end || shiftMonth(month,-1) < data.start) return null;
          try { return ivv(data,month); } catch(error) { result.warnings.push(`${month}: ${error instanceof Error?error.message:'IVV indisponível'}`); return null; }
        })}));
        if(result.rows.every(row=>row.values.every(value=>value===null)))throw new Error('Nenhuma competência histórica com IVV válido.');
        result.rows.push({label:'Média do ano',values:years.map((_,i)=>{const values=result.rows.map(row=>row.values[i]).filter((v):v is number=>v!==null);return values.length?total(values)/values.length:null;})});
        result.warnings.push('— indica competência futura, sem cobertura ou sem balanço reconciliado; a coleta atual começa em '+data.start+'. Médias anuais usam somente os meses cobertos e reconciliados; consulte as competências excluídas nas advertências.');
      }
    } else if (logical === 47 || logical === 48) {
      const months = Array.from({length:logical===48?12:1},(_,i)=>shiftMonth(end,i-(logical===48?11:0))), opening = shiftMonth(months[0],-1);
      const before = snapshots(data,['Maceió'],opening), after=snapshots(data,['Maceió'],end), flow=months.flatMap(month=>snapshots(data,['Maceió'],month,true));
      for (const [metric,field] of [['sales','sales'],['releases','releases']] as const) for (const month of months) {
        const observations=snapshots(data,['Maceió'],month,true),apiField=field==='sales'?'sold_in_period':'releases_in_period',missing=observations.filter(row=>readNumber(row[field],metric==='sales')===null).length;
        if(missing)throw new Error(`Maceió: ${apiField}${metric==='releases'?' ou oferta inicial histórica de lançamento':''} ausente ou inválido em ${missing} observação(ões) de ${month}; IVV por área indisponível.`);
        const actual=total(observations.map(row=>requiredNumber(row[field],metric==='sales'))),expected=quantity(data,'Maceió',metric,month);
        if(actual!==expected)throw new Error(`Maceió: fluxos granulares por área divergem dos totais municipais em ${month} (${apiField}: ${actual} versus ${expected}, diferença ${actual-expected}).`);
      }
      // Only contributing rows need an area. Unknown areas remain an explicit
      // bucket, never zero m², guessed from the catalog, or silently dropped.
      const openingRows=before.filter(row=>row.stock!==0),closingRows=after.filter(row=>row.stock!==0),flowRows=flow.filter(row=>requiredNumber(row.releases)!==0||requiredNumber(row.sales,true)!==0);
      const band=(row:Snapshot)=>{const area=readNumber(row.area,false,true);if(area===null||area<=0)return 8;const i=[35,40,50,60,70,80,85].findIndex(limit=>area<=limit);return i<0?7:i;};
      const unknownArea=[...openingRows,...closingRows,...flowRows].some(row=>band(row)===8);
      const areaBands=unknownArea?[...bands,'Área não informada']:bands;
      result.kind='table';result.columns=[`Oferta ${labelMonth(opening)}`,`Oferta ${labelMonth(end)}`,'% oferta','Lançamentos','% lanç.','Vendas líq.','% vendas','IVV (%)'];
      const rows=areaBands.map((label,i)=>({label,opening:total(openingRows.filter(row=>band(row)===i).map(row=>row.stock)),stock:total(closingRows.filter(row=>band(row)===i).map(row=>row.stock)),releases:total(flowRows.filter(row=>band(row)===i).map(row=>requiredNumber(row.releases))),sales:total(flowRows.filter(row=>band(row)===i).map(row=>requiredNumber(row.sales,true)))}));
      const totals={label:'Total',opening:total(rows.map(row=>row.opening)),stock:total(rows.map(row=>row.stock)),releases:total(rows.map(row=>row.releases)),sales:total(rows.map(row=>row.sales))};
      if(rows.some(row=>row.opening+row.releases-row.sales!==row.stock))throw new Error('Balanço por área não reconciliado; as faixas históricas podem ter mudado.');
      const share=(value:number,base:number)=>base>0?value/base*100:null;
      result.rows=[...rows,totals].map(row=>({label:row.label,values:[row.opening,row.stock,share(row.stock,totals.stock),row.releases,share(row.releases,totals.releases),row.sales,share(row.sales,totals.sales),share(row.sales,total([row.opening,row.releases]))]}));
      if(flow.some(row=>row.derivedLaunch))result.warnings.push(historicalLaunchNotice);
      if(unknownArea)result.warnings.push('Área não informada preserva estoques e fluxos sem área histórica positiva; essas unidades não são atribuídas às faixas de m². O balanço de cada linha continua obrigatório.');
      result.note='Oferta inicial/final são fotografias; lançamentos e vendas são fluxos da janela. IVV acumulado usa vendas ÷ (estoque anterior à janela + lançamentos), sem somar taxas mensais. Faixas contínuas: (35,40], (40,50] etc.; agrupamento a homologar.';
    } else if (result.price) {
      if(policy!=='stock-weighted')throw new Error('Confirme o critério de ponderação dos preços para esta prévia. O original não comprova a fórmula.');
      result.note='Critério de conferência: todas as tipologias com estoque histórico positivo, incluindo Garden e Cobertura. Ticket = Σ(estoque×preço)÷Σestoque; R$/m² = Σ(estoque×preço/área)÷Σestoque. Preços nominais, sem INCC. Critério não homologado.';
      result.unit='money';
      if(logical<=54){
        const months=Array.from({length:13},(_,i)=>shiftMonth(end,(i-12)*(selection.periodicity==='monthly'?1:3)));
        result.kind='series';result.groups=months.map(month=>selection.periodicity==='monthly'?labelMonth(month):`${Math.ceil(Number(month.slice(5))/3)}T/${month.slice(2,4)}`);
        result.series=[{label:logical===50?'Média':`${logical-50} dormitório(s)`,values:months.map(month=>{
          const rows=snapshots(data,['Maceió'],month).filter(row=>row.stock>0);
          return price(logical===50?rows:rows.filter(row=>bedroom(row.bedroom)===logical-51),true);
        })}];
        if(selection.periodicity==='quarterly')result.warnings.push('Série trimestral utiliza o preço no fechamento de cada trimestre. O original51 apresenta datas mensais inconsistentes com as outras séries; critério a homologar.');
      }else{
        const typology=logical>=59,meter=logical!==56&&logical!==59,rows=snapshots(data,maceioCities(selection.periodicity),end,false,result.warnings).filter(row=>row.stock>0);
        result.unit=meter?'money':'ticket';result.groups=typology?['1 dorm','2 dorm','3 dorm','4 dorm']:standards;
        const group=(row:Snapshot)=>{const index=typology?bedroom(row.bedroom):standards.findIndex(name=>normalizeMarketText(name)===normalizeMarketText(row.standard));if(index<0)throw new Error('Padrão granular sem correspondência explícita com as categorias de preço do original.');return index;};
        rows.forEach(group);
        const combined=logical===57;
        for(const capital of combined?[null]:[true,false]){
          const selected=capital===null?rows:rows.filter(row=>(normalizeMarketText(row.city)==='maceio')===capital);
          const label=capital===null?'Maceió + RM':capital?'Maceió':'Região Metropolitana';
          result.series.push({label,values:result.groups.map((_,i)=>{const value=price(selected.filter(row=>group(row)===i),meter);return value===null?null:meter?value:value/1000;})});
          if(!typology){const average=price(selected,meter);(result.averages??=[]).push({label:`Média ${label}`,value:average===null?null:meter?average:average/1000});}
        }
      }
      if(result.series.every(series=>series.values.every(value=>value===null)))throw new Error('Nenhuma unidade ofertada com estoque histórico positivo no recorte de preços.');
      if(result.series.some(series=>series.values.some(value=>value===null)))result.warnings.push('— indica grupo sem estoque ofertado positivo; não representa preço zero.');
    } else throw new Error('Slide sem contrato neste bloco.');
    return result;
  }catch(error){return {...result,series:[],rows:[],issue:error instanceof Error?error.message:'Fonte indisponível para este slide.'};}
}
