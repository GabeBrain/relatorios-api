import { useAuthStore } from '@/store/auth-store';
import { normalizeEmployeeReport } from './domain';
import { METHODOLOGY_VERSION, QUERY_VERSION, type EmployeeReport, type EmployeeReportRequest, type MunicipalityOption } from './types';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '');
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/rais-employees-report`;
const IBGE_MUNICIPALITIES_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';

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

interface IbgeMunicipality {
  id: number;
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
}

let municipalitiesPromise: Promise<MunicipalityOption[]> | null = null;

function comparableName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
}

export function loadMunicipalities(signal?: AbortSignal): Promise<MunicipalityOption[]> {
  if (!municipalitiesPromise) {
    municipalitiesPromise = fetch(IBGE_MUNICIPALITIES_URL, { signal })
      .then(async (response) => {
        if (!response.ok) throw new EmployeesApiError('Não foi possível carregar os municípios do IBGE.', response.status);
        const rows = await response.json() as IbgeMunicipality[];
        return rows
          .map((row) => ({ ibgeCode: String(row.id).padStart(7, '0'), name: row.nome, uf: String(row.microrregiao?.mesorregiao?.UF?.sigla ?? '').toUpperCase() }))
          .filter((row) => /^\d{7}$/.test(row.ibgeCode) && /^[A-Z]{2}$/.test(row.uf))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      })
      .catch((error) => {
        municipalitiesPromise = null;
        throw error;
      });
  }
  return municipalitiesPromise;
}

/**
 * `monitored-cities` é o universo autorizado de escolha. A lista IBGE entra
 * somente para resolver o código necessário pela RAIS da cidade já autorizada.
 */
export function resolveMonitoredMunicipality(
  municipalities: MunicipalityOption[],
  scope: { uf: string; city: string },
): MunicipalityOption | null {
  const comparableCity = comparableName(scope.city);
  return municipalities.find((municipality) => municipality.uf === scope.uf && comparableName(municipality.name) === comparableCity) ?? null;
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
    throw new EmployeesApiError(error instanceof Error ? error.message : 'Falha de rede ao gerar relatório.', null, 'NETWORK');
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
