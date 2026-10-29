import { buildSpTemporalPreview, priorMonth, type SpTemporalInput, type SpTemporalRow } from '../temporal';
import { recordedInput } from './recorded';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { syntheticLaunchSeries, syntheticSalesSeries } from './launch-series';
import { SP_API_PATTERNS } from '../segments';

/** Invented distribution for contract tests only; these are NOT real typology observations. */
export function syntheticTypologyInput(data: SpTemporalInput = recordedInput(), quarter: Quarter = '3T2026'): SpTemporalInput {
  const baseline = buildSpTemporalPreview(data, quarter);
  const split = (period: string, field: string, total: number): SpTemporalRow[] => {
    const values = [Math.floor(total * .1), Math.floor(total * .6), Math.floor(total * .2)];
    values.push(total - values.reduce((a, b) => a + b, 0));
    return values.map((value, index) => ({ period: `${period}-01`, group: `${index + 1} dormitório${index ? 's' : ''}`, building_type: 'Vertical', [field]: value }));
  };
  return { ...data, groupBy: 'Tipologia',
    releases: baseline.monthly!.flatMap(row => split(row.month, 'releases_in_period', row.launches)),
    sales: baseline.monthly!.flatMap(row => split(row.month, 'liquid_sales', row.sales)),
    stock: [
      ...split(priorMonth(baseline.monthly![0].month), 'stock', baseline.monthly![0].openingStock),
      ...baseline.monthly!.flatMap(row => split(row.month, 'stock', row.closingStock)),
    ],
  };
}

export function syntheticPreviousTypology(input: SpTemporalInput = recordedInput()): SpTemporalInput {
  const current = buildSpTemporalPreview(input, '3T2026');
  const allowed = current.monthly!.map(row => `2025${row.month.slice(4)}`);
  const previous: SpTemporalInput = { ...input, groupBy: 'Padrão', rootPeriod: '2025-08-01', windowEnd: allowed.at(-1),
    releases: syntheticLaunchSeries(input).filter(row => allowed.includes(String(row.period).slice(0, 7))),
    sales: syntheticSalesSeries(input).filter(row => allowed.includes(String(row.period).slice(0, 7))),
    stock: [priorMonth(allowed[0]), ...allowed].flatMap(month => SP_API_PATTERNS.map((group, i) => ({ period: `${month}-01`, group, building_type: 'Vertical', stock: 1000 + i * 50 }))),
  };
  return syntheticTypologyInput(previous, '3T2025');
}
