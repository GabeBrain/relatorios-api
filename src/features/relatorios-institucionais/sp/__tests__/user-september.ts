import observed from './fixtures/sp-september-user-2026-10-29.json';
import { syntheticWindow } from './synthetic-window';

/** Mixed-date replay for the regression mechanism only, never a quarterly market baseline. */
export function userSeptemberReplay() {
  const input = syntheticWindow('09');
  input.rootPeriod = observed.rootPeriod;
  for (const [source, field, month, values] of [
    ['stock', 'stock', '2026-08', observed.augustStock],
    ['stock', 'stock', '2026-09', observed.septemberStock],
    ['sales', 'liquid_sales', '2026-09', observed.septemberSales],
    ['releases', 'releases_in_period', '2026-09', observed.septemberReleases],
  ] as const) {
    input[source] = input[source].filter(row => row.period !== `${month}-01`);
    input[source].push(...values.map((value, index) => ({ period: `${month}-01`, group: observed.groups[index], building_type: 'Vertical', [field]: value })));
  }
  return input;
}
