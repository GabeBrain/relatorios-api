// Corretor v3 — fluxo unificado de correção (DESIGN_corretor_v3.md).
// v3.0: Triagem DET (R$ 0) → Corrigir → Reconferir (diff) → Entregar.
// v3.1: estágio "Aprofundar com IA" (texto em batch, custo estimado antes).
// Navegação sem rail duplo: landing com cards de estudos → workspace com voltar.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, RefreshCw, PackageCheck,
  Trash2, FileUp, ArrowLeft, Quote, Sparkles, ChevronDown, BookOpen, Pause, FileText, Zap, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { errorLabel, ERROR_CATALOG, MODE_META, type ErrorType } from '../lib/error-catalog';
import type { Finding } from '../lib/audit/model';
import type { Ir } from '../lib/audit/ir';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import { irToFindings } from '../lib/audit/ir-rules';
import { VizSwitch } from '../components/audit/FindingCard';
import LegacyV1Panel from '../components/LegacyV1Panel';
import AtaTestPanel from '../components/AtaTestPanel';
import AtaCard from '../components/AtaCard';
import AtaGateCard, { type AtaGateValue } from '../components/AtaGateCard';
import { formatUSD, type ModelId } from '../lib/cost-calculator';
import {
  runPhase1, runPhase2, estimateFullAnalysis,
  type StageProgress, type FullEstimate, type Phase1Result,
} from '../lib/v3/pipeline';
import type { AtaData } from '../lib/v3/ia-ata';
import { BUDGET_STUDY_BRL, formatBRL, usdToBrl } from '../lib/v3/config';
import { confidenceOf, CONFIDENCE_META, type Confidence } from '../lib/v3/confidence';
import {
  createStudy, listStudies, loadFindings, setFindingStatus, recheck,
  concludeStudy, deleteStudy, insertIaFindings, registerIaPass, saveAta, confirmAta,
  saveReport, setFindingVerdict, type StudyV3, type FindingV3, type FindingStatus, type DiffResult,
} from '../lib/v3/db';

const MODEL: ModelId = 'gpt-4o-mini'; // econômico por padrão; visão cai p/ R$ 0 após cache

// Rótulo humano de cada etapa do pipeline de passo único
const STAGE_LABEL: Record<StageProgress['stage'], string> = {
  det: 'Triagem determinística',
  ata: 'Ata do projeto',
  texto: 'Revisão de texto (IA)',
  visao: 'Números das tabelas (visão)',
  cruzamento: 'Cruzamentos e completude',
};

// ordem de exibição das etapas no banner
const STAGE_ORDER: StageProgress['stage'][] = ['det', 'ata', 'texto', 'visao', 'cruzamento'];

const isLocal = (f: Finding) => /^s\d+$/.test(f.slideRef.trim());
const slideNumOf = (f: Finding) => parseInt(f.slideRef.replace(/\D/g, ''), 10) || 0;

// ─── Card de achado com status de correção ────────────────────────────────────

const STATUS_META: Record<FindingStatus, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  corrigido: { label: 'Corrigido', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  ignorado: { label: 'Ignorado', className: 'bg-muted text-muted-foreground border-border' },
};

function V3FindingCard({ item, onStatus, onVerdict }: {
  item: FindingV3;
  onStatus: (s: FindingStatus) => void;
  onVerdict: (v: 'bug' | 'fp') => void;
}) {
  const f = item.finding;
  const meta = ERROR_CATALOG[f.type as ErrorType];
  const mode = meta ? MODE_META[meta.mode] : null;
  const done = item.status !== 'pendente';
  const confidence = confidenceOf(f, item.origem);
  const confidenceMeta = CONFIDENCE_META[confidence];
  const [evidenceOpen, setEvidenceOpen] = useState(confidence === 1);

  return (
    <div className={cn(
      'rounded-lg border border-l-4 bg-card transition-opacity',
      item.resolvidoNaVersao && 'animate-in fade-in zoom-in-95 duration-300',
      done ? 'border-border opacity-60' : confidence === 1 ? 'border-l-red-500 border-red-500/30' : confidence === 2 ? 'border-l-orange-500 border-orange-500/30' : 'border-l-amber-500 border-amber-500/30'
    )}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 shrink-0">
          {item.status === 'corrigido'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : <AlertTriangle className="w-4 h-4 text-amber-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className={cn('text-[10px] rounded px-1.5 py-0.5 border font-medium', confidenceMeta.className)}>{confidenceMeta.icon} {confidenceMeta.label}</span>
            <span className="text-sm font-medium">{f.title}</span>
            {f.slideRef.split('×').map((ref) => <span key={ref} className="text-[10px] font-mono rounded border border-border px-1 text-muted-foreground">{ref.trim()}</span>)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[10px] rounded px-1.5 py-0.5 border bg-muted/50 text-muted-foreground">
              {errorLabel(f.type as ErrorType)}
            </span>
            {item.origem !== 'DET' && (
              <span className="text-[10px] rounded px-1.5 py-0.5 border bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30">
                IA
              </span>
            )}
            {mode && item.origem === 'DET' && (
              <span className={cn('text-[10px] rounded px-1.5 py-0.5 border', mode.className)} title={mode.hint}>
                {mode.label}
              </span>
            )}
            <span className={cn('text-[10px] rounded px-1.5 py-0.5 border', STATUS_META[item.status].className)}>
              {STATUS_META[item.status].label}
            </span>
            {item.resolvidoNaVersao && (
              <span className="text-[10px] text-muted-foreground">resolvido na v{item.resolvidoNaVersao}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{f.detail}</p>
          {f.gabarito && (
            <p className="mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1 italic">
              <Quote className="w-3 h-3 mt-0.5 shrink-0" /> Nota do analista: “{f.gabarito}”
            </p>
          )}
        </div>
      </div>
      {(f.evidenceImage || f.viz) && !done && (
        <div className="px-4 pb-2">
          <button onClick={() => setEvidenceOpen((open) => !open)} className="text-[11px] text-primary hover:underline mb-2">
            {evidenceOpen ? 'Ocultar evidência' : 'Ver evidência'}
          </button>
          {evidenceOpen && <div className="space-y-2">
          {f.evidenceImage && <>
          <a href={f.evidenceImage} target="_blank" rel="noreferrer" className="block">
            <img
              src={f.evidenceImage}
              alt={`Tabela original do slide ${f.slideRef}`}
              loading="lazy"
              className="w-full max-h-[440px] object-contain rounded-md border border-border bg-white"
            />
          </a>
          <p className="text-[10px] text-muted-foreground">
            Imagem original do {f.slideRef} — clique para ampliar. A prova abaixo mostra qual número não fecha.
          </p>
          </>}
          {f.viz && <VizSwitch finding={f} />}
          </div>}
        </div>
      )}
      <div className="flex items-center gap-1.5 border-t border-border px-4 py-2">
        <span className="text-[10px] text-muted-foreground mr-1">Marcar:</span>
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
          Não é erro (FP)
        </button>
      </div>
    </div>
  );
}

// ─── Banner de análise vivo (passo único) ────────────────────────────────────

interface AnalysisState {
  running: boolean;
  stages: Partial<Record<StageProgress['stage'], { done: number; total: number }>>;
  spentUsd: number;
  estimateUsd: number;
}

function AnalysisBanner({ state, onPause }: { state: AnalysisState; onPause: () => void }) {
  const order = STAGE_ORDER;
  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-violet-500 shrink-0 animate-pulse" />
          <h3 className="text-sm font-semibold truncate">Analisando o estudo…</h3>
          <span className="text-xs text-muted-foreground">
            ~{formatBRL(state.estimateUsd)} estimado · {formatBRL(state.spentUsd)} gasto
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

function BudgetModal({ estimate, onConfirm, onCancel }: {
  estimate: FullEstimate;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-lg border bg-card p-5 space-y-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold">Estimativa acima do teto</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          A análise completa deste estudo custa cerca de{' '}
          <strong className="text-foreground">{formatBRL(estimate.costUsd)}</strong>, acima do teto de{' '}
          <strong className="text-foreground">R$ {BUDGET_STUDY_BRL.toFixed(2).replace('.', ',')}</strong>{' '}
          da fase de testes. São {estimate.textSlides} slides de texto e {estimate.visionToRun} imagem(ns) de
          tabela a extrair{estimate.visionCached > 0 && ` (${estimate.visionCached} já no cache)`}.
        </p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onCancel} className="text-xs rounded-md px-3 py-1.5 border border-border hover:bg-muted">
            Cancelar (fica só a triagem grátis)
          </button>
          <button onClick={onConfirm} className="text-xs rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            Analisar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Seção + card de estudo (homepage) ───────────────────────────────────────

function StudySection({ title, studies, onOpen, empty }: {
  title: string;
  studies: StudyV3[];
  onOpen: (id: string) => void;
  empty?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-[10px] text-muted-foreground">{studies.length}</span>
        <div className="flex-1 border-t border-border" />
      </div>
      {studies.length === 0 ? (
        empty && <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {studies.map((s) => <StudyCard key={s.id} s={s} onOpen={onOpen} />)}
        </div>
      )}
    </section>
  );
}

function StudyCard({ s, onOpen }: { s: StudyV3; onOpen: (id: string) => void }) {
  const pronto = s.status === 'pronto';
  return (
    <button
      onClick={() => onOpen(s.id)}
      className="text-left rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/50 transition-colors space-y-1.5"
    >
      <div className="flex items-center gap-2">
        {pronto
          ? <PackageCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
        <span className="text-sm font-medium truncate">{s.nome}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {s.cidade && <>{s.cidade} · </>}v{s.lastVersion} · {s.nSlides} slides
        {s.custoTotal > 0 && <> · IA {formatUSD(s.custoTotal)}</>}
      </p>
      <p className={cn('text-[11px] font-medium', pronto ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
        {pronto ? 'Pronto para o A&R' : `${s.pendentes} pendente(s)`}
      </p>
    </button>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CorretorV3Page() {
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
    ata: AtaData | null; estimate: FullEstimate; phase2Brl: string;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'completude' | 'problemas' | 'slides'>('completude');
  const [confidenceFilter, setConfidenceFilter] = useState<Confidence[]>([1, 2, 3]);
  const [triaging, setTriaging] = useState(false);
  const newRef = useRef<HTMLInputElement>(null);
  const recheckRef = useRef<HTMLInputElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selected = studies.find((s) => s.id === selectedId) ?? null;

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try { setStudies(await listStudies()); } finally { setLoadingList(false); }
  }, []);
  useEffect(() => { refreshList(); }, [refreshList]);

  const openStudy = useCallback(async (id: string) => {
    setSelectedId(id);
    setLastDiff(null);
    setLoadingStudy(true);
    try { setItems(await loadFindings(id)); } finally { setLoadingStudy(false); }
  }, []);

  /**
   * FASE 2 (paga): texto + visão + cruzamentos, com a cidade/UF JÁ confirmadas no
   * portão. Persiste a ata confirmada, os DET pós-ata e registra os passes/custos.
   */
  const runPaidAnalysis = useCallback(async (
    ctx: { studyId: string; version: number; ir: Ir; bytes: Uint8Array; estimate: FullEstimate },
    confirmed: AtaGateValue,
    phase2Usd: number,
  ) => {
    const ac = new AbortController();
    abortRef.current = ac;
    setAnalysis({ running: true, stages: { det: { done: 1, total: 1 }, ata: { done: 1, total: 1 } }, spentUsd: 0, estimateUsd: phase2Usd });
    try {
      // grava a ata confirmada + cidade/UF validadas (a régua da revisão)
      await confirmAta(ctx.studyId, confirmed.ata, confirmed.cidade, confirmed.uf);

      const res = await runPhase2(ctx.ir, {
        city: confirmed.cidade,
        uf: confirmed.uf,
        ata: confirmed.ata,
        model: MODEL,
        candidates: ctx.estimate.candidates,
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

      // DET pós-ata (UF + cobertura) por upsert — IDs estáveis evitam duplicata.
      await insertIaFindings(ctx.studyId, res.detFindings, 'DET', ctx.version);
      // snapshot do que foi verificado (attestation / WS-2)
      await saveReport(ctx.studyId, res.report);

      if (res.textCostUsd > 0 || res.textFindings.length) {
        await registerIaPass(ctx.studyId, 'texto', `${ctx.estimate.textSlides} slides · ${MODEL}`,
          res.textCostUsd, res.textTokens.input, res.textTokens.output);
      }
      if (res.visionCostUsd > 0 || res.visionFindings.length) {
        await registerIaPass(ctx.studyId, 'visao_tabela', `${ctx.estimate.candidates.length} imagens · ${MODEL}`,
          res.visionCostUsd, res.visionTokens.input, res.visionTokens.output);
      }

      const nIa = res.textFindings.length + res.visionFindings.length;
      const custo = res.textCostUsd + res.visionCostUsd;
      if (res.aborted) {
        toast.warning('Análise pausada', { description: `${nIa} achado(s) de IA até aqui · ${formatBRL(custo)} — o que foi extraído ficou salvo (cache).` });
      } else {
        toast.success(`Análise completa — ${formatBRL(custo)}`, {
          description: `${nIa} achado(s) de IA na worklist` +
            (res.visionEscalated > 0 ? ` · ${res.visionEscalated} tabela(s) reconferida(s) no gpt-4o` : ''),
        });
      }
      await refreshList();
      setItems(await loadFindings(ctx.studyId));
    } catch (err) {
      toast.error('Falha na análise', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      abortRef.current = null;
      setAnalysis(null);
    }
  }, [refreshList]);

  /**
   * FASE 1 (barata): DET + ata. Persiste a ata bruta e os DET, depois ABRE O PORTÃO
   * (setGate) — nada de texto/visão paga roda antes da confirmação do analista.
   */
  const startPhase1AndGate = useCallback(async (
    study: { id: string; version: number }, ir: Ir, bytes: Uint8Array,
  ) => {
    const ac = new AbortController();
    abortRef.current = ac;
    setAnalysis({ running: true, stages: { det: { done: 1, total: 1 } }, spentUsd: 0, estimateUsd: 0 });
    try {
      const estimate = await estimateFullAnalysis(ir, bytes, MODEL);
      const p1: Phase1Result = await runPhase1(ir, bytes, {
        model: MODEL,
        candidates: estimate.candidates,
        ataCandidate: estimate.ataCandidate,
        signal: ac.signal,
        onStage: async (p) => {
          setAnalysis((prev) => prev && {
            ...prev,
            stages: { ...prev.stages, [p.stage]: { done: p.done, total: p.total } },
            spentUsd: prev.spentUsd + (p.spentUsd ?? 0),
          });
        },
      });

      // persiste a ata bruta (card) e o custo da ata; DET já entrou no createStudy
      if (p1.ata !== null || p1.ataCandidate) await saveAta(study.id, p1.ata);
      if (p1.ataCostUsd > 0) {
        await registerIaPass(study.id, 'visao_ata', `ata · ${MODEL}`, p1.ataCostUsd, p1.ataTokens.input, p1.ataTokens.output);
      }
      await insertIaFindings(study.id, p1.detFindings, 'DET', study.version);
      await refreshList();
      setItems(await loadFindings(study.id));

      const phase2Usd = Math.max(0, estimate.costUsd - p1.ataCostUsd);
      setGate({
        studyId: study.id, version: study.version, ir, bytes,
        ata: p1.ata, estimate, phase2Brl: formatBRL(phase2Usd),
      });
    } catch (err) {
      toast.error('Falha na triagem', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      abortRef.current = null;
      setAnalysis(null);
    }
  }, [refreshList]);

  /** Portão confirmado: valida orçamento da fase 2 e a executa. */
  const confirmGate = useCallback((value: AtaGateValue) => {
    if (!gate) return;
    const ctx = { studyId: gate.studyId, version: gate.version, ir: gate.ir, bytes: gate.bytes, estimate: gate.estimate };
    // A ata já foi paga na fase 1; o orçamento restante é texto + visão.
    const phase2Usd = Math.max(0, gate.estimate.costUsd - gate.estimate.vision.costUsd) + gate.estimate.vision.costUsd;
    setGate(null);
    const run = () => void runPaidAnalysis(ctx, value, gate.estimate.costUsd);
    if (usdToBrl(phase2Usd) > BUDGET_STUDY_BRL) {
      setBudgetPrompt({ estimate: gate.estimate, run: () => { setBudgetPrompt(null); run(); } });
      return;
    }
    run();
  }, [gate, runPaidAnalysis]);

  async function ingestNew(file: File) {
    if (!/\.pptx$/i.test(file.name)) {
      toast.error('Formato não suportado', { description: 'O corretor recebe estudos em .pptx.' });
      return;
    }
    setBusy('upload');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ir = await pptxToIr(bytes, file.name);
      const findings = irToFindings(ir).filter((f) => !f.ok);
      const id = await createStudy(
        file.name.replace(/\.pptx$/i, ''),
        { sha1: ir.sha1, nSlides: ir.n_slides, arquivo: file.name },
        findings
      );
      toast.success('Triagem concluída (R$ 0)', {
        description: `${ir.n_slides} slides · ${findings.length} pendências determinísticas`,
      });
      await refreshList();
      await openStudy(id);
      setBusy(null);
      // fase 1 (DET + ata) → portão de confirmação → fase 2 (paga)
      await startPhase1AndGate({ id, version: 1 }, ir, bytes);
    } catch (err) {
      toast.error('Falha na triagem', { description: err instanceof Error ? err.message : String(err) });
      setBusy(null);
    }
  }

  function handleNew(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    void ingestNew(file);
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
    const newVersion = selected.lastVersion + 1;
    setBusy('recheck');
    try {
      const ir = await pptxToIr(bytes, filename);
      const findings = irToFindings(ir, selected.uf ? { uf: selected.uf } : undefined).filter((f) => !f.ok);
      const diff = await recheck(
        selected.id,
        newVersion,
        { sha1: ir.sha1, nSlides: ir.n_slides, arquivo: filename },
        findings
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
        toast.info('Reconferência gratuita concluída', {
          description: `${estimate.visionCached} imagem(ns) no cache · nenhum passe pago executado.`,
        });
        return;
      }
      // Imagens novas exigem a fase paga; cidade/UF já foram confirmadas no portão.
      await runPaidAnalysis(
        { studyId: selected.id, version: newVersion, ir, bytes, estimate },
        { cidade: selected.cidade ?? '', uf: selected.uf ?? '', ata: selected.ata ?? null },
        estimate.costUsd,
      );
    } catch (err) {
      toast.error('Falha ao reconferir', { description: err instanceof Error ? err.message : String(err) });
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
    if (!selected) return;
    setItems((prev) => prev.map((i) => (i.ruleId === ruleId ? { ...i, status: s, verdict: s === 'corrigido' || s === 'pendente' ? null : i.verdict } : i)));
    try {
      await setFindingStatus(selected.id, ruleId, s);
    } catch (err) {
      toast.error('Falha ao salvar status', { description: err instanceof Error ? err.message : String(err) });
      setItems(await loadFindings(selected.id));
    }
  }

  async function handleVerdict(ruleId: string, verdict: 'bug' | 'fp') {
    if (!selected) return;
    const status: FindingStatus = verdict === 'fp' ? 'ignorado' : 'pendente';
    setItems((prev) => prev.map((item) => item.ruleId === ruleId ? { ...item, status, verdict } : item));
    try {
      await setFindingVerdict(selected.id, ruleId, verdict);
    } catch (err) {
      toast.error('Falha ao registrar falso positivo', { description: err instanceof Error ? err.message : String(err) });
      setItems(await loadFindings(selected.id));
    }
  }

  async function handleGroupStatus(group: FindingV3[], status: FindingStatus) {
    await Promise.all(group.map((item) => handleStatus(item.ruleId, status)));
  }

  async function handleConclude() {
    if (!selected) return;
    const blocking = items.filter((item) => item.status === 'pendente' && confidenceOf(item.finding, item.origem) <= 2);
    const verify = items.filter((item) => item.status === 'pendente' && confidenceOf(item.finding, item.origem) === 3);
    if (blocking.length) {
      toast.error('Ainda há erros ou prováveis pendentes', { description: `${blocking.length} item(ns) de nível 1–2 bloqueiam a entrega.` });
      return;
    }
    if (verify.length && !window.confirm(`Entregar com ${verify.length} item(ns) “Verificar” ainda abertos?`)) return;
    try {
      await concludeStudy(selected.id);
      toast.success('Estudo pronto para o A&R 🎉');
      await refreshList();
    } catch (err) {
      toast.error('Falha ao concluir', { description: err instanceof Error ? err.message : String(err) });
    }
  }

  const wl = useMemo(() => {
    const active = items.filter((i) => i.resolvidoNaVersao === null || i.status === 'pendente');
    const pend = items.filter((i) => i.status === 'pendente').length;
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
    return { pend, total: items.length, slides: [...bySlide.entries()], relational: [...byType.entries()], confidence, completude, grouped: [...grouped.entries()], triageQueue };
  }, [items]);

  const progressPct = wl.total > 0 ? Math.round(((wl.total - wl.pend) / wl.total) * 100) : 0;
  const blockingPend = wl.confidence.filter(([level]) => level <= 2).reduce((total, [, findings]) => total + findings.length, 0);

  // ─── HOMEPAGE (dropzone herói + seções) ─────────────────────────────────────
  if (!selected) {
    const emCorrecao = studies.filter((s) => s.status !== 'pronto');
    const prontos = studies.filter((s) => s.status === 'pronto');
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card px-6 py-4">
          <h1 className="text-base font-semibold">Corretor de Estudos</h1>
          <p className="text-xs text-muted-foreground">
            Suba o .pptx → análise completa automática (texto + números) → corrija a worklist → entregue ao A&R com 0 pendentes
          </p>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
          {/* Dropzone herói */}
          <input ref={newRef} type="file" accept=".pptx" className="hidden" onChange={handleNew} />
          <button
            type="button"
            onClick={() => busy === null && newRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void ingestNew(f);
            }}
            disabled={busy !== null}
            className={cn(
              'w-full rounded-xl border-2 border-dashed px-6 py-10 flex flex-col items-center justify-center gap-3 text-center transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card',
              busy !== null && 'opacity-70 cursor-wait'
            )}
          >
            {busy === 'upload'
              ? <Loader2 className="w-8 h-8 text-primary animate-spin" />
              : <Upload className={cn('w-8 h-8', dragging ? 'text-primary' : 'text-muted-foreground')} />}
            <div>
              <p className="text-sm font-medium">
                {busy === 'upload' ? 'Lendo o estudo…' : 'Arraste o .pptx aqui ou clique para escolher'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A triagem determinística roda em segundos (R$ 0); a IA de texto e números segue automática, com teto de{' '}
                R$ {BUDGET_STUDY_BRL.toFixed(2).replace('.', ',')} por estudo.
              </p>
            </div>
          </button>

          {loadingList ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando estudos…
            </div>
          ) : (
            <>
              <StudySection
                title="Em correção"
                empty="Nenhum estudo em correção — suba um .pptx acima."
                studies={emCorrecao}
                onOpen={openStudy}
              />
              {prontos.length > 0 && (
                <StudySection title="Prontos para o A&R" studies={prontos} onOpen={openStudy} />
              )}
              <LegacyV1Panel />
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── WORKSPACE ───────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-background flex flex-col relative"
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
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => { setSelectedId(null); refreshList(); }}
            className="text-muted-foreground hover:text-foreground"
            title="Voltar aos estudos"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{selected.nome}</h2>
            <p className="text-xs text-muted-foreground">
              versão {selected.lastVersion} · {selected.nSlides} slides
              {selected.custoTotal > 0 && <> · IA acumulada {formatUSD(selected.custoTotal)}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input ref={recheckRef} type="file" accept=".pptx" className="hidden" onChange={handleRecheck} />
          <button
            onClick={() => recheckRef.current?.click()}
            disabled={busy !== null || analysis?.running || selected.status === 'pronto'}
            className="text-xs rounded-md px-2.5 py-1.5 border border-border hover:border-primary/50 inline-flex items-center gap-1.5 disabled:opacity-50"
            title="O diff determinístico é grátis; IA só roda quando houver imagem nova"
          >
            {busy === 'recheck' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Reconferir (DET R$ 0)
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
              disabled={blockingPend > 0 || analysis?.running}
              className="text-xs rounded-md px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5 disabled:opacity-40"
              title={blockingPend > 0 ? `Ainda há ${blockingPend} erro(s)/provável(is) pendente(s)` : 'Marcar como pronto para o A&R'}
            >
              <PackageCheck className="w-3.5 h-3.5" /> Entregar
            </button>
          )}
          <button
            onClick={async () => { await deleteStudy(selected.id); setSelectedId(null); refreshList(); }}
            className="text-muted-foreground hover:text-destructive p-1.5"
            title="Excluir estudo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur px-6 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap gap-2">
            {wl.confidence.map(([level, findings]) => {
              const meta = CONFIDENCE_META[level];
              return <span key={level} className={cn('rounded border px-2 py-0.5 font-medium', meta.className)}>{meta.icon} {findings.length} {meta.label.toLowerCase()}{findings.length === 1 ? '' : 's'}</span>;
            })}
          </div>
          <span className={cn('font-medium', blockingPend === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
            {blockingPend === 0 ? (wl.pend ? `${wl.pend} item(ns) para verificar` : '0 pendentes — pronto para entregar 🎉') : `${blockingPend} bloqueia(m) a entrega`}
          </span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
        <div className="flex gap-1 pt-0.5 items-center">
          {([
            ['completude', 'Completude'], ['problemas', 'Problemas'], ['slides', 'Por slide'],
          ] as const).map(([tab, label]) => <button key={tab} onClick={() => setWorkspaceTab(tab)} className={cn('text-xs rounded-md px-3 py-1.5 border', workspaceTab === tab ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>{label}</button>)}
          <div className="flex-1" />
          {wl.pend > 0 && (
            <button
              onClick={() => setTriaging(true)}
              className="text-xs rounded-md px-3 py-1.5 border border-primary/40 text-primary hover:bg-primary/5 inline-flex items-center gap-1.5"
              title="Passar pelos pendentes rapidamente com o teclado"
            >
              <Zap className="w-3.5 h-3.5" /> Triar {wl.pend}
            </button>
          )}
        </div>
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
        <div className="max-w-3xl mx-auto px-6 py-5 space-y-5">
          {/* Passo único: análise completa dispara sozinha no upload/reconferir */}
          {analysis?.running && (
            <AnalysisBanner state={analysis} onPause={() => abortRef.current?.abort()} />
          )}

          {/* WS-1: portão da ata — bloqueia os passes pagos até a confirmação da cidade/UF */}
          {gate && gate.studyId === selected.id && !analysis?.running && (
            <AtaGateCard
              ata={gate.ata}
              costBrl={gate.phase2Brl}
              running={false}
              onConfirm={confirmGate}
            />
          )}

          {loadingStudy ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando achados…
            </div>
          ) : (
            <>
              {workspaceTab === 'completude' && <section className="space-y-4">
                {selected.ata
                  ? <AtaCard ata={selected.ata} />
                  : selected.status !== 'pronto' && <AtaTestPanel studyId={selected.id} />}
                <WlHead title="Cobertura da ata e estrutura" count={wl.completude.length} hint="corrija o que falta produzir antes da varredura fina" />
                {wl.completude.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum item estrutural pendente.</p> : wl.completude.map((item) => <V3FindingCard key={item.ruleId} item={item} onStatus={(status) => handleStatus(item.ruleId, status)} onVerdict={(verdict) => handleVerdict(item.ruleId, verdict)} />)}
                <DeckRuler slides={selected.nSlides} items={items} onSlide={(slide) => { setWorkspaceTab('slides'); setConfidenceFilter([1, 2, 3]); requestAnimationFrame(() => document.getElementById(`slide-${slide}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} />
              </section>}

              {workspaceTab === 'problemas' && <section className="space-y-3">
                <WlHead title="Problemas por causa raiz" count={wl.grouped.reduce((total, [, group]) => total + group.length, 0)} hint="grupos de “Verificar” ficam recolhidos" />
                {wl.grouped.sort(([, a], [, b]) => confidenceOf(a[0].finding, a[0].origem) - confidenceOf(b[0].finding, b[0].origem) || b.length - a.length).map(([type, group]) => <ProblemGroup key={type} type={type as ErrorType} items={group} onStatus={handleStatus} onVerdict={handleVerdict} onGroupStatus={handleGroupStatus} />)}
              </section>}

              {workspaceTab === 'slides' && <section className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {([1, 2, 3] as Confidence[]).map((level) => <button key={level} onClick={() => setConfidenceFilter((current) => current.includes(level) ? current.filter((item) => item !== level) : [...current, level])} className={cn('text-[11px] rounded-full border px-2.5 py-1', confidenceFilter.includes(level) ? CONFIDENCE_META[level].className : 'border-border text-muted-foreground')}>{CONFIDENCE_META[level].icon} {CONFIDENCE_META[level].label}</button>)}
                </div>
                <WlHead title="Por slide (ordem do deck)" count={wl.slides.reduce((total, [, findings]) => total + findings.length, 0)} />
                {wl.slides.map(([n, findings]) => {
                  const visible = findings.filter((item) => confidenceFilter.includes(confidenceOf(item.finding, item.origem)));
                  if (!visible.length) return null;
                  return <div id={`slide-${n}`} key={n} className="space-y-2 scroll-mt-32"><div className="flex items-center gap-2"><span className="text-xs font-semibold rounded bg-muted px-2 py-0.5">Slide {n}</span><span className="text-[10px] text-muted-foreground">{visible.length} item(ns)</span></div>{visible.map((item) => <V3FindingCard key={item.ruleId} item={item} onStatus={(status) => handleStatus(item.ruleId, status)} onVerdict={(verdict) => handleVerdict(item.ruleId, verdict)} />)}</div>;
                })}
              </section>}

              {/* Card de regras */}
              <section className="pt-4">
                <RulesCard />
              </section>
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

      {triaging && wl.triageQueue.length > 0 && (
        <TriageOverlay
          queue={wl.triageQueue}
          onStatus={handleStatus}
          onVerdict={handleVerdict}
          groupOf={(type) => items.filter((i) => i.status === 'pendente' && i.finding.type === type)}
          onClose={() => { setTriaging(false); setWorkspaceTab('slides'); setConfidenceFilter([1, 2, 3]); }}
        />
      )}
    </div>
  );
}

// ─── Card expansivo com todas as regras ───────────────────────────────────

function RulesCard() {
  const [open, setOpen] = useState(false);

  const detRules = Object.entries(ERROR_CATALOG).filter(
    ([_, meta]) => meta.motor === 'DET'
  );
  const iaRules = Object.entries(ERROR_CATALOG).filter(
    ([_, meta]) => meta.motor === 'IA' || meta.motor === 'DET+IA'
  );

  const RuleItem = ({ type, meta }: { type: string; meta: typeof ERROR_CATALOG['PERCENTAGE_SUM'] }) => (
    <div className="border-l-2 border-border pl-3 py-2">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{meta.label}</span>
            <span className={cn('text-[10px] rounded px-1.5 py-0.5 border', MODE_META[meta.mode].className)}>
              {MODE_META[meta.mode].label}
            </span>
            <span className="text-[10px] rounded px-1.5 py-0.5 border bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30">
              {meta.motor}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{type}</span>
      </div>
      <p className="text-xs text-muted-foreground">{meta.description}</p>
      <span className="text-[10px] text-muted-foreground italic mt-1 block">
        Padrão: {meta.viz}
      </span>
    </div>
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card p-4">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Regras aplicadas</h3>
              <span className="text-[10px] text-muted-foreground">
                {detRules.length} determinísticas · {iaRules.length} de IA
              </span>
            </div>
            <ChevronDown
              className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          {/* Regras Determinísticas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Determinísticas (DET)</span>
              <span className="text-[10px] text-muted-foreground">{detRules.length}</span>
            </div>
            <div className="space-y-1">
              {detRules.map(([type, meta]) => (
                <RuleItem key={type} type={type as ErrorType} meta={meta} />
              ))}
            </div>
          </div>

          {/* Regras de IA */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Com IA (IA · DET+IA)</span>
              <span className="text-[10px] text-muted-foreground">{iaRules.length}</span>
            </div>
            <div className="space-y-1">
              {iaRules.map(([type, meta]) => (
                <RuleItem key={type} type={type as ErrorType} meta={meta} />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function DeckRuler({ slides, items, onSlide }: { slides: number; items: FindingV3[]; onSlide: (slide: number) => void }) {
  const pinned = new Set<number>();
  for (const item of items.filter((item) => item.status === 'pendente')) {
    for (const match of item.finding.slideRef.matchAll(/s(\d+)/g)) pinned.add(Number(match[1]));
  }
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="text-xs font-semibold">Vista geral do deck</div>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(26px, 1fr))' }}>
        {Array.from({ length: slides }, (_, index) => index + 1).map((slide) => <button key={slide} onClick={() => onSlide(slide)} title={`Slide ${slide}${pinned.has(slide) ? ' — possui pendência' : ''}`} className={cn('h-5 rounded text-[9px] font-mono border', pinned.has(slide) ? 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300' : 'bg-muted/40 border-border text-muted-foreground hover:border-primary/50')}>{slide}</button>)}
      </div>
      <p className="text-[10px] text-muted-foreground">Pinos âmbar indicam slides com pendência; clique para abrir a varredura daquele ponto.</p>
    </div>
  );
}

function ProblemGroup({ type, items, onStatus, onVerdict, onGroupStatus }: {
  type: ErrorType; items: FindingV3[];
  onStatus: (ruleId: string, status: FindingStatus) => void;
  onVerdict: (ruleId: string, verdict: 'bug' | 'fp') => void;
  onGroupStatus: (items: FindingV3[], status: FindingStatus) => void;
}) {
  const level = confidenceOf(items[0].finding, items[0].origem);
  const [open, setOpen] = useState(level !== 3);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn('rounded-lg border', CONFIDENCE_META[level].className)}>
        <div className="flex items-center gap-2 px-3 py-2">
          <CollapsibleTrigger className="text-left flex-1 min-w-0"><span className="text-xs font-semibold">{CONFIDENCE_META[level].icon} {errorLabel(type)} ({items.length})</span><span className="ml-2 text-[10px] opacity-70">{open ? 'ocultar' : 'ver grupo'}</span></CollapsibleTrigger>
          <button onClick={() => void onGroupStatus(items, 'corrigido')} className="text-[10px] rounded border border-current/30 px-2 py-1 hover:bg-background/40">Corrigir grupo</button>
          <button onClick={() => void onGroupStatus(items, 'ignorado')} className="text-[10px] rounded border border-current/30 px-2 py-1 hover:bg-background/40">Ignorar grupo</button>
        </div>
        <CollapsibleContent className="border-t border-current/15 p-2 space-y-2">
          {items.map((item) => <V3FindingCard key={item.ruleId} item={item} onStatus={(status) => onStatus(item.ruleId, status)} onVerdict={(verdict) => onVerdict(item.ruleId, verdict)} />)}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function WlHead({ title, count, hint }: { title: string; count: number; hint?: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      <span className="text-[10px] text-muted-foreground">{count} achado(s)</span>
      {hint && <span className="text-[10px] text-muted-foreground italic">· {hint}</span>}
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

// ─── WS-3: modo triage por teclado ────────────────────────────────────────────
// Um card por vez, decisão rápida com o teclado. A fila é congelada na abertura para
// não reembaralhar a cada decisão; o resumo aparece ao fim.

function TriageOverlay({ queue, onStatus, onVerdict, groupOf, onClose }: {
  queue: FindingV3[];
  onStatus: (ruleId: string, status: FindingStatus) => void;
  onVerdict: (ruleId: string, verdict: 'bug' | 'fp') => void;
  groupOf: (type: string) => FindingV3[];
  onClose: () => void;
}) {
  // A fila nasce congelada. Aceitar grupo remove as ocorrências futuras apenas
  // desta sessão; os achados continuam pendentes para a correção de verdade.
  const [frozen, setFrozen] = useState(queue);
  const [total] = useState(queue.length);
  const [i, setI] = useState(0);
  const [tally, setTally] = useState({ aceitos: 0, corrigidos: 0, fp: 0, ignorados: 0 });

  const advance = useCallback(() => setI((n) => n + 1), []);
  const item = frozen[i];

  const act = useCallback((kind: 'aceitar' | 'corrigido' | 'fp' | 'ignorar' | 'grupo') => {
    if (!item) return;
    if (kind === 'aceitar') { setTally((t) => ({ ...t, aceitos: t.aceitos + 1 })); advance(); return; }
    if (kind === 'corrigido') { onStatus(item.ruleId, 'corrigido'); setTally((t) => ({ ...t, corrigidos: t.corrigidos + 1 })); advance(); return; }
    if (kind === 'ignorar') { onStatus(item.ruleId, 'ignorado'); setTally((t) => ({ ...t, ignorados: t.ignorados + 1 })); advance(); return; }
    if (kind === 'fp') { onVerdict(item.ruleId, 'fp'); setTally((t) => ({ ...t, fp: t.fp + 1 })); advance(); return; }
    if (kind === 'grupo') {
      const remaining = frozen.slice(i).filter((candidate) => candidate.finding.type === item.finding.type).length;
      setTally((t) => ({ ...t, aceitos: t.aceitos + remaining }));
      setFrozen((current) => current.filter((candidate, index) => index <= i || candidate.finding.type !== item.finding.type));
      advance();
    }
  }, [item, advance, onStatus, onVerdict, groupOf, frozen, i]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      switch (e.key) {
        case 'Enter': case 'ArrowRight': e.preventDefault(); act('aceitar'); break;
        case 'c': case 'C': act('corrigido'); break;
        case 'f': case 'F': act('fp'); break;
        case 'i': case 'I': act('ignorar'); break;
        case 'g': case 'G': act('grupo'); break;
        case 'ArrowLeft': setI((n) => Math.max(0, n - 1)); break;
        case 'Escape': onClose(); break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act, onClose]);

  const done = i >= frozen.length;
  const groupSize = item ? groupOf(item.finding.type).length : 0;
  const conf = item ? confidenceOf(item.finding, item.origem) : 1;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex flex-col">
      <div className="border-b bg-card px-6 py-3 flex items-center gap-4">
        <Zap className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Triagem rápida</h2>
        <span className="text-xs text-muted-foreground">{done ? 'concluída' : `${Math.min(tally.aceitos + tally.corrigidos + tally.fp + tally.ignorados + 1, total)} de ${total}`}</span>
        <div className="flex-1"><Progress value={total ? ((tally.aceitos + tally.corrigidos + tally.fp + tally.ignorados) / total) * 100 : 100} className="h-1.5 max-w-md" /></div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {done ? (
            <div className="text-center space-y-4 py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div>
                <p className="text-lg font-semibold">Triagem concluída</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tally.aceitos} aceito(s) · {tally.corrigidos} corrigido(s) · {tally.fp} FP · {tally.ignorados} ignorado(s)
                </p>
              </div>
              <button onClick={onClose} className="text-sm rounded-md px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90">Voltar à worklist</button>
            </div>
          ) : item ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={cn('text-[11px] rounded px-2 py-0.5 border font-medium', CONFIDENCE_META[conf].className)}>{CONFIDENCE_META[conf].icon} {CONFIDENCE_META[conf].label}</span>
                <span className="text-xs font-medium">{errorLabel(item.finding.type as ErrorType)}</span>
                {item.finding.slideRef.split('×').map((ref) => <span key={ref} className="text-[10px] font-mono rounded border border-border px-1 text-muted-foreground">{ref.trim()}</span>)}
              </div>
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <p className="text-sm font-medium">{item.finding.title}</p>
                <p className="text-xs text-muted-foreground">{item.finding.detail}</p>
                {item.finding.evidenceImage && (
                  <a href={item.finding.evidenceImage} target="_blank" rel="noreferrer" className="block">
                    <img src={item.finding.evidenceImage} alt={`Evidência do ${item.finding.slideRef}`} className="max-h-64 rounded border border-border object-contain" />
                  </a>
                )}
                {item.finding.viz && <VizSwitch finding={item.finding} />}
              </div>
              {groupSize > 1 && (
                <p className="text-[11px] text-amber-600">
                  Há {groupSize} itens do tipo “{errorLabel(item.finding.type as ErrorType)}”. <kbd className="rounded border px-1">G</kbd> decide todos de uma vez.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <TriageKey k="Enter" label="Aceitar" onClick={() => act('aceitar')} />
                <TriageKey k="C" label="Já corrigi" onClick={() => act('corrigido')} />
                <TriageKey k="F" label="Não é erro" onClick={() => act('fp')} />
                <TriageKey k="I" label="Ignorar" onClick={() => act('ignorar')} />
                {groupSize > 1 && <TriageKey k="G" label={`Aceitar grupo (${groupSize})`} onClick={() => act('grupo')} />}
                <div className="flex-1" />
                <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40">← anterior</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TriageKey({ k, label, onClick }: { k: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border px-3 py-1.5 hover:border-primary/50">
      <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">{k}</kbd> {label}
    </button>
  );
}
