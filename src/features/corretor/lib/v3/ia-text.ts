// Corretor v3.1 — passe de IA de TEXTO sobre o IR (ortografia/cidade/coerência).
// Batches de N slides por chamada à edge function analyze-text-batch.
// Custo estimado ANTES de rodar; IDs de achado estáveis por conteúdo.

import { supabase } from '@/integrations/supabase/client';
import { calculateCost, type ModelId } from '../cost-calculator';
import type { Ir, IrSlide } from '../audit/ir';
import { toAuditSection } from '../audit/ir';
import type { Finding } from '../audit/model';

const BATCH_SIZE = 12;
const MAX_CHARS_PER_SLIDE = 6000;

interface RawIaFinding {
  slide: number;
  type: string;
  description: string;
  evidence?: string;
  severity?: string;
}

function slideText(s: IrSlide): string {
  return (s.textos ?? []).join('\n').slice(0, MAX_CHARS_PER_SLIDE);
}

function slideTables(s: IrSlide): string {
  return (s.tabelas ?? [])
    .map((t) => t.linhas.map((r) => r.join(' | ')).join('\n'))
    .join('\n---\n')
    .slice(0, MAX_CHARS_PER_SLIDE);
}

/** Slides com texto suficiente para valer a revisão (pula capas/fotos). */
function reviewableSlides(ir: Ir): IrSlide[] {
  return ir.slides.filter((s) => slideText(s).length > 40);
}

// ── estimativa de custo (antes de rodar) ─────────────────────────────────────

export interface TextPassEstimate {
  slides: number;
  batches: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function estimateTextPass(ir: Ir, model: ModelId): TextPassEstimate {
  const slides = reviewableSlides(ir);
  const chars = slides.reduce((a, s) => a + slideText(s).length + slideTables(s).length, 0);
  const batches = Math.ceil(slides.length / BATCH_SIZE);
  const inputTokens = Math.ceil(chars / 4) + batches * 400; // prompt fixo por batch
  const outputTokens = batches * 350;
  return { slides: slides.length, batches, inputTokens, outputTokens, costUsd: calculateCost(inputTokens, outputTokens, model) };
}

// ── execução ─────────────────────────────────────────────────────────────────

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export interface TextPassResult {
  findings: Finding[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  batches: number;
}

export async function runTextPass(
  ir: Ir,
  city: string,
  model: ModelId,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<TextPassResult> {
  const slides = reviewableSlides(ir);
  const secao = new Map(ir.slides.map((s) => [s.n, toAuditSection(s.secao_canonica)]));
  const batches: IrSlide[][] = [];
  for (let i = 0; i < slides.length; i += BATCH_SIZE) batches.push(slides.slice(i, i + BATCH_SIZE));

  const findings: Finding[] = [];
  let inputTokens = 0, outputTokens = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    if (signal?.aborted) break;
    const batch = batches[bi];
    const { data, error } = await supabase.functions.invoke<{
      findings: RawIaFinding[]; inputTokens: number; outputTokens: number; error?: string;
    }>('analyze-text-batch', {
      body: {
        city,
        model,
        slides: batch.map((s) => ({ n: s.n, titulo: s.titulo ?? '', texto: slideText(s), tabelas: slideTables(s) })),
      },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    inputTokens += data?.inputTokens ?? 0;
    outputTokens += data?.outputTokens ?? 0;

    for (const raw of data?.findings ?? []) {
      const type = ['SPELLING', 'CITY_NAME', 'COHERENCE'].includes(raw.type) ? raw.type : 'SPELLING';
      const key = djb2(`${raw.type}|${raw.evidence ?? raw.description}`);
      findings.push({
        id: `iatxt-${raw.slide}-${type.toLowerCase()}-${key}`,
        type: type as Finding['type'],
        section: secao.get(raw.slide) ?? 'GLOBAL',
        slideRef: `s${raw.slide}`,
        title: raw.description.slice(0, 90),
        detail: raw.description,
        ok: false,
        viz: raw.evidence ? { kind: 'text', evidence: raw.evidence } : undefined,
      });
    }
    onProgress?.(bi + 1, batches.length);
  }

  return { findings, inputTokens, outputTokens, costUsd: calculateCost(inputTokens, outputTokens, model), batches: batches.length };
}
