import type { ValidationBuilding, ValidationHistory } from './api';

export interface Divergence {
  building_type: string;
  building_id: string; typology_id: string; building_name: string; private_area: number | null; city: string; status: string; period: string;
  field: string; error: string; value: string; rule: string; group: string; isBuildingRule: boolean;
}

interface Row { b: ValidationBuilding; h: ValidationHistory; typologyId: string; cluster: string; clusterValid: boolean; }
interface Totals { qty: number; sold: number; price: number; area: number; standardQty: number; standardPrice: number; }
interface Cluster extends Totals { buildings: Set<string>; soldValues: number[]; noGarageQty: number; noGaragePrice: number; noGarageArea: number; }
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
  const qty = n(history.qty), price = qty * n(history.price), area = qty * n(history.private_area);
  totals.qty += qty; totals.sold += n(history.sold); totals.price += price; totals.area += area;
  if (history.type_of_typology === 'Padrão') { totals.standardQty += qty; totals.standardPrice += price; }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length ? round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, 2) : 0;
}

/** Regras farol 21/10/2026. Agregados são calculados no histórico antes do último período. */
export function validateBuildings(buildings: ValidationBuilding[]): Divergence[] {
  const base: Row[] = buildings.flatMap((b) => b.typologies.flatMap((t) => t.history.map((h) => {
    const releaseYear = /^\d{4}-\d{2}-\d{2}/.test(b.release_date) && Number.isFinite(Date.parse(b.release_date)) ? b.release_date.slice(0, 4) : '';
    const zipcode5 = String(b.zipcode ?? '').split('.')[0].padStart(8, '0').slice(0, 5);
    const hasZipcode = b.validation_zipcode_missing !== true;
    return { b, h, typologyId: t.typology_id, clusterValid: Boolean(releaseYear) && hasZipcode, cluster: [b.city, b.building_type, h.type_of_typology, b.standard, `${n(h.number_bedroom)} dorms`, hasZipcode ? zipcode5 : '', h.period.slice(0, 10), releaseYear].join('|') };
  })));
  const buildingTotals = new Map<string, Totals>();
  const clusters = new Map<string, Cluster>();
  for (const row of base) {
    const buildingKey = key(row.b.building_id, row.h.period);
    const totals = buildingTotals.get(buildingKey) ?? emptyTotals();
    add(totals, row.h);
    buildingTotals.set(buildingKey, totals);
    if (!row.clusterValid) continue;
    const cluster = clusters.get(row.cluster) ?? { ...emptyTotals(), buildings: new Set<string>(), soldValues: [], noGarageQty: 0, noGaragePrice: 0, noGarageArea: 0 };
    add(cluster, row.h);
    cluster.buildings.add(row.b.building_id);
    cluster.soldValues.push(n(row.h.sold));
    if (!hasGarage(row.h)) {
      cluster.noGarageQty += n(row.h.qty);
      cluster.noGaragePrice += n(row.h.qty) * n(row.h.price);
      cluster.noGarageArea += n(row.h.qty) * n(row.h.private_area);
    }
    clusters.set(row.cluster, cluster);
  }

  // Mesmo critério do Python: database, period, building_id, typology_id.
  const compareId = (a: string, b: string) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) ? Number(a) - Number(b) : a.localeCompare(b);
  const ordered = [...base].sort((a, b) => a.b.period.localeCompare(b.b.period) || a.h.period.localeCompare(b.h.period) || compareId(a.b.building_id, b.b.building_id) || compareId(a.typologyId, b.typologyId));
  const latestTypologies = new Map<string, Row>();
  for (const row of ordered) latestTypologies.set(row.typologyId, row);
  const latestBuildings = new Map<string, Row>();
  for (const row of [...latestTypologies.values()].sort((a, b) => a.b.period.localeCompare(b.b.period) || a.h.period.localeCompare(b.h.period) || compareId(a.b.building_id, b.b.building_id) || compareId(a.typologyId, b.typologyId))) latestBuildings.set(row.b.building_id, row);

  const out: Divergence[] = [];
  const emit = (row: Row, field: string, error: string, value: string, rule: string, group = '', isBuildingRule = false) => {
    out.push({ building_type: row.b.building_type, building_id: row.b.building_id, typology_id: isBuildingRule ? '0' : row.typologyId, building_name: row.b.name, private_area: isBuildingRule ? null : row.h.private_area, city: row.b.city, status: row.b.status, period: row.h.period, field, error, value, rule, group, isBuildingRule });
  };

  for (const row of latestBuildings.values()) {
    const totals = buildingTotals.get(key(row.b.building_id, row.h.period))!;
    const cluster = clusters.get(row.cluster);
    const months = round((Date.parse(row.h.period) - Date.parse(row.b.release_date)) / 86400000 / 30.44) || 0;
    const stock = n(row.b.total_stock);
    const buildingGroup = `Empreendimento: building_id=${row.b.building_id} | período=${row.h.period}`;
    if (months > 24 && row.b.status === 'Ativo' && stock > totals.qty * .7) emit(row, 'total_stock', '> 24 meses, Ativo, Estoque > 70% das unidades', `Tempo venda: ${months} | Estoque atual: ${fmt(stock)} | 70% das unidades: ${fmt(round(totals.qty * .7))}`, 'Estoque', buildingGroup, true);
    if (months <= 24 && row.b.status === 'Ativo' && stock <= totals.qty * .2) emit(row, 'total_stock', '≤ 24 meses, Ativo, Estoque ≤ 20% das unidades', `Tempo venda: ${months} | Estoque atual: ${fmt(stock)} | 20% das unidades: ${fmt(round(totals.qty * .2))}`, 'Estoque', buildingGroup, true);
    if (cluster && cluster.buildings.size > 2 && deviation(totals.sold, median(cluster.soldValues)) > .5) emit(row, 'sold', 'Quantidade vendida com desvio > 50% da mediana do cluster', `Vendas Empreendimento: ${fmt(round(totals.sold))} | Mediana cluster: ${fmt(round(median(cluster.soldValues)))} | Empreendimentos: ${cluster.buildings.size}`, 'Estoque', row.cluster, true);
  }

  for (const row of latestTypologies.values()) {
    const { h, b } = row;
    const cluster = clusters.get(row.cluster);
    const count = cluster?.buildings.size ?? 0;
    const totals = buildingTotals.get(key(b.building_id, h.period))!;
    const area = n(h.private_area), price = n(h.price), priceM2 = n(h.price_private_area);
    const suffix = ` | Empreendimentos: ${count}`;
    if (cluster && count > 2 && deviation(area, ratio(cluster.area, cluster.qty)) >= .4) emit(row, 'private_area', 'Desvio ≥ 40% da média ponderada do cluster', `M²: ${fmt(area)} | Média ponderada cluster: ${fmt(ratio(cluster.area, cluster.qty))}${suffix}`, 'Metragem', row.cluster);
    if (area < 10 && count < 3) emit(row, 'private_area', 'Desvio ≥ 40% da média do cluster', `M²: ${fmt(area)}${suffix}`, 'Metragem', row.cluster);
    if (b.building_type === 'Vertical' && b.standard === 'Compacto' && area >= 50 && n(h.number_bedroom) <= 1) emit(row, 'private_area', 'Compacto ≥ 50 m² com até 1 quarto', `M²: ${fmt(area)} | Quartos: ${n(h.number_bedroom)} dorms`, 'Metragem');
    if (cluster && count > 2 && deviation(price, ratio(cluster.price, cluster.qty)) >= .3) emit(row, 'price', 'Desvio ≥ 30% da média ponderada do cluster', `Preço: ${fmt(price)} | Média ponderada cluster: ${fmt(ratio(cluster.price, cluster.qty))}${suffix}`, 'Preço', row.cluster);
    if (price < 1000 && count < 3) emit(row, 'price', 'Desvio ≥ 30% da média ponderada do cluster', `Preço: ${fmt(price)}${suffix}`, 'Preço', row.cluster);
    if (cluster && count > 2 && deviation(priceM2, ratio(cluster.price, cluster.area)) >= .3) emit(row, 'price_private_area', 'Desvio ≥ 30% da média ponderada do cluster', `Preço/m²: ${fmt(priceM2)} | Média ponderada cluster: ${fmt(ratio(cluster.price, cluster.area))}${suffix}`, 'Preço', row.cluster);
    if (priceM2 < 10 && count < 3) emit(row, 'price_private_area', 'Desvio ≥ 30% da média ponderada do cluster', `Preço/m²: ${fmt(priceM2)}${suffix}`, 'Preço', row.cluster);
    if (hasGarage(h) && round(price) <= round(ratio(cluster?.noGaragePrice ?? 0, cluster?.noGarageQty ?? 0))) emit(row, 'price', 'Preço com vaga ≤ Preço sem vaga', `Com vagas: ${fmt(price)} | Sem vagas: ${fmt(ratio(cluster?.noGaragePrice ?? 0, cluster?.noGarageQty ?? 0))}${suffix}`, 'Preço', row.cluster);
    if (hasGarage(h) && round(priceM2) <= round(ratio(cluster?.noGaragePrice ?? 0, cluster?.noGarageArea ?? 0))) emit(row, 'price_private_area', 'Preço/m² com vaga ≤ Preço/m² sem vaga', `Com vagas: ${fmt(priceM2)} | Sem vagas: ${fmt(ratio(cluster?.noGaragePrice ?? 0, cluster?.noGarageArea ?? 0))}${suffix}`, 'Preço', row.cluster);
    const standardTicket = ratio(totals.standardPrice, totals.standardQty);
    const buildingGroup = `Empreendimento: building_id=${b.building_id} | período=${h.period}`;
    if (h.type_of_typology === 'Garden' && round(price) >= round(standardTicket)) emit(row, 'price', 'Ticket Garden ≥ Ticket Padrão', `Garden: ${fmt(price)} | Padrão: ${fmt(standardTicket)}`, 'Preço', buildingGroup);
    if (h.type_of_typology === 'Cobertura' && round(price) <= round(standardTicket)) emit(row, 'price', 'Ticket Cobertura ≤ Ticket Padrão', `Cobertura: ${fmt(price)} | Padrão: ${fmt(standardTicket)}`, 'Preço', buildingGroup);
    if (b.building_type === 'Vertical' && h.pattern === 'Econômico' && !/0|1\s*vagas?/i.test(h.garage_label)) emit(row, 'garage', 'Vertical Econômico com mais de 1 vaga', `Vagas: ${h.garage_label}`, 'Vagas');
    if (b.building_type === 'Vertical' && area >= 150 && /0|1\s*vagas?/i.test(h.garage_label)) emit(row, 'garage', 'Vertical ≥ 150 m² com menos de 2 vagas', `Vagas: ${h.garage_label}`, 'Vagas');
    if (b.building_type === 'Vertical' && h.pattern === 'Compacto' && area >= 40 && /0\s*vagas?/i.test(h.garage_label)) emit(row, 'garage', 'Vertical Compacto ≥ 40 m² sem vaga', `Vagas: ${h.garage_label}`, 'Vagas');
  }
  return out;
}
