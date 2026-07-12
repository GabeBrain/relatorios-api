// Corretor v3.2 — passe de VISÃO sobre as imagens de tabela (Fase C produtizada).
// Cache por sha1 no Supabase (vision_cache): cada imagem é paga UMA vez.
// A redundância linha×coluna×total auto-valida a extração (fase_c_visao.md).

import { supabase } from '@/integrations/supabase/client';
import { calculateCost, calculateImageTokens, type ModelId } from '../cost-calculator';
import { checkTableSums, checkPercentConsistency, detectBinGap } from '../audit/engine';
import { toAuditSection } from '../audit/ir';
import type { Cell, ColKind, ExtractedTable, Finding, Bin } from '../audit/model';
import type { TableImageCandidate } from './table-images';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// Versão da lógica de extração/validação. Ao subir (novas checagens, escalonamento),
// o cache antigo (schema menor) é reprocessado — extração ruim não fica presa pra sempre.
// v4: semântica declarada (col_kinds/total_kind/share_of) capturada na extração e usada
//     como hipótese verificada pela aritmética (participação vs taxa vs média).
const CACHE_SCHEMA = 4;

interface RawTable {
  title?: string;
  columns?: unknown[];
  rows?: unknown[][];
  totals?: unknown[];
  col_kinds?: unknown[];
  total_kind?: unknown;
  share_of?: Record<string, unknown>;
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
  const { data } = await db.from('vision_cache').select('sha1, schema_version').in('sha1', shas);
  // só conta como cache o que foi gerado pela versão ATUAL da lógica (senão reprocessa)
  const cachedSet = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).filter((r: any) => (r.schema_version ?? 1) >= CACHE_SCHEMA).map((r: any) => r.sha1 as string)
  );
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

/** Exportada para teste (regressão do realinhamento de totais — caso s28). */
export function toExtracted(raw: RawTable): ExtractedTable | null {
  const columns = (raw.columns ?? []).map((c) => String(c ?? ''));
  const rows = (raw.rows ?? []).map((r) => (r ?? []).map(normCell));
  if (!columns.length || rows.length < 2) return null;

  let totals = raw.totals ? raw.totals.map(normCell) : undefined;
  // Realinha os totais quando a visão derruba o rótulo ("Total") e os valores
  // escorregam uma célula à esquerda (caso real s28: 16.848.551 caiu na coluna
  // de rótulos e cada total foi comparado com a coluna errada). Sinal: a 1ª
  // célula dos totais é NÚMERO enquanto as linhas têm rótulo de texto.
  let shifted = false;
  if (totals && typeof totals[0] === 'number' && typeof rows[0]?.[0] === 'string') {
    totals = ['Total', ...totals];
    shifted = true;
  }

  const KINDS = new Set<ColKind>(['label', 'count', 'share', 'rate', 'measure', 'other']);
  const colKinds = Array.isArray(raw.col_kinds)
    ? raw.col_kinds.map((k) => (KINDS.has(String(k) as ColKind) ? (String(k) as ColKind) : 'other'))
    : undefined;
  const tk = String(raw.total_kind ?? '');
  const totalKind = (['sum', 'mean', 'mixed', 'none'] as const).find((v) => v === tk);
  let shareOf: Record<number, number> | undefined;
  if (raw.share_of && typeof raw.share_of === 'object') {
    shareOf = {};
    for (const [k, v] of Object.entries(raw.share_of)) {
      const ki = Number(k), vi = Number(v);
      if (Number.isInteger(ki) && Number.isInteger(vi)) shareOf[ki] = vi;
    }
  }

  return {
    title: String(raw.title ?? 'Tabela'),
    columns,
    rows,
    totals,
    // se os totais foram deslocados, os índices de col_kinds/share_of continuam
    // válidos (a inserção do rótulo restaura o alinhamento coluna↔índice)
    colKinds: colKinds && colKinds.length === columns.length ? colKinds : undefined,
    totalKind,
    shareOf: shifted ? undefined : shareOf, // em caso de desalinhamento, não confia nos índices
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
  /** quantas imagens precisaram escalar do mini p/ o 4o (leitura divergiu) */
  escalated: number;
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

/**
 * Amplia a imagem 2× (limitada a 2048px no lado maior) para a RE-leitura: mais
 * pixels por dígito = OCR melhor exatamente onde a 1ª leitura divergiu. Dígito
 * pequeno com separador de milhar (34.090 → 34.909) é o erro típico que isso
 * mitiga. Best-effort: sem OffscreenCanvas (testes/node), devolve null e a
 * re-leitura usa a imagem original.
 */
async function upscaleForRetry(c: TableImageCandidate): Promise<{ base64: string; mime: string } | null> {
  try {
    if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
    const bmp = await createImageBitmap(new Blob([c.bytes as BlobPart], { type: c.mime }));
    const scale = Math.min(2, 2048 / Math.max(bmp.width, bmp.height));
    if (scale <= 1.1) return null; // já é grande — ampliar não acrescenta
    const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return { base64: toBase64(new Uint8Array(await blob.arrayBuffer())), mime: 'image/png' };
  } catch {
    return null;
  }
}

/** Chama a edge de visão para UMA imagem com um modelo específico (sem cache). */
async function extractWithModel(
  c: TableImageCandidate,
  model: ModelId,
  imageOverride?: { base64: string; mime: string } | null
): Promise<{
  payload: CachePayload; inputTokens: number; outputTokens: number;
}> {
  const { data, error } = await supabase.functions.invoke<{
    tables: RawTable[]; inputTokens: number; outputTokens: number; error?: string;
  }>('analyze-table-image', {
    body: {
      base64: imageOverride?.base64 ?? toBase64(c.bytes),
      mime: imageOverride?.mime ?? c.mime,
      model,
      contexto: `slide ${c.slide} · ${c.titulo ?? ''} · seção ${c.secao ?? '?'}`,
    },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return {
    payload: { tables: data?.tables ?? [] },
    inputTokens: data?.inputTokens ?? 0,
    outputTokens: data?.outputTokens ?? 0,
  };
}

/** true se TODAS as tabelas do payload passam nas auto-validações (soma + %↔abs). */
function payloadIsClean(payload: CachePayload): boolean {
  for (const raw of payload.tables ?? []) {
    const ext = toExtracted(raw);
    if (!ext) continue;
    if (ext.totals) {
      const v = checkTableSums(ext, { absTol: Math.max(0.5, ext.rows.length / 2) });
      if ((v.badColumns?.length ?? 0) + (v.badRows?.length ?? 0) > 0) return false;
    }
    const pc = checkPercentConsistency(ext);
    if (pc && (pc.badRows?.length ?? 0) > 0) return false;
  }
  return true;
}

/**
 * Extrai + auto-valida UMA imagem, com ESCALONAMENTO: se o modelo econômico (mini)
 * produz uma extração que não fecha (soma OU %↔absoluto), re-lê a MESMA imagem no
 * gpt-4o (OCR melhor) antes de incomodar o analista. Cacheia a melhor leitura com
 * schema_version + modelo. Cache antigo (schema < atual) é reprocessado.
 */
async function processImage(
  c: TableImageCandidate,
  model: ModelId
): Promise<{ findings: Finding[]; tablesExtracted: number; tablesVerified: number; fromCache: number; inputTokens: number; outputTokens: number; costUsd: number; escalated: boolean }> {
  const findings: Finding[] = [];
  let tablesExtracted = 0, tablesVerified = 0, fromCache = 0, inputTokens = 0, outputTokens = 0, costUsd = 0;
  let escalated = false;
  let usedModel = model;

  // cache primeiro — só vale se foi gerado pela versão ATUAL da lógica
  let payload: CachePayload | null = null;
  const { data: hit } = await db.from('vision_cache')
    .select('payload, schema_version, model').eq('sha1', c.sha1).maybeSingle();
  if (hit?.payload && (hit.schema_version ?? 1) >= CACHE_SCHEMA) {
    payload = hit.payload as CachePayload;
    usedModel = (hit.model as ModelId) ?? model;
    fromCache = 1;
  } else {
    const first = await extractWithModel(c, model);
    inputTokens += first.inputTokens;
    outputTokens += first.outputTokens;
    costUsd += calculateCost(first.inputTokens, first.outputTokens, model);
    payload = first.payload;

    // escalonamento: extração barata que não fecha → confirma no 4o (preço próprio),
    // com a imagem AMPLIADA 2× (mais pixels por dígito na leitura decisiva)
    if (model === 'gpt-4o-mini' && !payloadIsClean(first.payload)) {
      const second = await extractWithModel(c, 'gpt-4o', await upscaleForRetry(c));
      inputTokens += second.inputTokens;
      outputTokens += second.outputTokens;
      costUsd += calculateCost(second.inputTokens, second.outputTokens, 'gpt-4o');
      escalated = true;
      usedModel = 'gpt-4o';
      // fica com a leitura que fecha; se ambas falham, fica com a do 4o (OCR melhor)
      payload = payloadIsClean(second.payload) || !payloadIsClean(first.payload)
        ? second.payload : first.payload;
    }

    await db.from('vision_cache').upsert({
      sha1: c.sha1, payload,
      input_tokens: inputTokens, output_tokens: outputTokens,
      schema_version: CACHE_SCHEMA, model: usedModel,
    });
  }

  // fonte da leitura, para o analista saber a confiança
  const origemLeitura = escalated
    ? 'confirmado no gpt-4o (após divergência no modelo econômico)'
    : `lido pelo modelo ${usedModel}`;

  const secao = toAuditSection(c.secao);
  (payload?.tables ?? []).forEach((raw, ti) => {
    const ext = toExtracted(raw);
    if (!ext) return;
    tablesExtracted++;
    let flagged = false;

    // 1) soma de coluna/linha × total declarado
    if (ext.totals) {
      const viz = checkTableSums(ext, { absTol: Math.max(0.5, ext.rows.length / 2) });
      if ((viz.badColumns?.length ?? 0) + (viz.badRows?.length ?? 0) > 0) {
        flagged = true;
        findings.push({
          id: `iavis-sum-${c.sha1.slice(0, 10)}-${ti}`,
          type: 'ABSOLUTE_SUM',
          section: secao,
          slideRef: `s${c.slide}`,
          title: `Tabela não fecha no total (${ext.title.slice(0, 50)})`,
          detail: `Números da imagem do slide ${c.slide} (${origemLeitura}). ${escalated ? 'Como o 4o confirmou, é provável bug real do estudo.' : 'Pode ser bug do estudo OU dígito mal lido — confira na imagem.'}`,
          ok: false,
          viz,
          evidenceSha1: c.sha1,
        });
      }
    }

    // 2) cross-check %↔absoluto (pega dígito mal lido mesmo com soma fechando)
    const pc = checkPercentConsistency(ext);
    if (pc && (pc.badRows?.length ?? 0) > 0) {
      flagged = true;
      findings.push({
        id: `iavis-pct-${c.sha1.slice(0, 10)}-${ti}`,
        type: 'PERCENTAGE_SUM',
        section: secao,
        slideRef: `s${c.slide}`,
        title: `Coluna % não bate com a absoluta (${ext.title.slice(0, 40)})`,
        detail: `${pc.notes?.[0] ?? 'Percentual inconsistente com o valor absoluto.'} (${origemLeitura})`,
        ok: false,
        viz: pc,
        evidenceSha1: c.sha1,
      });
    }

    // 3) furo de faixa
    const bins = binsFromColumns(ext.columns);
    if (bins.length >= 3) {
      const gap = detectBinGap(bins);
      if (gap.gapAfterIndex !== undefined) {
        flagged = true;
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

    if (!flagged) tablesVerified++;
  });

  return { findings, tablesExtracted, tablesVerified, fromCache, inputTokens, outputTokens, costUsd, escalated };
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
  let tablesExtracted = 0, tablesVerified = 0, fromCache = 0, inputTokens = 0, outputTokens = 0;
  let costUsd = 0, escalated = 0, done = 0;

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
      costUsd += r.costUsd;
      if (r.escalated) escalated += 1;
      o.onProgress?.(++done, candidates.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker));

  return {
    findings, tablesExtracted, tablesVerified, fromCache,
    inputTokens, outputTokens, escalated,
    costUsd,
  };
}
