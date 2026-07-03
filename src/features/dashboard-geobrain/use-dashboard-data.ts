import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBuildings, type FetchProgress } from './api';
import type { Building } from './types';
import { useAuthStore } from '@/store/auth-store';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function useDashboardData() {
  const token = useAuthStore((s) => s.getToken());
  const [status, setStatus] = useState<Status>('idle');
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastKey = useRef<string>('');

  const load = useCallback(
    async (uf: string, city?: string) => {
      const key = `${uf}|${city ?? ''}`;
      if (!uf) return;
      if (!token) {
        setError('Sessão sem token — faça login no cabeçalho.');
        setStatus('error');
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      lastKey.current = key;
      setStatus('loading');
      setError('');
      setProgress({ lanesTotal: 8, lanesDone: 0, pagesDone: 0, buildingsFound: 0 });
      try {
        const data = await fetchBuildings({
          uf,
          city,
          token,
          signal: controller.signal,
          onProgress: (p) => setProgress({ ...p }),
        });
        if (lastKey.current !== key) return;
        setBuildings(data);
        setStatus('ready');
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError((err as Error).message || 'Erro desconhecido');
        setStatus('error');
      }
    },
    [token],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return { status, buildings, error, progress, load };
}
