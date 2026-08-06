import type { Building, Typology, HistoryEntry, Incorporator, BuildingArea } from './types';

const BASE_URL = 'https://api.geobrain.com.br/public-api/v2';
const ALL_TYPES = ['Vertical', 'Horizontal', 'Comercial', 'Hotel'];
const ALL_STATUSES = ['Ativo', 'Esgotado'];
const PER_PAGE = 100;

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}
function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}
function toStr(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}
function parseDate(s: string): Date {
  const t = String(s ?? '').slice(0, 10);
  const d = new Date(t);
  return isNaN(d.getTime()) ? new Date(0) : d;
}
function parseGarage(v: unknown): number {
  const s = String(v ?? '').trim();
  if (!s) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}
/** Remove acentuação — o bairro sem acentos é o valor canônico em filtros e gráficos. */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function normalizeBuilding(raw: Record<string, unknown>): Building {
  const typHistRaw = (raw.typologies_history as unknown[]) ?? [];
  // group history entries by typology_id
  const byTyp = new Map<string, Record<string, unknown>[]>();
  for (const h of typHistRaw) {
    const hh = h as Record<string, unknown>;
    const tid = String(hh.typology_id ?? '');
    if (!tid) continue;
    if (!byTyp.has(tid)) byTyp.set(tid, []);
    byTyp.get(tid)!.push(hh);
  }
  const buildingStandard = toStr(raw.standard).trim();
  const typologies: Typology[] = [];
  byTyp.forEach((entries, tid) => {
    entries.sort((a, b) => parseDate(String(a.period)).getTime() - parseDate(String(b.period)).getTime());
    const first = entries[0];
    const last = entries[entries.length - 1];
    const history: HistoryEntry[] = entries.map((e) => ({
      period: String(e.period ?? ''),
      periodDate: parseDate(String(e.period)),
      price: toNumOrNull(e.price),
      price_private_area: toNumOrNull(e.price_private_area),
      typology_stock: toNum(e.typology_stock),
      sold_in_period: toNum(e.sold_in_period),
      vgv_stock: toNumOrNull(e.vgv_stock),
      // ---- v2 ----
      pattern: toStr(e.pattern).trim() || buildingStandard,
      building_status: toStr(e.building_status).trim(),
      time_on_sale: toNumOrNull(e.time_on_sale),
      private_area: toNumOrNull(e.private_area),
      public_area: toNumOrNull(e.public_area),
      price_public_area: toNumOrNull(e.price_public_area),
      release_price: toNumOrNull(e.release_price),
      vgv_total: toNumOrNull(e.vgv_total),
      sold: toNum(e.sold),
      number_bedroom: toNum(e.number_bedroom),
      number_suite: toNum(e.number_suite),
      garage: parseGarage(e.garage),
      qty: toNum(e.qty),
      estagio_empreendimento: toStr(e.estagio_empreendimento).trim(),
      taxa_associativa: toNumOrNull(e.taxa_associativa),
    }));
    // valor representativo da tipologia = registro mais recente com dado preenchido
    const pick = <T,>(get: (e: Record<string, unknown>) => T, isEmpty: (v: T) => boolean): T => {
      for (let i = entries.length - 1; i >= 0; i--) {
        const v = get(entries[i]);
        if (!isEmpty(v)) return v;
      }
      return get(last ?? first);
    };
    typologies.push({
      typology_id: tid,
      type_of_typology: pick((e) => toStr(e.type_of_typology).trim(), (v) => v === ''),
      number_bedroom: pick((e) => toNum(e.number_bedroom), (v) => v === 0),
      garage: pick((e) => parseGarage(e.garage), (v) => v === 0),
      qty: pick((e) => toNum(e.qty), (v) => v === 0),
      private_area: pick((e) => toNumOrNull(e.private_area), (v) => v == null || v <= 0),
      release_price: pick((e) => toNumOrNull(e.release_price), (v) => v == null || v <= 0),
      history,
    });
  });

  const releaseDate = String(raw.release_date ?? '');
  const yearMatch = releaseDate.match(/(\d{4})/);
  const incorporators: Incorporator[] = ((raw.incorporators as unknown[]) ?? []).map((i) => {
    const ii = (i ?? {}) as Record<string, unknown>;
    return { id: toStr(ii.id), name: toStr(ii.name) };
  });
  const areas: BuildingArea[] = ((raw.areas as unknown[]) ?? []).map((a) => {
    const aa = (a ?? {}) as Record<string, unknown>;
    return { area: toStr(aa.area), type: toStr(aa.type) };
  });

  return {
    building_id: String(raw.building_id ?? ''),
    name: String(raw.name ?? ''),
    status: String(raw.status ?? ''),
    city: String(raw.city ?? ''),
    state: String(raw.state ?? ''),
    neighborhood: stripAccents(String(raw.neighborhood ?? '')),
    building_type: String(raw.building_type ?? ''),
    standard: buildingStandard,
    release_date: releaseDate,
    releaseYear: yearMatch ? parseInt(yearMatch[1], 10) : null,
    typologies,
    // ---- v2 ----
    delivery_date: toStr(raw.delivery_date),
    zipcode: toStr(raw.zipcode),
    address: toStr(raw.address),
    address_number: toStr(raw.address_number),
    city_id: toStr(raw.city_id),
    latitude: toNumOrNull(raw.latitude),
    longitude: toNumOrNull(raw.longitude),
    towers: toNumOrNull(raw.towers),
    floors: toNumOrNull(raw.floors),
    elevators: toNumOrNull(raw.elevators),
    period: toStr(raw.period),
    time_on_sale: toNumOrNull(raw.time_on_sale),
    total_stock: toNumOrNull(raw.total_stock),
    total_units: toNumOrNull(raw.total_units),
    builder_name: toStr(raw.builder_name),
    bathrooms: toNumOrNull(raw.bathrooms),
    has_suites: toStr(raw.has_suites),
    last_update: toStr(raw.last_update),
    interest_rate_index: toStr(raw.interest_rate_index),
    interest_rate_tax: toNumOrNull(raw.interest_rate_tax),
    bank_financing: toStr(raw.bank_financing),
    own_financing: toStr(raw.own_financing),
    fiduciary_ownership: toStr(raw.fiduciary_ownership),
    down_payment_percentage: toNumOrNull(raw.down_payment_percentage),
    discount_percentage: toNumOrNull(raw.discount_percentage),
    number_of_installments: toNumOrNull(raw.number_of_installments),
    incorporators,
    areas,
  };
}

async function apiGet(path: string, params: Record<string, unknown>, token: string, signal: AbortSignal) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') qs.set(k, String(v));
  }
  const url = `${BASE_URL}${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  return res.json();
}


export interface FetchProgress {
  lanesTotal: number;
  lanesDone: number;
  pagesDone: number;
  buildingsFound: number;
}

export interface FetchOptions {
  uf: string;
  city?: string;
  token: string;
  signal: AbortSignal;
  onProgress?: (p: FetchProgress) => void;
}

export async function fetchBuildings({ uf, city, token, signal, onProgress }: FetchOptions): Promise<Building[]> {
  if (!uf) throw new Error('UF é obrigatório');

  const pairs = ALL_TYPES.flatMap((t) => ALL_STATUSES.map((s) => ({ type: t, status: s })));
  const progress: FetchProgress = { lanesTotal: pairs.length, lanesDone: 0, pagesDone: 0, buildingsFound: 0 };
  const seen = new Map<string, Building>();

  await Promise.all(
    pairs.map(async ({ type, status }) => {
      let page = 1;
      while (true) {
        if (signal.aborted) return;
        try {
          const data = await apiGet(
            '/building-with-history',
            { uf, city: city || undefined, type, status, per_page: PER_PAGE, page },
            token,
            signal,
          );
          const items = (data?.data as unknown[]) ?? [];
          const lastPage = data?.meta?.last_page ?? 1;
          for (const it of items) {
            const b = normalizeBuilding(it as Record<string, unknown>);
            if (b.building_id && !seen.has(b.building_id)) {
              seen.set(b.building_id, b);
              progress.buildingsFound++;
            }
          }
          progress.pagesDone++;
          onProgress?.({ ...progress });
          if (page >= lastPage) break;
          page++;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          // swallow individual lane failures — some type/status combos return 4xx
          break;
        }
      }
      progress.lanesDone++;
      onProgress?.({ ...progress });
    }),
  );

  return Array.from(seen.values());
}
