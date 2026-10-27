import { httpRequest } from '@/lib/http-client';
export type SourceType = 'Horizontal' | 'Vertical';
export type HistoryRow = {
    period: string;
    typology_id: number | string;
    pattern: string;
    qty: number | null;
    typology_stock: number | null;
    sold_in_period: number | null;
    time_on_sale?: number | null;
    gross_sales?: number | null;
    distractions?: number | null;
    building_status?: string;
};
export type Building = {
    building_id?: number | string;
    id?: number | string;
    name?: string;
    building_name?: string;
    release_date?: string;
    status?: string;
    estimation?: unknown;
    sourceType?: SourceType;
    typologies_history: HistoryRow[];
};
export type ReadResult = {
    buildings: Building[];
    pages: number;
    fetchedAt: string;
};
/** Transport only. Monthly provenance remains unknown even when building.estimation is set. */
export async function readHorizontalHistory(uf: string, city: string, signal?: AbortSignal, progress?: (page: number, total: number) => void, type: SourceType = 'Horizontal'): Promise<ReadResult> {
    if (!uf || !city)
        throw new Error('Selecione UF e cidade monitorada.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const pages = new Map<number, Building[]>();
    let total = 1, completed = 0;
    const read = async (page: number) => {
        if (signal?.aborted || controller.signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
        const requestPage = () => httpRequest<{data: Building[]; meta: {last_page: number}}>({
            method: 'POST', url: 'https://app.geobrain.com.br/public-api/v2/building-with-history-internal',
            query: {type, uf, city, per_page: 100, page}, signal: controller.signal,
        });
        let response = await requestPage();
        for (let attempt = 0; !response.ok && [429, 502, 503, 504].includes(response.status ?? 0) && attempt < 2; attempt++) {
            const wait = Math.min(5000, Math.max(250, response.retryAfterMs ?? 500 * (attempt + 1)));
            await new Promise<void>((resolve, reject) => {
                const abortWait = () => { clearTimeout(timer); reject(new DOMException('Consulta cancelada', 'AbortError')); };
                const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abortWait); resolve(); }, wait);
                controller.signal.addEventListener('abort', abortWait, { once: true });
                if (controller.signal.aborted) abortWait();
            });
            if (controller.signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
            response = await requestPage();
        }
        if (!response.ok || !response.data || !Array.isArray(response.data.data))
            throw new Error(`Falha no histórico, página ${page}: ${response.error ?? response.status ?? 'resposta inválida'}`);
        const count = Number(response.data.meta?.last_page ?? 1);
        if (!Number.isSafeInteger(count) || count < 1 || count > 30) throw new Error('Paginação fora do limite de 30 páginas.');
        if (page === 1) total = count;
        else if (count !== total) throw new Error('A paginação mudou durante a consulta. Consulte novamente.');
        if (controller.signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
        pages.set(page, response.data.data.map(b => ({...b, sourceType: type})));
        progress?.(++completed, total);
    };
    try {
        await read(1);
        let next = 2;
        await Promise.all(Array.from({length: Math.min(8, total - 1)}, async () => {
            while (next <= total) { const page = next++; await read(page); }
        }));
        if (signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
    } catch (error) {
        controller.abort();
        throw error;
    } finally {
        signal?.removeEventListener('abort', abort);
    }
    const buildings = [...pages.entries()].sort(([a], [b]) => a - b).flatMap(([, rows]) => rows);
    const identifiers = buildings.map(buildingId);
    if (identifiers.some(id => !id) || new Set(identifiers).size !== identifiers.length)
        throw new Error('Cadastros sem identificador ou repetidos entre páginas. Consulte novamente.');
    return { buildings, pages: total, fetchedAt: new Date().toISOString() };
}
export const buildingId = (b: Building) => String(b.building_id ?? b.id ?? '');
export const buildingName = (b: Building) => String(b.name ?? b.building_name ?? buildingId(b));
export const monthKey = (period: string) => String(period).slice(0, 7);
export const finite = (value: unknown): number | null => value === null || value === undefined || value === '' || value === '-' || !Number.isFinite(Number(value)) ? null : Number(value);
