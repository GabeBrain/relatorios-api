import { httpRequest } from '@/lib/http-client';
import { periodToQuarter, safeNumber } from './lib/launches';
import type { CalibrationCell, LaunchRecord, PanoramaReference, PanoramaScope, Quarter, Segment } from './types';

const BASE_URL = 'https://geobrain.com.br/public-api';
const PER_PAGE = 100;

function segmentOf(value: unknown): Segment | null {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('vertical')) return 'Vertical';
  if (raw.includes('horizontal') || raw.includes('casa')) return 'Horizontal';
  return null;
}
function standardOf(value: unknown): string { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

/**
 * The endpoint returns one row per typology history. This adapter consolidates it
 * per building/quarter before it reaches the contracts: one empreendimento, with
 * units and VGV summed across its typologies.
 */
export async function fetchLaunchRecords(scope: PanoramaScope, signal?: AbortSignal): Promise<LaunchRecord[]> {
  const records: LaunchRecord[] = [];
  for (const type of ['Vertical', 'Horizontal']) {
    let page = 1; let lastPage = 1;
    do {
      const response = await httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/building-with-history`, query: { type, city: scope.city, uf: scope.uf, status: 'Ativo', per_page: PER_PAGE, page }, signal });
      if (!response.ok || !response.data) throw new Error(response.error ?? `Falha da API GeoBrain (${response.status ?? 'rede'}).`);
      const payload = response.data; const data = Array.isArray(payload.data) ? payload.data as Record<string, unknown>[] : [];
      lastPage = Number((payload.meta as Record<string, unknown> | undefined)?.last_page ?? 1);
      for (const building of data) {
        const segment = segmentOf(building.type ?? type); if (!segment) continue;
        const buildingUnits = safeNumber(building.total_units ?? building.qty ?? building.total_stock) ?? 0;
        const history = Array.isArray(building.typologies_history) ? building.typologies_history as Record<string, unknown>[] : [];
        const byQuarter = new Map<string, LaunchRecord>();
        for (const entry of history) {
          const quarter = periodToQuarter(entry.period); if (!quarter) continue;
          const units = safeNumber(entry.qty ?? entry.total_units ?? buildingUnits) ?? buildingUnits;
          const price = safeNumber(entry.release_price ?? entry.price);
          const standard = standardOf(entry.pattern ?? building.standard);
          const economic = standard.includes('econom');
          const key = `${segment}:${quarter}`;
          const current = byQuarter.get(key);
          const vgvMillions = price === null ? null : units * price / 1_000_000;
          if (!current) {
            byQuarter.set(key, { quarter, segment, projects: 1, units, vgvMillions, economicProjects: economic ? 1 : 0, otherProjects: economic ? 0 : 1, economicUnits: economic ? units : 0, otherUnits: economic ? 0 : units, economicVgvMillions: economic && vgvMillions !== null ? vgvMillions : 0, otherVgvMillions: !economic && vgvMillions !== null ? vgvMillions : 0 });
            continue;
          }
          current.units += units;
          current.vgvMillions = current.vgvMillions === null || vgvMillions === null ? null : current.vgvMillions + vgvMillions;
          current.economicUnits = (current.economicUnits ?? 0) + (economic ? units : 0);
          current.otherUnits = (current.otherUnits ?? 0) + (economic ? 0 : units);
          current.economicVgvMillions = (current.economicVgvMillions ?? 0) + (economic && vgvMillions !== null ? vgvMillions : 0);
          current.otherVgvMillions = (current.otherVgvMillions ?? 0) + (!economic && vgvMillions !== null ? vgvMillions : 0);
        }
        records.push(...byQuarter.values());
      }
      page += 1;
    } while (page <= lastPage);
  }
  return records;
}

function releaseQuarter(value: unknown): Quarter | null { return periodToQuarter(value); }
function rawSegment(value: unknown): Segment | null { return segmentOf(value); }
function expected(reference: PanoramaReference, metric: 'projects' | 'units', quarter: Quarter, segment: 'vertical' | 'horizontal' | 'total') {
  return reference.model[metric].find((row) => row.quarter === quarter)?.[segment] ?? 0;
}
function cells(method: string, metric: CalibrationCell['metric'], source: string, reference: PanoramaReference, values: Map<string, number>): CalibrationCell[] {
  const rows: CalibrationCell[] = [];
  for (const quarter of reference.model.quarters) for (const segment of ['vertical', 'horizontal', 'total'] as const) {
    const actual = values.get(`${quarter}:${segment}`) ?? null; const exp = expected(reference, metric === 'Empreendimentos' ? 'projects' : 'units', quarter, segment);
    rows.push({ method, metric, source, quarter, segment, expected: exp, actual, difference: actual === null ? null : actual - exp, status: actual === null ? 'missing_api' : actual === exp ? 'match' : 'different' });
  }
  return rows;
}
function add(map: Map<string, number>, quarter: Quarter, segment: Segment, value: number) { for (const key of [segment.toLowerCase(), 'total']) { const id = `${quarter}:${key}`; map.set(id, (map.get(id) ?? 0) + value); } }

/** Explicit calibration suite. It never changes the report contracts. */
export async function fetchLaunchCalibration(scope: PanoramaScope, reference: PanoramaReference, signal?: AbortSignal): Promise<CalibrationCell[]> {
  const raw: Record<string, unknown>[] = [];
  for (const type of ['Vertical', 'Horizontal']) {
    let page = 1; let lastPage = 1;
    do {
      const response = await httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/building-with-history`, query: { type, city: scope.city, uf: scope.uf, per_page: PER_PAGE, page }, signal });
      if (!response.ok || !response.data) throw new Error(response.error ?? `Falha na calibração granular (${response.status ?? 'rede'}).`);
      raw.push(...(Array.isArray(response.data.data) ? response.data.data as Record<string, unknown>[] : []));
      lastPage = Number((response.data.meta as Record<string, unknown> | undefined)?.last_page ?? 1); page += 1;
    } while (page <= lastPage);
  }
  const projectValues = new Map<string, number>(); const unitTotalValues = new Map<string, number>(); const unitHistoryValues = new Map<string, number>();
  const seen = new Set<string>();
  for (const building of raw) {
    const quarter = releaseQuarter(building.release_date); const segment = rawSegment(building.building_type ?? building.type); const id = String(building.building_id ?? building.id ?? '');
    if (!quarter || !segment || !id || quarter > scope.endQuarter || seen.has(`${id}:${segment}`)) continue;
    seen.add(`${id}:${segment}`); add(projectValues, quarter, segment, 1); add(unitTotalValues, quarter, segment, safeNumber(building.total_units ?? building.qty) ?? 0);
    const releaseMonth = String(building.release_date).slice(0, 7);
    const qty = (Array.isArray(building.typologies_history) ? building.typologies_history as Record<string, unknown>[] : []).filter((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth).reduce((sum, entry) => sum + (safeNumber(entry.qty) ?? 0), 0);
    add(unitHistoryValues, quarter, segment, qty);
  }
  const temporalValues = new Map<string, number>();
  const response = await httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/temporal-analysis-city/releases`, query: { city: scope.city, uf: scope.uf, start_period: '2022-01-01', end_period: `${scope.endQuarter.slice(2)}-${String(Number(scope.endQuarter[0]) * 3).padStart(2, '0')}-31`, per_page: 500, group_by: 'Padrão' }, signal });
  if (response.ok && response.data) for (const row of (Array.isArray(response.data.data) ? response.data.data as Record<string, unknown>[] : [])) { const quarter = periodToQuarter(row.period); const segment = rawSegment(row.building_type); if (quarter && segment) add(temporalValues, quarter, segment, safeNumber(row.releases_in_period) ?? 0); }
  return [
    ...cells('A · release_date + building_id distinto', 'Empreendimentos', 'building-with-history · sem status', reference, projectValues),
    ...cells('B · release_date + total_units', 'Unidades lançadas', 'building-with-history · total_units', reference, unitTotalValues),
    ...cells('C · release_date + qty no mês', 'Unidades lançadas', 'building-with-history · typologies_history', reference, unitHistoryValues),
    ...cells('D · endpoint releases', 'Unidades lançadas', 'temporal-analysis-city/releases', reference, temporalValues),
  ];
}
