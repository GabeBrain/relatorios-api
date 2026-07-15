import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { fetchMonitoredCities } from './fetch-monitored-cities';
import { GeoApiScopeError, type GeoScope } from './types';

// Session cache keyed by token. Cleared on reload() or when token changes.
const cache = new Map<string, Promise<Record<string, string[]>>>();

function loadCities(token: string): Promise<Record<string, string[]>> {
  const cached = cache.get(token);
  if (cached) return cached;
  const p = fetchMonitoredCities(token).catch((err) => {
    cache.delete(token);
    throw err;
  });
  cache.set(token, p);
  return p;
}

export function clearMonitoredCitiesCache(token?: string) {
  if (token) cache.delete(token);
  else cache.clear();
}

interface UseGeoApiScopeOptions {
  value: GeoScope;
  onChange: (next: GeoScope) => void;
}

export interface UseGeoApiScopeResult {
  citiesByUf: Record<string, string[]> | null;
  availableUfs: string[];
  availableCities: string[];
  uf: string;
  city: string;
  setUf: (uf: string) => void;
  setCity: (city: string) => void;
  isLoading: boolean;
  error: GeoApiScopeError | null;
  strictReady: boolean;
  scopeVersion: number;
  reload: () => void;
  hasToken: boolean;
}

/**
 * Controlled hook: parent owns `{uf, city}` and this hook manages fetch/cache
 * of monitored cities and derives available options.
 *
 * Contract:
 *  - Changing UF clears city (via onChange).
 *  - `scopeVersion` increments whenever uf or city changes — consumers use it
 *    to invalidate/abort stale downstream requests.
 *  - `strictReady = true` only when /monitored-cities loaded AND uf ∈ availableUfs
 *    AND city ∈ availableCities. No IBGE fallback.
 */
export function useGeoApiScope({ value, onChange }: UseGeoApiScopeOptions): UseGeoApiScopeResult {
  const token = useAuthStore((s) => s.getToken());
  const hasToken = !!token;

  const [citiesByUf, setCitiesByUf] = useState<Record<string, string[]> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeoApiScopeError | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!token) {
      setCitiesByUf(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    loadCities(token)
      .then((data) => {
        if (cancelled) return;
        setCitiesByUf(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const scopeErr =
          err instanceof GeoApiScopeError
            ? err
            : new GeoApiScopeError('network', (err as Error).message ?? 'Erro desconhecido');
        setError(scopeErr);
        setCitiesByUf(null);
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, reloadTick]);

  const availableUfs = useMemo(
    () => (citiesByUf ? Object.keys(citiesByUf).sort() : []),
    [citiesByUf],
  );
  const availableCities = useMemo(
    () => (citiesByUf && value.uf ? citiesByUf[value.uf] ?? [] : []),
    [citiesByUf, value.uf],
  );

  const strictReady = Boolean(
    citiesByUf &&
      value.uf &&
      value.city &&
      availableUfs.includes(value.uf) &&
      availableCities.includes(value.city),
  );

  // scopeVersion: bump on uf/city change
  const versionRef = useRef(0);
  const lastKeyRef = useRef<string>('');
  const currentKey = `${value.uf}|${value.city}`;
  if (lastKeyRef.current !== currentKey) {
    lastKeyRef.current = currentKey;
    versionRef.current += 1;
  }

  const setUf = useCallback(
    (uf: string) => {
      if (uf === value.uf) return;
      onChange({ uf, city: '' });
    },
    [value.uf, onChange],
  );
  const setCity = useCallback(
    (city: string) => {
      if (city === value.city) return;
      onChange({ uf: value.uf, city });
    },
    [value, onChange],
  );

  const reload = useCallback(() => {
    if (token) clearMonitoredCitiesCache(token);
    setReloadTick((t) => t + 1);
  }, [token]);

  return {
    citiesByUf,
    availableUfs,
    availableCities,
    uf: value.uf,
    city: value.city,
    setUf,
    setCity,
    isLoading,
    error,
    strictReady,
    scopeVersion: versionRef.current,
    reload,
    hasToken,
  };
}
