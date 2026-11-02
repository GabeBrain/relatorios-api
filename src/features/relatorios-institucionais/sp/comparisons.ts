export interface SpGroupComparison {
  status: 'ready' | 'blocked';
  issues: string[];
  rows: { group: string; current: number; previous: number; variation: number | null; currentShare: number | null; previousShare: number | null }[];
  currentTotal: number;
  previousTotal: number;
}
export const blockedSpComparison = (message: string): SpGroupComparison => ({ status: 'blocked', issues: [message], rows: [], currentTotal: 0, previousTotal: 0 });
export function compareSpGroups(current: { group: string; value: number }[], previous: { group: string; value: number }[]): SpGroupComparison {
  const key = (group: string) => group.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const keys = (rows: typeof current) => rows.map(row => key(row.group)).sort().join('|');
  if (!current.length || current.length !== previous.length || keys(current) !== keys(previous) || [current, previous].some(rows => new Set(rows.map(row => key(row.group))).size !== rows.length || rows.some(row => !row.group.trim() || !Number.isSafeInteger(row.value)))) return blockedSpComparison('Grupos ou valores incompatíveis nos dois anos. Ausência não representa zero.');
  const currentTotal = current.reduce((sum, row) => sum + row.value, 0), previousTotal = previous.reduce((sum, row) => sum + row.value, 0);
  if (![currentTotal, previousTotal].every(Number.isSafeInteger)) return blockedSpComparison('Os totais excedem a precisão segura.');
  return { status: 'ready', issues: [], currentTotal, previousTotal, rows: current.map(row => {
    const before = previous.find(value => key(value.group) === key(row.group))!.value;
    return { group: row.group, current: row.value, previous: before, variation: before > 0 ? (row.value - before) / before * 100 : null, currentShare: currentTotal > 0 && current.every(item => item.value >= 0) ? row.value / currentTotal * 100 : null, previousShare: previousTotal > 0 && previous.every(item => item.value >= 0) ? before / previousTotal * 100 : null };
  }) };
}
