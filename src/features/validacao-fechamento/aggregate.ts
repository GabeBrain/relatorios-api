import type { Building } from '@/features/dashboard-geobrain/types';

export type Granularity = 'year' | 'quarter' | 'month';

export interface VFFilters {
  years: string[];        // '2024'
  quarters: string[];     // '01T/26'
  periods: string[];      // 'YYYY-MM' (armazenado); rótulo 'jan/26'
  standards: string[];
  buildingTypes: string[];
  buildings: string[];    // building_id
}

export const EMPTY_VF_FILTERS: VFFilters = {
  years: [], quarters: [], periods: [], standards: [], buildingTypes: [], buildings: [],
};

/** Uma linha achatada por typology-period do dataset. */
export interface ClosureRow {
  building_id: string;
  building_name: string;
  building_type: string;
  standard: string;
  city: string;
  release_date: string;
  release_period_key: string; // YYYY-MM
  release_period_bucket_year: string;
  release_period_bucket_quarter: string;
  release_period_bucket_month: string;
  typology_id: string;
  type_of_typology: string;
  number_bedroom: number;
  garage: number;
  qty: number;
  private_area: number | null;
  period: string;             // YYYY-MM-DD
  periodDate: Date;
  periodKey: string;          // YYYY-MM
  bucketYear: string;         // '2024'
  bucketQuarter: string;      // '01T/24'
  bucketMonth: string;        // 'jan/24' (rótulo)
  price: number | null;
  sold_in_period: number;
  typology_stock: number;
  vgv_period: number;         // qty * price (quando price)
}

const MONTH_LABEL = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/** Parse 'YYYY-MM-DD' / 'YYYY-MM' / 'YYYY/MM/DD' sem depender de Date (evita bug UTC). */
function parsePeriodParts(s: string): { y: number; m: number } {
  const clean = String(s ?? '').replaceAll('/', '-');
  const [ys, ms] = clean.split('-');
  const y = parseInt(ys ?? '', 10);
  const m = parseInt(ms ?? '', 10);
  return { y: Number.isFinite(y) ? y : 0, m: Number.isFinite(m) && m >= 1 && m <= 12 ? m : 0 };
}
export function periodKeyFromStr(s: string): string {
  const { y, m } = parsePeriodParts(s);
  if (!y || !m) return '';
  return `${y}-${String(m).padStart(2,'0')}`;
}
export function bucketYearFromStr(s: string): string {
  const { y } = parsePeriodParts(s);
  return y ? String(y) : '';
}
export function bucketQuarterFromStr(s: string): string {
  const { y, m } = parsePeriodParts(s);
  if (!y || !m) return '';
  const q = Math.floor((m - 1) / 3) + 1;
  return `${String(q).padStart(2,'0')}T/${String(y).slice(-2)}`;
}
export function bucketMonthFromStr(s: string): string {
  const { y, m } = parsePeriodParts(s);
  if (!y || !m) return '';
  return `${MONTH_LABEL[m - 1]}/${String(y).slice(-2)}`;
}
export function bucketOfStr(s: string, g: Granularity): string {
  if (g === 'year') return bucketYearFromStr(s);
  if (g === 'quarter') return bucketQuarterFromStr(s);
  return bucketMonthFromStr(s);
}

/** Achata Building[] em ClosureRow[]. */
export function flattenBuildings(buildings: Building[]): ClosureRow[] {
  const out: ClosureRow[] = [];
  for (const b of buildings) {
    const rel = new Date(b.release_date || '1970-01-01');
    const relKey = isNaN(rel.getTime()) ? '' : periodKey(rel);
    const relY = isNaN(rel.getTime()) ? '' : toBucketYear(rel);
    const relQ = isNaN(rel.getTime()) ? '' : toBucketQuarter(rel);
    const relM = isNaN(rel.getTime()) ? '' : toBucketMonth(rel);
    for (const t of b.typologies) {
      for (const h of t.history) {
        const price = h.price;
        out.push({
          building_id: b.building_id,
          building_name: b.name,
          building_type: b.building_type,
          standard: b.standard,
          city: b.city,
          release_date: b.release_date,
          release_period_key: relKey,
          release_period_bucket_year: relY,
          release_period_bucket_quarter: relQ,
          release_period_bucket_month: relM,
          typology_id: t.typology_id,
          type_of_typology: t.type_of_typology,
          number_bedroom: t.number_bedroom,
          garage: t.garage,
          qty: t.qty,
          private_area: t.private_area,
          period: h.period,
          periodDate: h.periodDate,
          periodKey: periodKey(h.periodDate),
          bucketYear: toBucketYear(h.periodDate),
          bucketQuarter: toBucketQuarter(h.periodDate),
          bucketMonth: toBucketMonth(h.periodDate),
          price,
          sold_in_period: h.sold_in_period,
          typology_stock: h.typology_stock,
          vgv_period: price != null ? t.qty * price : 0,
        });
      }
    }
  }
  return out;
}

export function applyVFFilters(rows: ClosureRow[], f: VFFilters): ClosureRow[] {
  return rows.filter((r) => {
    if (f.years.length && !f.years.includes(r.bucketYear)) return false;
    if (f.quarters.length && !f.quarters.includes(r.bucketQuarter)) return false;
    if (f.periods.length && !f.periods.includes(r.periodKey)) return false;
    if (f.standards.length && !f.standards.includes(r.standard)) return false;
    if (f.buildingTypes.length && !f.buildingTypes.includes(r.building_type)) return false;
    if (f.buildings.length && !f.buildings.includes(r.building_id)) return false;
    return true;
  });
}

export interface VFOptions {
  years: string[];
  quarters: string[];
  periods: { value: string; label: string }[]; // ordenado desc
  standards: string[];
  buildingTypes: string[];
  buildings: { id: string; name: string }[];
}

export function extractVFOptions(rows: ClosureRow[]): VFOptions {
  const years = new Set<string>();
  const quarters = new Set<string>();
  const periodMap = new Map<string, string>(); // key → label
  const standards = new Set<string>();
  const btypes = new Set<string>();
  const buildingsMap = new Map<string, string>();
  for (const r of rows) {
    if (r.bucketYear) years.add(r.bucketYear);
    if (r.bucketQuarter) quarters.add(r.bucketQuarter);
    if (r.periodKey) periodMap.set(r.periodKey, r.bucketMonth);
    if (r.standard) standards.add(r.standard);
    if (r.building_type) btypes.add(r.building_type);
    if (r.building_id) buildingsMap.set(r.building_id, r.building_name);
  }
  const periods = Array.from(periodMap.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))     // desc
    .map(([value, label]) => ({ value, label }));
  return {
    years: Array.from(years).sort(),
    quarters: Array.from(quarters).sort((a,b) => {
      // '01T/24' → compare (yy, q)
      const [qa, ya] = a.split('T/'); const [qb, yb] = b.split('T/');
      return ya === yb ? qa.localeCompare(qb) : ya.localeCompare(yb);
    }),
    periods,
    standards: Array.from(standards).sort(),
    buildingTypes: Array.from(btypes).sort(),
    buildings: Array.from(buildingsMap.entries()).map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name)),
  };
}

// ============ Métricas ============

export type MetricKey = 'empreendimentos_lancados' | 'unidades_lancadas' | 'unidades_vendidas' | 'oferta_final' | 'preco_medio' | 'preco_m2';

export interface MetricDef {
  key: MetricKey;
  label: string;
  format: 'int' | 'currency';
}

export const METRICS: MetricDef[] = [
  { key: 'empreendimentos_lancados', label: 'Empreendimentos lançados', format: 'int' },
  { key: 'unidades_lancadas',        label: 'Unidades lançadas',        format: 'int' },
  { key: 'unidades_vendidas',        label: 'Unidades vendidas',        format: 'int' },
  { key: 'oferta_final',             label: 'Oferta final',              format: 'int' },
  { key: 'preco_medio',              label: 'Preço médio',               format: 'currency' },
  { key: 'preco_m2',                 label: 'Preço M²',                  format: 'currency' },
];

function bucketKeyOfRow(r: ClosureRow, g: Granularity): string {
  if (g === 'year') return r.bucketYear;
  if (g === 'quarter') return r.bucketQuarter;
  return r.bucketMonth;
}
function releaseBucketKeyOfRow(r: ClosureRow, g: Granularity): string {
  if (g === 'year') return r.release_period_bucket_year;
  if (g === 'quarter') return r.release_period_bucket_quarter;
  return r.release_period_bucket_month;
}

/** Ordena buckets do "menor" (mais antigo) para o "maior" (mais recente). */
export function sortBuckets(keys: string[], g: Granularity): string[] {
  const arr = Array.from(new Set(keys));
  if (g === 'year') return arr.sort();
  if (g === 'quarter') {
    return arr.sort((a, b) => {
      const [qa, ya] = a.split('T/'); const [qb, yb] = b.split('T/');
      return ya === yb ? qa.localeCompare(qb) : ya.localeCompare(yb);
    });
  }
  // month bucket 'jan/24'
  const idx = (s: string) => {
    const [m, y] = s.split('/');
    return parseInt(y, 10) * 12 + MONTH_LABEL.indexOf(m);
  };
  return arr.sort((a, b) => idx(a) - idx(b));
}

/** Retorna a chave do bucket "ano anterior" para SAMEPERIODLASTYEAR. */
export function bucketMinusYear(key: string, g: Granularity): string {
  if (g === 'year') return String(parseInt(key, 10) - 1);
  if (g === 'quarter') {
    const [q, y] = key.split('T/');
    const yn = (parseInt(y, 10) - 1 + 100) % 100;
    return `${q}T/${String(yn).padStart(2,'0')}`;
  }
  const [m, y] = key.split('/');
  const yn = (parseInt(y, 10) - 1 + 100) % 100;
  return `${m}/${String(yn).padStart(2,'0')}`;
}

/** Bucket imediatamente anterior. Precisa da lista completa ordenada para achar o vizinho. */
export function bucketPrev(key: string, allSorted: string[]): string | null {
  const i = allSorted.indexOf(key);
  return i > 0 ? allSorted[i - 1] : null;
}

interface Aggregates {
  buildingIds: Set<string>;
  qtyLancadas: number;
  soldPeriodo: number;
  offerAtLast: Map<string, number>; // typology_id → estoque no último período visto no bucket
  offerLastPeriodKey: Map<string, string>;
  // Preço médio: filtrar type_of_typology='Padrão' e typology_stock<>0
  pmSumVgv: number;   // sum(qty * price)
  pmSumQty: number;
  // Preço m²: mesmos filtros
  pmm2SumVgv: number;
  pmm2SumArea: number; // sum(qty * private_area)
}

function newAgg(): Aggregates {
  return {
    buildingIds: new Set(),
    qtyLancadas: 0,
    soldPeriodo: 0,
    offerAtLast: new Map(),
    offerLastPeriodKey: new Map(),
    pmSumVgv: 0, pmSumQty: 0,
    pmm2SumVgv: 0, pmm2SumArea: 0,
  };
}

function accumulate(agg: Aggregates, r: ClosureRow, bucketKey: string, releaseKey: string) {
  // Empreendimentos/Unidades lançadas: KEEPFILTERS(release_date == period)
  if (releaseKey === bucketKey) {
    agg.buildingIds.add(r.building_id);
    agg.qtyLancadas += r.qty;
  }
  agg.soldPeriodo += r.sold_in_period;
  // Oferta final: último período do bucket por typology_id
  const prev = agg.offerLastPeriodKey.get(r.typology_id);
  if (!prev || r.periodKey > prev) {
    agg.offerLastPeriodKey.set(r.typology_id, r.periodKey);
    agg.offerAtLast.set(r.typology_id, r.typology_stock);
  }
  // Preço médio: type_of_typology='Padrão' e typology_stock<>0
  if (r.type_of_typology === 'Padrão' && r.typology_stock !== 0 && r.price != null) {
    agg.pmSumVgv += r.qty * r.price;
    agg.pmSumQty += r.qty;
    if (r.private_area != null && r.private_area > 0) {
      agg.pmm2SumVgv += r.qty * r.price;
      agg.pmm2SumArea += r.qty * r.private_area;
    }
  }
}

function metricValue(agg: Aggregates, metric: MetricKey): number | null {
  switch (metric) {
    case 'empreendimentos_lancados': return agg.buildingIds.size;
    case 'unidades_lancadas': return agg.qtyLancadas;
    case 'unidades_vendidas': return agg.soldPeriodo;
    case 'oferta_final': {
      let s = 0; agg.offerAtLast.forEach((v) => { s += v; }); return s;
    }
    case 'preco_medio': return agg.pmSumQty > 0 ? agg.pmSumVgv / agg.pmSumQty : null;
    case 'preco_m2': return agg.pmm2SumArea > 0 ? agg.pmm2SumVgv / agg.pmm2SumArea : null;
  }
}

export interface ResumoBucket {
  key: string;
  metrics: Record<MetricKey, number | null>;
}

export interface ResumoResult {
  buckets: ResumoBucket[]; // ordenados asc
  // AA = ano anterior por bucket
  yearAgo: Map<string, Record<MetricKey, number | null>>;
  // PA = bucket imediatamente anterior por bucket
  prevBucket: Map<string, Record<MetricKey, number | null>>;
}

/** Agrega rows em buckets conforme granularidade. Constrói também AA e PA. */
export function computeResumo(rows: ClosureRow[], allRowsUnfiltered: ClosureRow[], g: Granularity): ResumoResult {
  // Buckets a exibir: derivados dos rows filtrados
  const byBucket = new Map<string, Aggregates>();
  for (const r of rows) {
    const k = bucketKeyOfRow(r, g);
    if (!byBucket.has(k)) byBucket.set(k, newAgg());
    accumulate(byBucket.get(k)!, r, k, releaseBucketKeyOfRow(r, g));
  }
  const bucketsSorted = sortBuckets(Array.from(byBucket.keys()), g);
  const buckets: ResumoBucket[] = bucketsSorted.map((k) => {
    const agg = byBucket.get(k)!;
    return {
      key: k,
      metrics: {
        empreendimentos_lancados: metricValue(agg, 'empreendimentos_lancados'),
        unidades_lancadas: metricValue(agg, 'unidades_lancadas'),
        unidades_vendidas: metricValue(agg, 'unidades_vendidas'),
        oferta_final: metricValue(agg, 'oferta_final'),
        preco_medio: metricValue(agg, 'preco_medio'),
        preco_m2: metricValue(agg, 'preco_m2'),
      },
    };
  });

  // Para AA/PA usamos allRowsUnfiltered filtrado apenas por dimensões (padrão/tipo/empreend.)
  // -> aqui já entra pronto (o caller aplica filtros dimensionais sem temporais).
  const byBucketFull = new Map<string, Aggregates>();
  for (const r of allRowsUnfiltered) {
    const k = bucketKeyOfRow(r, g);
    if (!byBucketFull.has(k)) byBucketFull.set(k, newAgg());
    accumulate(byBucketFull.get(k)!, r, k, releaseBucketKeyOfRow(r, g));
  }
  const allSorted = sortBuckets(Array.from(byBucketFull.keys()), g);
  function aggMetrics(agg: Aggregates | undefined): Record<MetricKey, number | null> {
    if (!agg) return { empreendimentos_lancados: null, unidades_lancadas: null, unidades_vendidas: null, oferta_final: null, preco_medio: null, preco_m2: null };
    return {
      empreendimentos_lancados: metricValue(agg, 'empreendimentos_lancados'),
      unidades_lancadas: metricValue(agg, 'unidades_lancadas'),
      unidades_vendidas: metricValue(agg, 'unidades_vendidas'),
      oferta_final: metricValue(agg, 'oferta_final'),
      preco_medio: metricValue(agg, 'preco_medio'),
      preco_m2: metricValue(agg, 'preco_m2'),
    };
  }

  const yearAgo = new Map<string, Record<MetricKey, number | null>>();
  const prevBucket = new Map<string, Record<MetricKey, number | null>>();
  for (const k of bucketsSorted) {
    const kAA = bucketMinusYear(k, g);
    yearAgo.set(k, aggMetrics(byBucketFull.get(kAA)));
    const kPA = bucketPrev(k, allSorted);
    prevBucket.set(k, kPA ? aggMetrics(byBucketFull.get(kPA)) : aggMetrics(undefined));
  }
  return { buckets, yearAgo, prevBucket };
}

/** Fórmula DAX VarXxx: se AA=0 e atual>0 → 1; senão (atual - AA) / AA. */
export function varPct(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0 && current > 0) return 1;
  if (previous === 0) return null;
  return (current - previous) / previous;
}
