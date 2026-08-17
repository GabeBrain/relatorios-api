import { httpRequest } from '@/lib/http-client';
import { periodToQuarter, quarterKey, safeNumber } from './lib/launches';
import type { CalibrationCell, LaunchAuditBuilding, LaunchRecord, MarketCalibrationCell, PanoramaReference, PanoramaReportModel, PanoramaScope, Quarter, Segment } from './types';
import { buildPanoramaReportModel } from './report/model';
import { aggregateTemporal, buildMarketCells } from './lib/market-calibration';
import { PIRACICABA_1T26_MARKET_REFERENCE } from './reference/piracicaba-1t26-market';

const BASE_URL = 'https://geobrain.com.br/public-api';
const PER_PAGE = 100;

function segmentOf(value: unknown): Segment | null {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('vertical')) return 'Vertical';
  if (raw.includes('horizontal') || raw.includes('casa')) return 'Horizontal';
  return null;
}
function standardOf(value: unknown): string { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

/** Promoted launch contract: a release is one building on its release_date, never every history snapshot. */
export async function fetchLaunchRecords(scope: PanoramaScope, signal?: AbortSignal): Promise<LaunchRecord[]> {
  const records: LaunchRecord[] = [];
  for (const type of ['Vertical', 'Horizontal']) {
    let page = 1; let lastPage = 1;
    do {
      const response = await httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/building-with-history`, query: { type, city: scope.city, uf: scope.uf, per_page: PER_PAGE, page }, signal });
      if (!response.ok || !response.data) throw new Error(response.error ?? `Falha da API GeoBrain (${response.status ?? 'rede'}).`);
      const payload = response.data; const data = Array.isArray(payload.data) ? payload.data as Record<string, unknown>[] : [];
      lastPage = Number((payload.meta as Record<string, unknown> | undefined)?.last_page ?? 1);
      for (const building of data) {
        const segment = segmentOf(building.building_type ?? building.type ?? type); const quarter = periodToQuarter(building.release_date); if (!segment || !quarter || quarterKey(quarter) > quarterKey(scope.endQuarter)) continue;
        const buildingUnits = safeNumber(building.total_units ?? building.qty) ?? 0;
        const history = Array.isArray(building.typologies_history) ? building.typologies_history as Record<string, unknown>[] : [];
        const releaseMonth = String(building.release_date).slice(0, 7);
        const vgvMillions = history.filter((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth).reduce<number | null>((sum, entry) => {
          const qty = safeNumber(entry.qty); const price = safeNumber(entry.release_price ?? entry.price);
          return sum === null || qty === null || price === null ? null : sum + qty * price / 1_000_000;
        }, 0);
        const standard = standardOf(building.standard ?? history.find((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth)?.pattern);
        const economic = standard.includes('econom');
        records.push({ quarter, segment, projects: 1, units: buildingUnits, vgvMillions, economicProjects: economic ? 1 : 0, otherProjects: economic ? 0 : 1, economicUnits: economic ? buildingUnits : 0, otherUnits: economic ? 0 : buildingUnits, economicVgvMillions: economic ? vgvMillions : 0, otherVgvMillions: economic ? 0 : vgvMillions });
      }
      page += 1;
    } while (page <= lastPage);
  }
  return records;
}

/** Uma coleta de lançamentos por recorte alimenta todas as páginas do PDF. */
export async function fetchPanoramaReportModel(scope: PanoramaScope, signal?: AbortSignal): Promise<PanoramaReportModel> {
  return buildPanoramaReportModel(scope, await fetchLaunchRecords(scope, signal));
}

function releaseQuarter(value: unknown): Quarter | null { return periodToQuarter(value); }
function rawSegment(value: unknown): Segment | null { return segmentOf(value); }
function expected(reference: PanoramaReference, metric: 'projects' | 'units', quarter: Quarter, segment: 'vertical' | 'horizontal' | 'total') {
  return reference.model[metric].find((row) => row.quarter === quarter)?.[segment] ?? 0;
}
function cells(method: string, metric: CalibrationCell['metric'], source: string, reference: PanoramaReference, values: Map<string, number>, complete: boolean): CalibrationCell[] {
  const rows: CalibrationCell[] = [];
  for (const quarter of reference.model.quarters) for (const segment of ['vertical', 'horizontal', 'total'] as const) {
    const actual = complete ? (values.get(`${quarter}:${segment}`) ?? 0) : null; const exp = expected(reference, metric === 'Empreendimentos' ? 'projects' : 'units', quarter, segment);
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
    if (!quarter || !segment || !id || quarterKey(quarter) > quarterKey(scope.endQuarter) || seen.has(`${id}:${segment}`)) continue;
    seen.add(`${id}:${segment}`); add(projectValues, quarter, segment, 1); add(unitTotalValues, quarter, segment, safeNumber(building.total_units ?? building.qty) ?? 0);
    const releaseMonth = String(building.release_date).slice(0, 7);
    const qty = (Array.isArray(building.typologies_history) ? building.typologies_history as Record<string, unknown>[] : []).filter((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth).reduce((sum, entry) => sum + (safeNumber(entry.qty) ?? 0), 0);
    add(unitHistoryValues, quarter, segment, qty);
  }
  const temporalValues = new Map<string, number>();
  const response = await httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/temporal-analysis-city/releases`, query: { city: scope.city, uf: scope.uf, start_period: '2022-01-01', end_period: `${scope.endQuarter.slice(2)}-${String(Number(scope.endQuarter[0]) * 3).padStart(2, '0')}-31`, per_page: 100, group_by: 'Padrão', 'type[]': ['Vertical', 'Horizontal'] }, signal });
  if (response.ok && response.data) for (const row of (Array.isArray(response.data.data) ? response.data.data as Record<string, unknown>[] : [])) { const quarter = periodToQuarter(row.period); const segment = rawSegment(row.building_type); if (quarter && segment) add(temporalValues, quarter, segment, safeNumber(row.releases_in_period) ?? 0); }
  return [
    ...cells('A · release_date + building_id distinto', 'Empreendimentos', 'building-with-history · sem status', reference, projectValues, true),
    ...cells('B · release_date + total_units', 'Unidades lançadas', 'building-with-history · total_units', reference, unitTotalValues, true),
    ...cells('C · release_date + qty no mês', 'Unidades lançadas', 'building-with-history · typologies_history', reference, unitHistoryValues, true),
    ...cells('D · endpoint releases', 'Unidades lançadas', response.ok ? 'temporal-analysis-city/releases' : `temporal-analysis-city/releases · HTTP ${response.status ?? 'rede'}`, reference, temporalValues, response.ok && response.data !== null),
  ];
}

async function temporalRows(scope: PanoramaScope, endpoint: 'sales' | 'stock' | 'ivv', signal?: AbortSignal): Promise<{ rows: Record<string, unknown>[]; available: boolean; source: string }> {
  const rows: Record<string, unknown>[] = []; let page = 1; let lastPage = 1;
  do {
    // IVV is a rate, not an additive category. Omitting group_by asks the API for the segment total;
    // sales and stock remain grouped for their additive aggregation.
    const response = await httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/temporal-analysis-city/${endpoint}`, query: { city: scope.city, uf: scope.uf, start_period: '2022-01-01', end_period: `${scope.endQuarter.slice(2)}-${String(Number(scope.endQuarter[0]) * 3).padStart(2, '0')}-31`, per_page: PER_PAGE, page, ...(endpoint === 'ivv' ? {} : { group_by: 'Padrão' }), 'type[]': ['Vertical', 'Horizontal'] }, signal });
    if (!response.ok || !response.data) return { rows: [], available: false, source: `temporal-analysis-city/${endpoint} · HTTP ${response.status ?? 'rede'}` };
    rows.push(...(Array.isArray(response.data.data) ? response.data.data as Record<string, unknown>[] : []));
    lastPage = Number((response.data.meta as Record<string, unknown> | undefined)?.last_page ?? 1); page += 1;
  } while (page <= lastPage);
  return { rows, available: true, source: `temporal-analysis-city/${endpoint}` };
}

/** Initial T3/T4 bench: direct temporal endpoints only; it cannot silently promote a report contract. */
export async function fetchMarketCalibration(scope: PanoramaScope, signal?: AbortSignal): Promise<MarketCalibrationCell[]> {
  const reference = PIRACICABA_1T26_MARKET_REFERENCE;
  const [sales, stock, ivv] = await Promise.all([temporalRows(scope, 'sales', signal), temporalRows(scope, 'stock', signal), temporalRows(scope, 'ivv', signal)]);
  const stockPeriod = [scope.endQuarter];
  return [
    ...buildMarketCells('Vendas', 'A · endpoint sales', 'Unidades vendidas', sales.source, reference, aggregateTemporal(sales.rows, 'liquid_sales'), sales.available),
    ...buildMarketCells('Vendas', 'A · endpoint sales', 'VGV vendido (R$ mi)', sales.source, reference, aggregateTemporal(sales.rows.map((row) => ({ ...row, vgv_liquid_sales: Number(row.vgv_liquid_sales ?? 0) / 1_000_000 })), 'vgv_liquid_sales'), sales.available),
    ...buildMarketCells('Estoque', 'A · endpoint stock', 'Estoque final', stock.source, reference, aggregateTemporal(stock.rows, 'stock'), stock.available, stockPeriod),
    ...buildMarketCells('Estoque', 'A · endpoint stock', 'VGV estoque (R$ mi)', stock.source, reference, aggregateTemporal(stock.rows.map((row) => ({ ...row, vgv_stock: Number(row.vgv_stock ?? 0) / 1_000_000 })), 'vgv_stock'), stock.available, stockPeriod),
    ...buildMarketCells('IVV', 'A · endpoint ivv', 'IVV', ivv.source, reference, aggregateTemporal(ivv.rows, 'ivv'), ivv.available, stockPeriod),
  ];
}

/** Raw, audited universe used only by analyst curation; it never changes contracts by itself. */
export async function fetchLaunchAuditBuildings(scope: PanoramaScope, signal?: AbortSignal): Promise<LaunchAuditBuilding[]> {
  const raw: Record<string, unknown>[] = [];
  for (const type of ['Vertical', 'Horizontal']) {
    let page = 1; let lastPage = 1;
    do {
      const response = await httpRequest<Record<string, unknown>>({ url: `${BASE_URL}/building-with-history`, query: { type, city: scope.city, uf: scope.uf, per_page: PER_PAGE, page }, signal });
      if (!response.ok || !response.data) throw new Error(response.error ?? `Falha ao carregar universo (${response.status ?? 'rede'}).`);
      raw.push(...(Array.isArray(response.data.data) ? response.data.data as Record<string, unknown>[] : []));
      lastPage = Number((response.data.meta as Record<string, unknown> | undefined)?.last_page ?? 1); page += 1;
    } while (page <= lastPage);
  }
  const seen = new Set<string>(); const rows: LaunchAuditBuilding[] = [];
  for (const building of raw) {
    const quarter = releaseQuarter(building.release_date); const segment = rawSegment(building.building_type ?? building.type); const buildingId = String(building.building_id ?? building.id ?? '');
    if (!quarter || !segment || !buildingId || quarterKey(quarter) > quarterKey(scope.endQuarter) || seen.has(buildingId)) continue;
    seen.add(buildingId); const releaseMonth = String(building.release_date).slice(0, 7);
    const releaseMonthQty = (Array.isArray(building.typologies_history) ? building.typologies_history as Record<string, unknown>[] : []).filter((entry) => String(entry.period ?? '').slice(0, 7) === releaseMonth).reduce((sum, entry) => sum + (safeNumber(entry.qty) ?? 0), 0);
    rows.push({ buildingId, name: String(building.name ?? 'Sem nome'), segment, releaseQuarter: quarter, totalUnits: safeNumber(building.total_units ?? building.qty) ?? 0, releaseMonthQty });
  }
  return rows.sort((a, b) => quarterKey(a.releaseQuarter) - quarterKey(b.releaseQuarter) || a.name.localeCompare(b.name));
}
