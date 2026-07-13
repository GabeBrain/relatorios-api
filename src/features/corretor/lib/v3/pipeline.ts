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
import { findAtaImage, type AtaImageCandidate } from './ata-image';
import { estimateAtaPass, extractAtaFromImage, type AtaData } from './ia-ata';
import { usdToBrl, VISION_CONCURRENCY } from './config';
import { crossTableFindings, nativeTableRefs, projectionFindings } from './cross-table';
import { ataCoverageFindings, requiredAndExclusionFindings, sourceFindingsFromVision } from './coverage-rules';

// ── estimativa combinada (antes de gastar) ────────────────────────────────────

export interface FullEstimate {
  textSlides: number;
  visionCandidates: number;
  visionCached: number;
  visionToRun: number;
  hasAta: boolean;
  costUsd: number;
  costBrl: number;
  vision: VisionEstimate;
  candidates: TableImageCandidate[];
  ataCandidate: AtaImageCandidate | null;
}

export async function estimateFullAnalysis(
  ir: Ir,
  bytes: Uint8Array,
  model: ModelId
): Promise<FullEstimate> {
  const [candidates, ataCandidate] = await Promise.all([
    findTableImages(bytes, ir),
    findAtaImage(bytes, ir),
  ]);
  const [text, vision, ata] = await Promise.all([
    Promise.resolve(estimateTextPass(ir, model)),
    estimateVisionPass(candidates, model),
    estimateAtaPass(ataCandidate, model),
  ]);
  const costUsd = text.costUsd + vision.costUsd + ata.costUsd;
  return {
    textSlides: text.slides,
    visionCandidates: candidates.length,
    visionCached: vision.cached,
    visionToRun: vision.toRun,
    hasAta: ata.hasAta,
    costUsd,
    costBrl: usdToBrl(costUsd),
    vision,
    candidates,
    ataCandidate,
  };
}

// ── execução do passo único ───────────────────────────────────────────────────

export type Stage = 'det' | 'ata' | 'texto' | 'visao';

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
  /** ata extraída (null se não localizada) + cidade usada na revisão de texto */
  ata: AtaData | null;
  cityUsed: string;
  ataCostUsd: number;
  ataTokens: { input: number; output: number };
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
  /** candidata da ata já localizada na estimativa */
  ataCandidate?: AtaImageCandidate | null;
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
  let detFindings = irToFindings(ir).filter((f) => !f.ok);
  onStage?.({ stage: 'det', done: 1, total: 1, findings: detFindings });

  const candidates = opts.candidates ?? (await findTableImages(bytes, ir));

  // 2. ATA — roda ANTES do texto: a cidade extraída vira a régua do CITY_NAME.
  // Best-effort: falha na ata nunca bloqueia o resto (a cidade cai no fallback).
  const ataCand = opts.ataCandidate !== undefined ? opts.ataCandidate : await findAtaImage(bytes, ir);
  let ata: AtaData | null = null;
  let ataCostUsd = 0, ataIn = 0, ataOut = 0;
  if (ataCand && !signal?.aborted) {
    onStage?.({ stage: 'ata', done: 0, total: 1 });
    try {
      const res = await extractAtaFromImage(ataCand, model);
      ata = res.ata;
      ataCostUsd = res.costUsd; ataIn = res.inputTokens; ataOut = res.outputTokens;
    } catch { /* segue sem ata */ }
    onStage?.({ stage: 'ata', done: 1, total: 1, spentUsd: ataCostUsd });
  }
  const cityUsed = ata?.cidade?.trim() || city;
  // A UF vem da ata e só está disponível após a primeira triagem. Reexecutar a
  // camada DET é barato; IDs estáveis evitam duplicidade na persistência.
  if (ata?.uf) detFindings = irToFindings(ir, { uf: ata.uf }).filter((f) => !f.ok);
  // ATA_COVERAGE é determinística no primeiro corte; itens sem evidência ficam
  // explícitos para revisão, sem chamada adicional nem falso "coberto".
  detFindings.push(...ataCoverageFindings(ir, ata).filter((f) => !f.ok));

  // 3. texto (com a cidade da ata) + visão em paralelo
  const textPromise = runTextPass(
    ir, cityUsed, model,
    (done, total) => onStage?.({ stage: 'texto', done, total }),
    signal
  ).then((res) => {
    onStage?.({ stage: 'texto', done: res.batches, total: res.batches, findings: res.findings, spentUsd: res.costUsd });
    return res;
  });

  const visionPromise = runVisionPass(candidates, model, {
    concurrency: VISION_CONCURRENCY,
    signal,
    expected: { cidade: cityUsed, uf: ata?.uf },
    onProgress: (done, total) => onStage?.({ stage: 'visao', done, total }),
  });

  const [text, vision] = await Promise.all([textPromise, visionPromise]);
  const refs = nativeTableRefs(ir).concat(vision.tables.map((table) => ({ ...table, source: 'vision' as const })));
  const cross = crossTableFindings(ir, vision.tables);
  const projection = projectionFindings(refs);
  const coverage = [
    ...sourceFindingsFromVision(ir, vision.sourceSlides),
    ...requiredAndExclusionFindings(ir, refs),
  ];
  const visionFindings = [...vision.findings, ...cross, ...projection, ...coverage].filter((f) => !f.ok);
  // Persiste a imagem original de cada achado → evidência visual na correção.
  await attachEvidenceImages(visionFindings, candidates);
  onStage?.({ stage: 'visao', done: candidates.length, total: candidates.length, findings: visionFindings, spentUsd: vision.costUsd });

  return {
    detFindings,
    textFindings: text.findings,
    visionFindings,
    ata,
    cityUsed,
    ataCostUsd,
    ataTokens: { input: ataIn, output: ataOut },
    textCostUsd: text.costUsd,
    visionCostUsd: vision.costUsd,
    textTokens: { input: text.inputTokens, output: text.outputTokens },
    visionTokens: { input: vision.inputTokens, output: vision.outputTokens },
    visionEscalated: vision.escalated,
    aborted: signal?.aborted ?? false,
  };
}
