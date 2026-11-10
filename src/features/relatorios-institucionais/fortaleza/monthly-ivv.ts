import type { FortalezaSelection } from './model';
import { monthlyMarketMonths,monthlyStockMonths,monthlyMarketSourceIssue,readMonthlyNumber,type MonthlyMarketData } from './monthly-market';
import type { PriceSlideData } from './monthly-prices';
export function buildMonthlyIvv(data:MonthlyMarketData|null,selection:FortalezaSelection,cities:string[]):PriceSlideData {
  const blocked = (issue:string):PriceSlideData => ({ status:'blocked',issue,warnings:[],series:[],changes:[],sourceKeys:[] });
  if (!cities.includes('Fortaleza')) return blocked('Fortaleza não integra o recorte.');
  const months = monthlyMarketMonths(selection),stockMonths = monthlyStockMonths(months);
  const sources = (['stock','releases','sales'] as const).map(metric => data?.sources.filter(source => source.city === 'Fortaleza' && source.segment === 'Vertical' && source.metric === metric) ?? []);
  if (sources.some(matches => matches.length !== 1)) return blocked('Faltam fontes verticais da capital para o IVV.');
  for (const [source] of sources) {
    const issue = monthlyMarketSourceIssue(source,months);
    if (issue) return blocked(issue);
  }
  const [stock,releases,sales] = sources.map(([source]) => source);
  if (!stock.openingIncluded) return blocked('Falta a fotografia de estoque anterior ao primeiro mês do IVV.');
  const sum = (source:typeof stock,month:string,field:string,signed=false) => {
    const rows = source.rows.filter(row => String(row.period).slice(0,7) === month);
    if (!rows.length) throw new Error('Fotografia mensal ausente.');
    return rows.reduce((total,row) => { const value=readMonthlyNumber(row[field],signed,true); if(value===null) throw new Error('Quantidade inválida.'); return total+value; },0);
  };
  try {
    const points = months.map((month,index) => {
      const opening=sum(stock,stockMonths[index],'stock'),launched=sum(releases,month,'releases_in_period'),sold=sum(sales,month,'liquid_sales',true),denominator=opening+launched;
      if (!Number.isSafeInteger(denominator) || denominator<=0 || !Number.isSafeInteger(sold)) throw new Error('Oferta inicial mais lançamentos sem base positiva segura para calcular o IVV.');
      return { month,label:`${new Intl.DateTimeFormat('pt-BR',{month:'short',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`)).replace('.','')}/${month.slice(2,4)}`,value:sold/denominator*100,units:denominator };
    });
    return { status:'ready',issue:null,warnings:[],series:[{label:'IVV residencial vertical',points}],average:points.reduce((sum,point)=>sum+point.value,0)/points.length,changes:[],sourceKeys:['Fortaleza/Vertical/stock','Fortaleza/Vertical/releases','Fortaleza/Vertical/sales'] };
  } catch(error) { return blocked(error instanceof Error ? error.message : 'IVV indisponível.'); }
}
