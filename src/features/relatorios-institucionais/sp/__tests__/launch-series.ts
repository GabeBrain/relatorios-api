import { shiftSpMonth } from '../project-trends';
import { buildSpTemporalPreview, type SpTemporalInput, type SpTemporalRow } from '../temporal';
import { SP_API_PATTERNS } from '../segments';
import { recordedInput } from './recorded';

/** Invented history, with the current short window replaced by its own fixture. Not market data. */
export function syntheticLaunchSeries(input: SpTemporalInput = recordedInput()): SpTemporalRow[] {
  const report = buildSpTemporalPreview(input, '3T2026');
  const rows: SpTemporalRow[] = [];
  for (let month = '2021-01'; month <= report.throughMonth!; month = shiftSpMonth(month, 1)) {
    for (const [i, group] of SP_API_PATTERNS.entries()) {
      const observed = input.releases.find(row => row.period === `${month}-01` && row.group === group);
      rows.push(observed ?? { period: `${month}-01`, group, building_type: 'Vertical', releases_in_period: 100 + i * 5 + Number(month.slice(5)) });
    }
  }
  return rows;
}
