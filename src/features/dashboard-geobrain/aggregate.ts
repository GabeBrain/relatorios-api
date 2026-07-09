import type { Building, Filters, Granularity, HistoryEntry, Typology } from './types';

function garageBucket(g: number): string {
  return g >= 4 ? '4+' : String(g);
}
function bedroomBucket(n: number): string {
  return n >= 4 ? '4+' : String(n);
}

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

function inRange(d: Date, from: Date | null, to: Date | null): boolean {
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Filtro dos períodos históricos por Ano (release) e Períodos (mês YYYY-MM). */
function historyMatches(h: HistoryEntry, f: Filters): boolean {
  if (!inRange(h.periodDate, f.from, f.to)) return false;
  if (f.years.length && !f.years.includes(String(h.periodDate.getFullYear()))) return false;
  if (f.periods.length && !f.periods.includes(monthKey(h.periodDate))) return false;
  return true;
}

/** Última entrada de histórico respeitando f.to E os filtros temporais (years/periods) — se houver. */
function lastHistoryMatching(t: Typology, f: Filters): HistoryEntry | null {
  let last: HistoryEntry | null = null;
  for (const h of t.history) {
    if (f.to && h.periodDate > f.to) continue;
    if (f.years.length && !f.years.includes(String(h.periodDate.getFullYear()))) continue;
    if (f.periods.length && !f.periods.includes(monthKey(h.periodDate))) continue;
    if (!last || h.periodDate > last.periodDate) last = h;
  }
  return last;
}

export interface KPIValues {
  empreendimentos: number;
  empreendimentosAtivos: number;
  ofertaLancada: number;
  vgvLancado: number;
  ofertaFinal: number;
  vgvEstoque: number;
  ivv: number;
  tempoEstoque: number;
}

export function computeKpis(buildings: Building[], f: Filters): KPIValues {
  let ofertaLancada = 0, vgvLancado = 0, ofertaFinal = 0, vgvEstoque = 0, vendasLiquidas = 0, ativos = 0;

  for (const b of buildings) {
    if (b.status === 'Ativo') ativos++;
    for (const t of b.typologies) {
      ofertaLancada += t.qty;
      vgvLancado += t.qty * (t.release_price ?? 0);
      const last = lastHistoryMatching(t, f);
      if (last) {
        ofertaFinal += last.typology_stock;
        vgvEstoque += last.vgv_stock ?? 0;
      }
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        vendasLiquidas += h.sold_in_period;
      }
    }
  }

  const ivv = ofertaFinal + vendasLiquidas > 0 ? vendasLiquidas / (ofertaFinal + vendasLiquidas) : 0;
  let monthsRange = 12;
  if (f.from && f.to) {
    monthsRange = (f.to.getFullYear() - f.from.getFullYear()) * 12 + (f.to.getMonth() - f.from.getMonth()) + 1;
    if (monthsRange < 1) monthsRange = 1;
  }
  const salesPerMonth = vendasLiquidas / monthsRange;
  const tempoEstoque = salesPerMonth > 0 ? ofertaFinal / salesPerMonth : 0;

  return { empreendimentos: buildings.length, empreendimentosAtivos: ativos, ofertaLancada, vgvLancado, ofertaFinal, vgvEstoque, ivv, tempoEstoque };
}

function periodKey(d: Date, g: Granularity): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (g === 'year') return String(y);
  if (g === 'quarter') return `${String(y).slice(2)}T${Math.floor((m - 1) / 3) + 1}`;
  return `${String(m).padStart(2, '0')}/${String(y).slice(2)}`;
}
function periodSortKey(d: Date, g: Granularity): number {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (g === 'year') return y * 12;
  if (g === 'quarter') return y * 12 + Math.floor(m / 3) * 3;
  return y * 12 + m;
}

export interface SeriesPoint {
  period: string;
  ofertaLancada: number;
  vendaLiquida: number;
  vgvLancamento: number;
  vgvEstoque: number;
  estoqueFinal: number;
  ivv: number;
  _sort: number;
}

export function computeSeries(buildings: Building[], f: Filters, g: Granularity): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (const b of buildings) {
    for (const t of b.typologies) {
      if (!t.history.length) continue;
      const launchEntry = t.history[0];
      if (historyMatches(launchEntry, f)) {
        const key = periodKey(launchEntry.periodDate, g);
        const p = map.get(key) ?? emptyPoint(key, periodSortKey(launchEntry.periodDate, g));
        p.ofertaLancada += t.qty;
        p.vgvLancamento += t.qty * (t.release_price ?? 0);
        map.set(key, p);
      }
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        const key = periodKey(h.periodDate, g);
        const p = map.get(key) ?? emptyPoint(key, periodSortKey(h.periodDate, g));
        p.vendaLiquida += h.sold_in_period;
        p.vgvEstoque += h.vgv_stock ?? 0;
        p.estoqueFinal += h.typology_stock;
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
function emptyPoint(period: string, sort: number): SeriesPoint {
  return { period, ofertaLancada: 0, vendaLiquida: 0, vgvLancamento: 0, vgvEstoque: 0, estoqueFinal: 0, ivv: 0, _sort: sort };
}

// ============ Rankings & combos ============

export interface ComboBucket { key: string; estoque: number; tempoEstoque: number; }

function tempoEstoqueFor(estoque: number, vendas: number, months: number): number {
  const perMonth = vendas / Math.max(1, months);
  return perMonth > 0 ? estoque / perMonth : 0;
}

function monthsRangeOf(f: Filters, buildings: Building[]): number {
  if (f.from && f.to) {
    const m = (f.to.getFullYear() - f.from.getFullYear()) * 12 + (f.to.getMonth() - f.from.getMonth()) + 1;
    return Math.max(1, m);
  }
  // fallback: 12 meses
  return 12;
}

/** Oferta final + tempo de estoque agrupado por dormitório (0..4+). */
export function computeOfertaPorDormitorio(buildings: Building[], f: Filters): ComboBucket[] {
  const months = monthsRangeOf(f, buildings);
  const est = new Map<string, number>();
  const vnd = new Map<string, number>();
  for (const b of buildings) {
    for (const t of b.typologies) {
      const k = bedroomBucket(t.number_bedroom);
      const last = lastHistoryMatching(t, f);
      if (last) est.set(k, (est.get(k) ?? 0) + last.typology_stock);
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        vnd.set(k, (vnd.get(k) ?? 0) + h.sold_in_period);
      }
    }
  }
  const keys = Array.from(est.keys()).sort();
  return keys.map((k) => ({ key: `${k} dorm${k === '1' ? '' : 's'}`, estoque: est.get(k) ?? 0, tempoEstoque: tempoEstoqueFor(est.get(k) ?? 0, vnd.get(k) ?? 0, months) }));
}

export function computeOfertaPorPadrao(buildings: Building[], f: Filters): ComboBucket[] {
  const months = monthsRangeOf(f, buildings);
  const est = new Map<string, number>();
  const vnd = new Map<string, number>();
  for (const b of buildings) {
    const k = b.standard || 'Sem classificação';
    for (const t of b.typologies) {
      const last = lastHistoryMatching(t, f);
      if (last) est.set(k, (est.get(k) ?? 0) + last.typology_stock);
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        vnd.set(k, (vnd.get(k) ?? 0) + h.sold_in_period);
      }
    }
  }
  return Array.from(est.keys())
    .map((k) => ({ key: k, estoque: est.get(k) ?? 0, tempoEstoque: tempoEstoqueFor(est.get(k) ?? 0, vnd.get(k) ?? 0, months) }))
    .sort((a, b) => a.tempoEstoque - b.tempoEstoque);
}

export interface RankRow { key: string; value: number; }

/** IVV por bairro (soma vendas / (soma estoque final + soma vendas)) */
export function rankBairrosPorIvv(buildings: Building[], f: Filters): RankRow[] {
  const est = new Map<string, number>();
  const vnd = new Map<string, number>();
  for (const b of buildings) {
    const k = b.neighborhood;
    if (!k) continue;
    for (const t of b.typologies) {
      const last = lastHistoryMatching(t, f);
      if (last) est.set(k, (est.get(k) ?? 0) + last.typology_stock);
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        vnd.set(k, (vnd.get(k) ?? 0) + h.sold_in_period);
      }
    }
  }
  const rows: RankRow[] = [];
  for (const k of est.keys()) {
    const e = est.get(k) ?? 0;
    const v = vnd.get(k) ?? 0;
    if (e + v > 0) rows.push({ key: k, value: v / (e + v) });
  }
  return rows.sort((a, b) => b.value - a.value);
}

export function rankBairrosPorTempoEstoque(buildings: Building[], f: Filters): RankRow[] {
  const months = monthsRangeOf(f, buildings);
  const est = new Map<string, number>();
  const vnd = new Map<string, number>();
  for (const b of buildings) {
    const k = b.neighborhood;
    if (!k) continue;
    for (const t of b.typologies) {
      const last = lastHistoryMatching(t, f);
      if (last) est.set(k, (est.get(k) ?? 0) + last.typology_stock);
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        vnd.set(k, (vnd.get(k) ?? 0) + h.sold_in_period);
      }
    }
  }
  const rows: RankRow[] = [];
  for (const k of est.keys()) {
    const t = tempoEstoqueFor(est.get(k) ?? 0, vnd.get(k) ?? 0, months);
    if (t > 0) rows.push({ key: k, value: t });
  }
  return rows.sort((a, b) => a.value - b.value);
}

function avgLastPrice(buildings: Building[], f: Filters, field: 'price' | 'price_private_area', groupBy: (b: Building) => string): RankRow[] {
  const sum = new Map<string, { s: number; c: number }>();
  for (const b of buildings) {
    const k = groupBy(b);
    if (!k) continue;
    for (const t of b.typologies) {
      const last = lastHistoryMatching(t, f);
      if (!last) continue;
      const val = last[field];
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
  bairros: string[];
  cols: string[]; // ['1 dorm', '2 dorms', ...]
  data: Record<string, Record<string, number>>; // bairro → col → ivv (0..1)
}

export function computeOpportunityMap(buildings: Building[], f: Filters): OpportunityMatrix {
  const cols = ['1', '2', '3', '4+'];
  const est = new Map<string, Map<string, number>>();
  const vnd = new Map<string, Map<string, number>>();
  const ensure = (m: Map<string, Map<string, number>>, k: string) => {
    let inner = m.get(k);
    if (!inner) { inner = new Map(); m.set(k, inner); }
    return inner;
  };
  for (const b of buildings) {
    const nb = b.neighborhood;
    if (!nb) continue;
    for (const t of b.typologies) {
      const col = bedroomBucket(t.number_bedroom);
      if (!cols.includes(col)) continue;
      const last = lastHistoryMatching(t, f);
      if (last) {
        const inner = ensure(est, nb);
        inner.set(col, (inner.get(col) ?? 0) + last.typology_stock);
      }
      for (const h of t.history) {
        if (!historyMatches(h, f)) continue;
        const inner = ensure(vnd, nb);
        inner.set(col, (inner.get(col) ?? 0) + h.sold_in_period);
      }
    }
  }
  const bairros = Array.from(est.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const data: Record<string, Record<string, number>> = {};
  for (const nb of bairros) {
    data[nb] = {};
    for (const col of cols) {
      const e = est.get(nb)?.get(col) ?? 0;
      const v = vnd.get(nb)?.get(col) ?? 0;
      data[nb][col] = e + v > 0 ? v / (e + v) : 0;
    }
  }
  return {
    bairros,
    cols: cols.map((c) => (c === '4+' ? '4 dorms' : c === '1' ? '1 dorm' : `${c} dorms`)),
    data,
  };
}

// ============ IPC — Índice de Performance Comercial ============

export interface IpcSeriesPoint { period: string; _sort: number; [standard: string]: number | string; }

/**
 * IPC(b, p) = (Vendas(b,p)/Vendas(ALL,p)) / (Estoque(b,p)/Estoque(ALL,p))
 * `allBuildings` = universo bruto (antes de qualquer filtro do sidebar).
 * `filtered` = após filtros; agrupamos por `standard` e agregamos IPC via média ponderada por vendas.
 */
export function computeIpcByStandard(
  allBuildings: Building[],
  filtered: Building[],
  f: Filters,
  g: Granularity,
): { series: IpcSeriesPoint[]; standards: string[] } {
  // ALL totals per period
  const allVendas = new Map<string, number>();
  const allEstoque = new Map<string, number>();
  const addSort = new Map<string, number>();
  for (const b of allBuildings) {
    for (const t of b.typologies) {
      for (const h of t.history) {
        const key = periodKey(h.periodDate, g);
        addSort.set(key, periodSortKey(h.periodDate, g));
        allVendas.set(key, (allVendas.get(key) ?? 0) + h.sold_in_period);
        allEstoque.set(key, (allEstoque.get(key) ?? 0) + h.typology_stock);
      }
    }
  }

  // per (standard, period) vendas / estoque within filtered
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
        const key = periodKey(h.periodDate, g);
        addSort.set(key, periodSortKey(h.periodDate, g));
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
      const percV = av > 0 ? ve / av : 0;
      const percE = ae > 0 ? ee / ae : 0;
      row[std] = ee > 0 && percE > 0 ? percV / percE : 0;
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
  const names = new Map<string, string>();

  for (const b of buildings) {
    if (b.releaseYear) years.add(String(b.releaseYear));
    // extract years also from history
    for (const t of b.typologies) {
      for (const h of t.history) {
        const y = h.periodDate.getFullYear();
        if (y > 1990) years.add(String(y));
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
  return {
    years: sortStr(Array.from(years)).reverse(),
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
