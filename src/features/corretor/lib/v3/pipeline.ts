// Corretor v3 — orquestrador do PASSO ÚNICO (Gabriel, 11/jul).
// Ao subir o .pptx, roda TUDO sozinho: triagem DET (grátis) → IA de texto +
// visão (em paralelo) → cada achado pinga na worklist conforme chega. O custo é
// transparência (banner vivo + Pausar), não pedágio; só pede confirmação se a
// estimativa passar do teto (config.BUDGET_STUDY_BRL).

import type { Ir } from '../audit/ir';
import type { Finding } from '../audit/model';
import { irToFindings, reviewNoteBlindSpots } from '../audit/ir-rules';
import { applyDeclaredExclusions } from './declared-exclusions';
import type { ModelId } from '../cost-calculator';
import { estimateTextPass, runTextPass } from './ia-text';
import {
  findTableImages, type TableImageCandidate, type TableImageScan,
} from './table-images';
import { estimateVisionPass, runVisionPass, type VisionEstimate, type VisionPassResult, type FailedImage } from './ia-vision';
import { attachEvidenceImages } from './evidence';
import { reconcileDeckFindings } from './deck-reconcile';
import { findAtaImage, type AtaImageCandidate } from './ata-image';
import { estimateAtaPass, extractAtaFromImage, type AtaData } from './ia-ata';
import { usdToBrl, VISION_CONCURRENCY } from './config';
import { crossTableFindings, nativeTableRefs, projectionFindings, type CrossStats } from './cross-table';
import { ataCoverageFindings, requiredAndExclusionFindings, sourceFindingsFromVision } from './coverage-rules';
import type { Fonte } from './fonte';
import { sourceCrosscheckFindings, sourceCrosscheckVisionFindings, type SourceStats } from './source-crosscheck';

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
  fonte?: Fonte | null;
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
  /** Fonte numérica opcional; sem ela, o comportamento histórico é preservado. */
  fonte?: Fonte | null;
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

  const detFindings = [
    ...irToFindings(ir).filter((f) => !f.ok),
    ...(opts.fonte ? sourceCrosscheckFindings(ir, opts.fonte) : []),
  ];
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
  /** Valores do slide comparados com as planilhas e quantos bateram (resumo de acertos). */
  fonte?: SourceStats;
  /** Cruzamentos entre tabelas feitos e quantos bateram (resumo de acertos). */
  cruzamentos?: CrossStats;
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
  /** Outras cidades confirmadas pelo analista como parte do estudo. */
  outras?: string[];
  /** ata confirmada/editada (alimenta ATA_COVERAGE); pode ser null se sem ata */
  ata: AtaData | null;
  model: ModelId;
  candidates: TableImageCandidate[];
  /** Mesma fonte validada usada na fase 1, quando disponível. */
  fonte?: Fonte | null;
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
  // Fonte vinculada depois da triagem (no portão): o cruzamento DET roda aqui também.
  const acertos = { fonte: { comparados: 0, batem: 0 }, cruzamentos: { feitos: 0, batem: 0 } };
  if (opts.fonte) detFindings = detFindings.concat(sourceCrosscheckFindings(ir, opts.fonte, acertos.fonte));

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
    expected: { cidade: cityUsed, uf: uf ?? undefined, outras: opts.outras ?? [] },
    onProgress: (done, total) => onStage?.({ stage: 'visao', done, total }),
  }).then(async (res) => {
    // CH-6: o slide que declara exclusão (esgotados, garden, cobertura) explica o
    // total aberto — o achado desce para “Verificar” citando a nota, nunca “Erro”.
    res.findings = applyDeclaredExclusions(ir, res.findings);
    await attachEvidenceImages(res.findings, candidates);
    // Sem achados aqui: os de visão só são gravados depois da reconciliação do
    // deck (etapa “cruzamento”). Gravar os brutos aqui deixou 28 somas soltas no
    // estudo de João Pessoa (30/set).
    onStage?.({ stage: 'visao', done: candidates.length, total: candidates.length, spentUsd: res.costUsd });
    return res;
  });

  const [text, vision] = await Promise.all([textPromise, visionPromise]);
  const combined = combineVisionFindings(ir, vision, candidates, opts.fonte, acertos);
  const visionFindings = combined.visionFindings;
  await attachEvidenceImages(combined.crossFindings, candidates);
  onStage?.({ stage: 'cruzamento', done: 1, total: 1, findings: visionFindings });

  // Pista dirigida: slide com comentário da revisão e nenhum achado do motor é
  // candidato a regra faltante. Só faz sentido com texto e visão já concluídos.
  detFindings = detFindings.concat(
    reviewNoteBlindSpots(ir, [...detFindings, ...text.findings, ...visionFindings])
  );

  const report: AnalysisReport = {
    ...(opts.fonte ? { fonte: acertos.fonte } : {}),
    cruzamentos: acertos.cruzamentos,
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
 * Visão + cruzamentos + cobertura → lista final de achados de imagem. PURA:
 * o site e o replay dos testes usam a mesma função sobre o mesmo passe.
 * `crossFindings` são os novos desta etapa (recebem evidência depois).
 */
export function combineVisionFindings(
  ir: Ir, vision: VisionPassResult, candidates: TableImageCandidate[], fonte?: Fonte | null,
  acertos?: { fonte: SourceStats; cruzamentos: CrossStats },
): { visionFindings: Finding[]; crossFindings: Finding[] } {
  const unread = unreadImageFindings(candidates, vision.failed ?? []);
  const refs = nativeTableRefs(ir).concat(vision.tables.map((table) => ({ ...table, source: 'vision' as const })));
  const cross = crossTableFindings(ir, vision.tables, acertos?.cruzamentos);
  const projection = projectionFindings(refs);
  const coverage = [
    ...sourceFindingsFromVision(ir, vision.sourceSlides, vision.analyzedSlides),
    ...requiredAndExclusionFindings(ir, refs),
  ];
  const sourceCrosscheck = fonte ? sourceCrosscheckVisionFindings(ir, fonte, vision.tables, acertos?.fonte) : [];
  const crossFindings = applyDeclaredExclusions(ir, [...cross, ...projection, ...coverage, ...sourceCrosscheck].filter((f) => !f.ok));
  const visionFindings = reconcileDeckFindings([...vision.findings.filter((f) => !f.ok), ...crossFindings, ...unread], vision.tables);
  const kept = new Set(visionFindings.map((f) => f.id));
  return { visionFindings, crossFindings: [...crossFindings, ...unread].filter((f) => kept.has(f.id)).concat(visionFindings.filter((f) => f.id === 'vision-unsafe-sums')) };
}

/**
 * Cobertura explícita: imagem com cara de tabela que não foi lida vira um aviso
 * por slide. Antes ela simplesmente não existia no relatório, e "nenhum erro"
 * era indistinguível de "nada conferido" (v2 do SJC, set/2026).
 */
export function unreadImageFindings(candidates: TableImageCandidate[], failed: FailedImage[] = []): Finding[] {
  const skipped = [...((candidates as TableImageScan).skipped ?? []), ...failed];
  if (!skipped.length) return [];
  // Um aviso só, com a lista: 30 cartões iguais escondiam os achados de verdade.
  const slides = [...new Set(skipped.map((s) => `s${s.slide}`))];
  const motivos = [...new Set(skipped.map((s) => s.motivo))];
  return [{
    id: 'image-not-read',
    type: 'IMAGE_NOT_READ' as const,
    section: toAuditSectionSafe(skipped[0].secao),
    slideRef: slides[0],
    title: `Imagens de tabela não lidas (${skipped.length} em ${slides.length} slide${slides.length > 1 ? 's' : ''})`,
    detail: `${motivos.join('; ')}: ${slides.join(', ')}. Os números dessas imagens não foram conferidos; revise manualmente ou cole as tabelas como PNG.`,
    ok: false,
    confidence: 3 as const,
    origem: 'DET',
    viz: { kind: 'text' as const, evidence: skipped.map((i) => `${i.name.split('/').pop()} (${i.kb} KB)`).join('; ') },
  }];
}

function toAuditSectionSafe(secao: string | null): Finding['section'] {
  const s = (secao ?? '').toUpperCase();
  return (['SOCIO', 'MERCADO', 'LACUNAS', 'ABSORCAO'].includes(s) ? s : 'GLOBAL') as Finding['section'];
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
    model, signal, onStage, fonte: opts.fonte,
    candidates: opts.candidates, ataCandidate: opts.ataCandidate,
  });
  const p2 = await runPhase2(ir, {
    city, uf: p1.ata?.uf ?? null, ata: p1.ata, model,
    candidates: p1.candidates, signal, onStage, fonte: opts.fonte,
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
