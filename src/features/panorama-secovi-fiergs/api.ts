import { httpRequest } from '@/lib/http-client';
import { periodToQuarter, safeNumber } from './lib/launches';
import type { LaunchRecord, PanoramaScope, Segment } from './types';

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
