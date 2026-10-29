import { shiftSpMonth } from '../project-trends';
import { buildSpTemporalPreview, type SpTemporalInput, type SpTemporalRow } from '../temporal';
import { SP_API_PATTERNS } from '../segments';
import { recordedInput } from './recorded';

/** Invented history, with the current short window replaced by its own fixture. Not market data. */
export function syntheticLaunchSeries(input: SpTemporalInput = recordedInput()): SpTemporalRow[] {
  return syntheticFlowSeries(input, 'releases');
}
export function syntheticSalesSeries(input: SpTemporalInput = recordedInput()): SpTemporalRow[] {
  return syntheticFlowSeries(input, 'sales');
}
function syntheticFlowSeries(input: SpTemporalInput, metric: 'releases' | 'sales'): SpTemporalRow[] {
  const field = metric === 'releases' ? 'releases_in_period' : 'liquid_sales';
  const report = buildSpTemporalPreview(input, '3T2026');
  const rows: SpTemporalRow[] = [];
  for (let month = '2021-01'; month <= report.throughMonth!; month = shiftSpMonth(month, 1)) {
    for (const [i, group] of SP_API_PATTERNS.entries()) {
      const observed = input[metric].find(row => row.period === `${month}-01` && row.group === group);
      const row = observed ?? { period: `${month}-01`, group, building_type: 'Vertical', [field]: 100 + i * 5 + Number(month.slice(5)) };
      rows.push(metric === 'releases' ? { ...row, vgv_release: row.vgv_release ?? Number(row[field]) * 100000.25 } : { ...row, vgv_liquid_sales: row.vgv_liquid_sales ?? Number(row[field]) * 100000.25 });
    }
  }
  return rows;
}

/** Synthetic nominal money, only for testing correction and source reconciliation. */
export function syntheticVglInput(input: SpTemporalInput = recordedInput()): SpTemporalInput {
  return { ...input, sales: input.sales.map(row => ({ ...row, vgv_liquid_sales: row.vgv_liquid_sales ?? Number(row.liquid_sales) * 100000.25 })), releases: input.releases.map(row => ({ ...row, vgv_release: row.vgv_release ?? Number(row.releases_in_period) * 100000.25 })) };
}

export function syntheticStockSeries(input: SpTemporalInput = recordedInput()): SpTemporalRow[] {
  const report = buildSpTemporalPreview(input, '3T2026'), rows: SpTemporalRow[] = [];
  for (let month = '2021-01'; month <= report.throughMonth!; month = shiftSpMonth(month, 1)) for (const [i, group] of SP_API_PATTERNS.entries()) {
    rows.push(input.stock.find(row => row.period === `${month}-01` && row.group === group) ?? { period: `${month}-01`, group, building_type: 'Vertical', stock: 1000 + i * 50 });
  }
  return rows;
}
