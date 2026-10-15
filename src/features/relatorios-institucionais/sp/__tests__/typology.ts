import { buildSpTemporalPreview, priorMonth, type SpTemporalInput, type SpTemporalRow } from '../temporal';
import { recordedInput } from './recorded';

/** Invented distribution for contract tests only; these are NOT real typology observations. */
export function syntheticTypologyInput(): SpTemporalInput {
  const data = recordedInput();
  const baseline = buildSpTemporalPreview(data, '3T2026');
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
