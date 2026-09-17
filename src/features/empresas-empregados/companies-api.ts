import { useAuthStore } from '@/store/auth-store';
import type { CompaniesAggregatedRow, CompaniesReportResponse } from './types';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '');
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/empresas-report`;

export class CompaniesApiError extends Error {
  status: number | null;
  code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = 'CompaniesApiError';
    this.status = status;
    this.code = code;
  }
}

function normalizeRows(payload: unknown): CompaniesAggregatedRow[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const quantidade = Number(row.quantidade);
      return {
        id_municipio: String(row.id_municipio ?? ''),
        cnae_secao: String(row.cnae_secao ?? 'ND').trim().toUpperCase() || 'ND',
        porte: String(row.porte ?? '00').padStart(2, '0'),
        matriz_filial: Number(row.matriz_filial) === 2 ? 2 : 1,
        regime_simples: String(row.regime_simples ?? 'nenhum'),
        quantidade: Number.isFinite(quantidade) && quantidade > 0 ? Math.trunc(quantidade) : 0,
      } satisfies CompaniesAggregatedRow;
    })
    .filter((row) => row.quantidade > 0);
}

/**
 * Cache do agregado já publicado.
 *
 * O agregado é o mesmo para todo mundo (a materialização é global, por município
 * e competência), então uma vez lido ele não precisa ser buscado de novo: fica na
 * memória da aba e também em `localStorage`, para sobreviver a recarregamentos.
 * Só respostas publicadas entram no cache — "ainda não materializado" precisa ser
 * reconsultado, senão a cidade nunca sairia desse estado.
 */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_PREFIX = 'empresas-report-cache:v1:';
const memoryCache = new Map<string, { at: number; report: CompaniesReportResponse }>();

function readCache(ibge: string): CompaniesReportResponse | null {
  const fresh = (entry?: { at: number; report: CompaniesReportResponse }) =>
    entry && Date.now() - entry.at < CACHE_TTL_MS ? entry.report : null;
  const inMemory = fresh(memoryCache.get(ibge));
  if (inMemory) return inMemory;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${ibge}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { at: number; report: CompaniesReportResponse };
    const stored = fresh(entry);
    if (stored) { memoryCache.set(ibge, entry); return stored; }
    localStorage.removeItem(`${CACHE_PREFIX}${ibge}`);
  } catch { /* cache corrompido/indisponível: segue para a rede */ }
  return null;
}

function writeCache(ibge: string, report: CompaniesReportResponse) {
  const entry = { at: Date.now(), report };
  memoryCache.set(ibge, entry);
  try { localStorage.setItem(`${CACHE_PREFIX}${ibge}`, JSON.stringify(entry)); } catch { /* cota cheia: memória basta */ }
}

/** Limpa o cache de um município (usado ao pedir atualização manual). */
export function clearCompaniesReportCache(municipalityIbge?: string) {
  if (municipalityIbge) {
    memoryCache.delete(municipalityIbge);
    try { localStorage.removeItem(`${CACHE_PREFIX}${municipalityIbge}`); } catch { /* ignora */ }
    return;
  }
  memoryCache.clear();
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(CACHE_PREFIX)) localStorage.removeItem(key);
  } catch { /* ignora */ }
}

/** Única porta de leitura de Empresas no navegador: a Edge Function `empresas-report`. */
export async function fetchCompaniesReport(
  municipalityIbge: string,
  signal?: AbortSignal,
  options: { force?: boolean } = {},
): Promise<CompaniesReportResponse> {
  if (options.force) clearCompaniesReportCache(municipalityIbge);
  else {
    const cached = readCache(municipalityIbge);
    if (cached) return cached;
  }
  const token = useAuthStore.getState().getToken();
  if (!token) throw new CompaniesApiError('Faça login GeoBrain para consultar Empresas.', 401, 'UNAUTHORIZED');
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new CompaniesApiError('Backend não configurado neste ambiente.', null, 'CONFIGURATION');

  let response: Response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ municipalityIbge }),
      signal,
    });
  } catch {
    throw new CompaniesApiError('Não foi possível alcançar o serviço de Empresas.', null, 'NETWORK');
  }

  let payload: Record<string, unknown> = {};
  try { payload = (await response.json()) as Record<string, unknown>; } catch { /* tratado abaixo */ }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new CompaniesApiError('Sua sessão GeoBrain não está autorizada para consultar Empresas.', response.status, 'UNAUTHORIZED');
    }
    throw new CompaniesApiError(String(payload.error ?? 'A fonte de Empresas não respondeu corretamente.'), response.status, String(payload.code ?? 'UPSTREAM'));
  }

  if (payload.available !== true) {
    return { available: false, message: String(payload.message ?? 'Ainda não há competência de Empresas publicada para este município.') };
  }

  const meta = (payload.meta ?? {}) as Record<string, unknown>;
  const report: CompaniesReportResponse = {
    available: true,
    meta: {
      competencia: String(meta.competencia ?? ''),
      source: String(meta.source ?? 'Base dos Dados · CNPJ · BigQuery'),
      queryVersion: String(meta.queryVersion ?? ''),
      methodologyVersion: String(meta.methodologyVersion ?? ''),
      simplesReadAt: meta.simplesReadAt ? String(meta.simplesReadAt) : null,
    },
    rows: normalizeRows(payload.rows),
  };
  writeCache(municipalityIbge, report);
  return report;
}
