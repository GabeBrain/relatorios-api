import { normalizeMarketText } from './market';
import { FORTALEZA_CITIES,type FortalezaSelection } from './model';
import { monthlyMarketMonths,monthlyStockMonths,monthlyMarketSourceIssue,readMonthlyNumber,type MonthlyMarketData } from './monthly-market';
import type { PriceSlideData } from './monthly-prices';
export function buildMonthlyIvv(data:MonthlyMarketData|null,selection:FortalezaSelection,cities:string[],rm=false):PriceSlideData {
  const blocked = (issue:string):PriceSlideData => ({ status:'blocked',issue,warnings:[],series:[],changes:[],sourceKeys:[] });
  const required=rm?FORTALEZA_CITIES.filter(city=>city!=='Fortaleza'):['Fortaleza'];
  if (required.some(city=>!cities.some(value=>normalizeMarketText(value)===normalizeMarketText(city)))) return blocked('Faltam municípios do recorte do IVV.');
  const months = monthlyMarketMonths(selection),stockMonths = monthlyStockMonths(months);
  const sources = (['stock','releases','sales'] as const).map(metric => required.flatMap(city=>data?.sources.filter(source => normalizeMarketText(source.city) === normalizeMarketText(city) && source.segment === 'Vertical' && source.metric === metric) ?? []));
  if (sources.some(matches => matches.length !== required.length || required.some(city=>matches.filter(source=>normalizeMarketText(source.city)===normalizeMarketText(city)).length!==1))) return blocked('Faltam fontes verticais para o IVV.');
  for (const source of sources.flat()) {
    const issue = monthlyMarketSourceIssue(source,months);
    if (issue) return blocked(issue);
  }
  const [stock,releases,sales] = sources;
  if (stock.some(source=>!source.openingIncluded)) return blocked('Falta a fotografia de estoque anterior ao primeiro mês do IVV.');
  const sum = (selected:typeof stock,month:string,field:string,signed=false) => {
    const rows = selected.flatMap(source=>source.rows.filter(row => String(row.period).slice(0,7) === month));
    if (!rows.length) throw new Error('Fotografia mensal ausente.');
    return rows.reduce((total,row) => { const value=readMonthlyNumber(row[field],signed,true); if(value===null) throw new Error('Quantidade inválida.'); return total+value; },0);
  };
  try {
    const points = months.map((month,index) => {
      const opening=sum(stock,stockMonths[index],'stock'),launched=sum(releases,month,'releases_in_period'),sold=sum(sales,month,'liquid_sales',true),denominator=opening+launched;
      if (!Number.isSafeInteger(denominator) || denominator<=0 || !Number.isSafeInteger(sold)) throw new Error('Oferta inicial mais lançamentos sem base positiva segura para calcular o IVV.');
      return { month,label:`${new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`)).replace('.','')}/${month.slice(2,4)}`,value:sold/denominator*100,units:denominator };
    });
    return { status:'ready',issue:null,warnings:[],series:[{label:'IVV residencial vertical',points}],average:points.reduce((sum,point)=>sum+point.value,0)/points.length,changes:[],sourceKeys:required.flatMap(city=>['stock','releases','sales'].map(metric=>`${city}/Vertical/${metric}`)) };
  } catch(error) { return blocked(error instanceof Error ? error.message : 'IVV indisponível.'); }
}
