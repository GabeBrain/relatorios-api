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

export type Stage = 'det' | 'ata' | 'texto' | 'visao' | 'cruzamento';

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

// ── FASE 1 — DET + ata (barata; roda antes do portão de confirmação) ──────────

export interface Phase1Result {
  detFindings: Finding[];
  ata: AtaData | null;
  ataCostUsd: number;
  ataTokens: { input: number; output: number };
  candidates: TableImageCandidate[];
  ataCandidate: AtaImageCandidate | null;
}

export interface RunPhase1Opts {
  model: ModelId;
  candidates?: TableImageCandidate[];
  ataCandidate?: AtaImageCandidate | null;
  signal?: AbortSignal;
  onStage?: (p: StageProgress) => void;
}

/**
 * Fase 1 do passo único: triagem DET (grátis) + extração da ata (barata). Nada de
 * texto/visão paga roda aqui — a cidade/UF que a ata revela é confirmada pelo
 * analista no portão (WS-1) ANTES de gastar. `detFindings` já inclui a UF e a
 * cobertura da ata quando disponíveis.
 */
export async function runPhase1(
  ir: Ir,
  bytes: Uint8Array,
  opts: RunPhase1Opts
): Promise<Phase1Result> {
  const { model, signal, onStage } = opts;

  let detFindings = irToFindings(ir).filter((f) => !f.ok);
  onStage?.({ stage: 'det', done: 1, total: 1, findings: detFindings });

  const candidates = opts.candidates ?? (await findTableImages(bytes, ir));
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

  return {
    detFindings, ata, ataCostUsd, ataTokens: { input: ataIn, output: ataOut },
    candidates, ataCandidate: ataCand,
  };
}

// ── FASE 2 — texto + visão + cruzamentos (paga; roda após a confirmação) ──────

/**
 * Snapshot do trabalho POSITIVO da análise (attestation / WS-2). O que fechou é
 * descartado dos findings (só problemas persistem), então guardamos as contagens
 * aqui para o relatório de entrega mostrar "o que foi verificado".
 */
export interface AnalysisReport {
  tabelasExtraidas: number;
  tabelasVerificadas: number;   // extraídas sem achado de soma/%/faixa
  imagensAnalisadas: number;
  tabelasNativas: number;       // tabelas nativas do PPTX conferidas por DET
  geradoEm: string;
}

export interface Phase2Result {
  detFindings: Finding[];
  textFindings: Finding[];
  visionFindings: Finding[];
  cityUsed: string;
  report: AnalysisReport;
  textCostUsd: number;
  visionCostUsd: number;
  textTokens: { input: number; output: number };
  visionTokens: { input: number; output: number };
  visionEscalated: number;
  aborted: boolean;
}

export interface RunPhase2Opts {
  /** cidade/UF JÁ confirmadas pelo analista no portão (regra do CITY_NAME/WRONG_CONTEXT) */
  city: string;
  uf?: string | null;
  /** ata confirmada/editada (alimenta ATA_COVERAGE); pode ser null se sem ata */
  ata: AtaData | null;
  model: ModelId;
  candidates: TableImageCandidate[];
  signal?: AbortSignal;
  onStage?: (p: StageProgress) => void;
}

/**
 * Fase 2: texto + visão em paralelo, depois cruzamentos. Recebe a cidade/UF JÁ
 * confirmadas (não re-extrai a ata). Reexecuta o DET com a UF confirmada — barato,
 * IDs estáveis evitam duplicata — e recalcula a cobertura da ata com a versão
 * editada pelo analista.
 */
export async function runPhase2(
  ir: Ir,
  opts: RunPhase2Opts
): Promise<Phase2Result> {
  const { city, uf, ata, model, candidates, signal, onStage } = opts;
  const cityUsed = city.trim() || ata?.cidade?.trim() || '';

  // DET com a UF confirmada + cobertura da ata editada.
  let detFindings = irToFindings(ir, { city: cityUsed, uf }).filter((f) => !f.ok);
  detFindings = detFindings.concat(ataCoverageFindings(ir, ata).filter((f) => !f.ok));

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
    expected: { cidade: cityUsed, uf: uf ?? undefined },
    onProgress: (done, total) => onStage?.({ stage: 'visao', done, total }),
  }).then(async (res) => {
    await attachEvidenceImages(res.findings, candidates);
    onStage?.({ stage: 'visao', done: candidates.length, total: candidates.length, findings: res.findings, spentUsd: res.costUsd });
    return res;
  });

  const [text, vision] = await Promise.all([textPromise, visionPromise]);
  const refs = nativeTableRefs(ir).concat(vision.tables.map((table) => ({ ...table, source: 'vision' as const })));
  const cross = crossTableFindings(ir, vision.tables);
  const projection = projectionFindings(refs);
  const coverage = [
    ...sourceFindingsFromVision(ir, vision.sourceSlides, vision.analyzedSlides),
    ...requiredAndExclusionFindings(ir, refs),
  ];
  const visionFindings = [...vision.findings, ...cross, ...projection, ...coverage].filter((f) => !f.ok);
  const crossFindings = [...cross, ...projection, ...coverage].filter((f) => !f.ok);
  await attachEvidenceImages(crossFindings, candidates);
  onStage?.({ stage: 'cruzamento', done: 1, total: 1, findings: crossFindings });

  const report: AnalysisReport = {
    tabelasExtraidas: vision.tablesExtracted,
    tabelasVerificadas: vision.tablesVerified,
    imagensAnalisadas: vision.analyzedSlides.length,
    tabelasNativas: nativeTableRefs(ir).length,
    geradoEm: new Date().toISOString(),
  };

  return {
    detFindings, textFindings: text.findings, visionFindings, cityUsed, report,
    textCostUsd: text.costUsd, visionCostUsd: vision.costUsd,
    textTokens: { input: text.inputTokens, output: text.outputTokens },
    visionTokens: { input: vision.inputTokens, output: vision.outputTokens },
    visionEscalated: vision.escalated,
    aborted: signal?.aborted ?? false,
  };
}

/**
 * Composição das duas fases sem portão — mantém o contrato antigo para testes e
 * para quem não usa o fluxo de confirmação. A UI de produção chama phase1 → portão
 * → phase2 (WS-1).
 */
export async function runFullAnalysis(
  ir: Ir,
  bytes: Uint8Array,
  opts: RunFullOpts
): Promise<FullAnalysisResult> {
  const { city, model, signal, onStage } = opts;
  const p1 = await runPhase1(ir, bytes, {
    model, signal, onStage,
    candidates: opts.candidates, ataCandidate: opts.ataCandidate,
  });
  const p2 = await runPhase2(ir, {
    city, uf: p1.ata?.uf ?? null, ata: p1.ata, model,
    candidates: p1.candidates, signal, onStage,
  });

  // detFindings da fase 2 já traz UF + cobertura; combina com a triagem inicial (IDs estáveis).
  const detIds = new Set(p1.detFindings.map((f) => f.id));
  const detFindings = [...p1.detFindings, ...p2.detFindings.filter((f) => !detIds.has(f.id))];

  return {
    detFindings,
    textFindings: p2.textFindings,
    visionFindings: p2.visionFindings,
    ata: p1.ata,
    cityUsed: p2.cityUsed,
    ataCostUsd: p1.ataCostUsd,
    ataTokens: p1.ataTokens,
    textCostUsd: p2.textCostUsd,
    visionCostUsd: p2.visionCostUsd,
    textTokens: p2.textTokens,
    visionTokens: p2.visionTokens,
    visionEscalated: p2.visionEscalated,
    aborted: p2.aborted,
  };
}
