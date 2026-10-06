/** Retry restrito a falhas transitórias do provedor. Não tenta credenciais ou erros de contrato. */
export const isTransientGeoBrainFailure = (status: number | null) => status === null || status === 408 || status === 429 || (status !== null && status >= 500);

export async function requestWithRetry<T extends { ok: boolean; status: number | null }>(
  request: () => Promise<T>,
  options: { attempts?: number; signal?: AbortSignal; sleep?: (ms: number, signal?: AbortSignal) => Promise<void>; random?: () => number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const sleep = options.sleep ?? ((ms, signal) => new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Solicitação cancelada.', 'AbortError')); return; }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Solicitação cancelada.', 'AbortError')); }, { once: true });
  }));
  const random = options.random ?? Math.random;
  let latest: T | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (options.signal?.aborted) throw new DOMException('Solicitação cancelada.', 'AbortError');
    latest = await request();
    if (latest.ok || !isTransientGeoBrainFailure(latest.status) || attempt === attempts) return latest;
    // Retry-After prevalece; sem ele, backoff exponencial curto com jitter.
    const retryAfterMs = (latest as T & { retryAfterMs?: number | null }).retryAfterMs;
    await sleep(retryAfterMs != null ? Math.max(0, retryAfterMs) : Math.round(250 * 2 ** (attempt - 1) * (1 + random() * .25)), options.signal);
  }
  return latest!;
}
