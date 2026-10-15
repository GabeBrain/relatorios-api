import { safeNumber } from '@/features/panorama-secovi-fiergs/lib/launches';
import { monthOf, type SpCheck, type SpDistribution } from './model';
import type { SpTemporalInput } from './temporal';

/** Only call after source coverage, monthly groups and numeric values were validated. */
export function summarizeSpGroups(input: SpTemporalInput, months: string[], throughMonth: string, checks: SpCheck[] = []): SpDistribution {
  const periods = new Set(months);
  const rows = new Map<string, SpDistribution['rows'][number]>();
  for (const [source, field, target] of [['releases', 'releases_in_period', 'launches'], ['sales', 'liquid_sales', 'sales'], ['stock', 'stock', 'stock']] as const) {
    for (const item of input[source]) {
      const period = monthOf(item.period);
      if (!period || !periods.has(period) || target === 'stock' && period !== throughMonth) continue;
      const label = String(item.group).trim();
      const key = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const row = rows.get(key) ?? { group: label, launches: 0, sales: 0, stock: 0 };
      row[target] += safeNumber(item[field])!; rows.set(key, row);
    }
  }
  if (!rows.size || rows.size > 12 || [...rows.values()].some(row => row.group.length > 40)) return { status: 'blocked', issues: ['Os grupos retornados excedem o layout disponível. Confirme os grupos antes de montar os slides.'], rows: [], checks: [] };
  return { status: 'ready', issues: [], rows: [...rows.values()].sort((a, b) => a.group.localeCompare(b.group, 'pt-BR', { numeric: true })), checks };
}
