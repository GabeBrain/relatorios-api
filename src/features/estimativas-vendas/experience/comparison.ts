import { shiftMonth } from '../expanded/contract';
import { metricTrials, present, type CaseAnalysis, type Measure } from './domain';

/** Equal elapsed time is not a calendar portfolio; missing values never become zero. */
export function comparisonRows(analyses: CaseAnalysis[], measure: Measure, alignment: 'elapsed' | 'calendar', percent: boolean) {
  const rows = new Map<string, Record<string, string | number | null>>();
  for (const a of analyses) {
    const method = present(a).method, model = method ? a.stock.cases[0].methods[method].forecast : null;
    if (!model) continue;
    const targets = metricTrials(a, measure, 1).filter(t => t.method === method);
    for (let offset = 0; offset <= a.spec.duration; offset++) {
      const month = shiftMonth(a.spec.cutoff, offset), key = alignment === 'calendar' ? month : String(offset).padStart(3, '0');
      const row = rows.get(key) ?? { x: alignment === 'calendar' ? month : offset, label: alignment === 'calendar' ? month : offset === 0 ? 'Início' : `+${offset} meses` };
      const trial = targets.find(t => t.horizon === offset);
      const base = measure === 'stock' ? model.origin.stock : measure === 'sold' ? model.origin.sold : null;
      const value = offset === 0 ? base : trial?.predicted ?? null;
      const reported = offset === 0 ? base : trial?.actual ?? null;
      row[a.id] = value === null ? null : percent ? value * 100 / model.origin.units : value;
      row[`${a.id}-reported`] = reported === null ? null : percent ? reported * 100 / model.origin.units : reported;
      rows.set(key, row);
    }
  }
  return [...rows].sort(([a], [b]) => a.localeCompare(b)).map(([, r]) => r);
}
