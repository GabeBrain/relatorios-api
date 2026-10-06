/**
 * Coleta multi-cidade (G-01). Consulta cada município autorizado isoladamente, com concorrência
 * limitada e `AbortSignal`, e nunca consolida em silêncio: uma cidade que falha aparece nomeada na
 * proveniência e rebaixa o relatório para `partial`.
 */

export interface CityOutcome<T> {
  city: string;
  status: 'completed' | 'failed';
  value: T | null;
  error: string | null;
  attempts: number;
  durationMs: number;
}

export interface CollectionResult<T> {
  outcomes: CityOutcome<T>[];
  requestedCities: string[];
  completedCities: string[];
  failedCities: { city: string; error: string }[];
  /** `ready` só quando todas concluem; `partial` com falha parcial; `unavailable` sem nenhuma. */
  state: 'ready' | 'partial' | 'unavailable';
}

export interface CollectOptions {
  concurrency?: number;
  signal?: AbortSignal;
  /** Total tentativas por cidade, incluindo a inicial. */
  attempts?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  retryDelay?: (error: unknown, attempt: number) => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  onRetry?: (city: string, attempt: number, error: unknown) => void;
}

const DEFAULT_CONCURRENCY = 3;

export function isTransientCityFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/\bHTTP\s+(\d{3})\b/i);
  if (!statusMatch) return true; // timeout/rede sem resposta HTTP
  const status = Number(statusMatch[1]);
  return status === 408 || status === 429 || status >= 500;
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError(signal));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(abortError(signal)); }, { once: true });
  });
}

function abortError(signal: AbortSignal): Error {
  const reason = signal.reason;
  return reason instanceof Error ? reason : new Error('Coleta cancelada.');
}

/**
 * Executa `task` por cidade com no máximo `concurrency` requisições simultâneas. O cancelamento é
 * propagado: se o sinal aborta, a promessa rejeita em vez de devolver um consolidado incompleto
 * disfarçado de sucesso.
 */
export async function collectByCity<T>(
  cities: string[],
  task: (city: string, signal?: AbortSignal) => Promise<T>,
  options: CollectOptions = {},
): Promise<CollectionResult<T>> {
  const requestedCities = [...new Set(cities.map((city) => city.trim()).filter(Boolean))];
  const { signal } = options;
  if (signal?.aborted) throw abortError(signal);

  const outcomes: CityOutcome<T>[] = requestedCities.map((city) => ({ city, status: 'failed', value: null, error: 'não coletada', attempts: 0, durationMs: 0 }));
  const limit = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  let cursor = 0;

  const worker = async () => {
    for (;;) {
      const index = cursor++;
      if (index >= requestedCities.length) return;
      if (signal?.aborted) throw abortError(signal);
      const city = requestedCities[index];
      const cityStartedAt = Date.now();
      const maxAttempts = Math.max(1, options.attempts ?? 1);
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (signal?.aborted) throw abortError(signal);
        try {
          const value = await task(city, signal);
          outcomes[index] = { city, status: 'completed', value, error: null, attempts: attempt, durationMs: Date.now() - cityStartedAt };
          break;
        } catch (error) {
          if (signal?.aborted) throw abortError(signal);
          outcomes[index] = { city, status: 'failed', value: null, error: error instanceof Error ? error.message : String(error), attempts: attempt, durationMs: Date.now() - cityStartedAt };
          const retry = attempt < maxAttempts && (options.shouldRetry ?? isTransientCityFailure)(error, attempt);
          if (!retry) break;
          options.onRetry?.(city, attempt + 1, error);
          const delay = options.retryDelay?.(error, attempt) ?? Math.min(5000, 500 * 2 ** (attempt - 1));
          await (options.sleep ?? abortableSleep)(delay, signal);
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, requestedCities.length) }, worker));
  if (signal?.aborted) throw abortError(signal);

  const completedCities = outcomes.filter((outcome) => outcome.status === 'completed').map((outcome) => outcome.city);
  const failedCities = outcomes
    .filter((outcome) => outcome.status === 'failed')
    .map((outcome) => ({ city: outcome.city, error: outcome.error ?? 'falha desconhecida' }));

  return {
    outcomes,
    requestedCities,
    completedCities,
    failedCities,
    state: !completedCities.length ? 'unavailable' : failedCities.length ? 'partial' : 'ready',
  };
}

/** Valores das cidades concluídas, na ordem solicitada. */
export function completedValues<T>(result: CollectionResult<T>): T[] {
  return result.outcomes.filter((outcome): outcome is CityOutcome<T> & { value: T } => outcome.status === 'completed' && outcome.value !== null).map((outcome) => outcome.value);
}
