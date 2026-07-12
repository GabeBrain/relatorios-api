// Corretor v3.3 (Fase A da ata) — extração da ata de abertura para JSON estruturado.
// Cache-first no vision_cache (sha1 da imagem, ou do texto no caso DOCX); cada ata é
// paga uma vez. Extração da LLM é HIPÓTESE — o analista revisa (fases B/C).

import { supabase } from '@/integrations/supabase/client';
import { calculateCost, type ModelId } from '../cost-calculator';
import type { AtaImageCandidate } from './ata-image';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface AtaProduto {
  torres: number | null;
  unidades: number | null;
  dorms: number[] | null;
  m2_min: number | null;
  m2_max: number | null;
  vagas_pct: number | null;
  programa: string | null;
}

export interface AtaData {
  cliente: string | null;
  projeto: string | null;
  cidade: string | null;
  uf: string | null;
  endereco: string | null;
  bairro: string | null;
  area_terreno_m2: number | null;
  produto: AtaProduto | null;
  preco_m2_viabilidade: number | null;
  duvidas_cliente: string[];
  pedidos_analista: string[];
}

export interface AtaExtractResult {
  ata: AtaData | null;
  fromCache: boolean;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

async function callEdge(body: Record<string, unknown>): Promise<{ ata: AtaData | null; inputTokens: number; outputTokens: number }> {
  const { data, error } = await supabase.functions.invoke<{
    ata: AtaData | null; inputTokens: number; outputTokens: number; error?: string;
  }>('analyze-ata-image', { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { ata: data?.ata ?? null, inputTokens: data?.inputTokens ?? 0, outputTokens: data?.outputTokens ?? 0 };
}

/** Extrai a ata de uma IMAGEM (print colado no slide). Cache por sha1. */
export async function extractAtaFromImage(c: AtaImageCandidate, model: ModelId): Promise<AtaExtractResult> {
  const cacheKey = `ata:${c.sha1}`;
  const { data: hit } = await db.from('vision_cache').select('payload').eq('sha1', cacheKey).maybeSingle();
  if (hit?.payload?.ata !== undefined) {
    return { ata: hit.payload.ata as AtaData | null, fromCache: true, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }
  const res = await callEdge({ base64: toBase64(c.bytes), mime: c.mime, model });
  await db.from('vision_cache').upsert({
    sha1: cacheKey, payload: { ata: res.ata },
    input_tokens: res.inputTokens, output_tokens: res.outputTokens,
    schema_version: 4, model,
  });
  return { ata: res.ata, fromCache: false, inputTokens: res.inputTokens, outputTokens: res.outputTokens, costUsd: calculateCost(res.inputTokens, res.outputTokens, model) };
}

/** Extrai a ata de um TEXTO (DOCX) — ~10× mais barato, sem visão. Cache por sha1 do texto. */
export async function extractAtaFromText(texto: string, sha1: string, model: ModelId): Promise<AtaExtractResult> {
  const cacheKey = `ata:${sha1}`;
  const { data: hit } = await db.from('vision_cache').select('payload').eq('sha1', cacheKey).maybeSingle();
  if (hit?.payload?.ata !== undefined) {
    return { ata: hit.payload.ata as AtaData | null, fromCache: true, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }
  const res = await callEdge({ texto, model });
  await db.from('vision_cache').upsert({
    sha1: cacheKey, payload: { ata: res.ata },
    input_tokens: res.inputTokens, output_tokens: res.outputTokens,
    schema_version: 4, model,
  });
  return { ata: res.ata, fromCache: false, inputTokens: res.inputTokens, outputTokens: res.outputTokens, costUsd: calculateCost(res.inputTokens, res.outputTokens, model) };
}
