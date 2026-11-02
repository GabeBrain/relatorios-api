import type { SpPreview } from './model';

export interface SpLaunchNeighborhoods {
  status: 'ready' | 'blocked'; issues: string[];
  rows: { neighborhood: string; units: number; share: number | null }[];
  cityTotal: number | null; topTotal: number | null; topShare: number | null;
}
const blocked = (message: string): SpLaunchNeighborhoods => ({ status: 'blocked', issues: [message], rows: [], cityTotal: null, topTotal: null, topShare: null });
/** Called only after complete ID/scope/date validation of the register. No additional collection. */
export function buildSpLaunchNeighborhoods(buildings: Record<string, unknown>[], report: SpPreview): SpLaunchNeighborhoods {
  const months = new Set(report.monthly?.map(row => row.month));
  if (!months.size || report.metrics.launches === null) return blocked('Confira os meses e lançamentos municipais antes dos bairros.');
  const groups = new Map<string, { neighborhood: string; units: number }>();
  for (const building of buildings) {
    if (!months.has(String(building.release_date).slice(0, 7))) continue;
    const raw = building.total_units;
    const units = typeof raw === 'number' || typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
    const neighborhood = String(building.neighborhood ?? '').trim().replace(/\s+/g, ' ');
    if (!Number.isSafeInteger(units) || units < 0 || !neighborhood) return blocked('Há lançamento sem bairro ou quantidade válida. O ranking não usa somente os registros preenchidos.');
    const key = neighborhood.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const group = groups.get(key) ?? { neighborhood, units: 0 };
    group.units += units; groups.set(key, group);
  }
  const cityTotal = [...groups.values()].reduce((sum, row) => sum + row.units, 0);
  if (!Number.isSafeInteger(cityTotal) || cityTotal !== report.metrics.launches) return blocked(`As unidades do cadastro (${cityTotal.toLocaleString('pt-BR')}) não coincidem com os lançamentos municipais (${report.metrics.launches.toLocaleString('pt-BR')}). O ranking aguarda reconciliação.`);
  const rows = [...groups.values()].sort((a, b) => b.units - a.units || a.neighborhood.localeCompare(b.neighborhood, 'pt-BR')).slice(0, 10).map(row => ({ ...row, share: cityTotal > 0 ? row.units / cityTotal * 100 : null }));
  const topTotal = rows.reduce((sum, row) => sum + row.units, 0);
  return { status: 'ready', issues: [], rows, cityTotal, topTotal, topShare: cityTotal > 0 ? topTotal / cityTotal * 100 : null };
}
