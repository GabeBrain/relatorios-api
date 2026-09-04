import { useAuthStore } from '@/store/auth-store';
import { normalizeEmployeeHistoryReport, normalizeEmployeeReport } from './domain';
import { HISTORY_METHODOLOGY_VERSION, HISTORY_QUERY_VERSION, METHODOLOGY_VERSION, QUERY_VERSION, type EmployeeHistoryReport, type EmployeeReport, type EmployeeReportRequest, type MunicipalityOption } from './types';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '');
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/rais-employees-report`;

export class EmployeesApiError extends Error {
  status: number | null;
  code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = 'EmployeesApiError';
    this.status = status;
    this.code = code;
  }
}

async function functionRequest<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const token = useAuthStore.getState().getToken();
  if (!token) throw new EmployeesApiError('Faça login para gerar um relatório.', 401, 'UNAUTHORIZED');
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new EmployeesApiError('Supabase não configurado neste ambiente.', null, 'CONFIGURATION');

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
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    throw new EmployeesApiError('Não foi possível alcançar o serviço do relatório. Verifique a publicação da Edge Function e a origem permitida no CORS.', null, 'NETWORK');
  }

  let payload: unknown = null;
  try { payload = await response.json(); } catch { /* handled below */ }
  if (!response.ok && response.status !== 202) {
    if (response.status === 401 || response.status === 403) {
      throw new EmployeesApiError('Sua sessão não está autorizada para consultar este relatório.', response.status, 'UNAUTHORIZED');
    }
    if (response.status === 429) throw new EmployeesApiError('Limite de consultas atingido. Aguarde um pouco e tente novamente.', response.status, 'RATE_LIMIT');
    if (response.status === 413) throw new EmployeesApiError('A consulta excede o limite de custo configurado.', response.status, 'COST_LIMIT');
    const errorPayload = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    throw new EmployeesApiError(String(errorPayload.error ?? 'A fonte de dados não respondeu corretamente.'), response.status, String(errorPayload.code ?? 'UPSTREAM'));
  }
  return payload as T;
}

/** Resolve o código IBGE no backend; o navegador não consulta catálogo externo. */
export async function resolveRaisMunicipality(scope: Pick<MunicipalityOption, 'name' | 'uf'>, signal?: AbortSignal): Promise<MunicipalityOption> {
  const payload = await functionRequest<{ municipality?: MunicipalityOption }>({ action: 'resolveMunicipality', municipality: scope }, signal);
  if (!payload.municipality || !/^\d{7}$/.test(payload.municipality.ibgeCode)) {
    throw new EmployeesApiError('Não foi possível associar o município selecionado ao código IBGE da RAIS.', null, 'MUNICIPALITY_RESOLUTION');
  }
  return payload.municipality;
}

export async function loadAvailableYears(signal?: AbortSignal): Promise<number[]> {
  const payload = await functionRequest<{ years?: unknown[] }>({ action: 'metadata' }, signal);
  return (payload.years ?? []).map(Number).filter((year) => Number.isInteger(year)).sort((a, b) => b - a);
}

export async function generateEmployeeReport(request: EmployeeReportRequest, signal?: AbortSignal): Promise<EmployeeReport> {
  let payload = await functionRequest<{ report?: unknown; pending?: boolean; snapshotId?: string; retryAfterMs?: number }>({
    action: 'generate',
    municipality: request.municipality,
    year: request.year,
    queryVersion: QUERY_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
  }, signal);

  for (let attempt = 0; payload.pending && payload.snapshotId && attempt < 40; attempt += 1) {
    await new Promise((resolve, reject) => { const timer = window.setTimeout(resolve, Math.min(5000, Math.max(1000, payload.retryAfterMs ?? 3000))); signal?.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true }); });
    payload = await functionRequest<{ report?: unknown; pending?: boolean; snapshotId?: string; retryAfterMs?: number }>({ action: 'status', snapshotId: payload.snapshotId }, signal);
  }
  if (payload.pending) {
    throw new EmployeesApiError('A geração ainda está em andamento. Tente novamente em alguns segundos.', 202, 'PENDING');
  }
  return normalizeEmployeeReport(payload.report ?? payload);
}

export async function generateEmployeeHistory(municipality: MunicipalityOption, signal?: AbortSignal): Promise<EmployeeHistoryReport> {
  let payload = await functionRequest<{ history?: unknown; pending?: boolean; snapshotId?: string; retryAfterMs?: number }>({
    action: 'historyGenerate', municipality, queryVersion: HISTORY_QUERY_VERSION, methodologyVersion: HISTORY_METHODOLOGY_VERSION,
  }, signal);
  for (let attempt = 0; payload.pending && payload.snapshotId && attempt < 50; attempt += 1) {
    await new Promise((resolve, reject) => { const timer = window.setTimeout(resolve, Math.min(5000, Math.max(1000, payload.retryAfterMs ?? 3000))); signal?.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true }); });
    payload = await functionRequest<{ history?: unknown; pending?: boolean; snapshotId?: string; retryAfterMs?: number }>({ action: 'historyStatus', snapshotId: payload.snapshotId }, signal);
  }
  if (payload.pending) throw new EmployeesApiError('A evolução histórica ainda está sendo preparada. Tente novamente em alguns segundos.', 202, 'PENDING');
  return normalizeEmployeeHistoryReport(payload.history ?? payload);
}
