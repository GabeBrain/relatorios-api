import { monthlySelection } from './market-fixture';
import { FORTALEZA_STANDARDS, monthlyLaunchMonths, type MonthlyLaunchData } from '../monthly-launches';
const selection = { ...monthlySelection, position: 7 };
export function monthlyLaunchFixture(cities = ['Fortaleza']): MonthlyLaunchData {
  return { issues: [], sources: cities.map(city => ({ city, complete: true, requests: 2, startedAt: '', finishedAt: '', rows: monthlyLaunchMonths(selection).flatMap(month => FORTALEZA_STANDARDS.map((group, index) => ({ city, state: 'CE', building_type: 'Vertical', period: `${month}-01`, group, releases_in_period: group === 'Econômico' ? month.startsWith('2026') ? 30 : 10 : index === 1 ? 5 : 0 }))) })) };
}
