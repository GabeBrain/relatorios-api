import { useEffect, useState } from 'react';
import type { QuantiDataset } from './types';

const cache = new Map<string, Promise<QuantiDataset>>();

async function fetchDataset(url: string): Promise<QuantiDataset> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar dataset (${r.status})`);
        return r.json();
      }),
    );
  }
  return cache.get(url)!;
}

export function useQuantiDataset(url: string) {
  const [data, setData] = useState<QuantiDataset | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchDataset(url)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [url]);

  return { data, error, loading };
}
