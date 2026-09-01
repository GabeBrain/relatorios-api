/** Retry restrito a falhas transitórias do provedor. Não tenta credenciais ou erros de contrato. */
export const isTransientGeoBrainFailure = (status: number | null) => status === null || status === 408 || status === 429 || (status !== null && status >= 500);

export async function requestWithRetry<T extends { ok: boolean; status: number | null }>(
  request: () => Promise<T>,
  options: { attempts?: number; signal?: AbortSignal; sleep?: (ms: number) => Promise<void>; random?: () => number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  let latest: T | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (options.signal?.aborted) throw new DOMException('Solicitação cancelada.', 'AbortError');
    latest = await request();
    if (latest.ok || !isTransientGeoBrainFailure(latest.status) || attempt === attempts) return latest;
    // backoff exponencial curto com jitter: 250, 500ms (+ até 25%).
    await sleep(Math.round(250 * 2 ** (attempt - 1) * (1 + random() * .25)));
  }
  return latest!;
}
