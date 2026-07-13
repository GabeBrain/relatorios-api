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

/* ══════ Universal schema detection + universal crosstab ══════ */

export type FieldKind = 'categorical' | 'numeric';
export interface FieldMeta {
  key: string;
  label: string;
  kind: FieldKind;
  cardinality: number;
}

const TECHNICAL_PATTERNS = /(^|_)(id|uuid|hash|_raw|timestamp|created_at|updated_at|lat|lng|lon|longitude|latitude)($|_)/i;
const TECHNICAL_EXACT = new Set(['data_pesquisa', 'localidade']); // treated as technical/free-text for the cross explorer

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Scan the first N records and return the set of fields eligible for the
 * cross-analysis explorer. New columns are picked up automatically.
 */
export function detectFieldSchema(
  records: any[],
  labels: Record<string, string> = {},
  sampleSize = 3000,
): FieldMeta[] {
  if (!records.length) return [];
  const sample = records.slice(0, Math.min(records.length, sampleSize));
  const keys = new Set<string>();
  for (const r of sample) for (const k of Object.keys(r)) keys.add(k);

  const out: FieldMeta[] = [];
  for (const key of keys) {
    if (TECHNICAL_PATTERNS.test(key)) continue;
    if (TECHNICAL_EXACT.has(key)) continue;

    const values = new Set<string>();
    let numericCount = 0;
    let nonNullCount = 0;
    for (const r of sample) {
      const v = r[key];
      if (v == null || v === '') continue;
      nonNullCount++;
      if (typeof v === 'number' && Number.isFinite(v)) numericCount++;
      values.add(String(v));
      if (values.size > 800) break;
    }
    if (!nonNullCount) continue;

    const cardinality = values.size;
    const numericRatio = numericCount / Math.max(1, nonNullCount);
    const uniqueRatio = cardinality / Math.max(1, nonNullCount);

    let kind: FieldKind;
    if (numericRatio > 0.9 && cardinality > 30) kind = 'numeric';
    else if (cardinality > 500 && uniqueRatio > 0.85) continue; // free text
    else if (cardinality > 200 && numericRatio < 0.5) continue; // long tail label
    else kind = 'categorical';

    out.push({ key, label: labels[key] ?? titleCase(key), kind, cardinality });
  }

  // Stable, human-friendly order: categorical first, then alphabetical by label.
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'categorical' ? -1 : 1;
    return a.label.localeCompare(b.label, 'pt-BR');
  });
  return out;
}

export type UniversalMetric =
  | 'count'
  | 'pct_total'
  | 'pct_row'
  | 'pct_col'
  | 'avg'
  | 'sum'
  | 'median';

export interface UniversalCrosstab extends Crosstab {
  metric: UniversalMetric;
  valueField: string | null;
}

/**
 * Universal crosstab. `colField` may be null → 1D distribution.
 * Numeric metrics (avg/sum/median) require `valueField`.
 */
export function crosstabUniversal(
  rows: any[],
  rowField: string,
  colField: string | null,
  metric: UniversalMetric,
  valueField: string | null = null,
): UniversalCrosstab {
  const rowKeys = new Set<string>();
  const colKeys = new Set<string>();
  // key -> { count, values[] (only when we need median), sum }
  const buckets = new Map<string, { count: number; sum: number; values: number[] }>();
  const NONE = '—';

  for (const r of rows) {
    const rk = String(r[rowField] ?? NA);
    const ck = colField ? String(r[colField] ?? NA) : NONE;
    rowKeys.add(rk);
    colKeys.add(ck);
    const k = `${rk}||${ck}`;
    let b = buckets.get(k);
    if (!b) { b = { count: 0, sum: 0, values: [] }; buckets.set(k, b); }
    b.count++;
    if (valueField) {
      const v = r[valueField];
      if (typeof v === 'number' && Number.isFinite(v)) {
        b.sum += v;
        if (metric === 'median') b.values.push(v);
      }
    }
  }

  const rowArr = Array.from(rowKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const colArr = Array.from(colKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const total = rows.length;

  // Base counts for percent calculations
  const counts = rowArr.map((rk) => colArr.map((ck) => buckets.get(`${rk}||${ck}`)?.count ?? 0));
  const rowTotalsCnt = counts.map((r) => r.reduce((a, b) => a + b, 0));
  const colTotalsCnt = colArr.map((_, j) => counts.reduce((a, r) => a + r[j], 0));

  const matrix = rowArr.map((rk, i) =>
    colArr.map((ck, j) => {
      const b = buckets.get(`${rk}||${ck}`);
      const c = b?.count ?? 0;
      switch (metric) {
        case 'count': return c;
        case 'pct_total': return total ? (c / total) * 100 : 0;
        case 'pct_row': return rowTotalsCnt[i] ? (c / rowTotalsCnt[i]) * 100 : 0;
        case 'pct_col': return colTotalsCnt[j] ? (c / colTotalsCnt[j]) * 100 : 0;
        case 'sum': return b?.sum ?? 0;
        case 'avg': return b && b.count ? b.sum / b.count : 0;
        case 'median': {
          if (!b || !b.values.length) return 0;
          const s = [...b.values].sort((a, b) => a - b);
          const mid = s.length >> 1;
          return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
        }
      }
    }),
  );

  const rowTotals = metric === 'count' || metric === 'sum'
    ? matrix.map((r) => r.reduce((a, b) => a + b, 0))
    : rowTotalsCnt;
  const colTotals = metric === 'count' || metric === 'sum'
    ? colArr.map((_, j) => matrix.reduce((a, r) => a + r[j], 0))
    : colTotalsCnt;

  return { rows: rowArr, cols: colArr, matrix, rowTotals, colTotals, total, metric, valueField };
}
