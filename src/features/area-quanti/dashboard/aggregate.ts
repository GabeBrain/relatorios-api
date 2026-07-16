import type { CategoricalField, Filters, QuantiRecord } from './types';

export const NA = 'Não informado';

function isNullMarker(value: string): boolean {
  return value.trim() === '-';
}

export function normalizeCategoricalValue(_field: string, value: unknown): string | null {
  const raw = value == null || value === '' ? NA : String(value).trim();
  if (isNullMarker(raw)) return null;
  return raw;
}

export function applyFilters(rows: QuantiRecord[], filters: Filters): QuantiRecord[] {
  const entries = Object.entries(filters) as [CategoricalField, string[]][];
  if (!entries.length) return rows;
  return rows.filter((r) =>
    entries.every(([f, values]) => {
      if (!values.length) return true;
      const value = normalizeCategoricalValue(f, (r as any)[f]);
      return value != null && values.includes(value);
    }),
  );
}

export function countBy<T extends string>(
  rows: QuantiRecord[],
  field: CategoricalField,
): { key: T; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = normalizeCategoricalValue(field, (r as any)[field]);
    if (v == null) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Array.from(m, ([key, count]) => ({ key: key as T, count })).sort(
    (a, b) => b.count - a.count,
  );
}

export function distinctCount(rows: QuantiRecord[], field: CategoricalField): number {
  const s = new Set<string>();
  for (const r of rows) {
    const v = normalizeCategoricalValue(field, (r as any)[field]);
    if (v == null) continue;
    if (v !== NA) s.add(v);
  }
  return s.size;
}

export function distinctValues(rows: QuantiRecord[], field: CategoricalField): string[] {
  const s = new Set<string>();
  for (const r of rows) {
    const v = normalizeCategoricalValue(field, (r as any)[field]);
    if (v != null) s.add(v);
  }
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
  let n = 0, valid = 0;
  for (const r of rows) {
    const genero = normalizeCategoricalValue('genero', r.genero);
    if (genero == null || genero === NA) continue;
    valid++;
    if (genero.toLowerCase().startsWith(target.toLowerCase())) n++;
  }
  return valid ? (n / valid) * 100 : 0;
}

function comparableText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hasPurchaseIntent(value: unknown): boolean | null {
  const normalized = normalizeCategoricalValue('intencao_compra_padronizada', value);
  if (normalized == null || normalized === NA) return null;
  const text = comparableText(normalized);
  if (text.includes('nao pretende') || text.includes('sem intencao')) return false;
  return text.includes('pretende') || text.startsWith('sim');
}

function isWithinTwoYears(value: unknown): boolean {
  const normalized = normalizeCategoricalValue('tempo_intencao_padronizado', value);
  if (normalized == null || normalized === NA) return false;
  const text = comparableText(normalized);
  if (text.includes('sem intencao') || text.includes('acima')) return false;
  return text.includes('ate') || text.includes('entre');
}

export function purchaseIntentKpis(rows: QuantiRecord[]) {
  let validIntent = 0;
  let generalIntent = 0;
  let intentWithinTwoYears = 0;

  for (const row of rows) {
    const hasIntent = hasPurchaseIntent(row.intencao_compra_padronizada);
    if (hasIntent == null) continue;
    validIntent++;
    if (!hasIntent) continue;
    generalIntent++;
    if (isWithinTwoYears(row.tempo_intencao_padronizado)) intentWithinTwoYears++;
  }

  return {
    validIntent,
    generalIntent,
    intentWithinTwoYears,
    pctGeneralIntent: validIntent ? (generalIntent / validIntent) * 100 : 0,
    pctIntentWithinTwoYears: validIntent ? (intentWithinTwoYears / validIntent) * 100 : 0,
  };
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
    const rk = normalizeCategoricalValue(rowField, (r as any)[rowField]);
    const ck = normalizeCategoricalValue(colField, (r as any)[colField]);
    if (rk == null || ck == null) continue;
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
  const total = Array.from(buckets.values()).reduce((sum, bucket) => sum + bucket.count, 0);
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

const ORDER_PREFIX_FIELDS = new Set<CategoricalField>([
  'faixa_etaria',
  'geracao',
  'renda_macro_faixa',
  'renda_faixa_padronizada',
  'tempo_intencao_padronizado',
]);

export function displayCategoricalValue(field: CategoricalField, value: string): string {
  if (!ORDER_PREFIX_FIELDS.has(field)) return value;
  return value.replace(/^\s*\d+\.\s*/, '');
}

function leadingOrder(value: string): number | null {
  const match = value.match(/^\s*(\d+)\./);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

/** Preferred ordering for known ordinal fields (age ranges, generations, income). */
const ORDER: Partial<Record<CategoricalField, RegExp>> = {
  faixa_etaria: /^(\d+)\./,
  geracao: /^(\d+)\./,
  renda_macro_faixa: /^(\d+)\./,
  renda_faixa_padronizada: /^(\d+)\./,
  tempo_intencao_padronizado: /^(\d+)\./,
};

export function orderedValues(field: CategoricalField, values: string[]): string[] {
  const rx = ORDER[field];
  if (rx) {
    return [...values].sort((a, b) => {
      if (a === NA) return 1; if (b === NA) return -1;
      const na = Number.parseInt(a.match(rx)?.[1] ?? '999999', 10);
      const nb = Number.parseInt(b.match(rx)?.[1] ?? '999999', 10);
      return na - nb || displayCategoricalValue(field, a).localeCompare(displayCategoricalValue(field, b), 'pt-BR');
    });
  }
  return values;
}

export function compareCategoricalAlphabetic(field: CategoricalField, a: string, b: string): number {
  if (a === NA) return 1;
  if (b === NA) return -1;
  const ao = leadingOrder(a);
  const bo = leadingOrder(b);
  if (ORDER_PREFIX_FIELDS.has(field) && ao != null && bo != null && ao !== bo) return ao - bo;
  return displayCategoricalValue(field, a).localeCompare(displayCategoricalValue(field, b), 'pt-BR');
}

/* ══════ Universal schema detection + universal crosstab ══════ */

export type FieldKind = 'categorical' | 'numeric';
export interface FieldMeta {
  key: string;
  label: string;
  kind: FieldKind;
  cardinality: number;
}

/** Fields never useful as a grouping/comparison axis. */
const TECHNICAL_EXACT = new Set<string>([
  // Row-level identifiers
  'respondent_id', 'survey_id', 'Código', 'codigo', 'id', 'uuid',
  // Coordinates
  'lat', 'lng', 'latitude', 'longitude', 'Latitude', 'Longitude',
  // Duplicate raw aliases — normalized versions are kept
  'Cidade', 'Estado', 'idade_numerica', 'Data', 'Status',
]);
/** Suffixes / substrings that mark technical or free-text raw columns. */
const TECHNICAL_PATTERNS = /(_original$|_texto_original$|_raw$|_hash$|(^|_)timestamp($|_)|created_at|updated_at)/i;

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Scan the records and return the full set of fields eligible for the
 * cross-analysis explorer. Includes every column of the loaded dataset —
 * only pure identifiers, coordinates and free-text raw columns are dropped.
 */
export function detectFieldSchema(
  records: any[],
  labels: Record<string, string> = {},
  sampleSize = 5000,
): FieldMeta[] {
  if (!records.length) return [];
  const sample = records.slice(0, Math.min(records.length, sampleSize));
  const keys = new Set<string>();
  for (const r of sample) for (const k of Object.keys(r)) keys.add(k);

  const out: FieldMeta[] = [];
  for (const key of keys) {
    if (TECHNICAL_EXACT.has(key)) continue;
    if (TECHNICAL_PATTERNS.test(key)) continue;

    const values = new Set<string>();
    let numericCount = 0;
    let nonNullCount = 0;
    for (const r of sample) {
      const v = r[key];
      if (v == null || v === '') continue;
      if (typeof v === 'string' && isNullMarker(v)) continue;
      nonNullCount++;
      if (typeof v === 'number' && Number.isFinite(v)) numericCount++;
      if (values.size < 5000) values.add(String(v));
    }
    if (!nonNullCount) continue;

    const cardinality = values.size;
    const numericRatio = numericCount / Math.max(1, nonNullCount);
    const uniqueRatio = cardinality / Math.max(1, nonNullCount);

    // Truly free-text open answers: nearly every response distinct AND cardinality huge.
    if (uniqueRatio > 0.9 && cardinality > 500) continue;

    let kind: FieldKind;
    if (numericRatio > 0.9 && cardinality > 30) kind = 'numeric';
    else kind = 'categorical';

    const label = labels[key] && labels[key] !== key ? labels[key] : titleCase(key);
    out.push({ key, label, kind, cardinality });
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
  | 'count_pct'
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
  // key -> { count, values[] (only when we need median), sum, valueN }
  const buckets = new Map<string, { count: number; sum: number; valueN: number; values: number[] }>();
  const NONE = '—';

  for (const r of rows) {
    const rk = normalizeCategoricalValue(rowField, r[rowField]);
    const ck = colField ? normalizeCategoricalValue(colField, r[colField]) : NONE;
    if (rk == null || ck == null) continue;
    rowKeys.add(rk);
    colKeys.add(ck);
    const k = `${rk}||${ck}`;
    let b = buckets.get(k);
    if (!b) { b = { count: 0, sum: 0, valueN: 0, values: [] }; buckets.set(k, b); }
    b.count++;
    if (valueField) {
      const v = r[valueField];
      if (typeof v === 'number' && Number.isFinite(v)) {
        b.sum += v;
        b.valueN++;
        if (metric === 'median') b.values.push(v);
      }
    }
  }

  const rowArr = Array.from(rowKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const colArr = Array.from(colKeys).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const total = Array.from(buckets.values()).reduce((sum, bucket) => sum + bucket.count, 0);

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
        case 'count_pct': return c;
        case 'pct_total': return total ? (c / total) * 100 : 0;
        case 'pct_row': return rowTotalsCnt[i] ? (c / rowTotalsCnt[i]) * 100 : 0;
        case 'pct_col': return colTotalsCnt[j] ? (c / colTotalsCnt[j]) * 100 : 0;
        case 'sum': return b?.sum ?? 0;
        case 'avg': return b && b.valueN ? b.sum / b.valueN : 0;
        case 'median': {
          if (!b || !b.values.length) return 0;
          const s = [...b.values].sort((a, b) => a - b);
          const mid = s.length >> 1;
          return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
        }
      }
    }),
  );

  const rowTotals = metric === 'count' || metric === 'count_pct' || metric === 'sum'
    ? matrix.map((r) => r.reduce((a, b) => a + b, 0))
    : rowTotalsCnt;
  const colTotals = metric === 'count' || metric === 'count_pct' || metric === 'sum'
    ? colArr.map((_, j) => matrix.reduce((a, r) => a + r[j], 0))
    : colTotalsCnt;

  return { rows: rowArr, cols: colArr, matrix, rowTotals, colTotals, total, metric, valueField };
}
