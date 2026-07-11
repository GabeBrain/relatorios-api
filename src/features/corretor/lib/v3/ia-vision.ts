// Corretor v3.2 — passe de VISÃO sobre as imagens de tabela (Fase C produtizada).
// Cache por sha1 no Supabase (vision_cache): cada imagem é paga UMA vez.
// A redundância linha×coluna×total auto-valida a extração (fase_c_visao.md).

import { supabase } from '@/integrations/supabase/client';
import { calculateCost, calculateImageTokens, type ModelId } from '../cost-calculator';
import { checkTableSums, detectBinGap } from '../audit/engine';
import { toAuditSection } from '../audit/ir';
import type { Cell, ExtractedTable, Finding, Bin } from '../audit/model';
import type { TableImageCandidate } from './table-images';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface RawTable {
  title?: string;
  columns?: unknown[];
  rows?: unknown[][];
  totals?: unknown[];
}
interface CachePayload { tables: RawTable[] }

// ── estimativa (antes de rodar) ───────────────────────────────────────────────

export interface VisionEstimate {
  candidates: number;
  cached: number;
  toRun: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function estimateVisionPass(
  candidates: TableImageCandidate[],
  model: ModelId
): Promise<VisionEstimate> {
  const shas = candidates.map((c) => c.sha1);
  const { data } = await db.from('vision_cache').select('sha1').in('sha1', shas);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedSet = new Set((data ?? []).map((r: any) => r.sha1 as string));
  const toRun = candidates.filter((c) => !cachedSet.has(c.sha1));
  const inputTokens = toRun.reduce((a, c) => a + calculateImageTokens(c.w, c.h, model) + 450, 0);
  const outputTokens = toRun.length * 700;
  return {
    candidates: candidates.length,
    cached: cachedSet.size,
    toRun: toRun.length,
    inputTokens,
    outputTokens,
    costUsd: calculateCost(inputTokens, outputTokens, model),
  };
}

// ── execução ──────────────────────────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function normCell(v: unknown): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  return String(v);
}

function toExtracted(raw: RawTable): ExtractedTable | null {
  const columns = (raw.columns ?? []).map((c) => String(c ?? ''));
  const rows = (raw.rows ?? []).map((r) => (r ?? []).map(normCell));
  if (!columns.length || rows.length < 2) return null;
  return {
    title: String(raw.title ?? 'Tabela'),
    columns,
    rows,
    totals: raw.totals ? raw.totals.map(normCell) : undefined,
  };
}

/** Faixas "9001-9500" / "Acima de 10000" nos cabeçalhos → Bin[] p/ checar furo. */
function binsFromColumns(columns: string[]): Bin[] {
  const bins: Bin[] = [];
  for (const c of columns) {
    const clean = c.replace(/[R$\s.]/g, '');
    let m = clean.match(/^(?:até)?(\d+)-(\d+)/i) ?? clean.match(/^de(\d+)a(\d+)/i);
    if (m) { bins.push({ label: c, from: parseInt(m[1], 10), to: parseInt(m[2], 10) }); continue; }
    m = clean.match(/^acimade(\d+)/i);
    if (m) bins.push({ label: c, from: parseInt(m[1], 10), to: null });
  }
  return bins;
}

export interface VisionPassResult {
  findings: Finding[];
  tablesExtracted: number;
  tablesVerified: number;
  fromCache: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface VisionPassOpts {
  onProgress?: (done: number, total: number) => void;
  /** Imagens processadas simultaneamente (default 1 = sequencial). */
  concurrency?: number;
  /** Pausar/cancelar o passe — o que já foi extraído fica no cache. */
  signal?: AbortSignal;
}

/** Extrai + auto-valida UMA imagem. Atualiza o cache; retorna achados + tokens. */
async function processImage(
  c: TableImageCandidate,
  model: ModelId
): Promise<{ findings: Finding[]; tablesExtracted: number; tablesVerified: number; fromCache: number; inputTokens: number; outputTokens: number }> {
  const findings: Finding[] = [];
  let tablesExtracted = 0, tablesVerified = 0, fromCache = 0, inputTokens = 0, outputTokens = 0;

  // cache primeiro — imagem já extraída não é paga de novo
  let payload: CachePayload | null = null;
  const { data: hit } = await db.from('vision_cache').select('payload').eq('sha1', c.sha1).maybeSingle();
  if (hit?.payload) {
    payload = hit.payload as CachePayload;
    fromCache = 1;
  } else {
    const { data, error } = await supabase.functions.invoke<{
      tables: RawTable[]; inputTokens: number; outputTokens: number; error?: string;
    }>('analyze-table-image', {
      body: {
        base64: toBase64(c.bytes),
        mime: c.mime,
        model,
        contexto: `slide ${c.slide} · ${c.titulo ?? ''} · seção ${c.secao ?? '?'}`,
      },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    inputTokens += data?.inputTokens ?? 0;
    outputTokens += data?.outputTokens ?? 0;
    payload = { tables: data?.tables ?? [] };
    await db.from('vision_cache').upsert({
      sha1: c.sha1, payload,
      input_tokens: data?.inputTokens ?? 0, output_tokens: data?.outputTokens ?? 0,
    });
  }

  // checagens DET sobre o extraído
  const secao = toAuditSection(c.secao);
  (payload?.tables ?? []).forEach((raw, ti) => {
    const ext = toExtracted(raw);
    if (!ext) return;
    tablesExtracted++;

    if (ext.totals) {
      const viz = checkTableSums(ext, { absTol: Math.max(0.5, ext.rows.length / 2) });
      const bad = (viz.badColumns?.length ?? 0) + (viz.badRows?.length ?? 0);
      if (bad > 0) {
        findings.push({
          id: `iavis-sum-${c.sha1.slice(0, 10)}-${ti}`,
          type: 'ABSOLUTE_SUM',
          section: secao,
          slideRef: `s${c.slide}`,
          title: `Tabela não fecha no total (${ext.title.slice(0, 50)})`,
          detail: `Números extraídos da imagem do slide ${c.slide} por visão (auto-validados por linha×coluna×total). Pode ser bug do estudo OU dígito mal lido — confira na imagem.`,
          ok: false,
          viz,
          evidenceSha1: c.sha1,
        });
      } else {
        tablesVerified++;
      }
    }

    const bins = binsFromColumns(ext.columns);
    if (bins.length >= 3) {
      const gap = detectBinGap(bins);
      if (gap.gapAfterIndex !== undefined) {
        findings.push({
          id: `iavis-bin-${c.sha1.slice(0, 10)}-${ti}`,
          type: 'BINNING_RULE',
          section: secao,
          slideRef: `s${c.slide}`,
          title: 'Furo/sobreposição nas faixas da tabela',
          detail: gap.description ?? 'Sequência de faixas inconsistente.',
          ok: false,
          viz: { kind: 'binrange', unit: '', bins, gapAfterIndex: gap.gapAfterIndex, gapDescription: gap.description },
          evidenceSha1: c.sha1,
        });
      }
    }
  });

  return { findings, tablesExtracted, tablesVerified, fromCache, inputTokens, outputTokens };
}

export async function runVisionPass(
  candidates: TableImageCandidate[],
  model: ModelId,
  opts: VisionPassOpts | ((done: number, total: number) => void) = {}
): Promise<VisionPassResult> {
  // compat: aceitava um callback de progresso posicional
  const o: VisionPassOpts = typeof opts === 'function' ? { onProgress: opts } : opts;
  const concurrency = Math.max(1, o.concurrency ?? 1);

  const findings: Finding[] = [];
  let tablesExtracted = 0, tablesVerified = 0, fromCache = 0, inputTokens = 0, outputTokens = 0, done = 0;

  let next = 0;
  async function worker() {
    while (next < candidates.length) {
      if (o.signal?.aborted) return;
      const i = next++;
      const r = await processImage(candidates[i], model);
      findings.push(...r.findings);
      tablesExtracted += r.tablesExtracted;
      tablesVerified += r.tablesVerified;
      fromCache += r.fromCache;
      inputTokens += r.inputTokens;
      outputTokens += r.outputTokens;
      o.onProgress?.(++done, candidates.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker));

  return {
    findings, tablesExtracted, tablesVerified, fromCache,
    inputTokens, outputTokens,
    costUsd: calculateCost(inputTokens, outputTokens, model),
  };
}
