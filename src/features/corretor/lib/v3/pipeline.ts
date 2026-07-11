// Corretor v3 — orquestrador do PASSO ÚNICO (Gabriel, 11/jul).
// Ao subir o .pptx, roda TUDO sozinho: triagem DET (grátis) → IA de texto +
// visão (em paralelo) → cada achado pinga na worklist conforme chega. O custo é
// transparência (banner vivo + Pausar), não pedágio; só pede confirmação se a
// estimativa passar do teto (config.BUDGET_STUDY_BRL).

import type { Ir } from '../audit/ir';
import type { Finding } from '../audit/model';
import { irToFindings } from '../audit/ir-rules';
import type { ModelId } from '../cost-calculator';
import { estimateTextPass, runTextPass } from './ia-text';
import {
  findTableImages, type TableImageCandidate,
} from './table-images';
import { estimateVisionPass, runVisionPass, type VisionEstimate } from './ia-vision';
import { attachEvidenceImages } from './evidence';
import { usdToBrl, VISION_CONCURRENCY } from './config';

// ── estimativa combinada (antes de gastar) ────────────────────────────────────

export interface FullEstimate {
  textSlides: number;
  visionCandidates: number;
  visionCached: number;
  visionToRun: number;
  costUsd: number;
  costBrl: number;
  vision: VisionEstimate;
  candidates: TableImageCandidate[];
}

export async function estimateFullAnalysis(
  ir: Ir,
  bytes: Uint8Array,
  model: ModelId
): Promise<FullEstimate> {
  const candidates = await findTableImages(bytes, ir);
  const [text, vision] = await Promise.all([
    Promise.resolve(estimateTextPass(ir, model)),
    estimateVisionPass(candidates, model),
  ]);
  const costUsd = text.costUsd + vision.costUsd;
  return {
    textSlides: text.slides,
    visionCandidates: candidates.length,
    visionCached: vision.cached,
    visionToRun: vision.toRun,
    costUsd,
    costBrl: usdToBrl(costUsd),
    vision,
    candidates,
  };
}

// ── execução do passo único ───────────────────────────────────────────────────

export type Stage = 'det' | 'texto' | 'visao';

export interface StageProgress {
  stage: Stage;
  done: number;
  total: number;
  /** achados novos desta etapa, para pingar na worklist assim que chegam */
  findings?: Finding[];
  spentUsd?: number;
}

export interface FullAnalysisResult {
  detFindings: Finding[];
  textFindings: Finding[];
  visionFindings: Finding[];
  textCostUsd: number;
  visionCostUsd: number;
  textTokens: { input: number; output: number };
  visionTokens: { input: number; output: number };
  /** imagens que precisaram escalar do mini p/ o 4o (leitura divergiu) */
  visionEscalated: number;
  aborted: boolean;
}

export interface RunFullOpts {
  city: string;
  model: ModelId;
  /** candidatas já localizadas na estimativa (evita re-scan) */
  candidates?: TableImageCandidate[];
  signal?: AbortSignal;
  onStage?: (p: StageProgress) => void;
}

/**
 * Roda a análise completa sobre um estudo já com IR extraído. A triagem DET é
 * síncrona (grátis, instantânea); texto e visão correm em paralelo e reportam
 * progresso + achados incrementais. `signal` pausa/cancela (o que a visão já
 * extraiu fica no cache; nada se perde).
 */
export async function runFullAnalysis(
  ir: Ir,
  bytes: Uint8Array,
  opts: RunFullOpts
): Promise<FullAnalysisResult> {
  const { city, model, signal, onStage } = opts;

  // 1. DET — instantâneo
  const detFindings = irToFindings(ir).filter((f) => !f.ok);
  onStage?.({ stage: 'det', done: 1, total: 1, findings: detFindings });

  const candidates = opts.candidates ?? (await findTableImages(bytes, ir));

  // 2. texto + visão em paralelo
  const textPromise = runTextPass(
    ir, city, model,
    (done, total) => onStage?.({ stage: 'texto', done, total }),
    signal
  ).then((res) => {
    onStage?.({ stage: 'texto', done: res.batches, total: res.batches, findings: res.findings, spentUsd: res.costUsd });
    return res;
  });

  const visionPromise = runVisionPass(candidates, model, {
    concurrency: VISION_CONCURRENCY,
    signal,
    onProgress: (done, total) => onStage?.({ stage: 'visao', done, total }),
  }).then(async (res) => {
    // persiste a imagem original de cada achado → evidência visual na correção
    await attachEvidenceImages(res.findings, candidates);
    onStage?.({ stage: 'visao', done: candidates.length, total: candidates.length, findings: res.findings, spentUsd: res.costUsd });
    return res;
  });

  const [text, vision] = await Promise.all([textPromise, visionPromise]);

  return {
    detFindings,
    textFindings: text.findings,
    visionFindings: vision.findings,
    textCostUsd: text.costUsd,
    visionCostUsd: vision.costUsd,
    textTokens: { input: text.inputTokens, output: text.outputTokens },
    visionTokens: { input: vision.inputTokens, output: vision.outputTokens },
    visionEscalated: vision.escalated,
    aborted: signal?.aborted ?? false,
  };
}
