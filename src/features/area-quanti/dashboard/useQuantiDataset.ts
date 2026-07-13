import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DatasetRef } from './datasets';
import type { QuantiDataset } from './types';

const cache = new Map<string, Promise<QuantiDataset>>();

function parseDataset(text: string, label: string): QuantiDataset {
  try {
    return JSON.parse(text) as QuantiDataset;
  } catch (originalError) {
    const sanitized = text.replace(/(:|\[|,)\s*(NaN|Infinity|-Infinity)(?=\s*[,}\]])/g, '$1 null');
    if (sanitized === text) {
      throw new Error(
        `Dataset "${label}" inválido: ${(originalError as Error).message}`,
      );
    }

    try {
      return JSON.parse(sanitized) as QuantiDataset;
    } catch (sanitizedError) {
      throw new Error(
        `Dataset "${label}" inválido mesmo após normalização: ${(sanitizedError as Error).message}`,
      );
    }
  }
}

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
        return parseDataset(text, ref.label);
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
