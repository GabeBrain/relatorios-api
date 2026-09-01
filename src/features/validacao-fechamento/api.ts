import type { Building, BuildingArea, HistoryEntry, Incorporator, Typology } from '@/features/dashboard-geobrain/types';

const BASE_URL = 'https://api.geobrain.com.br/public-api/v2';
const TYPES = ['Vertical', 'Horizontal', 'Comercial', 'Hotel'];
const STATUSES = ['Ativo', 'Esgotado'];
const PER_PAGE = 100;

export interface ValidationHistory extends HistoryEntry {
  type_of_typology: string;
  garage_label: string;
  distractions: number | null;
  gross_sales: number | null;
}
export interface ValidationTypology extends Omit<Typology, 'history'> { history: ValidationHistory[]; }
export interface ValidationBuilding extends Omit<Building, 'typologies'> {
  typologies: ValidationTypology[];
  installment_value: number | null;
  building_created_at: string;
}

function stringValue(value: unknown): string { return value == null ? '' : String(value); }
function numberValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function numberOrZero(value: unknown): number { return numberValue(value) ?? 0; }
function dateValue(value: unknown): Date {
  const date = new Date(stringValue(value).slice(0, 10));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}
function text(value: unknown): string { return stringValue(value).trim(); }

function normalizeBuilding(raw: Record<string, unknown>): ValidationBuilding {
  const standard = text(raw.standard);
  const historyRaw = Array.isArray(raw.typologies_history) ? raw.typologies_history : [];
  const byTypology = new Map<string, Record<string, unknown>[]>();

  for (const item of historyRaw) {
    const entry = item as Record<string, unknown>;
    const id = stringValue(entry.typology_id);
    if (!id) continue;
    if (!byTypology.has(id)) byTypology.set(id, []);
    byTypology.get(id)!.push(entry);
  }

  const typologies: ValidationTypology[] = Array.from(byTypology.entries()).map(([typologyId, entries]) => {
    entries.sort((a, b) => dateValue(a.period).getTime() - dateValue(b.period).getTime());
    const latest = entries[entries.length - 1] ?? {};
    const firstFilled = <T,>(key: string, fallback: T): T => {
      for (let i = entries.length - 1; i >= 0; i--) {
        const value = entries[i][key];
        if (value != null && value !== '') return value as T;
      }
      return latest[key] as T ?? fallback;
    };
    const history: ValidationHistory[] = entries.map((entry) => ({
      period: stringValue(entry.period), periodDate: dateValue(entry.period),
      price: numberValue(entry.price), price_private_area: numberValue(entry.price_private_area),
      typology_stock: numberOrZero(entry.typology_stock), sold_in_period: numberOrZero(entry.sold_in_period),
      vgv_stock: numberValue(entry.vgv_stock), pattern: text(entry.pattern) || standard,
      building_status: text(entry.building_status), time_on_sale: numberValue(entry.time_on_sale),
      private_area: numberValue(entry.private_area), public_area: numberValue(entry.public_area),
      price_public_area: numberValue(entry.price_public_area), release_price: numberValue(entry.release_price),
      vgv_total: numberValue(entry.vgv_total), sold: numberOrZero(entry.sold), type_of_typology: text(entry.type_of_typology),
      number_bedroom: numberOrZero(entry.number_bedroom), number_suite: numberOrZero(entry.number_suite),
      garage: numberOrZero(entry.garage), garage_label: stringValue(entry.garage), qty: numberOrZero(entry.qty),
      distractions: numberValue(entry.distractions), gross_sales: numberValue(entry.gross_sales),
      estagio_empreendimento: text(entry.estagio_empreendimento), taxa_associativa: numberValue(entry.taxa_associativa),
    }));
    return {
      typology_id: typologyId, type_of_typology: text(firstFilled('type_of_typology', '')),
      number_bedroom: numberOrZero(firstFilled('number_bedroom', 0)), garage: numberOrZero(firstFilled('garage', 0)),
      qty: numberOrZero(firstFilled('qty', 0)), private_area: numberValue(firstFilled('private_area', null)),
      release_price: numberValue(firstFilled('release_price', null)), history,
    };
  });

  const rawArray = (key: string): Record<string, unknown>[] => Array.isArray(raw[key]) ? raw[key] as Record<string, unknown>[] : [];
  const incorporators: Incorporator[] = rawArray('incorporators').map((item) => ({ id: stringValue(item.id), name: stringValue(item.name) }));
  const areas: BuildingArea[] = rawArray('areas').map((item) => ({ area: stringValue(item.area), type: stringValue(item.type) }));
  const releaseDate = stringValue(raw.release_date);
  const year = releaseDate.match(/\d{4}/);

  return {
    building_id: stringValue(raw.building_id), name: stringValue(raw.name), status: stringValue(raw.status),
    city: stringValue(raw.city), state: stringValue(raw.state), neighborhood: text(raw.neighborhood),
    building_type: stringValue(raw.building_type), standard, release_date: releaseDate,
    releaseYear: year ? Number(year[0]) : null, typologies,
    delivery_date: stringValue(raw.delivery_date), zipcode: stringValue(raw.zipcode), address: stringValue(raw.address),
    address_number: stringValue(raw.address_number), city_id: stringValue(raw.city_id), latitude: numberValue(raw.latitude),
    longitude: numberValue(raw.longitude), towers: numberValue(raw.towers), floors: numberValue(raw.floors),
    elevators: numberValue(raw.elevators), period: stringValue(raw.period), time_on_sale: numberValue(raw.time_on_sale),
    total_stock: numberValue(raw.total_stock), total_units: numberValue(raw.total_units), builder_name: stringValue(raw.builder_name),
    bathrooms: numberValue(raw.bathrooms), has_suites: stringValue(raw.has_suites), last_update: stringValue(raw.last_update),
    interest_rate_index: stringValue(raw.interest_rate_index), interest_rate_tax: numberValue(raw.interest_rate_tax),
    bank_financing: stringValue(raw.bank_financing), own_financing: stringValue(raw.own_financing), fiduciary_ownership: stringValue(raw.fiduciary_ownership),
    down_payment_percentage: numberValue(raw.down_payment_percentage), discount_percentage: numberValue(raw.discount_percentage),
    number_of_installments: numberValue(raw.number_of_installments), installment_value: numberValue(raw.installment_value),
    building_created_at: stringValue(raw.building_created_at),
    incorporators, areas,
  };
}

async function request(params: Record<string, unknown>, token: string, signal: AbortSignal) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value != null && value !== '') query.set(key, String(value)); });
  const response = await fetch(`${BASE_URL}/building-with-history-internal?${query}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} — /building-with-history-internal`);
  return response.json();
}

export async function fetchValidationBuildings({ uf, city, token, signal }: { uf: string; city?: string; token: string; signal: AbortSignal }): Promise<ValidationBuilding[]> {
  const result = new Map<string, ValidationBuilding>();
  await Promise.all(TYPES.flatMap((type) => STATUSES.map(async (status) => {
    try {
      for (let page = 1; !signal.aborted; page++) {
        const payload = await request({ uf, city, type, status, per_page: PER_PAGE, page }, token, signal);
        for (const item of (payload?.data ?? []) as Record<string, unknown>[]) {
          const building = normalizeBuilding(item);
          if (building.building_id && !result.has(building.building_id)) result.set(building.building_id, building);
        }
        if (page >= (payload?.meta?.last_page ?? 1)) break;
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') return;
    }
  })));
  return Array.from(result.values());
}
