import type { Building, Typology, HistoryEntry } from './types';

const BASE_URL = 'https://geobrain.com.br/public-api';
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
  const typologies: Typology[] = [];
  byTyp.forEach((entries, tid) => {
    entries.sort((a, b) => parseDate(String(a.period)).getTime() - parseDate(String(b.period)).getTime());
    const first = entries[0];
    const history: HistoryEntry[] = entries.map((e) => ({
      period: String(e.period ?? ''),
      periodDate: parseDate(String(e.period)),
      price: toNumOrNull(e.price),
      price_private_area: toNumOrNull(e.price_private_area),
      typology_stock: toNum(e.typology_stock),
      sold_in_period: toNum(e.sold_in_period),
      vgv_stock: toNumOrNull(e.vgv_stock),
    }));
    typologies.push({
      typology_id: tid,
      type_of_typology: String(first.type_of_typology ?? ''),
      number_bedroom: toNum(first.number_bedroom),
      garage: parseGarage(first.garage),
      qty: toNum(first.qty),
      private_area: toNumOrNull(first.private_area),
      release_price: toNumOrNull(first.release_price),
      history,
    });
  });

  const releaseDate = String(raw.release_date ?? '');
  const yearMatch = releaseDate.match(/(\d{4})/);
  return {
    building_id: String(raw.building_id ?? ''),
    name: String(raw.name ?? ''),
    status: String(raw.status ?? ''),
    city: String(raw.city ?? ''),
    state: String(raw.state ?? ''),
    neighborhood: String(raw.neighborhood ?? ''),
    building_type: String(raw.building_type ?? ''),
    standard: String(raw.standard ?? ''),
    release_date: releaseDate,
    releaseYear: yearMatch ? parseInt(yearMatch[1], 10) : null,
    typologies,
  };
}

async function apiGet(path: string, params: Record<string, unknown>, token: string, signal: AbortSignal) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') qs.set(k, String(v));
  }
  const url = `${BASE_URL}${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, {
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
