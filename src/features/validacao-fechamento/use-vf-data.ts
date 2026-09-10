import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchValidationBuildings } from './api';
import type { ValidationBuilding, ValidationFetchProgress } from './api';
import { useAuthStore } from '@/store/auth-store';

export const MAX_CITIES = 10;

type Status = 'idle' | 'loading' | 'ready' | 'error';

export interface VFProgress {
  citiesTotal: number;
  citiesDone: number;
  buildingsFound: number;
  pagesDone: number;
  pagesExpected: number;
  current: string[];
}

export interface CityFailure {
  city: string;
  message: string;
}

/**
 * Orquestra a consulta de múltiplas cidades (até MAX_CITIES) da mesma UF e
 * concatena tudo em uma base única de empreendimentos, deduplicada por building_id.
 */
export function useVFData() {
  const token = useAuthStore((s) => s.getToken());
  const [status, setStatus] = useState<Status>('idle');
  const [buildings, setBuildings] = useState<ValidationBuilding[] | null>(null);
  const [loadedCities, setLoadedCities] = useState<string[]>([]);
  const [failures, setFailures] = useState<CityFailure[]>([]);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<VFProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastKey = useRef<string>('');

  const load = useCallback(
    async ({ uf, cities }: { uf: string; cities: string[] }) => {
      const list = cities.slice(0, MAX_CITIES);
      if (!uf || list.length === 0) return;
      if (!token) {
        setError('Sessão sem token — faça login no cabeçalho.');
        setStatus('error');
        return;
      }
      const key = `${uf}|${list.join(',')}`;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      lastKey.current = key;
      setStatus('loading');
      setError('');
      setFailures([]);
      const prog: VFProgress = { citiesTotal: list.length, citiesDone: 0, buildingsFound: 0, pagesDone: 0, pagesExpected: 0, current: list };
      setProgress({ ...prog });

      const merged = new Map<string, ValidationBuilding>();
      const fails: CityFailure[] = [];
      const ok: string[] = [];
      const cityProgress = new Map<string, ValidationFetchProgress>();
      const publishProgress = () => {
        const current = Array.from(cityProgress.values());
        prog.pagesDone = current.reduce((sum, value) => sum + value.pagesDone, 0);
        prog.pagesExpected = current.reduce((sum, value) => sum + value.pagesExpected, 0);
        prog.buildingsFound = merged.size;
        setProgress({ ...prog });
      };

      await Promise.all(
        list.map(async (city) => {
          try {
            const data = await fetchValidationBuildings({ uf, city, token, signal: controller.signal, onProgress: (value) => { cityProgress.set(city, value); publishProgress(); } });
            for (const b of data) {
              if (b.building_id && !merged.has(b.building_id)) merged.set(b.building_id, b);
            }
            ok.push(city);
          } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            fails.push({ city, message: (err as Error).message || 'Erro desconhecido' });
          } finally {
            prog.citiesDone++;
            publishProgress();
          }
        }),
      );

      if (controller.signal.aborted || lastKey.current !== key) return;

      setBuildings(Array.from(merged.values()));
      setLoadedCities(ok.sort((a, b) => a.localeCompare(b)));
      setFailures(fails);
      if (ok.length === 0) {
        setError(fails[0]?.message || 'Nenhuma cidade pôde ser carregada.');
        setStatus('error');
      } else {
        setStatus('ready');
      }
    },
    [token],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    lastKey.current = '';
    setBuildings(null);
    setLoadedCities([]);
    setFailures([]);
    setStatus('idle');
    setError('');
    setProgress(null);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { status, buildings, loadedCities, failures, error, progress, load, reset };
}
