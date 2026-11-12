import type { SpLaunchHistoryInput } from '../history';
import { recordedInput } from './recorded';

/** Current counts replay supplied data; 2025 values are fictitious contract/UI test data. */
export function syntheticLaunchHistory(): SpLaunchHistoryInput {
  const current = recordedInput().releases.filter(row => String(row.period) < '2026-09-01');
  const groups = [...new Set(current.map(row => row.group))];
  return {
    city: 'São Paulo', uf: 'SP', rootPeriod: '2026-08-01', current,
    previous: ['2025-07-01', '2025-08-01'].flatMap(period => groups.map((group, index) => ({ period, group, building_type: 'Vertical', releases_in_period: index === groups.length - 1 ? 1432 : 1428 }))),
    complete: { current: true, previous: true },
  };
}
