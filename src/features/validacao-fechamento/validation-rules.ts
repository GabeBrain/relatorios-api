import type { ValidationBuilding, ValidationHistory } from './api';
import { areaKey, typologyAreaGroups } from './area-cluster';

export interface Divergence {
  building_type: string;
  building_id: string; typology_id: string; building_name: string; private_area: number | null; city: string; status: string; period: string;
  field: string; error: string; value: string; rule: string; group: string; isBuildingRule: boolean;
}

interface Row { b: ValidationBuilding; h: ValidationHistory; typologyId: string; cluster: string; clusterValid: boolean; }
interface Totals { qty: number; sold: number; price: number; area: number; standardQty: number; standardPrice: number; }
interface Cluster extends Totals { buildings: Set<string>; soldValues: number[]; prices: number[]; pricesM2: number[]; noGarageQty: number; noGaragePrice: number; noGarageArea: number; }
const n = (value: number | null | undefined) => value ?? 0;
const emptyTotals = (): Totals => ({ qty: 0, sold: 0, price: 0, area: 0, standardQty: 0, standardPrice: 0 });
const key = (...values: string[]) => JSON.stringify(values);
const fmt = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** pandas/numpy round: empates para o inteiro par. */
function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  return (scaled - floor === .5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(scaled)) / factor;
}
const ratio = (a: number, b: number) => b === 0 ? 0 : round(a / b, 2);
// Divisão por zero: positivo/0 é infinito; 0/0 não dispara desvio (pandas).
const deviation = (value: number, reference: number) => Math.abs(value / reference - 1);
const hasGarage = (history: ValidationHistory) => (history.garage_label || '0').slice(0, 1) !== '0';

function add(totals: Totals, history: ValidationHistory) {
  const qty = n(history.qty), price = round(qty * n(history.price), 2), area = round(qty * n(history.private_area), 2);
  totals.qty += qty; totals.sold += n(history.sold); totals.price += price; totals.area += area;
  if (history.type_of_typology === 'Padrão') { totals.standardQty += qty; totals.standardPrice += price; }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length ? round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, 2) : 0;
}

/** Farol atualizado: último registro por tipologia antes dos agrupamentos; cluster sem período. */
export function validateBuildings(buildings: ValidationBuilding[]): Divergence[] {
  const areaGroups = typologyAreaGroups(buildings);
  const historyRows: Row[] = buildings.flatMap((b) => b.typologies.flatMap((t) => t.history.map((h) => {
    const releaseYear = /^\d{4}-\d{2}-\d{2}/.test(b.release_date) && Number.isFinite(Date.parse(b.release_date)) ? b.release_date.slice(0, 4) : '';
    const zipcode5 = String(b.zipcode ?? '').split('.')[0].padStart(8, '0').slice(0, 5);
    const clusterDimension = /loteamento/i.test(b.standard) ? areaGroups.get(areaKey(b.building_id, t.typology_id))! : `${n(h.number_bedroom)} dorms`;
    return { b, h, typologyId: t.typology_id, clusterValid: Boolean(releaseYear), cluster: [b.city, b.building_type, h.type_of_typology, b.standard, clusterDimension, zipcode5, releaseYear].join('|') };
  })));
  // Mesmo critério do Python: database, period, building_id, typology_id.
  const compareId = (a: string, b: string) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) ? Number(a) - Number(b) : a.localeCompare(b);
  const ordered = [...historyRows].sort((a, b) => a.b.period.localeCompare(b.b.period) || a.h.period.localeCompare(b.h.period) || compareId(a.b.building_id, b.b.building_id) || compareId(a.typologyId, b.typologyId));
  const latestTypologies = new Map<string, Row>();
  for (const row of ordered) latestTypologies.set(row.typologyId, row);
  const latestBuildings = new Map<string, Row>();
  for (const row of [...latestTypologies.values()].sort((a, b) => a.b.period.localeCompare(b.b.period) || a.h.period.localeCompare(b.h.period) || compareId(a.b.building_id, b.b.building_id) || compareId(a.typologyId, b.typologyId))) latestBuildings.set(row.b.building_id, row);

  const base = [...latestTypologies.values()];

  const buildingTotals = new Map<string, Totals>();
  const clusters = new Map<string, Cluster>();
  for (const row of base) {
    const buildingKey = key(row.b.building_id, row.h.period);
    const totals = buildingTotals.get(buildingKey) ?? emptyTotals();
    add(totals, row.h);
    buildingTotals.set(buildingKey, totals);
    if (!row.clusterValid) continue;
    const cluster = clusters.get(row.cluster) ?? { ...emptyTotals(), buildings: new Set<string>(), soldValues: [], prices: [], pricesM2: [], noGarageQty: 0, noGaragePrice: 0, noGarageArea: 0 };
    add(cluster, row.h);
    cluster.buildings.add(row.b.building_id);
    cluster.soldValues.push(n(row.h.sold));
    if (row.h.price != null) cluster.prices.push(row.h.price);
    cluster.pricesM2.push(ratio(n(row.h.price), n(row.h.private_area)));
    if (!hasGarage(row.h)) {
      cluster.noGarageQty += n(row.h.qty);
      cluster.noGaragePrice += round(n(row.h.qty) * n(row.h.price), 2);
      cluster.noGarageArea += round(n(row.h.qty) * n(row.h.private_area), 2);
    }
    clusters.set(row.cluster, cluster);
  }


  const out: Divergence[] = [];
  const emit = (row: Row, field: string, error: string, value: string, rule: string, group = '', isBuildingRule = false) => {
    out.push({ building_type: row.b.building_type, building_id: row.b.building_id, typology_id: isBuildingRule ? '0' : row.typologyId, building_name: row.b.name, private_area: isBuildingRule ? null : row.h.private_area, city: row.b.city, status: row.b.status, period: row.h.period, field, error, value, rule, group, isBuildingRule });
  };

  for (const row of latestBuildings.values()) {
    const totals = buildingTotals.get(key(row.b.building_id, row.h.period))!;
    const cluster = clusters.get(row.cluster);
    const months = round((Date.parse(row.h.period) - Date.parse(row.b.release_date)) / 86400000 / 30.44) || 0;
    const stock = n(row.b.total_stock);
    const salesRate = ratio(totals.sold, totals.qty);
    const salesValue = `Tempo venda: ${months} | Estoque atual: ${fmt(stock)} | Total vendido: ${fmt(totals.sold)} | Oferta lançada: ${fmt(totals.qty)} | % Vendido: ${fmt(salesRate)}`;
    const buildingGroup = `Empreendimento: building_id=${row.b.building_id} | período=${row.h.period}`;
    if (months > 24 && row.b.status === 'Ativo' && salesRate <= .3) emit(row, 'total_stock', '> 24 meses, Ativo, Vendido ≤ 30% das unidades', salesValue, 'Estoque - Empreendimento', buildingGroup, true);
    if (months <= 24 && row.b.status === 'Ativo' && salesRate >= .8) emit(row, 'total_stock', '≤ 24 meses, Ativo, Vendido ≥ 80% das unidades', salesValue, 'Estoque - Empreendimento', buildingGroup, true);
    if (cluster && cluster.buildings.size > 1 && deviation(salesRate, ratio(cluster.sold, cluster.qty)) > .5) emit(row, 'sold', 'Taxa de vendas com desvio > 50% da taxa do cluster', `Vendas: ${fmt(totals.sold)} | Oferta lançada: ${fmt(totals.qty)} | % Vendido: ${fmt(salesRate)} | Empreendimentos: ${cluster.buildings.size} | Mediana cluster: ${fmt(round(median(cluster.soldValues)))} | % Vendido cluster: ${fmt(ratio(cluster.sold, cluster.qty))}`, 'Estoque - Tipologia', row.cluster, true);
  }

  for (const row of latestTypologies.values()) {
    const { h, b } = row;
    const cluster = clusters.get(row.cluster);
    const count = cluster?.buildings.size ?? 0;
    const totals = buildingTotals.get(key(b.building_id, h.period))!;
    const area = n(h.private_area), price = n(h.price), priceM2 = n(h.price_private_area);
    const launched = /Ativo|Esgotado|Lançado/i.test(h.building_status ?? '');
    const zeroPrice = price === 0 && launched;
    const priceMedian = median(cluster?.prices ?? []);
    const lowPriceLimit = b.building_type === 'Horizontal' ? 40000 : 100000;
    const lowPrice = price > 0 && price <= lowPriceLimit && deviation(price, priceMedian) >= .3;
    const suffix = ` | Empreendimentos: ${count}`;
    if (b.building_type === 'Vertical' && b.standard === 'Compacto' && area >= 50 && n(h.number_bedroom) <= 1) emit(row, 'private_area', 'Compacto ≥ 50 m² com até 1 quarto', `M²: ${fmt(area)} | Quartos: ${n(h.number_bedroom)} dorms`, 'Metragem - Tipologia');
    // Prioridade apenas nesta família: zerado > limite específico > desvio geral.
    if (lowPrice) emit(row, 'price', `Preço abaixo de R$ ${fmt(lowPriceLimit)}`, `Preço: ${fmt(price)} | Mediana cluster: ${fmt(priceMedian)}`, 'Preço', row.cluster);
    else if (!zeroPrice && cluster && count > 1 && deviation(price, priceMedian) >= .3) emit(row, 'price', 'Desvio ≥ 30% da mediana do cluster', `Preço: ${fmt(price)} | Mediana cluster: ${fmt(priceMedian)}${suffix}`, 'Preço - Tipologia', row.cluster);
    else if (!zeroPrice && price < 1000 && count === 1) emit(row, 'price', 'Desvio ≥ 30% da mediana do cluster', `Preço: ${fmt(price)}${suffix}`, 'Preço', row.cluster);
    if (cluster && count > 1 && deviation(priceM2, median(cluster.pricesM2)) >= .3) emit(row, 'price_private_area', 'Desvio ≥ 30% da mediana do cluster', `Preço/m²: ${fmt(priceM2)} | Mediana cluster: ${fmt(median(cluster.pricesM2))}${suffix}`, 'Preço', row.cluster);
    if (priceM2 < 10 && count === 1) emit(row, 'price_private_area', 'Desvio ≥ 30% da mediana do cluster', `Preço/m²: ${fmt(priceM2)}${suffix}`, 'Preço', row.cluster);
    if (hasGarage(h) && round(price) <= round(ratio(cluster?.noGaragePrice ?? 0, cluster?.noGarageQty ?? 0))) emit(row, 'price', 'Preço com vaga ≤ Preço sem vaga', `Com vagas: ${fmt(price)} | Sem vagas: ${fmt(ratio(cluster?.noGaragePrice ?? 0, cluster?.noGarageQty ?? 0))}${suffix}`, 'Preço', row.cluster);
    if (hasGarage(h) && round(priceM2) <= round(ratio(cluster?.noGaragePrice ?? 0, cluster?.noGarageArea ?? 0))) emit(row, 'price_private_area', 'Preço/m² com vaga ≤ Preço/m² sem vaga', `Com vagas: ${fmt(priceM2)} | Sem vagas: ${fmt(ratio(cluster?.noGaragePrice ?? 0, cluster?.noGarageArea ?? 0))}${suffix}`, 'Preço', row.cluster);
    const standardTicket = ratio(totals.standardPrice, totals.standardQty);
    const buildingGroup = `Empreendimento: building_id=${b.building_id} | período=${h.period}`;
    if (h.type_of_typology === 'Garden' && round(price) >= round(standardTicket)) emit(row, 'price', 'Ticket Garden ≥ Ticket Padrão', `Garden: ${fmt(price)} | Padrão: ${fmt(standardTicket)}`, 'Preço', buildingGroup);
    if (h.type_of_typology === 'Cobertura' && round(price) <= round(standardTicket)) emit(row, 'price', 'Ticket Cobertura ≤ Ticket Padrão', `Cobertura: ${fmt(price)} | Padrão: ${fmt(standardTicket)}`, 'Preço', buildingGroup);
    if (b.building_type === 'Vertical' && b.standard === 'Econômico' && !/0|1\s*vagas?/i.test(h.garage_label)) emit(row, 'garage', 'Vertical Econômico com mais de 1 vaga', `Vagas: ${h.garage_label}`, 'Vagas');
    if (b.building_type === 'Vertical' && area >= 150 && /0|1\s*vagas?/i.test(h.garage_label)) emit(row, 'garage', 'Vertical ≥ 150 m² com menos de 2 vagas', `Vagas: ${h.garage_label}`, 'Vagas');
    if (b.building_type === 'Vertical' && b.standard === 'Compacto' && area >= 40 && /0\s*vagas?/i.test(h.garage_label)) emit(row, 'garage', 'Vertical Compacto ≥ 40 m² sem vaga', `Vagas: ${h.garage_label}`, 'Vagas');

    // Farol 26/10/2026: integridade cadastral, sem duplicar os desvios de preço do cluster.
    const releasePrice = n(h.release_price);
    const monthLabel = (date: string) => /^\d{4}-\d{2}-\d{2}/.test(date) && Number.isFinite(Date.parse(date)) ? `${date.slice(5, 7)}/${date.slice(0, 4)}` : '';
    const releaseDay = b.release_date.slice(0, 10);
    const sameReleasePeriod = Boolean(releaseDay && Number.isFinite(Date.parse(releaseDay)) && releaseDay === h.period.slice(0, 10));
    if (area === 0 && h.building_status !== 'Futuro') emit(row, 'private_area', 'Área privativa zerada', `M2: ${fmt(area)}`, 'Metragem');
    if (round(Math.abs(round(priceM2, 2) - ratio(price, area)), 2) > .01) emit(row, 'price_private_area', 'Preço M2 diferente de (Preço / Área Privativa)', `Preço M2 gravado: ${fmt(priceM2)} | Preço: ${fmt(price)} | M2: ${fmt(area)}`, 'Preço');
    if (releasePrice === 0 && launched) emit(row, 'release_price', 'Preço de lançamento zerado', `Preço: ${fmt(releasePrice)} | Período: ${monthLabel(b.release_date)}`, 'Preço');
    if (price === 0 && launched) emit(row, 'price', 'Preço do período zerado', `Preço: ${fmt(price)} | Período: ${monthLabel(h.period)}`, 'Preço');
    if (sameReleasePeriod && n(h.qty) === 0) emit(row, 'qty', 'Quantidade lançada zerada', `Quantidade lançada: ${fmt(n(h.qty))}`, 'Estoque');
    if (sameReleasePeriod && round(releasePrice, 2) !== round(price, 2)) emit(row, 'release_price', 'Preço de lançamento diferente do preço do período', `Preço lançamento: ${fmt(releasePrice)} | Preço: ${fmt(price)}`, 'Preço');
  }
  return out;
}
