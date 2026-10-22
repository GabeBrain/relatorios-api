import { httpRequest } from '@/lib/http-client';

export type HistoryRow = { period: string; typology_id: number | string; pattern: string; qty: number | null; typology_stock: number | null; sold_in_period: number | null; time_on_sale?: number | null };
export type Building = { building_id?: number | string; id?: number | string; name?: string; building_name?: string; release_date?: string; status?: string; estimation?: unknown; typologies_history: HistoryRow[] };
export type ReadResult = { buildings: Building[]; pages: number; fetchedAt: string };

/** Transport only. Monthly provenance remains unknown even when building.estimation is set. */
export async function readHorizontalHistory(uf: string, city: string, signal?: AbortSignal, progress?: (page: number, total: number) => void): Promise<ReadResult> {
  if (!uf || !city) throw new Error('Selecione UF e cidade monitorada.');
  const buildings: Building[] = [];
  let total = 1;
  for (let page = 1; page <= total; page += 1) {
    const response = await httpRequest<{ data: Building[]; meta: { last_page: number } }>({ method: 'POST', url: 'https://app.geobrain.com.br/public-api/v2/building-with-history-internal', query: { type: 'Horizontal', uf, city, per_page: 100, page }, signal });
    if (!response.ok || !response.data || !Array.isArray(response.data.data)) throw new Error(`Falha no histórico, página ${page}: ${response.error ?? response.status ?? 'resposta inválida'}`);
    total = Number(response.data.meta?.last_page ?? 1);
    if (!Number.isSafeInteger(total) || total < 1 || total > 30) throw new Error('Paginação fora do limite de 30 páginas.');
    buildings.push(...response.data.data);
    progress?.(page, total);
  }
  return { buildings, pages: total, fetchedAt: new Date().toISOString() };
}

export const buildingId = (b: Building) => String(b.building_id ?? b.id ?? '');
export const buildingName = (b: Building) => String(b.name ?? b.building_name ?? buildingId(b));
export const monthKey = (period: string) => String(period).slice(0, 7);
export const finite = (value: unknown): number | null => value === null || value === undefined || value === '' || value === '-' || !Number.isFinite(Number(value)) ? null : Number(value);
