import type { CategoricalField, Filters, QuantiRecord } from './types';

export const NA = 'Não informado';

export function applyFilters(rows: QuantiRecord[], filters: Filters): QuantiRecord[] {
  const entries = Object.entries(filters) as [CategoricalField, string[]][];
  if (!entries.length) return rows;
  return rows.filter((r) =>
    entries.every(([f, values]) => !values.length || values.includes(String((r as any)[f] ?? NA))),
  );
}

export function countBy<T extends string>(
  rows: QuantiRecord[],
  field: CategoricalField,
): { key: T; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = String((r as any)[field] ?? NA);
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Array.from(m, ([key, count]) => ({ key: key as T, count })).sort(
    (a, b) => b.count - a.count,
  );
}

export function distinctCount(rows: QuantiRecord[], field: CategoricalField): number {
  const s = new Set<string>();
  for (const r of rows) {
    const v = String((r as any)[field] ?? NA);
    if (v !== NA) s.add(v);
  }
  return s.size;
}

export function distinctValues(rows: QuantiRecord[], field: CategoricalField): string[] {
  const s = new Set<string>();
  for (const r of rows) s.add(String((r as any)[field] ?? NA));
  return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function mean(rows: QuantiRecord[], field: 'idade' | 'renda_valor_estimado'): number {
  let s = 0, n = 0;
  for (const r of rows) {
    const v = r[field];
    if (typeof v === 'number' && Number.isFinite(v)) { s += v; n++; }
  }
  return n ? s / n : 0;
}

export function pctGenero(rows: QuantiRecord[], target: string): number {
  if (!rows.length) return 0;
  let n = 0;
  for (const r of rows) {
    if (String(r.genero).toLowerCase().startsWith(target.toLowerCase())) n++;
  }
  return (n / rows.length) * 100;
}

export function histogram(
  rows: QuantiRecord[],
  field: 'idade' | 'renda_valor_estimado',
  binCount = 20,
): { bin: string; from: number; to: number; count: number }[] {
  const vals = rows.map((r) => r[field]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!vals.length) return [];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (min === max) return [{ bin: String(min), from: min, to: max, count: vals.length }];
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    from: min + i * width,
    to: min + (i + 1) * width,
    count: 0,
    bin: '',
  }));
  for (const v of vals) {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / width));
    bins[idx].count++;
  }
  return bins.map((b) => ({ ...b, bin: `${Math.round(b.from)}–${Math.round(b.to)}` }));
}

export interface Crosstab {
  rows: string[];
  cols: string[];
  matrix: number[][];
  rowTotals: number[];
  colTotals: number[];
  total: number;
}

export function crosstab(
  rows: QuantiRecord[],
  rowField: CategoricalField,
  colField: CategoricalField,
  metric: 'count' | 'pct' | 'avg_renda' = 'count',
): Crosstab {
  const rowKeys = new Set<string>();
  const colKeys = new Set<string>();
  const buckets = new Map<string, { count: number; rendaSum: number; rendaN: number }>();
  for (const r of rows) {
    const rk = String((r as any)[rowField] ?? NA);
    const ck = String((r as any)[colField] ?? NA);
    rowKeys.add(rk);
    colKeys.add(ck);
    const k = `${rk}||${ck}`;
    let b = buckets.get(k);
    if (!b) { b = { count: 0, rendaSum: 0, rendaN: 0 }; buckets.set(k, b); }
    b.count++;
    const v = r.renda_valor_estimado;
    if (typeof v === 'number' && Number.isFinite(v)) { b.rendaSum += v; b.rendaN++; }
  }
  const rowArr = Array.from(rowKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const colArr = Array.from(colKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const total = rows.length;
  const matrix = rowArr.map((rk) =>
    colArr.map((ck) => {
      const b = buckets.get(`${rk}||${ck}`);
      if (!b) return 0;
      if (metric === 'count') return b.count;
      if (metric === 'pct') return total ? (b.count / total) * 100 : 0;
      if (metric === 'avg_renda') return b.rendaN ? b.rendaSum / b.rendaN : 0;
      return 0;
    }),
  );
  const rowTotals = matrix.map((r) => r.reduce((a, b) => a + b, 0));
  const colTotals = colArr.map((_, j) => matrix.reduce((a, r) => a + r[j], 0));
  return { rows: rowArr, cols: colArr, matrix, rowTotals, colTotals, total };
}

/** Preferred ordering for known ordinal fields (age ranges, generations, income). */
const ORDER: Partial<Record<CategoricalField, RegExp>> = {
  faixa_etaria: /(\d+)/,
  renda_faixa_padronizada: /(\d+)/,
};

export function orderedValues(field: CategoricalField, values: string[]): string[] {
  const rx = ORDER[field];
  if (rx) {
    return [...values].sort((a, b) => {
      if (a === NA) return 1; if (b === NA) return -1;
      const na = parseInt(a.match(rx)?.[1] ?? '999999', 10);
      const nb = parseInt(b.match(rx)?.[1] ?? '999999', 10);
      return na - nb;
    });
  }
  return values;
}
