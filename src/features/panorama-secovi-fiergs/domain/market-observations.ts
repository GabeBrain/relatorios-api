import type { CubeProject, MarketCube } from './cube';
import { canonicalStandard, canonicalTypology } from './taxonomy';
import { historyNumber, type HistoryRow } from './building-history';
import { quarterEndMonth, quarterIndex } from './quarters';
import type { Quarter } from '../types';

export const MARKET_OBSERVATION_CONTRACT = 'geobrain-market-v1';
export interface MarketObservation {
  id: string; month: string; typology: ReturnType<typeof canonicalTypology>;
  standard: ReturnType<typeof canonicalStandard>; status: string | null; kind: string;
  quantity: number | null; stock: number | null; sold: number | null;
  ticket: number | null; area: number | null;
}
const text = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export const sumObserved = (values: (number | null)[]): number | null => {
  const observed = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return observed.length ? observed.reduce((a, b) => a + b, 0) : null;
};
export function marketObservations(rows: HistoryRow[]): MarketObservation[] {
  return rows.map((r) => ({ id: String(r.typology_id), month: String(r.period).slice(0, 7),
    typology: canonicalTypology(r.number_bedroom ?? r.typology ?? r.bedrooms),
    standard: canonicalStandard(r.pattern ?? r.standard), status: r.building_status == null ? null : text(r.building_status),
    kind: text(r.type_of_typology), quantity: historyNumber(r.qty), stock: historyNumber(r.typology_stock ?? r.stock),
    sold: historyNumber(r.sold_in_period ?? r.liquid_sales ?? r.sales),
    ticket: historyNumber(r.price ?? r.average_price), area: historyNumber(r.private_area ?? r.area),
  }));
}
export function plantSnapshot(rows: MarketObservation[], month: string): MarketObservation[] {
  const ids = new Map<string, MarketObservation>();
  for (const row of rows) if (row.month <= month && (!ids.has(row.id) || ids.get(row.id)!.month < row.month)) ids.set(row.id, row);
  return [...ids.values()];
}
export function periodSales(rows: MarketObservation[], quarter: Quarter): number | null {
  const end = quarterEndMonth(quarter), start = `${end.slice(0, 4)}-${String(Number(end.slice(5)) - 2).padStart(2, '0')}`;
  return sumObserved(rows.filter((r) => r.month >= start && r.month <= end && r.status !== 'futuro').map((r) => r.sold));
}
export const isActivePlant = (r: MarketObservation) => r.status === 'ativo' || r.status === 'em comercializacao';
export const pricePlant = (r: MarketObservation) => r.status !== 'futuro' && r.kind === 'padrao' && r.stock !== null && r.stock > 0;
const snapshots = new WeakMap<CubeProject, Map<string, MarketObservation[]>>();
export function closingPlants(p: CubeProject, quarter?: Quarter) {
  const month = quarter ? quarterEndMonth(quarter) : p.historyAudit?.requestedMonth ?? '';
  let cache = snapshots.get(p);
  if (!cache) { cache = new Map(); snapshots.set(p, cache); }
  if (!cache.has(month)) cache.set(month, plantSnapshot(p.marketObservations ?? [], month));
  return cache.get(month)!;
}
export function priceContributions(projects: CubeProject[], accept: (r: MarketObservation) => boolean = () => true, quarter?: Quarter) {
  const selected = projects.flatMap((p) => closingPlants(p, quarter).filter((r) => pricePlant(r) && accept(r)).map((r) => ({ ...r, projectKey: p.key })));
  const tickets = selected.filter((r) => r.quantity !== null && r.quantity > 0 && r.ticket !== null);
  const areas = selected.filter((r) => r.quantity !== null && r.quantity > 0 && r.area !== null && r.area > 0);
  const meters = tickets.filter((r) => r.area !== null && r.area > 0);
  const q = (rows: MarketObservation[]) => rows.reduce((s, r) => s + r.quantity!, 0);
  const value = (rows: MarketObservation[]) => rows.reduce((s, r) => s + r.quantity! * r.ticket!, 0);
  const area = (rows: MarketObservation[]) => rows.reduce((s, r) => s + r.quantity! * r.area!, 0);
  return { projects: new Set(selected.map((r) => r.projectKey)).size,
    averageTicket: q(tickets) > 0 ? value(tickets) / q(tickets) : null,
    averageArea: q(areas) > 0 ? area(areas) / q(areas) : null,
    averagePricePerMeter: area(meters) > 0 ? value(meters) / area(meters) : null,
  };
}
/** A separate market view; historical release capacity and original launch facts stay untouched. */
export function activeMarketCube(cube: MarketCube): MarketCube {
  if (cube.entity !== 'fiergs-rs' || !cube.projects.some((p) => p.marketObservations)) return cube;
  return { ...cube, projects: cube.projects.flatMap((p) => {
    if (!p.marketObservations) return [p];
    const rows = closingPlants(p, cube.endQuarter), active = rows.filter(isActivePlant);
    const quantity = (items: MarketObservation[]) => items.some((r) => r.status === null) ? null : sumObserved(items.map((r) => isActivePlant(r) ? r.quantity : 0));
    return [{ ...p, marketActive: active.length > 0, launchedUnits: quantity(rows), typologies: p.typologies.map((t) => ({ ...t,
      launchedUnits: quantity(rows.filter((r) => r.typology === t.typology)),
    })) }];
  }) };
}
export function previousQuarter(quarter: Quarter): Quarter {
  const index = quarterIndex(quarter) - 1;
  return `${index % 4 + 1}T${Math.floor(index / 4)}` as Quarter;
}
