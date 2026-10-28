import { buildingId } from '../source';
import { monthIndex } from '../expanded/contract';
import { predictCase } from '../scientific/study';
import { prepareReferenceModels } from '../expanded/referenceModels';
import { buildingSpec, cleanReason, observations, type AnalysisSpec, type Universe } from './domain';

export type TilePoint = { offset: number; percent: number | null };
export type CurveTile = { id: string; cutoff: string; finotti: boolean; reason: string; sales: number | null; stock: number | null; finalStock: number | null; history: TilePoint[]; forecast: TilePoint[] };
/** Preview only: uses the original prediction engine; no retrospective trials or fitting. */
export async function buildTiles(dataset: Universe, ids: string[], requested: AnalysisSpec): Promise<CurveTile[]> {
  await prepareReferenceModels();
  const index = new Map(dataset.buildings.map(b => [buildingId(b), b]));
  return ids.map(id => {
    const b = index.get(id);
    if (!b) throw new Error('Empreendimento ausente do panorama.');
    const spec = buildingSpec(dataset, id, requested);
    const c = predictCase(b, spec.cutoff, [spec.duration], ['finotti-reference']);
    const model = c.methods['finotti-reference'];
    const row = c.inventory;
    const finalStock = model.forecast?.points.at(-1)?.stock ?? null;
    const units = row.units;
    const history = observations(b).filter(o => o.month <= spec.cutoff && monthIndex(o.month) >= monthIndex(spec.cutoff) - 36).map(o => ({ offset: monthIndex(o.month) - monthIndex(spec.cutoff), percent: o.stock !== null && o.units ? 100 * (o.units - o.stock) / o.units : null }));
    const forecast: TilePoint[] = model.forecast && units ? [{ offset: 0, percent: row.sold === null ? null : 100 * row.sold / units }, ...model.forecast.points.map(p => ({ offset: p.offset, percent: p.predicted === null ? null : 100 * p.predicted / units }))] : [];
    return { id, cutoff: spec.cutoff, finotti: !!model.forecast, reason: cleanReason(model.reason), sales: row.stock !== null && finalStock !== null ? row.stock - finalStock : null, stock: row.stock, finalStock, history, forecast };
  });
}
/** Missing months break a path: gaps never become invented observations. */
export function tilePath(points: TilePoint[], start: number, end: number) {
  let path = '', previous: number | null = null;
  for (const p of points) {
    if (p.percent === null || !Number.isFinite(p.percent)) { previous = null; continue; }
    const x = 4 + 192 * (p.offset - start) / Math.max(1, end - start), y = 58 - 52 * Math.max(0, Math.min(100, p.percent)) / 100;
    path += `${previous !== null && p.offset - previous === 1 ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)} `;
    previous = p.offset;
  }
  return path;
}
export function orderTiles<T extends { id: string; name: string }>(rows: T[], tiles: Record<string, CurveTile>, sort: 'name' | 'sales') {
  return [...rows].sort((a, b) => (sort === 'sales' ? (tiles[b.id]?.sales ?? -Infinity) - (tiles[a.id]?.sales ?? -Infinity) : 0) || a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
}
