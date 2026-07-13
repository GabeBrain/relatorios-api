import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DatasetRef } from './datasets';
import type { QuantiDataset } from './types';

const cache = new Map<string, Promise<QuantiDataset>>();

async function fetchDataset(ref: DatasetRef): Promise<QuantiDataset> {
  const key = `${ref.bucket}/${ref.path}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const { data, error } = await supabase.storage.from(ref.bucket).download(ref.path);
        if (error || !data) {
          throw new Error(`Falha ao carregar dataset "${ref.label}": ${error?.message ?? 'sem dados'}`);
        }
        const text = await data.text();
        return JSON.parse(text) as QuantiDataset;
      })(),
    );
  }
  return cache.get(key)!;
}

export function useQuantiDataset(ref: DatasetRef) {
  const [data, setData] = useState<QuantiDataset | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchDataset(ref)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [ref.bucket, ref.path]);

  return { data, error, loading };
}
