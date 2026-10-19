import { processingMessage } from '../lib/processing-message';
// Corretor v3 — fluxo unificado de correção (DESIGN_corretor_v3.md).
// v3.0: Triagem DET (R$ 0) → Corrigir → Reconferir (diff) → Entregar.
// v3.1: estágio "Aprofundar com IA" (texto em batch, custo estimado antes).
// Navegação sem rail duplo: landing com cards de estudos → workspace com voltar.

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { beginExecution, finishExecution, hasActiveExecution } from '../lib/v3/execution';
import StudyPreparationPage, { type PreparedStudy } from '../components/StudyPreparationPage';
import { summarizeStudy } from '../lib/study-summary';
import StudyQuickReview from '../components/StudyQuickReview';
import { presentFindingPt } from '../lib/v3/present-finding-pt';
import PreAnalysisNotice from '../components/PreAnalysisNotice';
import { useGeobrainAccess } from '../lib/geobrain-access-context';
import { requireProjectIdentity, loadVersions } from '../lib/projects';
const ReviewBench = lazy(() => import('../components/ReviewBench'));
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { portfolioHref } from '../lib/study-navigation';
import { toast } from 'sonner';
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, RefreshCw, PackageCheck,
  Trash2, FileUp, ArrowLeft, Quote, Sparkles, ChevronDown, BookOpen, Pause, FileText, Zap, X,
  FileSpreadsheet, PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { errorLabel, ERROR_CATALOG, isCommunication, MODE_META, type ErrorType } from '../lib/error-catalog';
import type { Finding } from '../lib/audit/model';
import type { Ir } from '../lib/audit/ir';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import { irToFindings } from '../lib/audit/ir-rules';
import { detectBinGap } from '../lib/audit/engine';
import { isStaleCrossTable, isStaleReviewNote, isStaleVisionContext, isStaleWrongCity } from '../lib/v3/reconcile';
import { VizSwitch } from '../components/audit/FindingCard';
import '../styles/projects.css';
import { Button } from '@/components/ui/button';
import AtaTestPanel from '../components/AtaTestPanel';
import AtaCard from '../components/AtaCard';
import { type AtaGateValue } from '../components/AtaGateCard';
import PreAnalysisCard, { type PreAnalysisValue } from '../components/PreAnalysisCard';
import { directRecheckRuleWasEvaluated } from '../lib/v3/recheck-scope';
import { presentTextFindings } from '../lib/v3/text-review';
import { type ModelId } from '../lib/cost-calculator';
import {
  runPhase1, runPhase2, estimateFullAnalysis, TEXT_REVIEW_MODEL,
  type StageProgress, type FullEstimate, type Phase1Result,
} from '../lib/v3/pipeline';
import type { AtaData } from '../lib/v3/ia-ata';
import { BUDGET_STUDY_BRL, formatBRL, usdToBrl } from '../lib/v3/config';
import { confidenceOf, CONFIDENCE_META, type Confidence } from '../lib/v3/confidence';

import {
  prepareStudyAtomic, listStudies, loadFindings, setFindingStatus, recheck,
  concludeStudy, deleteStudy, insertIaFindings, saveAta, confirmAta,
  saveReport, setFindingVerdict, resolveInvalidFindings, loadTranscribedBySha1,
  saveStudyFonte, loadStudyFonte, analysisPending, loadVisionReadings,
  type StudyV3, type FindingV3, type FindingStatus, type DiffResult,
} from '../lib/v3/db';
import { parseFonteJson, type Fonte } from '../lib/v3/fonte';
import { suggestCity, type CitySuggestion } from '../lib/v3/city-suggestion';
import type { AnalysisReport } from '../lib/v3/pipeline';
import { otherCities, imageProfile, type CityMention, type ImageProfile } from '../lib/v3/pre-analysis';
import { savePptx, loadPptx } from '../lib/v3/pptx-store';
import { clearPreparationDraft } from '../lib/v3/local-materials';
import { canStartAccountPreparation } from '../lib/account-preparation';
import { findTableImages } from '../lib/v3/table-images';
import { replayVisionPass } from '../lib/v3/ia-vision';
import { sourceCrosscheckFindings as crosscheckDet, sourceCrosscheckVisionFindings } from '../lib/v3/source-crosscheck';
import { extractFonteFromExcel } from '../lib/v3/fonte-extractor-browser';
import { sourceCrosscheckFindings } from '../lib/v3/source-crosscheck';

const MODEL: ModelId = 'gpt-4o-mini'; // econômico por padrão; visão cai p/ R$ 0 após cache

// Rótulo humano de cada etapa do pipeline de passo único
type BannerStage = StageProgress['stage'] | 'gravando';
const STAGE_LABEL: Record<BannerStage, string> = {
  det: 'Triagem',
  ata: 'Ata',
  texto: 'Texto',
  visao: 'Tabelas-imagem',
  cruzamento: 'Cruzamentos',
  // Gravar achados, encerrar os antigos e salvar o resumo leva alguns segundos:
  // sem esta etapa o banner mostrava “tudo pronto” e a lista ficava vazia.
  gravando: 'Gravando resultados',
};

// ordem de exibição das etapas no banner
const STAGE_ORDER: BannerStage[] = ['det', 'ata', 'texto', 'visao', 'cruzamento', 'gravando'];

const isLocal = (f: Finding) => /^s\d+$/.test(f.slideRef.trim());
const slideNumOf = (f: Finding) => parseInt(f.slideRef.replace(/\D/g, ''), 10) || 0;
const isComunicacao = (item: FindingV3) => isCommunication(item.finding.type as ErrorType);
/** Quantos comentários o item agregado representa (o checklist é a lista real). */
const noteCount = (f: Finding) => (f.viz?.kind === 'text' && f.viz.checklist?.length) || 1;

// ─── Card de achado com status de correção ────────────────────────────────────

const STATUS_META: Record<FindingStatus, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  corrigido: { label: 'Ajuste declarado', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  ignorado: { label: 'Ignorado', className: 'bg-muted text-muted-foreground border-border' },
};

function V3FindingCard({ item, onStatus, onVerdict }: {
  item: FindingV3;
  onStatus: (s: FindingStatus) => void;
  onVerdict: (v: 'bug' | 'fp') => void;
}) {
  const f = presentFindingPt(item.finding);
  const done = item.status !== 'pendente';
  const confidence = confidenceOf(f, item.origem);
  // Recado da revisão não usa a escala de erro: chip próprio, e o checklist —
  // que É o conteúdo do item — já vem aberto.
  const comunicacao = isCommunication(f.type as ErrorType);
  const confidenceMeta = comunicacao
    ? { label: 'Comunicação', icon: '💬', className: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300' }
    : CONFIDENCE_META[confidence];

  return (
    <div className={cn(
      // Borda neutra: o nível já está no selo. A barra lateral colorida saiu (30/set).
      'cf-card',
      item.resolvidoNaVersao && 'animate-in fade-in zoom-in-95 duration-300',
      done && 'opacity-60',
    )}>
      <div className="cf-body">
        {item.status === 'corrigido' && (
          <div className="mt-0.5 shrink-0"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
        )}
        <div className="flex-1 min-w-0">
          <div className="cf-title"><h3>{f.title}</h3></div>
          <div className="cf-tags">
            <span className={cn('border font-medium', confidenceMeta.className)}>{confidenceMeta.label}</span>
            {f.slideRef.split('×').map((ref) => <span key={ref} className="border border-border text-muted-foreground">{ref.trim()}</span>)}
            <span className="text-[10px] rounded px-1.5 py-0.5 border bg-muted/50 text-muted-foreground">
              {errorLabel(f.type as ErrorType)}
            </span>
            <span className={cn('text-[10px] rounded px-1.5 py-0.5 border', STATUS_META[item.status].className)}>
              {STATUS_META[item.status].label}
            </span>
            {item.resolvidoNaVersao && (
              <span className="text-[10px] text-muted-foreground">resolvido na v{item.resolvidoNaVersao}</span>
            )}
          </div>
          {f.detail !== f.title && <p className="cf-detail">{f.detail}</p>}
          {f.gabarito && (
            <p className="mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1 italic">
              <Quote className="w-3 h-3 mt-0.5 shrink-0" /> Nota do analista: “{f.gabarito}”
            </p>
          )}
        </div>
      </div>
      {(f.evidenceImage || f.viz) && (
        <div className="px-4 pb-2">
          <div className="space-y-2">
          {f.viz && <VizSwitch finding={f} />}
          </div>
        </div>
      )}
      <div className="cf-actions">
        <span className="sr-only">Decisão:</span>
        {(['corrigido', 'ignorado', 'pendente'] as FindingStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className={cn(
              'text-[11px] rounded-full px-2.5 py-0.5 border transition-colors',
              item.status === s
                ? STATUS_META[s].className
                : 'bg-background border-border hover:border-primary/50 text-muted-foreground'
            )}
          >
            {STATUS_META[s].label}
          </button>
        ))}
        <button
          onClick={() => onVerdict('fp')}
          className={cn('text-[11px] rounded-full px-2.5 py-0.5 border transition-colors', item.verdict === 'fp' ? 'bg-slate-500/15 text-slate-600 border-slate-500/30' : 'bg-background border-border hover:border-slate-500/50 text-muted-foreground')}
        >
          Não é erro
        </button>
      </div>
    </div>
  );
}

// ─── Banner de análise vivo (passo único) ────────────────────────────────────

interface AnalysisState {
  running: boolean;
  stages: Partial<Record<BannerStage, { done: number; total: number }>>;
  spentUsd: number;
  estimateUsd: number;
}

function AnalysisBanner({ state, onPause }: { state: AnalysisState; onPause: () => void }) {
  const [startedAt] = useState(Date.now);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000); return () => window.clearInterval(timer); }, [startedAt]);
  const order = STAGE_ORDER;
  return (
    <div className="cp-panel space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-violet-500 shrink-0 animate-pulse" />
          <h3 className="text-sm font-semibold truncate">{state.stages.gravando ? 'Gravando os resultados…' : 'Analisando o estudo…'}</h3>
          <span className="text-xs text-muted-foreground">
            {Math.floor(elapsed / 60)}min {elapsed % 60}s
          </span>
        </div>
        <button
          onClick={onPause}
          className="text-xs rounded-md px-2.5 py-1.5 border border-border hover:border-destructive/50 inline-flex items-center gap-1.5 shrink-0"
        >
          <Pause className="w-3.5 h-3.5" /> Pausar IA
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {order.map((st) => {
          const p = state.stages[st];
          if (!p) return null;
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <span key={st} className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              {pct >= 100 ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Loader2 className="w-3 h-3 animate-spin" />}
              {STAGE_LABEL[st]} <span className="font-mono">{p.done}/{p.total}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modal de confirmação de orçamento (estimativa acima do teto) ────────────

export function BudgetModal({ estimate, onConfirm, onCancel }: {
  estimate: FullEstimate;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="corretor-budget-title"
        className="w-full max-w-md rounded-lg border bg-card p-5 space-y-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 id="corretor-budget-title" className="text-sm font-semibold">Iniciar avaliação</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Serão avaliados {estimate.textSlides} slides de texto e {estimate.visionToRun} imagens ainda sem leitura salva. Confira os materiais antes de iniciar.

        </p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onCancel} className="text-xs rounded-md px-3 py-1.5 border border-border hover:bg-muted">
            Cancelar
          </button>
          <button onClick={onConfirm} className="text-xs rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            Confirmar e analisar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lista operacional de estudos (homepage) ────────────────────────────────

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

/**
 * “O que bateu”: dimensão do que foi conferido e está certo, em contrapartida aos
 * erros (que continuam sendo o foco). Só números, cor neutra, uma linha de cartões.
 */
const outrasKey = (studyId: string) => `corretor-outras-${studyId}`;
/** Outras cidades confirmadas para o estudo, lembradas neste navegador (reconferências). */
function readOutras(studyId: string): string[] {
  try { return JSON.parse(localStorage.getItem(outrasKey(studyId)) ?? '[]') as string[]; } catch { return []; }
}
function writeOutras(studyId: string, outras: string[]) {
  try { localStorage.setItem(outrasKey(studyId), JSON.stringify(outras)); } catch { /* sem storage: só nesta análise */ }
}

export default function CorretorV3Page() {
  const [searchParams] = useSearchParams();
  const ensureAccess = useGeobrainAccess();
  const { studyId: routeStudyId } = useParams();
  const navigate = useNavigate();
  const [studies, setStudies] = useState<StudyV3[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<FindingV3[]>([]);
  const [loadingStudy, setLoadingStudy] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'recheck' | null>(null);
  const [lastDiff, setLastDiff] = useState<DiffResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [budgetPrompt, setBudgetPrompt] = useState<{ estimate: FullEstimate; run: () => void } | null>(null);
  // WS-1: portão da ata — fase 1 pronta, aguardando o analista confirmar cidade/UF.
  const [gate, setGate] = useState<{
    studyId: string; version: number; ir: Ir; bytes: Uint8Array;
    ata: AtaData | null; estimate: FullEstimate; phase2Brl: string; fonte?: Fonte | null;
    suggestion: CitySuggestion | null;
    cities: CityMention[];
    profile: ImageProfile;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState<Confidence[]>([1, 2, 3]);
  const [triaging, setTriaging] = useState(false);
  const fonteRef = useRef<HTMLInputElement>(null);
  const [fonteInput, setFonteInput] = useState<{ name: string; fonte: Fonte } | null>(null);
  const [sourceProgress, setSourceProgress] = useState<{ done: number; total: number } | null>(null);
  const recheckRef = useRef<HTMLInputElement>(null);
  /** Retomar a análise completa: o PPTX não fica no banco, então é preciso re-selecioná-lo. */
  const resumeRef = useRef<HTMLInputElement>(null);
  /** Planilhas (ou fonte.json) vinculadas de dentro do estudo, depois do upload. */
  const studySourcesRef = useRef<HTMLInputElement>(null);
  /** Planilhas vinculadas pós-análise aguardando o PPTX (quando não há cofre local). */
  const pendingCrosscheck = useRef<Fonte | null>(null);
  // Painel de teste da extração da ata: ferramenta de desenvolvimento, só com ?debug.
  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
  const diffRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selected = studies.find((s) => s.id === selectedId) ?? null;
  const [reviewContext, setReviewContext] = useState<{ studyId: string; ir: Ir } | null>(null);
  const reviewedItems = useMemo(() => presentTextFindings(items, reviewContext?.studyId === selectedId ? reviewContext.ir : null), [items, reviewContext, selectedId]);
  const pending = selected ? analysisPending(selected) : false;

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try { setStudies(await listStudies()); } finally { setLoadingList(false); }
  }, []);
  useEffect(() => { refreshList(); }, [refreshList]);

  const openStudy = useCallback(async (id: string) => {
    setSelectedId(id);
    setReviewContext(null);
    setLastDiff(null);
    setLoadingStudy(true);
    try {
      const [initialFindings, savedFonte] = await Promise.all([loadFindings(id), loadStudyFonte(id)]);
      let loaded = initialFindings;
      setFonteInput(savedFonte ? { name: savedFonte.filename, fonte: savedFonte.fonte } : null);
      const studyCity = studies.find((s) => s.id === id)?.cidade ?? null;
      // Texto que a visão transcreveu de cada imagem: âncora contra cidade alucinada.
      const shas = [...new Set(loaded
        .filter((item) => item.status === 'pendente' && item.finding.id.startsWith('iavis-context-'))
        .map((item) => item.finding.evidenceSha1).filter((s): s is string => Boolean(s)))];
      const transcribed = shas.length ? await loadTranscribedBySha1(shas) : new Map<string, string>();
      const invalid = loaded.filter((item) => {
        if (item.status !== 'pendente' || item.verdict || item.verdictRevisado) return false;
        const { finding } = item;
        if (finding.type === 'BINNING_RULE') {
          const viz = finding.viz;
          return viz?.kind === 'binrange' && detectBinGap(viz.bins).gapAfterIndex === undefined;
        }
        const seen = finding.evidenceSha1 ? transcribed.get(finding.evidenceSha1) : undefined;
        return isStaleVisionContext(finding, studyCity, seen) || isStaleCrossTable(finding)
          || isStaleWrongCity(finding, studyCity) || isStaleReviewNote(finding);
      });
      const mayReconcile = await requireProjectIdentity().then(() => true).catch(() => false);
      if (invalid.length && mayReconcile) {
        await resolveInvalidFindings(id, invalid.map((item) => item.ruleId));
        loaded = await loadFindings(id);
        toast.info('Achados reconciliados com as regras atuais', {
          description: `${invalid.length} achado(s) que as regras de hoje não geram mais foram encerrados.`,
        });
        await refreshList();
      }
      setItems(loaded);
      const selectedStudy = studies.find(s => s.id === id);
      const cachedDeck = await loadPptx(selectedStudy?.lastSha1 ?? null);
      if (cachedDeck) {
        const currentIr = await pptxToIr(cachedDeck.bytes, cachedDeck.name);
        if (currentIr.sha1 === selectedStudy?.lastSha1) setReviewContext({ studyId: id, ir: currentIr });
      }
    } finally { setLoadingStudy(false); }
  }, [refreshList, studies]);

  useEffect(() => {
    const requested = routeStudyId ?? searchParams.get('study');
    if (requested && requested !== selectedId && studies.some((study) => study.id === requested)) void openStudy(requested);
  }, [openStudy, searchParams, selectedId, studies, routeStudyId]);

  /**
   * FASE 2 (paga): texto + visão + cruzamentos, com a cidade/UF JÁ confirmadas no
   * portão. Persiste a ata confirmada, os DET pós-ata e registra os passes/custos.
   */
  const runPaidAnalysis = useCallback(async (
    ctx: { studyId: string; version: number; ir: Ir; bytes: Uint8Array; estimate: FullEstimate; fonte?: Fonte | null },
    confirmed: AtaGateValue & { outras?: string[] },
    phase2Usd: number,
  ) => {
    const ac = new AbortController();
    abortRef.current = ac;
    setAnalysis({ running: true, stages: { det: { done: 1, total: 1 }, ata: { done: 1, total: 1 } }, spentUsd: 0, estimateUsd: phase2Usd });
    try {
      if (!hasActiveExecution()) await beginExecution({ studyId: ctx.studyId, version: ctx.version, documentSha1: ctx.ir.sha1, budgetUsd: Math.ceil((ctx.estimate.costUsd * 2 + 1) * 100) / 100,
        context: { cidade: confirmed.cidade, uf: confirmed.uf, outras: confirmed.outras ?? [], fonte: ctx.fonte ?? null } });
      // grava a ata confirmada + cidade/UF validadas (a régua da revisão)
      await confirmAta(ctx.studyId, confirmed.ata, confirmed.cidade, confirmed.uf);

      const res = await runPhase2(ctx.ir, {
        city: confirmed.cidade,
        uf: confirmed.uf,
        outras: confirmed.outras ?? readOutras(ctx.studyId),
        ata: confirmed.ata,
        model: MODEL,
        candidates: ctx.estimate.candidates,
        fonte: ctx.fonte,
        signal: ac.signal,
        onStage: async (p) => {
          setAnalysis((prev) => prev && {
            ...prev,
            stages: { ...prev.stages, [p.stage]: { done: p.done, total: p.total } },
            spentUsd: prev.spentUsd + (p.spentUsd ?? 0),
          });
          if (p.findings?.length && (p.stage === 'texto' || p.stage === 'visao' || p.stage === 'cruzamento')) {
            await insertIaFindings(ctx.studyId, p.findings, p.stage === 'texto' ? 'IA_texto' : 'IA_visao', ctx.version);
            setItems(await loadFindings(ctx.studyId));
          }
        },
      });

      setAnalysis((prev) => prev && { ...prev, stages: { ...prev.stages, gravando: { done: 0, total: 1 } } });
      // DET pós-ata (UF + cobertura) por upsert — IDs estáveis evitam duplicata.
      await insertIaFindings(ctx.studyId, res.detFindings, 'DET', ctx.version);
      if (!res.aborted) {
        // Achados de visão que não sobreviveram à reconciliação do deck (gravados
        // brutos por versões anteriores) são encerrados: a lista final é a de agora.
        const finalIds = new Set(res.visionFindings.map((f) => f.id));
        const stale = (await loadFindings(ctx.studyId))
          .filter((i) => i.origem === 'IA_visao' && i.status === 'pendente' && !i.verdict && !i.verdictRevisado && !finalIds.has(i.ruleId))
          .map((i) => i.ruleId);
        if (stale.length) await resolveInvalidFindings(ctx.studyId, stale);
        // Snapshot só de análise COMPLETA: pausada, o estudo continua pendente
        // (antes a pausa gravava o snapshot e o estudo passava por analisado).
        await saveReport(ctx.studyId, res.report);
      }

      const nIa = res.textFindings.length + res.visionFindings.length;
      if (res.aborted) {
        toast.warning('Análise pausada — continua pendente', { description: 'Os resultados confirmados ficaram guardados. Retome para concluir as etapas pendentes.' });
      } else {
        toast.success('Análise completa', {
          description: `${nIa} apontamento(s) na revisão` +
            (res.visionEscalated > 0 ? ` · ${res.visionEscalated} tabela(s) com segunda leitura` : ''),
        });
      }
      await finishExecution(res.aborted ? 'interrupted' : 'completed');
      await refreshList();
      setItems(await loadFindings(ctx.studyId));
    } catch (err) {
      await finishExecution('failed').catch(() => {});
      toast.error('Avaliação interrompida', { description: processingMessage(err) });
    } finally {
      abortRef.current = null;
      setAnalysis(null);
    }
  }, [refreshList]);

  /** Preparação de estudo existente: estimativa e escolha de materiais, sem IA. */
  const startPhase1AndGate = useCallback(async (
    study: { id: string; version: number }, ir: Ir, bytes: Uint8Array, fonte?: Fonte | null,
  ) => {
    const ac = new AbortController();
    abortRef.current = ac;
    setAnalysis({ running: true, stages: { det: { done: 1, total: 1 } }, spentUsd: 0, estimateUsd: 0 });
    try {
      const estimate = await estimateFullAnalysis(ir, bytes, MODEL);
      const p1: Phase1Result = { detFindings: [], ata: null, ataCostUsd: 0, ataTokens: { input: 0, output: 0 }, candidates: estimate.candidates, ataCandidate: estimate.ataCandidate };
      const phase2Usd = Math.max(0, estimate.costUsd - p1.ataCostUsd);
      setGate({
        studyId: study.id, version: study.version, ir, bytes,
        ata: p1.ata, estimate, phase2Brl: formatBRL(phase2Usd), fonte,
        suggestion: suggestCity(ir.arquivo ?? '', ir),
        cities: otherCities(ir, p1.ata?.cidade && p1.ata?.uf ? { cidade: p1.ata.cidade, uf: p1.ata.uf } : suggestCity(ir.arquivo ?? '', ir)),
        profile: imageProfile(ir, estimate.candidates),
      });
      window.setTimeout(() => document.getElementById('analysis-gate')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    } catch (err) {
      toast.error('Falha na triagem', { description: processingMessage(err) });
    } finally {
      abortRef.current = null;
      setAnalysis(null);
    }
  }, []);

  /** Portão confirmado: valida orçamento da fase 2 e a executa. */
  const confirmGate = useCallback((value: PreAnalysisValue) => {
    if (!gate) return;
    writeOutras(gate.studyId, value.outras);
    // Planilhas vinculadas já no portão valem para a análise que vai rodar agora.
    const ctx = { studyId: gate.studyId, version: gate.version, ir: gate.ir, bytes: gate.bytes, estimate: gate.estimate, fonte: fonteInput?.fonte ?? gate.fonte };
    // A ata já foi paga na fase 1; o orçamento restante é texto + visão.
    const phase2Usd = Math.max(0, gate.estimate.costUsd - gate.estimate.vision.costUsd) + gate.estimate.vision.costUsd;
    setGate(null);
    const run = () => void (async () => {
      await beginExecution({ studyId: ctx.studyId, version: ctx.version, documentSha1: ctx.ir.sha1, budgetUsd: Math.ceil((ctx.estimate.costUsd * 2 + 1) * 100) / 100, context: { cidade: value.cidade, uf: value.uf, outras: value.outras ?? [], fonte: ctx.fonte ?? null } });
      if (!value.ata && gate.estimate.ataCandidate) {
        const p1 = await runPhase1(ctx.ir, ctx.bytes, { model: MODEL, fonte: ctx.fonte, candidates: ctx.estimate.candidates, ataCandidate: ctx.estimate.ataCandidate });
        value = { ...value, ata: p1.ata };
      }
      await runPaidAnalysis(ctx, value, gate.estimate.costUsd);
    })().catch(async () => { await finishExecution('failed').catch(() => {}); toast.error('Não foi possível iniciar. Retome a preparação para conferir os materiais.'); });
    setBudgetPrompt({ estimate: gate.estimate, run: () => { setBudgetPrompt(null); run(); } });
  }, [gate, runPaidAnalysis, fonteInput]);

  async function ingestNew(prepared: PreparedStudy) {
    const { file, bytes, ir, estimate, fonte, city, uf, outras } = prepared;
    const duplicate = studies.find(s => s.generation === 'v3' && s.lastSha1 === ir.sha1);
    const consumeDraft = async () => {
      try { await clearPreparationDraft(ir.sha1, prepared.sheets.map(f => `preparation:sheet:${f.name}:${f.size}:${f.lastModified}`)); }
      catch { toast.warning('O estudo foi registrado, mas o navegador não conseguiu encerrar o rascunho. Você pode limpá-lo em Novo estudo.'); }
    };
    if (duplicate && duplicate.id !== prepared.accountPreparation?.studyId) {
      if (window.confirm('Este arquivo já está registrado. Abrir o estudo existente sem nova avaliação?')) {
        await consumeDraft(); navigate(`/corretor/estudos/${duplicate.id}/resumo`);
      }
      return;
    }
    setBusy('upload');
    let registeredId: string | null = null;
    try {
      const saved = await savePptx(ir.sha1, file.name, bytes);
      if (!saved) toast.info('O PowerPoint ficará disponível nesta aba. Guarde o original em Materiais para recuperá-lo depois.');
      const findings = irToFindings(ir).filter(f => !f.ok);
      const registered = await prepareStudyAtomic(file.name.replace(/\.pptx$/i, ''), { sha1: ir.sha1, nSlides: ir.n_slides, arquivo: file.name }, findings);
      const id = registered.id;
      registeredId = id;
      if (!registered.created) {
        const ownPreparation = id === prepared.accountPreparation?.studyId
          && await canStartAccountPreparation(prepared.accountPreparation, ir.sha1);
        if (!ownPreparation) { await consumeDraft(); await refreshList(); await openStudy(id); return; }
      }
      if (fonte) await saveStudyFonte(id, `${prepared.sheets.length} planilhas`, fonte);
      writeOutras(id, outras);
      await confirmAta(id, null, city, uf);
      await consumeDraft();
      await refreshList(); await openStudy(id);
      await beginExecution({ studyId: id, version: 1, documentSha1: ir.sha1, budgetUsd: prepared.budgetUsd,
        context: { cidade: city, uf, outras, fonte } });
      // A intenção e o orçamento já foram confirmados na preparação, inclusive ata.
      const ac = new AbortController(); abortRef.current = ac;
      setAnalysis({ running: true, stages: {}, spentUsd: 0, estimateUsd: estimate.costUsd });
      const p1 = await runPhase1(ir, bytes, { model: MODEL, fonte, candidates: estimate.candidates, ataCandidate: estimate.ataCandidate, signal: ac.signal,
        onStage: p => setAnalysis(prev => prev && { ...prev, stages: { ...prev.stages, [p.stage]: { done: p.done, total: p.total } }, spentUsd: prev.spentUsd + (p.spentUsd ?? 0) }) });
      if (p1.ata !== null) await saveAta(id, p1.ata);
      await insertIaFindings(id, p1.detFindings, 'DET', 1);
      if (ac.signal.aborted) { await finishExecution('interrupted'); return; }
      if (p1.ata?.cidade && p1.ata?.uf && (p1.ata.cidade.toLocaleLowerCase() !== city.toLocaleLowerCase() || p1.ata.uf.toUpperCase() !== uf)) {
        setGate({ studyId: id, version: 1, ir, bytes, ata: p1.ata, estimate, phase2Brl: formatBRL(Math.max(0, estimate.costUsd - p1.ataCostUsd)), fonte,
          suggestion: { cidade: city, uf, origem: 'arquivo' }, cities: otherCities(ir, { cidade: city, uf }), profile: imageProfile(ir, estimate.candidates) });
        await finishExecution('interrupted');
        toast.info('A ata indicou outra localização. Confira antes de continuar.');
        return;
      }
      await runPaidAnalysis({ studyId: id, version: 1, ir, bytes, estimate, fonte }, { cidade: city, uf, outras, ata: p1.ata }, Math.max(0, estimate.costUsd - p1.ataCostUsd));
    } catch (error) { await finishExecution('failed').catch(() => {}); toast.error('Não foi possível concluir a avaliação', { description: processingMessage(error) }); throw error; }
    finally { setBusy(null); setAnalysis(null); abortRef.current = null; if (registeredId) navigate(`/corretor/estudos/${registeredId}/revisao`); }
  }

  async function resumePrepared(prepared: PreparedStudy) {
    if (!selected || prepared.ir.sha1 !== selected.lastSha1) throw new Error('Arquivo diferente da versão registrada.');
    const {ir, bytes, estimate, fonte, city, uf, outras, budgetUsd} = prepared;
    setBusy('upload');
    try {
      await savePptx(ir.sha1, prepared.file.name, bytes);
      if (fonte) await saveStudyFonte(selected.id, prepared.sheets.length ? `${prepared.sheets.length} planilhas` : fonteInput?.name ?? 'Fonte preservada', fonte);
      writeOutras(selected.id, outras);
      await beginExecution({studyId:selected.id, version:selected.lastVersion, documentSha1:ir.sha1, budgetUsd, context:{cidade:city, uf, outras, fonte}});
      setAnalysis({running:true, stages:{}, spentUsd:0, estimateUsd:estimate.costUsd});
      const ac = new AbortController(); abortRef.current=ac;
      const p1 = await runPhase1(ir, bytes, {model:MODEL, fonte, candidates:estimate.candidates, ataCandidate:estimate.ataCandidate, signal:ac.signal});
      if (ac.signal.aborted) { await finishExecution('interrupted'); return; }
      await runPaidAnalysis({studyId:selected.id,version:selected.lastVersion,ir,bytes,estimate,fonte},{cidade:city,uf,outras,ata:p1.ata},Math.max(0,estimate.costUsd-p1.ataCostUsd));
    } catch(e) { await finishExecution('failed').catch(()=>{}); throw e; }
    finally {setBusy(null);setAnalysis(null);abortRef.current=null;}
  }

  async function prepareRecommendation(prepared: PreparedStudy) {
    const {file,ir,bytes}=prepared;
    await savePptx(ir.sha1,file.name,bytes);
    const registered=await prepareStudyAtomic(file.name.replace(/\.pptx$/i,''),{sha1:ir.sha1,nSlides:ir.n_slides,arquivo:file.name},irToFindings(ir).filter(f=>!f.ok));
    const [current,versions]=await Promise.all([listStudies(true),loadVersions(registered.id)]);
    const study=current.find(s=>s.id===registered.id),version=versions.find(v=>v.sha1===ir.sha1);
    if(!study||!version)throw new Error('Não foi possível confirmar o vínculo com a versão do estudo.');
    await clearPreparationDraft(ir.sha1,prepared.sheets.map(f=>`preparation:sheet:${f.name}:${f.size}:${f.lastModified}`));
    return {study,version};
  }

  async function handleFonte(e: React.ChangeEvent<HTMLInputElement>): Promise<Fonte | null> {
    if (selected && !await ensureAccess('atualizar a fonte numérica deste estudo')) return null;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return null;
    const parsed = parseFonteJson(await file.text());
    if (!parsed.ok || !parsed.fonte) {
      toast.error('Fonte numérica inválida', { description: parsed.errors.slice(0, 3).join(' ') });
      return null;
    }
    if (selected) {
      try { await saveStudyFonte(selected.id, file.name, parsed.fonte); }
      catch (error) {
        toast.warning('Fonte vinculada somente nesta sessão', {
          description: processingMessage(error),
        });
      }
    }
    setFonteInput({ name: file.name, fonte: parsed.fonte });
    toast.success(selected ? 'Fonte numérica salva no estudo' : 'Fonte numérica vinculada', {
      description: `${parsed.fonte.blocos.length} blocos disponíveis para cruzamento.`,
    });
    return parsed.fonte;
  }

  async function handleExcelSources(e: React.ChangeEvent<HTMLInputElement>): Promise<Fonte | null> {
    const files = Array.from(e.target.files ?? []).filter((file) => /\.(xlsx|xlsm)$/i.test(file.name));
    e.target.value = '';
    if (!files.length) return null;
    if (selected && !await ensureAccess('atualizar as planilhas deste estudo')) return null;
    setSourceProgress({ done: 0, total: files.length });
    try {
      const slug = files[0].name.replace(/\.(xlsx|xlsm)$/i, '').replace(/\s+/g, '-').toLowerCase();
      const fonte = await extractFonteFromExcel(files, slug, (done, total) => setSourceProgress({ done, total }));
      const recognized = fonte.inventario.filter((item) => item.papel !== null).length;
      const label = `${files.length} planilha${files.length === 1 ? '' : 's'} · fonte automática`;
      if (selected) {
        try { await saveStudyFonte(selected.id, label, fonte); }
        catch (error) {
          toast.warning('Fonte vinculada somente nesta sessão', { description: processingMessage(error) });
        }
      }
      setFonteInput({ name: label, fonte });
      toast.success('Planilhas processadas', {
        description: `${recognized}/${files.length} reconhecidas · ${fonte.blocos.length} blocos numéricos · ${fonte.avisos.length} aviso(s).`,
      });
      return fonte;
    } catch (error) {
      toast.error('Falha ao processar as planilhas', { description: processingMessage(error) });
      return null;
    } finally {
      setSourceProgress(null);
    }
  }


  /**
   * Retoma a análise completa de um estudo que parou na triagem inicial (portão
   * perdido ao sair da página). Exige o MESMO arquivo da versão registrada —
   * versão nova é reconferência, não retomada.
   */
  /** Retoma a análise usando o PPTX guardado neste navegador; sem ele, pede o arquivo. */
  async function resumeAnalysis() {
    if (!selected) return;
    const cached = await loadPptx(selected.lastSha1);
    if (!cached) { resumeRef.current?.click(); return; }
    setBusy('upload');
    try {
      const ir = await pptxToIr(cached.bytes, cached.name);
      setBusy(null);
      await startPhase1AndGate({ id: selected.id, version: selected.lastVersion }, ir, cached.bytes, fonteInput?.fonte);
    } catch (err) {
      toast.error('Falha ao preparar a análise', { description: processingMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  async function handleResume(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selected) return;
    if (!/\.pptx$/i.test(file.name)) {
      toast.error('Formato não suportado', { description: 'Selecione o .pptx deste estudo.' });
      return;
    }
    setBusy('upload');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ir = await pptxToIr(bytes, file.name);
      if (selected.lastSha1 && ir.sha1 !== selected.lastSha1) {
        toast.error('Este não é o arquivo da versão registrada', {
          description: `Selecione o mesmo PPTX da versão ${selected.lastVersion}. Para uma versão corrigida, use “Reconferir”.`,
        });
        return;
      }
      setReviewContext({ studyId: selected.id, ir });
      void savePptx(ir.sha1, file.name, bytes);
      setBusy(null);
      if (pendingCrosscheck.current) {
        const fonte = pendingCrosscheck.current;
        pendingCrosscheck.current = null;
        await crosscheckAfterAnalysis(fonte, bytes, file.name);
        return;
      }
      await startPhase1AndGate({ id: selected.id, version: selected.lastVersion }, ir, bytes, fonteInput?.fonte);
    } catch (err) {
      toast.error('Falha ao preparar a análise', { description: processingMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  /**
   * Planilhas vinculadas DEPOIS da análise: cruzamento com a fonte sobre as
   * leituras já pagas (cache de visão). Sem nova chamada de IA, sem custo, e sem
   * subir o PPTX de novo quando ele está no cofre local deste navegador.
   */
  async function crosscheckAfterAnalysis(fonte: Fonte, bytes?: Uint8Array, name?: string) {
    if (!selected) return;
    let deck = bytes && name ? { bytes, name } : await loadPptx(selected.lastSha1);
    if (!deck) {
      pendingCrosscheck.current = fonte;
      toast.info('Selecione o PPTX deste estudo', { description: 'Ele não está guardado neste navegador; é só desta vez.' });
      resumeRef.current?.click();
      return;
    }
    setBusy('recheck');
    try {
      const ir = await pptxToIr(deck.bytes, deck.name);
      setReviewContext({ studyId: selected.id, ir });
      const candidates = await findTableImages(deck.bytes, ir);
      const readings = await loadVisionReadings(candidates.map((c) => c.sha1));
      const vision = replayVisionPass(candidates, readings, { cidade: selected.cidade ?? '', uf: selected.uf, outras: readOutras(selected.id) });
      const tally = { comparados: 0, batem: 0 };
      const det = crosscheckDet(ir, fonte, tally);
      const vis = sourceCrosscheckVisionFindings(ir, fonte, vision.tables, tally);
      if (selected.analise) await saveReport(selected.id, { ...selected.analise, fonte: tally });
      if (det.length) await insertIaFindings(selected.id, det, 'DET', selected.lastVersion);
      if (vis.length) await insertIaFindings(selected.id, vis, 'IA_visao', selected.lastVersion);
      setItems(await loadFindings(selected.id));
      await refreshList();
      toast.success('Cruzamento com as planilhas concluído', {
        description: `${det.length + vis.length} divergência(s) com a fonte · ${readings.size} leitura(s) reaproveitada(s).`,
      });
    } catch (err) {
      toast.error('Falha no cruzamento com as planilhas', { description: processingMessage(err) });
    } finally {
      setBusy(null);
    }
    deck = null;
  }

  /** Um só botão para planilhas Excel (fonte automática) ou fonte.json (compatibilidade). */
  async function handleStudySources(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const fonte = files.some((f) => /\.json$/i.test(f.name)) ? await handleFonte(e) : await handleExcelSources(e);
    await refreshList();
    // Análise já feita: o cruzamento com a fonte roda agora, sobre o cache.
    if (fonte && selected && !analysisPending(selected) && !gate) await crosscheckAfterAnalysis(fonte);
  }

  async function handleRecheck(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    e.target.value = '';
    await recheckFromBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  }

  /**
   * Reconferência a partir dos bytes (input, drop, futuro file-watch WS-F). Diff DET
   * grátis; a fase 2 re-roda com a cidade/UF já confirmadas (visão vem do cache).
   */
  async function recheckFromBytes(bytes: Uint8Array, filename: string) {
    if (!selected) return;
    if (!await ensureAccess('enviar uma versão corrigida deste estudo')) return;
    const newVersion = selected.lastVersion + 1;
    setBusy('recheck');
    try {
      const ir = await pptxToIr(bytes, filename);
      setReviewContext({ studyId: selected.id, ir });
      void savePptx(ir.sha1, filename, bytes);
      const findings = [
        ...irToFindings(ir, { city: selected.cidade ?? undefined, uf: selected.uf }).filter((f) => !f.ok),
        ...(fonteInput ? sourceCrosscheckFindings(ir, fonteInput.fonte) : []),
      ];
      const diff = await recheck(
        selected.id,
        newVersion,
        { sha1: ir.sha1, nSlides: ir.n_slides, arquivo: filename },
        findings,
        { sourceCrosscheckRan: Boolean(fonteInput), evaluatedRule: id => directRecheckRuleWasEvaluated(id, Boolean(fonteInput)) },
      );
      setLastDiff(diff);
      window.setTimeout(() => diffRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
      toast.success(`Reconferido (v${newVersion})`, {
        description: `${diff.resolved.length} resolvido(s) · ${diff.persistent.length} persistem · ${diff.fresh.length} novo(s)`,
      });
      await refreshList();
      setItems(await loadFindings(selected.id));
      // Sem imagem nova, o ciclo termina no diff DET: custo efetivo R$ 0. Achados de IA
      // antigos permanecem intactos e não são falsamente dados como resolvidos.
      const estimate = await estimateFullAnalysis(ir, bytes, MODEL);
      if (estimate.visionToRun === 0) {
        toast.info('Reconferência concluída', {
          description: `${estimate.visionCached} leituras de imagem reaproveitadas.`,
        });
        return;
      }
      // Imagens novas exigem a fase paga; cidade/UF já foram confirmadas no portão.
      let confirmed = false;
      setBudgetPrompt({ estimate, run: () => {
        if (confirmed) return;
        confirmed = true;
        setBudgetPrompt(null);
        void runPaidAnalysis(
          { studyId: selected.id, version: newVersion, ir, bytes, estimate, fonte: fonteInput?.fonte },
          { cidade: selected.cidade ?? '', uf: selected.uf ?? '', ata: selected.ata ?? null },
          estimate.costUsd,
        );
      } });
    } catch (err) {
      toast.error('Falha ao reconferir', { description: processingMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  async function handleWorkspaceDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (busy !== null || analysis?.running || selected?.status === 'pronto') return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!/\.pptx$/i.test(file.name)) {
      toast.error('Formato não suportado', { description: 'Solte a versão corrigida em .pptx.' });
      return;
    }
    await recheckFromBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  }

  async function handleStatus(ruleId: string, s: FindingStatus) {
    if (!selected) return false;
    if (!await ensureAccess('registrar sua decisão de revisão')) return false;
    const ids = reviewedItems.find(i => i.ruleId === ruleId)?.duplicateRuleIds ?? [ruleId];
    setItems((prev) => prev.map((i) => (ids.includes(i.ruleId) ? { ...i, status: s, verdict: s === 'corrigido' || s === 'pendente' ? null : i.verdict } : i)));
    try {
      await Promise.all(ids.map(id => setFindingStatus(selected.id, id, s)));
      return true;
    } catch (err) {
      toast.error('Falha ao salvar status', { description: processingMessage(err) });
      setItems(await loadFindings(selected.id));
      return false;
    }
  }

  async function handleVerdict(ruleId: string, verdict: 'bug' | 'fp') {
    if (!selected) return false;
    if (!await ensureAccess('registrar sua decisão de revisão')) return false;
    const status: FindingStatus = verdict === 'fp' ? 'ignorado' : 'pendente';
    const ids = reviewedItems.find(i => i.ruleId === ruleId)?.duplicateRuleIds ?? [ruleId];
    setItems((prev) => prev.map((item) => ids.includes(item.ruleId) ? { ...item, status, verdict } : item));
    try {
      await Promise.all(ids.map(id => setFindingVerdict(selected.id, id, verdict)));
      return true;
    } catch (err) {
      toast.error('Falha ao registrar falso positivo', { description: processingMessage(err) });
      setItems(await loadFindings(selected.id));
      return false;
    }
  }

  async function handleGroupStatus(group: FindingV3[], status: FindingStatus) {
    await Promise.all(group.map((item) => handleStatus(item.ruleId, status)));
  }

  async function handleConclude() {
    if (!selected) return;
    if (!await ensureAccess('concluir a revisão deste estudo')) return;
    if (analysisPending(selected)) {
      toast.error('A análise completa ainda não rodou', { description: 'Confirme a cidade e rode a análise antes de entregar.' });
      return;
    }
    const pendentes = reviewedItems.filter((item) => item.status === 'pendente');
    const erros = pendentes.filter((item) => !isComunicacao(item));
    const blocking = erros.filter((item) => confidenceOf(item.finding, item.origem) <= 2);
    const verify = erros.filter((item) => confidenceOf(item.finding, item.origem) === 3);
    if (blocking.length) {
      toast.error('Ainda há erros ou prováveis pendentes', { description: `${blocking.length} item(ns) de nível 1–2 bloqueiam a entrega.` });
      return;
    }
    if (verify.length && !window.confirm(`Entregar com ${verify.length} item(ns) “Verificar” ainda abertos?`)) return;
    // Decisão do Gabriel (31/jul): comentário no arquivo AVISA e pede confirmação
    // — não bloqueia. O PPTX entregue ao A&R não deveria levar recado da revisão.
    const comentarios = pendentes.filter(isComunicacao).reduce((total, item) => total + noteCount(item.finding), 0);
    if (comentarios && !window.confirm(
      `O estudo ainda tem ${comentarios} comentário(s) de revisão no arquivo. ` +
      'O PPTX entregue ao A&R não deveria conter comentários. Entregar assim mesmo?'
    )) return;
    try {
      await concludeStudy(selected.id);
      toast.success('Estudo pronto para o A&R 🎉');
      await refreshList();
    } catch (err) {
      toast.error('Falha ao concluir', { description: processingMessage(err) });
    }
  }

  const wl = useMemo(() => {
    const vivos = reviewedItems.filter((i) => i.resolvidoNaVersao === null || i.status === 'pendente');
    // Comunicação da revisão não é erro do estudo (31/jul/2026): sai da contagem,
    // dos grupos e da triagem. Tem bloco próprio e vira aviso no portão de entrega.
    const comunicacao = vivos.filter(isComunicacao);
    const comentarios = comunicacao
      .filter((i) => i.status === 'pendente')
      .reduce((total, i) => total + noteCount(i.finding), 0);
    const active = vivos.filter((i) => !isComunicacao(i));
    const pend = reviewedItems.filter((i) => i.status === 'pendente' && !isComunicacao(i)).length;
    const local = active.filter((i) => isLocal(i.finding));
    const rel = active.filter((i) => !isLocal(i.finding));
    const bySlide = new Map<number, FindingV3[]>();
    for (const i of local.sort((a, b) => slideNumOf(a.finding) - slideNumOf(b.finding))) {
      const n = slideNumOf(i.finding);
      if (!bySlide.has(n)) bySlide.set(n, []);
      bySlide.get(n)!.push(i);
    }
    const byType = new Map<string, FindingV3[]>();
    for (const i of rel) {
      if (!byType.has(i.finding.type)) byType.set(i.finding.type, []);
      byType.get(i.finding.type)!.push(i);
    }
    const confidence = ([1, 2, 3] as Confidence[]).map((level) => [level, active.filter((item) => item.status === 'pendente' && confidenceOf(item.finding, item.origem) === level)] as const);
    const completude = active.filter((item) => ['ATA_COVERAGE', 'STRUCTURE_MISSING'].includes(item.finding.type));
    const problems = active.filter((item) => !['ATA_COVERAGE', 'STRUCTURE_MISSING'].includes(item.finding.type));
    const grouped = new Map<string, FindingV3[]>();
    for (const item of problems) {
      if (!grouped.has(item.finding.type)) grouped.set(item.finding.type, []);
      grouped.get(item.finding.type)!.push(item);
    }
    // fila de triagem: todos os pendentes por confiança (1→3), depois por slide
    const triageQueue = active
      .filter((item) => item.status === 'pendente')
      .sort((a, b) =>
        confidenceOf(a.finding, a.origem) - confidenceOf(b.finding, b.origem) ||
        slideNumOf(a.finding) - slideNumOf(b.finding));
    return {
      pend, total: reviewedItems.filter((i) => !isComunicacao(i)).length,
      slides: [...bySlide.entries()], relational: [...byType.entries()],
      confidence, completude, grouped: [...grouped.entries()], triageQueue,
      comunicacao, comentarios,
    };
  }, [reviewedItems]);

  const summary = summarizeStudy(reviewedItems);
  const blockingPend = wl.confidence.filter(([level]) => level <= 2).reduce((total, [, findings]) => total + findings.length, 0);

  if (analysis?.running && selected) return <main className="corretor-projects cp-preparation">
    <header className="cp-heading"><div><p className="cp-eyebrow">Avaliação em andamento</p><h1>{selected.nome}</h1><p className="cp-muted">{selected.nSlides} slides · {fonteInput ? fonteInput.name : 'Sem planilhas vinculadas'}</p></div></header>
    <AnalysisBanner state={analysis} onPause={() => abortRef.current?.abort()} />
    <p className="cp-muted">Mantenha esta aba aberta. Os lotes com retorno confirmado ficam guardados; uma interrupção pode ser retomada após conferir os materiais.</p>
  </main>;

  // ─── HOMEPAGE (dropzone herói + seções) ─────────────────────────────────────
  if (!selected && routeStudyId) return <div className="p-6"><p role="status">{loadingList || loadingStudy ? 'Abrindo revisão…' : 'Estudo não encontrado.'}</p><Link to={portfolioHref(searchParams.get('carteira') ?? '')}>Voltar aos estudos</Link></div>;
  if (!selected) return <StudyPreparationPage back={portfolioHref(searchParams.get('carteira') ?? '')} onStart={ingestNew} onRecommendation={prepareRecommendation} />;

  if (pending && !loadingStudy) return <StudyPreparationPage key={selected.id} back={portfolioHref(searchParams.get('carteira') ?? '')} resume={{study:selected, fonte:fonteInput?.fonte ?? null}} onStart={resumePrepared}/>;

  // ─── WORKSPACE ───────────────────────────────────────────────────────────────
  return (
    <div
      className={cn('min-h-screen bg-background flex flex-col relative', !routeStudyId && 'corretor-projects cp-review-legacy')}
      onDragEnter={(e) => { e.preventDefault(); if (busy === null && !analysis?.running && selected.status !== 'pronto') setDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => void handleWorkspaceDrop(e)}
    >
      {dragging && (
        <div className="fixed inset-0 z-40 pointer-events-none bg-background/85 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-xl border-2 border-dashed border-primary bg-card px-8 py-12 text-center shadow-xl">
            <RefreshCw className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-base font-semibold">Soltar para reconferir a v{selected.lastVersion + 1}</p>
            <p className="text-sm text-muted-foreground mt-1 truncate">{selected.nome}</p>
          </div>
        </div>
      )}
      <header className="cp-review-tools border-b bg-card px-6 py-3 flex items-center justify-between gap-4">
        <div className={cn("flex items-center gap-3 min-w-0", routeStudyId && "sr-only")}>
          <button
            onClick={() => navigate(portfolioHref(searchParams.get('carteira') ?? ''))}
            className="text-muted-foreground hover:text-foreground"
            title="Voltar aos estudos" aria-label="Voltar aos estudos da revisão"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{selected.nome}</h2>
            <p className="text-xs text-muted-foreground">
              versão {selected.lastVersion} · {selected.nSlides} slides
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input ref={recheckRef} type="file" accept=".pptx" className="hidden" onChange={handleRecheck} />
          <input ref={fonteRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFonte} />
          <input ref={studySourcesRef} type="file" accept=".xlsx,.xlsm,.json" multiple className="hidden" onChange={handleStudySources} />
          <input ref={resumeRef} type="file" accept=".pptx" className="hidden" onChange={handleResume} />
          <button
            type="button"
            onClick={() => studySourcesRef.current?.click()}
            disabled={sourceProgress !== null}
            className={cn('text-xs rounded-md px-2.5 py-1.5 border inline-flex items-center gap-1.5 disabled:opacity-50', fonteInput ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-400' : 'border-border hover:border-primary/50')}
            title={fonteInput ? `${fonteInput.name} — clique para trocar` : 'Vincular as planilhas-fonte (.xlsx/.xlsm) do estudo'}
          >
            {sourceProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            {sourceProgress ? `Planilhas ${sourceProgress.done}/${sourceProgress.total}` : fonteInput ? 'Planilhas vinculadas' : 'Vincular planilhas'}
          </button>
          <button
            onClick={() => recheckRef.current?.click()}
            disabled={busy !== null || analysis?.running || selected.status === 'pronto'}
            className="text-xs rounded-md px-2.5 py-1.5 border border-border hover:border-primary/50 inline-flex items-center gap-1.5 disabled:opacity-50"
            title="Reconferir o arquivo corrigido com os registros anteriores"
          >
            {busy === 'recheck' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Reconferir
          </button>
          {selected.status === 'pronto' ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 text-xs font-medium">
                <PackageCheck className="w-3.5 h-3.5" /> Pronto para o A&R
              </span>
              <a
                href={`/corretor/${selected.id}/relatorio`}
                target="_blank" rel="noreferrer"
                className="text-xs rounded-md px-2.5 py-1.5 border border-border hover:border-primary/50 inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> Relatório
              </a>
            </div>
          ) : (
            <button
              onClick={handleConclude}
              disabled={pending || blockingPend > 0 || analysis?.running}
              className="text-xs rounded-md px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5 disabled:opacity-40"
              title={pending ? 'A análise completa ainda não rodou' : blockingPend > 0 ? `Ainda há ${blockingPend} erro(s)/provável(is) pendente(s)` : 'Marcar como pronto para o A&R'}
            >
              <PackageCheck className="w-3.5 h-3.5" /> Entregar
            </button>
          )}
          <button
            onClick={async () => { if (!await ensureAccess('excluir este estudo') || !window.confirm(`Excluir o estudo “${selected.nome}” e seu histórico? Esta ação não pode ser desfeita.`)) return; try { await deleteStudy(selected.id); navigate(portfolioHref(searchParams.get('carteira') ?? '')); } catch { toast.error('Não foi possível excluir. O estudo continua disponível.'); } }}
            className="text-muted-foreground hover:text-destructive p-1.5"
            title="Excluir estudo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {!pending && <section className="cp-review-summary" aria-label="Resumo da revisão"><h2>Resumo da revisão</h2><p>{selected.nSlides} slides · versão {selected.lastVersion} · {summary.pending} apontamentos pendentes</p><div className="cp-actions">{['Erros apontados','Prováveis','A verificar'].map((label,i)=><span key={label}><strong>{summary.levels[i]}</strong> {label}</span>)}</div>{summary.categories.length > 0 && <p className="cp-muted">{summary.categories.map(([label,n])=>`${label}: ${n}`).join(' · ')}</p>}</section>}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur px-6 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs min-h-[32px]">
          {analysis?.running ? (
            <p className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Análise em andamento — os resultados aparecem ao final.</p>
          ) : pending && gate && gate.studyId === selected.id ? (
            <PreAnalysisNotice />
          ) : pending ? (
            <>
              <PreAnalysisNotice resume />
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void resumeAnalysis()}
                className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 font-medium hover:bg-primary/90 inline-flex items-center gap-1.5 disabled:opacity-50"
                title="Usa o PPTX guardado neste navegador; se não houver, pede o arquivo uma vez"
              >
                {busy === 'upload' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                Retomar análise completa
              </button>
            </>
          ) : (
            <>
              <p className="text-foreground">
                <span className="font-medium">{selected.status === 'pronto' ? 'Entregue' : 'Análise completa'}</span>
                <span className="text-muted-foreground"> · {wl.pend} para revisar · </span>
                <span className={cn(blockingPend > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground')}>{blockingPend} bloqueia(m) a entrega</span>
                {!(fonteInput || selected.temFonte) && <span className="text-muted-foreground"> · sem planilhas</span>}
              </p>
              {wl.pend > 0 && (
                <button
                  onClick={() => setTriaging(true)}
                  className="text-xs rounded-md px-3 py-1.5 border border-border hover:border-primary/50 inline-flex items-center gap-1.5"
                  title="Revisar os pendentes um a um, com o teclado"
                >
                  <Zap className="w-3.5 h-3.5" /> Revisar um a um
                </button>
              )}
            </>
          )}
        </div>
        {!pending && !analysis?.running && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Filtrar por nível">
              {([
                ['todos', 'Todos', wl.pend, [1, 2, 3]],
                ['erro', 'Erros', wl.confidence.find(([l]) => l === 1)?.[1].length ?? 0, [1]],
                ['provavel', 'Prováveis', wl.confidence.find(([l]) => l === 2)?.[1].length ?? 0, [2]],
                ['verificar', 'Verificar', wl.confidence.find(([l]) => l === 3)?.[1].length ?? 0, [3]],
              ] as const).map(([key, label, n, levels]) => {
                const on = confidenceFilter.length === levels.length && levels.every((l) => confidenceFilter.includes(l as Confidence));
                return (
                  <button key={key} type="button" onClick={() => setConfidenceFilter([...levels] as Confidence[])}
                    className={cn('rounded px-2.5 py-1', on ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground')}>
                    {label} <span className="tabular-nums opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {lastDiff && (
        <div ref={diffRef} className="border-b bg-sky-500/5 px-6 py-2 text-xs text-muted-foreground flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
          <RefreshCw className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span><strong className="text-emerald-600 dark:text-emerald-400">{lastDiff.resolved.length} resolvido(s)</strong> na versão nova</span>
          <span>· {lastDiff.persistent.length} persistem</span>
          <span>· {lastDiff.fresh.length} novo(s)</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 md:px-6 py-5 space-y-5">
          {/* Passo único: análise completa dispara sozinha no upload/reconferir */}
          {analysis?.running && (
            <AnalysisBanner state={analysis} onPause={() => abortRef.current?.abort()} />
          )}

          {/* WS-1: portão da ata — bloqueia os passes pagos até a confirmação da cidade/UF */}
          {gate && gate.studyId === selected.id && !analysis?.running && (
            <div id="analysis-gate">
              <PreAnalysisCard
                ata={gate.ata}
                suggestion={gate.suggestion}
                cities={gate.cities}
                profile={gate.profile}
                cache={{ cached: gate.estimate.visionCached, total: gate.estimate.visionCandidates }}
                costBrl={gate.phase2Brl}
                running={false}
                temFonte={Boolean(fonteInput) || Boolean(selected.temFonte)}
                sourceLabel={fonteInput?.name ?? null}
                onAttachSources={() => studySourcesRef.current?.click()}
                onConfirm={confirmGate}
              />
            </div>
          )}

          {loadingStudy ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando achados…
            </div>
          ) : (
            <>
              {analysis?.running && (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  Os alertas aparecem aqui quando a análise terminar.
                </p>
              )}
              {!pending && !analysis?.running && <>
                <Suspense fallback={<p role="status">Preparando bancada…</p>}><ReviewBench key={selected.id} study={selected} items={reviewedItems.filter(i=>(i.resolvidoNaVersao===null||i.status==='pendente')&&confidenceFilter.includes(confidenceOf(i.finding,i.origem)))} renderFinding={item=><V3FindingCard item={item} onStatus={status=>void handleStatus(item.ruleId,status)} onVerdict={verdict=>void handleVerdict(item.ruleId,verdict)}/>} /></Suspense>
              </>}

            </>
          )}
        </div>
      </div>

      {budgetPrompt && (
        <BudgetModal
          estimate={budgetPrompt.estimate}
          onConfirm={budgetPrompt.run}
          onCancel={() => setBudgetPrompt(null)}
        />
      )}

      {triaging && wl.triageQueue.length > 0 && <StudyQuickReview study={selected} queue={wl.triageQueue} onStatus={handleStatus} onVerdict={handleVerdict} onClose={() => { setTriaging(false); setConfidenceFilter([1, 2, 3]); }} />}

    </div>
  );
}

// ─── Card expansivo com todas as regras ───────────────────────────────────
