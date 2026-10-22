// Contrato de consulta copiado do Dashboard GeoBrain; conserva os registros brutos.
// Preserva campos originais e nulos, sem a normalização dos KPIs do Dashboard.
export type RawBuilding = Record<string, unknown>;
const BASE_URL = 'https://app.geobrain.com.br/public-api/v2';
const BUILDING_HISTORY_ENDPOINT = '/building-with-history-internal';
const ALL_TYPES = ['Comercial', 'Horizontal', 'Vertical'];
const PER_PAGE = 100;
const PAGE_BATCH_SIZE = 5;
const REQUEST_TIMEOUT_MS = 60_000;

async function requestBuildingHistory(params: Record<string, unknown>, token: string, signal: AbortSignal) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') qs.set(k, String(v));
  }
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const abortRequest = () => timeoutController.abort();
  signal.addEventListener('abort', abortRequest, { once: true });

  try {
    const response = await fetch(`${BASE_URL}${BUILDING_HISTORY_ENDPOINT}?${qs}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: timeoutController.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} — ${BUILDING_HISTORY_ENDPOINT}`);
    return response.json();
  } catch (error) {
    if (timeoutController.signal.aborted && !signal.aborted) {
      throw new Error(`Tempo limite de 60 segundos excedido em ${BUILDING_HISTORY_ENDPOINT}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener('abort', abortRequest);
  }
}


export interface FetchProgress {
  lanesTotal: number;
  lanesDone: number;
  pagesDone: number;
  buildingsFound: number;
}

export interface FetchOptions {
  uf?: string;
  ufs?: string[];
  city?: string | string[];
  token: string;
  signal: AbortSignal;
  onProgress?: (p: FetchProgress) => void;
}

export async function fetchBuildings({ uf, ufs, city, token, signal, onProgress }: FetchOptions): Promise<RawBuilding[]> {
  const cities = (Array.isArray(city) ? city : [city]).filter((currentCity): currentCity is string => Boolean(currentCity));
  const scopes: Array<{ city: string } | { uf: string }> = cities.length
    ? cities.map((currentCity) => ({ city: currentCity }))
    : (ufs?.length ? ufs : uf ? [uf] : []).map((currentUf) => ({ uf: currentUf }));
  if (scopes.length === 0) throw new Error('Selecione uma região, UF ou município para carregar os dados.');

  const progress: FetchProgress = { lanesTotal: scopes.length * ALL_TYPES.length, lanesDone: 0, pagesDone: 0, buildingsFound: 0 };
  const result: RawBuilding[] = [];

  const consumePage = (payload: { data?: unknown[] }) => {
    if (!Array.isArray(payload.data)) throw new Error('Resposta da API sem lista de empreendimentos.');
    for (const item of payload.data) {
      result.push(item as RawBuilding);
      progress.buildingsFound++;
    }
    progress.pagesDone++;
    onProgress?.({ ...progress });
  };

  for (const scope of scopes) {
    for (const type of ALL_TYPES) {
      if (signal.aborted) throw new DOMException('A consulta foi cancelada.', 'AbortError');

      const firstPage = await requestBuildingHistory(
        { ...scope, type, per_page: PER_PAGE, page: 1 },
        token,
        signal,
      );
      const lastPage = Number(firstPage?.meta?.last_page ?? 1);
      if (!Number.isInteger(lastPage) || lastPage < 1) throw new Error('Paginação inválida na resposta da API.');
      consumePage(firstPage);

      for (let startPage = 2; startPage <= lastPage; startPage += PAGE_BATCH_SIZE) {
        if (signal.aborted) throw new DOMException('A consulta foi cancelada.', 'AbortError');
        const pages = Array.from(
          { length: Math.min(PAGE_BATCH_SIZE, lastPage - startPage + 1) },
          (_, index) => startPage + index,
        );
        const payloads = await Promise.all(
          pages.map((page) => requestBuildingHistory(
            { ...scope, type, per_page: PER_PAGE, page },
            token,
            signal,
          )),
        );
        payloads.forEach(consumePage);
      }
      progress.lanesDone++;
      onProgress?.({ ...progress });
    }
  }

  if (signal.aborted) throw new DOMException('A consulta foi cancelada.', 'AbortError');
  return result;
}
