import type { Building, Filters, Granularity, HistoryEntry, Typology } from './types';

function garageBucket(g: number): string {
  return g >= 4 ? '4+' : String(g);
}

function typologyMatchesFilters(t: Typology, f: Filters): boolean {
  if (f.typologies.length && !f.typologies.includes(t.type_of_typology)) return false;
  if (f.bedrooms.length && !f.bedrooms.includes(String(t.number_bedroom))) return false;
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
    if (f.years.length && (!b.releaseYear || !f.years.includes(String(b.releaseYear)))) continue;
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
  let ofertaLancada = 0;
  let vgvLancado = 0;
  let ofertaFinal = 0;
  let vgvEstoque = 0;
  let vendasLiquidas = 0;
  let ativos = 0;

  for (const b of buildings) {
    if (b.status === 'Ativo') ativos++;
    for (const t of b.typologies) {
      ofertaLancada += t.qty;
      vgvLancado += t.qty * (t.release_price ?? 0);

      // last entry ≤ f.to (or overall last)
      let last: HistoryEntry | null = null;
      for (const h of t.history) {
        if (f.to && h.periodDate > f.to) continue;
        if (f.from && h.periodDate < f.from) {
          // still include for finding "closest before"
          if (!last || h.periodDate > last.periodDate) last = h;
          continue;
        }
        if (!last || h.periodDate > last.periodDate) last = h;
      }
      if (last) {
        ofertaFinal += last.typology_stock;
        vgvEstoque += last.vgv_stock ?? 0;
      }

      for (const h of t.history) {
        if (!inRange(h.periodDate, f.from, f.to)) continue;
        vendasLiquidas += h.sold_in_period;
      }
    }
  }

  const ivv = ofertaFinal + vendasLiquidas > 0 ? vendasLiquidas / (ofertaFinal + vendasLiquidas) : 0;

  // Tempo de estoque: oferta_final / (vendas / meses_range). If no range => use 12 months.
  let monthsRange = 12;
  if (f.from && f.to) {
    monthsRange =
      (f.to.getFullYear() - f.from.getFullYear()) * 12 + (f.to.getMonth() - f.from.getMonth()) + 1;
    if (monthsRange < 1) monthsRange = 1;
  }
  const salesPerMonth = vendasLiquidas / monthsRange;
  const tempoEstoque = salesPerMonth > 0 ? ofertaFinal / salesPerMonth : 0;

  return {
    empreendimentos: buildings.length,
    empreendimentosAtivos: ativos,
    ofertaLancada,
    vgvLancado,
    ofertaFinal,
    vgvEstoque,
    ivv,
    tempoEstoque,
  };
}

function periodKey(d: Date, g: Granularity): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (g === 'year') return String(y);
  if (g === 'quarter') return `${y}-T${Math.floor((m - 1) / 3) + 1}`;
  return `${y}-${String(m).padStart(2, '0')}`;
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

  // Track launch-period per typology: earliest history entry counts as launch.
  for (const b of buildings) {
    for (const t of b.typologies) {
      if (!t.history.length) continue;
      const launchEntry = t.history[0];
      if (inRange(launchEntry.periodDate, f.from, f.to)) {
        const key = periodKey(launchEntry.periodDate, g);
        const p = map.get(key) ?? emptyPoint(key, periodSortKey(launchEntry.periodDate, g));
        p.ofertaLancada += t.qty;
        p.vgvLancamento += t.qty * (t.release_price ?? 0);
        map.set(key, p);
      }
      for (const h of t.history) {
        if (!inRange(h.periodDate, f.from, f.to)) continue;
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

/** Extract the set of filter option values from the loaded dataset. */
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
    if (b.status) status.add(b.status);
    if (b.city) cities.add(b.city);
    if (b.neighborhood) neighborhoods.add(b.neighborhood);
    if (b.building_type) types.add(b.building_type);
    if (b.standard) standards.add(b.standard);
    if (b.building_id) names.set(b.building_id, b.name || b.building_id);
    for (const t of b.typologies) {
      if (t.type_of_typology) typologies.add(t.type_of_typology);
      bedrooms.add(String(t.number_bedroom));
      garages.add(garageBucket(t.garage));
    }
  }

  const sortStr = (arr: string[]) => arr.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const sortNum = (arr: string[]) => arr.sort((a, b) => parseInt(a) - parseInt(b));
  return {
    years: sortStr(Array.from(years)).reverse(),
    status: sortStr(Array.from(status)),
    cities: sortStr(Array.from(cities)),
    neighborhoods: sortStr(Array.from(neighborhoods)),
    types: sortStr(Array.from(types)),
    typologies: sortStr(Array.from(typologies)),
    standards: sortStr(Array.from(standards)),
    bedrooms: sortNum(Array.from(bedrooms)),
    garages: sortStr(Array.from(garages)),
    buildings: Array.from(names.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  };
}
