import type { MunicipalityOption } from './types';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '');
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/empresas-materialize-request`;

/** Partições do piloto Empresas (competência julho/2026). */
export const MATERIALIZE_PARTITION = '2026-07-12';

export type MaterializeStatus = 'ok' | 'published' | 'processing' | 'rate_limited' | 'error';

export interface MaterializeRequestResult {
  status: MaterializeStatus;
  message: string;
  totalEstabelecimentos?: number;
  aggregatedRows?: number;
}

/**
 * Solicitação pública de atualização de Empresas.
 * O navegador chama exclusivamente `empresas-materialize-request` — nunca o
 * materializador interno — e nunca vê nem envia a secret de servidor.
 */
export async function requestCompaniesMaterialization(
  municipality: MunicipalityOption,
  signal?: AbortSignal,
): Promise<MaterializeRequestResult> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { status: 'error', message: 'Backend não configurado neste ambiente.' };
  }

  let response: Response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({
        municipality: { ibgeCode: municipality.ibgeCode, name: municipality.name, uf: municipality.uf },
        establishmentsPartition: MATERIALIZE_PARTITION,
        companiesPartition: MATERIALIZE_PARTITION,
      }),
      signal,
    });
  } catch {
    return { status: 'error', message: 'Não foi possível alcançar o serviço de atualização.' };
  }

  let payload: Record<string, unknown> = {};
  try { payload = (await response.json()) as Record<string, unknown>; } catch { /* tratado abaixo */ }

  if (response.status === 429) {
    return { status: 'rate_limited', message: String(payload.error ?? 'Limite temporário de solicitações atingido. Tente novamente mais tarde.') };
  }

  const status = String(payload.status ?? '');
  if (!response.ok || status === 'error') {
    return { status: 'error', message: String(payload.error ?? 'A atualização não pôde ser concluída agora.') };
  }
  if (status === 'published' || status === 'processing') {
    return { status: status as MaterializeStatus, message: String(payload.message ?? '') };
  }

  return {
    status: 'ok',
    message: String(payload.message ?? 'Dados de Empresas atualizados para este município.'),
    totalEstabelecimentos: Number(payload.totalEstabelecimentos ?? 0),
    aggregatedRows: Number(payload.aggregatedRows ?? 0),
  };
}
