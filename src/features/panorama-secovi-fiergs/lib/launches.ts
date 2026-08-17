import type { LaunchModel, LaunchRecord, LaunchSeries, Quarter } from '../types';

export function quarterKey(quarter: Quarter): number { return Number(quarter.slice(2)) * 4 + Number(quarter[0]); }
export function quarterLabel(quarter: Quarter): string { return `${quarter.slice(0, 2)} ${quarter.slice(2)}`; }
export function periodToQuarter(value: unknown): Quarter | null {
  const raw = String(value ?? '').trim();
  const iso = /^(\d{4})-(\d{1,2})/.exec(raw);
  const brazil = /^(\d{1,2})\/(\d{4})$/.exec(raw);
  const year = Number(iso?.[1] ?? brazil?.[2]); const month = Number(iso?.[2] ?? brazil?.[1]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return `${Math.ceil(month / 3)}T${year}` as Quarter;
}
export function safeNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null;
}
function series(quarters: Quarter[], records: LaunchRecord[], selector: (record: LaunchRecord) => number | null): LaunchSeries[] {
  return quarters.map((quarter) => {
    const vertical = records.filter((record) => record.quarter === quarter && record.segment === 'Vertical').reduce((sum, record) => sum + (selector(record) ?? 0), 0);
    const horizontal = records.filter((record) => record.quarter === quarter && record.segment === 'Horizontal').reduce((sum, record) => sum + (selector(record) ?? 0), 0);
    return { quarter, vertical, horizontal, total: vertical + horizontal };
  });
}
function standardSeries(quarters: Quarter[], records: LaunchRecord[], economic: (record: LaunchRecord) => number | null, other: (record: LaunchRecord) => number | null) {
  return quarters.map((quarter) => {
    const items = records.filter((record) => record.quarter === quarter && record.segment === 'Vertical');
    return {
      quarter,
      economic: items.reduce((sum, item) => sum + (economic(item) ?? 0), 0),
      other: items.reduce((sum, item) => sum + (other(item) ?? 0), 0),
    };
  });
}
export function buildLaunchModel(records: LaunchRecord[]): LaunchModel {
  const quarters = [...new Set(records.map((record) => record.quarter))].sort((a, b) => quarterKey(a) - quarterKey(b));
  const projects = series(quarters, records, (record) => record.projects);
  const units = series(quarters, records, (record) => record.units);
  const vgv = series(quarters, records, (record) => record.vgvMillions);
  const annual = [...new Set(quarters.map((quarter) => Number(quarter.slice(2))))].map((year) => {
    const annualQuarters = quarters.filter((quarter) => Number(quarter.slice(2)) === year);
    const sum = (items: LaunchSeries[]): LaunchSeries => items.reduce((total, item) => ({ quarter: annualQuarters[annualQuarters.length - 1], vertical: total.vertical + item.vertical, horizontal: total.horizontal + item.horizontal, total: total.total + item.total }), { quarter: `1T${year}` as Quarter, vertical: 0, horizontal: 0, total: 0 });
    return { year, projects: sum(projects.filter((item) => Number(item.quarter.slice(2)) === year)), units: sum(units.filter((item) => Number(item.quarter.slice(2)) === year)), vgv: sum(vgv.filter((item) => Number(item.quarter.slice(2)) === year)) };
  });
  return {
    quarters, projects, units, vgv,
    projectStandards: standardSeries(quarters, records, (record) => record.economicProjects, (record) => record.otherProjects),
    unitStandards: standardSeries(quarters, records, (record) => record.economicUnits, (record) => record.otherUnits),
    vgvStandards: standardSeries(quarters, records, (record) => record.economicVgvMillions, (record) => record.otherVgvMillions),
    annual,
    warnings: records.some((record) => record.vgvMillions === null) ? ['VGV lançado incompleto: há períodos sem preço suficiente.'] : [],
  };
}
export function variation(current: number, previous: number): number | null { return previous === 0 ? null : (current / previous - 1) * 100; }
