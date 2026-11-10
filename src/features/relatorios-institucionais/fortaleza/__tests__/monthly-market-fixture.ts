import { FORTALEZA_CITIES } from '../model';
import { monthlyMarketMonths, type MonthlyMarketData, type MonthlyMarketSource, type MonthlySegment, type MonthlyMetric } from '../monthly-market';
import { FORTALEZA_STANDARDS } from '../monthly-launches';
import { monthlySelection } from './market-fixture';
export const monthlyMarketSelection = { ...monthlySelection, territory:'capital-rm' as const, position:7 };
export function monthlyMarketFixture(): MonthlyMarketData {
  const months = monthlyMarketMonths(monthlyMarketSelection), sources:MonthlyMarketSource[] = [];
  for (const city of FORTALEZA_CITIES) for (const segment of ['Vertical','Horizontal','Comercial'] as MonthlySegment[]) for (const metric of ['releases','sales'] as MonthlyMetric[]) {
    const groups = segment === 'Horizontal' ? ['Condomínio de Casas/Sobrados','Loteamento Aberto','Loteamento Fechado','Condomínio de Chácaras'] : [...FORTALEZA_STANDARDS];
    const rows = months.flatMap(month => groups.map((group,index) => ({ city,state:'CE',building_type:segment,period:`${month}-01`,group,
      releases_in_period: segment === 'Vertical' ? index === 0 ? 10 : 1 : segment === 'Horizontal' ? index === 0 ? 4 : index === 3 ? 9999 : 3 : index === 0 ? 2 : 0,
      liquid_sales: segment === 'Vertical' ? index === 0 ? 8 : index === 1 ? -1 : 1 : segment === 'Horizontal' ? index === 0 ? 2 : index === 3 ? 9999 : 1 : index === 0 ? 1 : 0,
      vgv_release: 1_000_000,
    })));
    sources.push({ city,segment,metric,rows,complete:true,issue:null,requests:2,startedAt:'2026-11-10T12:00:00Z',finishedAt:'2026-11-10T12:00:01Z' });
  }
  return { scopeKey:'fixture',months,sources,issues:[] };
}
