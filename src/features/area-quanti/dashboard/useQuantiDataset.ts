import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DatasetRef } from './datasets';
import type { QuantiDataset } from './types';

const cache = new Map<string, Promise<QuantiDataset>>();

interface ColumnarDataset {
  id: string;
  label: string;
  count: number;
  generated_at: string;
  columns: string[];
  questions?: string[] | Record<string, string>;
  rows: unknown[][];
}

function toNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    // Aceita "12000", "12.000", "12000,50" etc.
    const cleaned = v.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Reconcilia campos que a extração da Base Unificada 2020 grava com nomes
 * alternativos ou como string, para que os componentes do dashboard (KPIs,
 * histograma, gráficos) continuem lendo pelas chaves canônicas.
 */
function normalizeRecords(ds: QuantiDataset): QuantiDataset {
  const recs = (ds as any).records as any[] | undefined;
  if (!Array.isArray(recs)) return ds;
  for (const r of recs) {
    if (r.idade == null && r.idade_numerica != null) {
      const n = toNumber(r.idade_numerica);
      if (n != null) r.idade = n;
    } else if (typeof r.idade === 'string') {
      r.idade = toNumber(r.idade);
    }
    if (typeof r.renda_valor_estimado === 'string') {
      r.renda_valor_estimado = toNumber(r.renda_valor_estimado);
    }
  }
  return ds;
}

function expandColumnarDataset(raw: ColumnarDataset): QuantiDataset {
  const questions = Array.isArray(raw.questions)
    ? Object.fromEntries(raw.columns.map((column, index) => [column, raw.questions?.[index] ?? column]))
    : raw.questions;
  const records = raw.rows.map((row) => Object.fromEntries(raw.columns.map((column, index) => [column, row[index]])));
  return {
    id: raw.id,
    label: raw.label,
    count: raw.count ?? records.length,
    generated_at: raw.generated_at,
    questions,
    records: records as unknown as QuantiDataset['records'],
  };
}

function normalizeDataset(raw: QuantiDataset | ColumnarDataset): QuantiDataset {
  if (Array.isArray((raw as ColumnarDataset).columns) && Array.isArray((raw as ColumnarDataset).rows)) {
    return normalizeRecords(expandColumnarDataset(raw as ColumnarDataset));
  }
  return normalizeRecords(raw as QuantiDataset);
}

function parseDataset(text: string, label: string): QuantiDataset {
  const sanitize = (s: string) =>
    s.replace(/(:|\[|,)\s*(NaN|Infinity|-Infinity)(?=\s*[,}\]])/g, '$1 null');
  try {
    return normalizeDataset(JSON.parse(text) as QuantiDataset | ColumnarDataset);
  } catch (originalError) {
    const sanitized = sanitize(text);
    if (sanitized === text) {
      throw new Error(
        `Dataset "${label}" inválido: ${(originalError as Error).message}`,
      );
    }
    try {
      return normalizeDataset(JSON.parse(sanitized) as QuantiDataset | ColumnarDataset);
    } catch (sanitizedError) {
      throw new Error(
        `Dataset "${label}" inválido mesmo após normalização: ${(sanitizedError as Error).message}`,
      );
    }
  }
}

async function fetchDataset(ref: DatasetRef): Promise<QuantiDataset> {
  const source = ref.source ?? 'storage';
  const key = `${source}/${ref.bucket ?? ''}/${ref.path}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        if (source === 'public') {
          const response = await fetch(ref.path);
          if (!response.ok) {
            throw new Error(`Falha ao carregar dataset "${ref.label}": HTTP ${response.status}`);
          }
          return parseDataset(await response.text(), ref.label);
        }

        if (!ref.bucket) {
          throw new Error(`Dataset "${ref.label}" sem bucket configurado`);
        }

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
  }, [ref.source, ref.bucket, ref.path]);

  return { data, error, loading };
}
