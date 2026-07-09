import { GeoApiScopeError, type MonitoredCity } from './types';

const BASE_URL = 'https://geobrain.com.br/public-api';

/**
 * Fetches all monitored cities available to the authenticated token, paginating
 * through `links.next`. Returns a `Record<UF, city[]>` map (cities sorted pt-BR).
 *
 * Throws `GeoApiScopeError` on failure — callers MUST NOT silently fall back to
 * the IBGE list. See AGENTS.md / CLAUDE.md, section "GeoApiScopeEngine".
 */
export async function fetchMonitoredCities(
  token: string,
  signal?: AbortSignal,
): Promise<Record<string, string[]>> {
  if (!token) {
    throw new GeoApiScopeError('no_token', 'Token ausente. Faça login para consultar cidades monitoradas.');
  }

  const byUf: Record<string, Set<string>> = {};
  let nextUrl: string | null = `${BASE_URL}/monitored-cities`;

  while (nextUrl) {
    let res: Response;
    try {
      res = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new GeoApiScopeError('network', `Falha de rede ao consultar /monitored-cities: ${(err as Error).message}`);
    }

    if (res.status === 401 || res.status === 403) {
      throw new GeoApiScopeError('unauthorized', 'Token inválido ou sem permissão para /monitored-cities.', res.status);
    }
    if (!res.ok) {
      throw new GeoApiScopeError('bad_response', `HTTP ${res.status} em /monitored-cities.`, res.status);
    }

    let payload: { data?: MonitoredCity[]; links?: { next?: string | null } };
    try {
      payload = await res.json();
    } catch {
      throw new GeoApiScopeError('bad_response', 'Resposta de /monitored-cities não é JSON válido.');
    }

    for (const item of payload.data ?? []) {
      const uf = String(item.state ?? '').toUpperCase().trim();
      const city = String(item.city ?? '').trim();
      if (!uf || !city) continue;
      if (!byUf[uf]) byUf[uf] = new Set();
      byUf[uf].add(city);
    }

    nextUrl = payload.links?.next ?? null;
  }

  const result: Record<string, string[]> = {};
  for (const [uf, set] of Object.entries(byUf)) {
    result[uf] = [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  return result;
}
