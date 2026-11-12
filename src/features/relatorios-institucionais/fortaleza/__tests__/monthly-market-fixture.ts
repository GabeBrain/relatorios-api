import { FORTALEZA_CITIES } from '../model';
import { monthlyMarketMonths, monthlyStockMonths, type MonthlyMarketData, type MonthlyMarketSource, type MonthlySegment, type MonthlyMetric } from '../monthly-market';
import { FORTALEZA_STANDARDS } from '../monthly-launches';
import { monthlySelection } from './market-fixture';
export const monthlyMarketSelection = { ...monthlySelection, territory:'capital-rm' as const, position:7 };
export function monthlyMarketFixture(selection=monthlyMarketSelection): MonthlyMarketData {
  const months = monthlyMarketMonths(selection), sources:MonthlyMarketSource[] = [];
  for (const city of FORTALEZA_CITIES) for (const segment of ['Vertical','Horizontal','Comercial'] as MonthlySegment[]) for (const metric of (segment === 'Comercial'&&selection.periodicity==='monthly' ? ['releases','sales'] : ['releases','sales','stock']) as MonthlyMetric[]) {
    const groups = segment === 'Horizontal' ? ['Condomínio de Casas/Sobrados','Loteamento Aberto','Loteamento Fechado','Condomínio de Chácaras'] : [...FORTALEZA_STANDARDS];
    const rows = (metric === 'stock' ? monthlyStockMonths(months) : months).flatMap(month => groups.map((group,index) => ({ city,state:'CE',building_type:segment,period:`${month}-01`,group,
      releases_in_period: segment === 'Vertical' ? index === 0 ? 10 : 1 : segment === 'Horizontal' ? index === 0 ? 4 : index === 3 ? 9999 : 3 : index === 0 ? 2 : 0,
      liquid_sales: segment === 'Vertical' ? index === 0 ? 8 : index === 1 ? -1 : 1 : segment === 'Horizontal' ? index === 0 ? 2 : index === 3 ? 9999 : 1 : index === 0 ? 1 : 0,
      vgv_release: 1_000_000, vgv_liquid_sales: index === 1 ? -100_000 : 1_000_000, stock:index === 0 ? 100 : 10,
    })));
    sources.push({ city,segment,metric,openingIncluded:metric === 'stock',rows,complete:true,issue:null,requests:2,startedAt:'2026-11-10T12:00:00Z',finishedAt:'2026-11-10T12:00:01Z' });
  }
  return { scopeKey:'fixture',months,sources,issues:[] };
}
