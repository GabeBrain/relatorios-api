import type { Building, Filters, Granularity, HistoryEntry, Typology } from './types';

// ============ period helpers (string-based) ============
// h.period vem como "YYYY-MM-DD" ou "YYYY-MM". Comparações lexicais funcionam.

export function yearFromPeriod(p: string): number {
  return parseInt(p.slice(0, 4), 10) || 0;
}
export function monthFromPeriod(p: string): number {
  return parseInt(p.slice(5, 7), 10) || 0;
}
export function monthKeyFromPeriod(p: string): string {
  return p.slice(0, 7);
}
function periodSortNum(p: string): number {
  return yearFromPeriod(p) * 12 + (monthFromPeriod(p) - 1);
}
function periodKey(p: string, g: Granularity): string {
  const y = p.slice(0, 4);
  const m = monthFromPeriod(p);
  if (g === 'year') return y;
  if (g === 'quarter') return `${y.slice(2)}T${Math.floor((m - 1) / 3) + 1}`;
  return `${String(m).padStart(2, '0')}/${y.slice(2)}`;
}
function periodSortKey(p: string, g: Granularity): number {
  const y = yearFromPeriod(p);
  const m = monthFromPeriod(p) - 1;
  if (g === 'year') return y * 12;
  if (g === 'quarter') return y * 12 + Math.floor(m / 3) * 3;
  return y * 12 + m;
}

// ============ filter helpers ============

function garageBucket(g: number): string { return g >= 4 ? '4+' : String(g); }
function bedroomBucket(n: number): string { return n >= 4 ? '4+' : String(n); }

function typologyMatchesFilters(t: Typology, f: Filters): boolean {
  if (f.typologies.length && !f.typologies.includes(t.type_of_typology)) return false;
  if (f.bedrooms.length && !f.bedrooms.includes(bedroomBucket(t.number_bedroom))) return false;
  if (f.garages.length && !f.garages.includes(garageBucket(t.garage))) return false;
  return true;
}

export function applyFilters(buildings: Building[], f: Filters): Building[] {
  const out: Building[] = [];
  for (const b of buildings) {
    if (f.status.length && !f.status.includes(b.status)) continue;
    if (f.cities.length && !f.cities.includes(b.city)) continue;
    if (f.neighborhoods.length && !f.neighborhoods.includes(b.neighborhood)) continue;
    if (f.types.length && !f.types.includes(b.building_type)) continue;
    if (f.standards.length && !f.standards.includes(b.standard)) continue;
    if (f.buildings.length && !f.buildings.includes(b.building_id)) continue;
    const typologies = b.typologies.filter((t) => typologyMatchesFilters(t, f));
    if (!typologies.length) continue;
    out.push({ ...b, typologies });
  }
  return out;
}

function historyMatches(h: HistoryEntry, f: Filters): boolean {
  const p = h.period;
  if (!p) return false;
  const pk = periodSortNum(p);
  if (f.from) {
    const fk = f.from.getFullYear() * 12 + f.from.getMonth();
    if (pk < fk) return false;
  }
  if (f.to) {
    const tk = f.to.getFullYear() * 12 + f.to.getMonth();
    if (pk > tk) return false;
  }
  if (f.years.length && !f.years.includes(p.slice(0, 4))) return false;
  if (f.periods.length && !f.periods.includes(p.slice(0, 7))) return false;
  return true;
}

/** Maior período (string) presente entre entradas que passam pelos filtros temporais. */
export function latestPeriodInScope(buildings: Building[], f: Filters): string | null {
  let best: string | null = null;
  for (const b of buildings) {
    for (const t of b.typologies) {
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        if (!best || h.period > best) best = h.period;
      }
    }
  }
  return best;
}

// ============ campos calculados por linha (§13) ============
export const isRelease = (b: Building, h: HistoryEntry) =>
  Boolean(b.release_date) && b.release_date.slice(0, 7) === h.period.slice(0, 7);
export const vgvSold = (h: HistoryEntry, price: number) => h.sold_in_period * price;
export const vgvStock = (h: HistoryEntry, price: number) => h.typology_stock * price;
export const initialStock = (h: HistoryEntry) => h.typology_stock + h.sold_in_period;
export const qtyRelease = (b: Building, h: HistoryEntry, t: Typology) => (isRelease(b, h) ? t.qty : 0);
export const vgvRelease = (b: Building, h: HistoryEntry, t: Typology, price: number) => (isRelease(b, h) ? t.qty * price : 0);

// ============ KPIs (sempre no período mais recente do escopo) ============

export interface KPIValues {
  empreendimentos: number;
  empreendimentosAtivos: number;
  empreendimentosLancados: number;
  unidadesLancadas: number;
  vgvLancado: number;
  unidadesVendidas: number;
  vgvVendido: number;
  estoqueFinal: number;
  vgvEstoque: number;
  estoqueInicial: number;
  precoMedio: number;
  precoMedioM2: number;
  ivv: number;
  tempoEstoque: number;
  ipc: number;
  latestPeriod: string | null;
  statusAtualizacao: string | null;
  /** Aliases de compatibilidade (legado) */
  ofertaLancada: number;
  ofertaFinal: number;
}

function emptyKpis(nBuildings: number): KPIValues {
  return {
    empreendimentos: nBuildings, empreendimentosAtivos: 0, empreendimentosLancados: 0,
    unidadesLancadas: 0, vgvLancado: 0, unidadesVendidas: 0, vgvVendido: 0,
    estoqueFinal: 0, vgvEstoque: 0, estoqueInicial: 0,
    precoMedio: 0, precoMedioM2: 0, ivv: 0, tempoEstoque: 0, ipc: 0,
    latestPeriod: null, statusAtualizacao: null,
    ofertaLancada: 0, ofertaFinal: 0,
  };
}

/**
 * §7 — Unidades Lançadas / VGV Lançado somam sobre TODO o período filtrado,
 * aplicando KEEPFILTERS(status = "Ativo"). Se sem filtros temporais, soma total.
 */
export function computeReleaseTotals(buildings: Building[], f: Filters): { unidadesLancadas: number; vgvLancado: number } {
  let unidadesLancadas = 0;
  let vgvLancado = 0;
  for (const b of buildings) {
    if (b.status !== 'Ativo') continue;
    for (const t of b.typologies) {
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        if (!isRelease(b, h)) continue;
        const price = h.price ?? 0;
        unidadesLancadas += t.qty;
        vgvLancado += t.qty * price;
      }
    }
  }
  return { unidadesLancadas, vgvLancado };
}

export function computeKpis(buildings: Building[], f: Filters): KPIValues {
  const latest = latestPeriodInScope(buildings, f);
  if (!latest) return emptyKpis(buildings.length);

  let unidadesVendidas = 0, vgvVendido = 0;
  let estoqueFinal = 0, vgvEstoqueSum = 0, estoqueInicial = 0;
  let sumPrice = 0, priceQty = 0, sumPm2 = 0, pm2Qty = 0;
  const activeIds = new Set<string>();
  const lancadosIds = new Set<string>();

  for (const b of buildings) {
    if (b.status === 'Ativo') activeIds.add(b.building_id);
    for (const t of b.typologies) {
      // entrada do período mais recente para esta tipologia
      const h = t.history.find((e) => e.period === latest && historyMatches(e, f));
      if (!h) continue;
      const price = h.price ?? 0;
      if (isRelease(b, h) && b.status === 'Ativo') {
        lancadosIds.add(b.building_id);
      }
      unidadesVendidas += h.sold_in_period;
      vgvVendido += vgvSold(h, price);
      estoqueFinal += h.typology_stock;
      vgvEstoqueSum += h.vgv_stock ?? vgvStock(h, price);
      estoqueInicial += initialStock(h);
      if (price > 0) { sumPrice += price * t.qty; priceQty += t.qty; }
      const pm2 = h.price_private_area;
      if (pm2 && pm2 > 0) { sumPm2 += pm2 * t.qty; pm2Qty += t.qty; }
    }
  }

  const denom = estoqueFinal + unidadesVendidas;
  const ivv = denom > 0 ? unidadesVendidas / denom : 0;
  const tempoEstoque = ivv > 0 ? 1 / ivv : 0;
  const precoMedio = priceQty > 0 ? sumPrice / priceQty : 0;
  const precoMedioM2 = pm2Qty > 0 ? sumPm2 / pm2Qty : 0;

  // §3/§7 — Unidades Lançadas / VGV Lançado sobre TODO período filtrado, Ativo apenas.
  const { unidadesLancadas, vgvLancado } = computeReleaseTotals(buildings, f);

  return {
    empreendimentos: buildings.length,
    empreendimentosAtivos: activeIds.size,
    empreendimentosLancados: lancadosIds.size,
    unidadesLancadas, vgvLancado,
    unidadesVendidas, vgvVendido,
    estoqueFinal, vgvEstoque: vgvEstoqueSum, estoqueInicial,
    precoMedio, precoMedioM2,
    ivv, tempoEstoque,
    ipc: 0,
    latestPeriod: latest,
    statusAtualizacao: latest,
    ofertaLancada: unidadesLancadas,
    ofertaFinal: estoqueFinal,
  };
}

// ============ séries temporais ============

export interface SeriesPoint {
  period: string;
  ofertaLancada: number;
  vendaLiquida: number;
  vgvLancamento: number;
  vgvEstoque: number;
  estoqueFinal: number;
  estoqueInicial: number;
  ivv: number;
  _sort: number;
}
function emptyPoint(period: string, sort: number): SeriesPoint {
  return { period, ofertaLancada: 0, vendaLiquida: 0, vgvLancamento: 0, vgvEstoque: 0, estoqueFinal: 0, estoqueInicial: 0, ivv: 0, _sort: sort };
}

export function computeSeries(buildings: Building[], f: Filters, g: Granularity): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (const b of buildings) {
    for (const t of b.typologies) {
      if (!t.history.length) continue;
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        const key = periodKey(h.period, g);
        const p = map.get(key) ?? emptyPoint(key, periodSortKey(h.period, g));
        const price = h.price ?? 0;
        if (isRelease(b, h)) {
          p.ofertaLancada += t.qty;
          p.vgvLancamento += t.qty * price;
        }
        p.vendaLiquida += h.sold_in_period;
        p.vgvEstoque += h.vgv_stock ?? vgvStock(h, price);
        p.estoqueFinal += h.typology_stock;
        p.estoqueInicial += initialStock(h);
        map.set(key, p);
      }
    }
  }
  const arr = Array.from(map.values()).sort((a, b) => a._sort - b._sort);
  for (const p of arr) {
    const denom = p.estoqueFinal + p.vendaLiquida;
    p.ivv = denom > 0 ? p.vendaLiquida / denom : 0;
  }
  return arr;
}

// ============ Rankings & combos ============

export interface ComboBucket { key: string; estoque: number; tempoEstoque: number; }

/** Tempo de estoque no período mais recente = 1 / IVV(latest). */
function tempoEstoqueByLatest(buildings: Building[], f: Filters, groupKey: (b: Building, t: Typology) => string): Map<string, { est: number; vnd: number }> {
  const latest = latestPeriodInScope(buildings, f);
  const acc = new Map<string, { est: number; vnd: number }>();
  if (!latest) return acc;
  for (const b of buildings) {
    for (const t of b.typologies) {
      const h = t.history.find((e) => e.period === latest && historyMatches(e, f));
      if (!h) continue;
      const k = groupKey(b, t);
      if (!k) continue;
      const cur = acc.get(k) ?? { est: 0, vnd: 0 };
      cur.est += h.typology_stock;
      cur.vnd += h.sold_in_period;
      acc.set(k, cur);
    }
  }
  return acc;
}

function tempoFromIvv(est: number, vnd: number): number {
  const denom = est + vnd;
  const ivv = denom > 0 ? vnd / denom : 0;
  return ivv > 0 ? 1 / ivv : 0;
}

export function computeOfertaPorDormitorio(buildings: Building[], f: Filters): ComboBucket[] {
  const acc = tempoEstoqueByLatest(buildings, f, (_b, t) => bedroomBucket(t.number_bedroom));
  const keys = Array.from(acc.keys()).sort();
  return keys.map((k) => {
    const { est, vnd } = acc.get(k)!;
    return { key: `${k} dorm${k === '1' ? '' : 's'}`, estoque: est, tempoEstoque: tempoFromIvv(est, vnd) };
  });
}

export function computeOfertaPorPadrao(buildings: Building[], f: Filters): ComboBucket[] {
  const acc = tempoEstoqueByLatest(buildings, f, (b) => b.standard || 'Sem classificação');
  // §10 — sem limitação de Top 10
  return Array.from(acc.entries())
    .map(([key, { est, vnd }]) => ({ key, estoque: est, tempoEstoque: tempoFromIvv(est, vnd) }))
    .sort((a, b) => a.tempoEstoque - b.tempoEstoque);
}

export interface RankRow { key: string; value: number; }

export function rankBairrosPorIvv(buildings: Building[], f: Filters): RankRow[] {
  const acc = tempoEstoqueByLatest(buildings, f, (b) => b.neighborhood);
  const rows: RankRow[] = [];
  for (const [k, { est, vnd }] of acc) {
    const denom = est + vnd;
    if (denom > 0) rows.push({ key: k, value: vnd / denom });
  }
  return rows.sort((a, b) => b.value - a.value);
}

export function rankBairrosPorTempoEstoque(buildings: Building[], f: Filters): RankRow[] {
  const acc = tempoEstoqueByLatest(buildings, f, (b) => b.neighborhood);
  const rows: RankRow[] = [];
  for (const [k, { est, vnd }] of acc) {
    const t = tempoFromIvv(est, vnd);
    if (t > 0) rows.push({ key: k, value: t });
  }
  return rows.sort((a, b) => a.value - b.value);
}

function avgLastPrice(buildings: Building[], f: Filters, field: 'price' | 'price_private_area', groupBy: (b: Building) => string): RankRow[] {
  const latest = latestPeriodInScope(buildings, f);
  const sum = new Map<string, { s: number; c: number }>();
  if (!latest) return [];
  for (const b of buildings) {
    const k = groupBy(b);
    if (!k) continue;
    for (const t of b.typologies) {
      const h = t.history.find((e) => e.period === latest && historyMatches(e, f));
      if (!h) continue;
      const val = h[field];
      if (val == null || !Number.isFinite(val)) continue;
      const cur = sum.get(k) ?? { s: 0, c: 0 };
      cur.s += val; cur.c += 1;
      sum.set(k, cur);
    }
  }
  return Array.from(sum.entries())
    .map(([key, { s, c }]) => ({ key, value: c > 0 ? s / c : 0 }))
    .filter((r) => r.value > 0);
}

export function rankBairrosPorPrecoM2(buildings: Building[], f: Filters): RankRow[] {
  return avgLastPrice(buildings, f, 'price_private_area', (b) => b.neighborhood).sort((a, b) => a.value - b.value);
}
export function rankBairrosPorPrecoMedio(buildings: Building[], f: Filters): RankRow[] {
  return avgLastPrice(buildings, f, 'price', (b) => b.neighborhood).sort((a, b) => a.value - b.value);
}
export function precoM2PorPadrao(buildings: Building[], f: Filters): RankRow[] {
  return avgLastPrice(buildings, f, 'price_private_area', (b) => b.standard || 'Sem classificação').sort((a, b) => a.value - b.value);
}
export function precoMedioPorPadrao(buildings: Building[], f: Filters): RankRow[] {
  return avgLastPrice(buildings, f, 'price', (b) => b.standard || 'Sem classificação').sort((a, b) => a.value - b.value);
}

// ============ Mapa de oportunidades ============

export interface OpportunityMatrix {
  rows: string[];
  cols: string[];
  data: Record<string, Record<string, number>>;
  rowLabel: string;
}

export type OpportunityGroupBy = 'neighborhood' | 'building_type';

export function computeOpportunityMap(
  buildings: Building[],
  f: Filters,
  groupBy: OpportunityGroupBy = 'neighborhood',
): OpportunityMatrix {
  const colKeys = ['1', '2', '3', '4+'];
  const est = new Map<string, Map<string, number>>();
  const vnd = new Map<string, Map<string, number>>();
  const ensure = (m: Map<string, Map<string, number>>, k: string) => {
    let inner = m.get(k);
    if (!inner) { inner = new Map(); m.set(k, inner); }
    return inner;
  };
  const latest = latestPeriodInScope(buildings, f);
  const keyFn = (b: Building) => (groupBy === 'building_type' ? b.building_type : b.neighborhood);
  if (latest) {
    for (const b of buildings) {
      const row = keyFn(b);
      if (!row) continue;
      for (const t of b.typologies) {
        const col = bedroomBucket(t.number_bedroom);
        if (!colKeys.includes(col)) continue;
        const h = t.history.find((e) => e.period === latest && historyMatches(e, f));
        if (!h) continue;
        ensure(est, row).set(col, (ensure(est, row).get(col) ?? 0) + h.typology_stock);
        ensure(vnd, row).set(col, (ensure(vnd, row).get(col) ?? 0) + h.sold_in_period);
      }
    }
  }
  const rows = Array.from(est.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const data: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    data[r] = {};
    for (const col of colKeys) {
      const e = est.get(r)?.get(col) ?? 0;
      const v = vnd.get(r)?.get(col) ?? 0;
      data[r][col] = e + v > 0 ? v / (e + v) : 0;
    }
  }
  return {
    rows,
    cols: colKeys.map((c) => (c === '4+' ? '4 dorms' : c === '1' ? '1 dorm' : `${c} dorms`)),
    data,
    rowLabel: groupBy === 'building_type' ? 'Tipo' : 'Bairro',
  };
}

// ============ IPC — Índice de Performance Comercial ============

export interface IpcSeriesPoint { period: string; _sort: number; [standard: string]: number | string | null; }

/**
 * IPC(b, p) = (Vendas(b,p)/Vendas(ALL,p)) / (Estoque(b,p)/Estoque(ALL,p))
 * Estoque(b,p) <= 0 → BLANK (null).
 */
export function computeIpcByStandard(
  allBuildings: Building[],
  filtered: Building[],
  f: Filters,
  g: Granularity,
): { series: IpcSeriesPoint[]; standards: string[] } {
  const allVendas = new Map<string, number>();
  const allEstoque = new Map<string, number>();
  const addSort = new Map<string, number>();
  for (const b of allBuildings) {
    for (const t of b.typologies) {
      for (const h of t.history) {
        const key = periodKey(h.period, g);
        addSort.set(key, periodSortKey(h.period, g));
        allVendas.set(key, (allVendas.get(key) ?? 0) + h.sold_in_period);
        allEstoque.set(key, (allEstoque.get(key) ?? 0) + h.typology_stock);
      }
    }
  }

  const stdVendas = new Map<string, Map<string, number>>();
  const stdEstoque = new Map<string, Map<string, number>>();
  const standardsSet = new Set<string>();
  const ensure = (m: Map<string, Map<string, number>>, s: string) => {
    let inner = m.get(s);
    if (!inner) { inner = new Map(); m.set(s, inner); }
    return inner;
  };
  for (const b of filtered) {
    const std = b.standard || 'Sem classificação';
    standardsSet.add(std);
    for (const t of b.typologies) {
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        const key = periodKey(h.period, g);
        addSort.set(key, periodSortKey(h.period, g));
        ensure(stdVendas, std).set(key, (ensure(stdVendas, std).get(key) ?? 0) + h.sold_in_period);
        ensure(stdEstoque, std).set(key, (ensure(stdEstoque, std).get(key) ?? 0) + h.typology_stock);
      }
    }
  }

  const periods = Array.from(addSort.keys()).sort((a, b) => (addSort.get(a) ?? 0) - (addSort.get(b) ?? 0));
  const standards = Array.from(standardsSet).sort();
  const series: IpcSeriesPoint[] = periods.map((p) => {
    const row: IpcSeriesPoint = { period: p, _sort: addSort.get(p) ?? 0 };
    for (const std of standards) {
      const ve = stdVendas.get(std)?.get(p) ?? 0;
      const ee = stdEstoque.get(std)?.get(p) ?? 0;
      const av = allVendas.get(p) ?? 0;
      const ae = allEstoque.get(p) ?? 0;
      if (ee <= 0) { row[std] = null; continue; }
      const percV = av > 0 ? ve / av : 0;
      const percE = ae > 0 ? ee / ae : 0;
      row[std] = percE > 0 ? percV / percE : null;
    }
    return row;
  });
  return { series, standards };
}

// ============ Options ============

export function extractOptions(buildings: Building[]) {
  const s = <T,>() => new Set<T>();
  const years = s<string>();
  const status = s<string>();
  const cities = s<string>();
  const neighborhoods = s<string>();
  const types = s<string>();
  const typologies = s<string>();
  const standards = s<string>();
  const bedrooms = s<string>();
  const garages = s<string>();
  const monthsMap = new Map<string, { year: number; month: number }>();
  const names = new Map<string, string>();

  for (const b of buildings) {
    if (b.releaseYear) years.add(String(b.releaseYear));
    for (const t of b.typologies) {
      for (const h of t.history) {
        const y = yearFromPeriod(h.period);
        if (y > 1990) {
          years.add(String(y));
          const mk = monthKeyFromPeriod(h.period);
          if (!monthsMap.has(mk)) monthsMap.set(mk, { year: y, month: monthFromPeriod(h.period) });
        }
      }
    }
    if (b.status) status.add(b.status);
    if (b.city) cities.add(b.city);
    if (b.neighborhood) neighborhoods.add(b.neighborhood);
    if (b.building_type) types.add(b.building_type);
    if (b.standard) standards.add(b.standard);
    if (b.building_id) names.set(b.building_id, b.name || b.building_id);
    for (const t of b.typologies) {
      if (t.type_of_typology) typologies.add(t.type_of_typology);
      bedrooms.add(bedroomBucket(t.number_bedroom));
      garages.add(garageBucket(t.garage));
    }
  }

  const sortStr = (arr: string[]) => arr.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const sortBucket = (arr: string[]) => arr.sort((a, b) => (a === '4+' ? 99 : parseInt(a)) - (b === '4+' ? 99 : parseInt(b)));

  const MONTH_LABELS_BR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const months = Array.from(monthsMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([value, { year, month }]) => ({
      value,
      label: `${MONTH_LABELS_BR[month - 1] ?? '??'}/${String(year).slice(2)}`,
    }));

  return {
    years: sortStr(Array.from(years)).reverse(),
    months,
    status: sortStr(Array.from(status)),
    cities: sortStr(Array.from(cities)),
    neighborhoods: sortStr(Array.from(neighborhoods)),
    types: sortStr(Array.from(types)),
    typologies: sortStr(Array.from(typologies)),
    standards: sortStr(Array.from(standards)),
    bedrooms: sortBucket(Array.from(bedrooms)),
    garages: sortBucket(Array.from(garages)),
    buildings: Array.from(names.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  };
}
