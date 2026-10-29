import { recordedInput } from './recorded';
import type { SpTemporalInput } from '../temporal';

/** September is invented to exercise closure transitions, never a market observation. */
export function syntheticWindow(month: '07' | '08' | '09'): SpTemporalInput {
  const input = recordedInput();
  input.rootPeriod = `2026-${month}-01`;
  input.groupBy = 'Padrão';
  for (const metric of ['sales', 'releases', 'stock'] as const) {
    input[metric] = input[metric].filter(row => String(row.period) < '2026-09');
  }
  for (const row of input.stock.filter(row => row.period === '2026-08-01')) {
    input.releases.push({ ...row, period: '2026-09-01', releases_in_period: 10 });
    input.sales.push({ ...row, period: '2026-09-01', liquid_sales: 4 });
    input.stock.push({ ...row, period: '2026-09-01', stock: Number(row.stock) + 6 });
  }
  for (const metric of ['sales', 'releases', 'stock'] as const) input[metric] = input[metric].filter(row => String(row.period) <= `2026-${month}-31`);
  return input;
}
