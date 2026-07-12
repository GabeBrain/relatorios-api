// Corretor v3 — fluxo unificado de correção (DESIGN_corretor_v3.md).
// v3.0: Triagem DET (R$ 0) → Corrigir → Reconferir (diff) → Entregar.
// v3.1: estágio "Aprofundar com IA" (texto em batch, custo estimado antes).
// Navegação sem rail duplo: landing com cards de estudos → workspace com voltar.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, RefreshCw, PackageCheck,
  Trash2, FileUp, ArrowLeft, Quote, Sparkles, ChevronDown, BookOpen, Pause,
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
import { formatUSD, type ModelId } from '../lib/cost-calculator';
import { runFullAnalysis, estimateFullAnalysis, type StageProgress, type FullEstimate } from '../lib/v3/pipeline';
import { BUDGET_STUDY_BRL, formatBRL } from '../lib/v3/config';
import {
  createStudy, listStudies, loadFindings, setFindingStatus, recheck,
  concludeStudy, deleteStudy, insertIaFindings, registerIaPass, saveAta,
  type StudyV3, type FindingV3, type FindingStatus, type DiffResult,
} from '../lib/v3/db';

const MODEL: ModelId = 'gpt-4o-mini'; // econômico por padrão; visão cai p/ R$ 0 após cache

// Rótulo humano de cada etapa do pipeline de passo único
const STAGE_LABEL: Record<StageProgress['stage'], string> = {
  det: 'Triagem determinística',
  ata: 'Ata do projeto',
  texto: 'Revisão de texto (IA)',
  visao: 'Números das tabelas (visão)',
};

// ordem de exibição das etapas no banner
const STAGE_ORDER: StageProgress['stage'][] = ['det', 'ata', 'texto', 'visao'];

const isLocal = (f: Finding) => /^s\d+$/.test(f.slideRef.trim());
const slideNumOf = (f: Finding) => parseInt(f.slideRef.replace(/\D/g, ''), 10) || 0;

// ─── Card de achado com status de correção ────────────────────────────────────

const STATUS_META: Record<FindingStatus, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  corrigido: { label: 'Corrigido', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  ignorado: { label: 'Ignorado', className: 'bg-muted text-muted-foreground border-border' },
};

function V3FindingCard({ item, onStatus }: {
  item: FindingV3;
  onStatus: (s: FindingStatus) => void;
}) {
  const f = item.finding;
  const meta = ERROR_CATALOG[f.type as ErrorType];
  const mode = meta ? MODE_META[meta.mode] : null;
  const done = item.status !== 'pendente';

  return (
    <div className={cn(
      'rounded-lg border bg-card transition-opacity',
      done ? 'border-border opacity-60' : f.ok ? 'border-border' : 'border-destructive/30'
    )}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 shrink-0">
          {item.status === 'corrigido'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : <AlertTriangle className="w-4 h-4 text-amber-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="text-sm font-medium">{f.title}</span>
            <span className="text-[10px] font-mono text-muted-foreground">· {f.slideRef}</span>
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
      {f.evidenceImage && !done && (
        <div className="px-4 pb-2 space-y-1">
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
        </div>
      )}
      {f.viz && !done && (
        <div className="px-4 pb-3"><VizSwitch finding={f} /></div>
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
  const [dragging, setDragging] = useState(false);
  const newRef = useRef<HTMLInputElement>(null);
  const recheckRef = useRef<HTMLInputElement>(null);
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

  /** Executa a análise completa (texto + visão em paralelo) já autorizada. */
  const startAnalysis = useCallback(async (
    study: { id: string; cidade: string | null; version: number },
    ir: Ir,
    bytes: Uint8Array,
    estimate: FullEstimate,
  ) => {
    const ac = new AbortController();
    abortRef.current = ac;
    setAnalysis({
      running: true,
      stages: { det: { done: 1, total: 1 } },
      spentUsd: 0,
      estimateUsd: estimate.costUsd,
    });
    try {
      const res = await runFullAnalysis(ir, bytes, {
        city: study.cidade ?? '',
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
          // achados de IA pingam na worklist assim que a etapa termina
          if (p.findings?.length && (p.stage === 'texto' || p.stage === 'visao')) {
            await insertIaFindings(study.id, p.findings, p.stage === 'texto' ? 'IA_texto' : 'IA_visao', study.version);
            setItems(await loadFindings(study.id));
          }
        },
      });

      // persiste a ata (+ copia a cidade p/ card e próximas revisões)
      if (res.ata !== null || estimate.ataCandidate) {
        await saveAta(study.id, res.ata);
      }

      // registra os passes com custo/tokens reais (acumula em studies_v3.custo_total)
      if (res.ataCostUsd > 0) {
        await registerIaPass(study.id, 'visao_ata', `ata · ${MODEL}`,
          res.ataCostUsd, res.ataTokens.input, res.ataTokens.output);
      }
      if (res.textCostUsd > 0 || res.textFindings.length) {
        await registerIaPass(study.id, 'texto', `${estimate.textSlides} slides · ${MODEL}`,
          res.textCostUsd, res.textTokens.input, res.textTokens.output);
      }
      if (res.visionCostUsd > 0 || res.visionFindings.length) {
        await registerIaPass(study.id, 'visao_tabela', `${estimate.candidates.length} imagens · ${MODEL}`,
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
      setItems(await loadFindings(study.id));
    } catch (err) {
      toast.error('Falha na análise', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      abortRef.current = null;
      setAnalysis(null);
    }
  }, [refreshList]);

  /** Decide entre rodar direto ou pedir confirmação (estimativa acima do teto). */
  const analyzeStudy = useCallback(async (
    study: { id: string; cidade: string | null; version: number },
    ir: Ir,
    bytes: Uint8Array,
  ) => {
    const estimate = await estimateFullAnalysis(ir, bytes, MODEL);
    if (estimate.costBrl > BUDGET_STUDY_BRL) {
      setBudgetPrompt({ estimate, run: () => { setBudgetPrompt(null); void startAnalysis(study, ir, bytes, estimate); } });
      return;
    }
    await startAnalysis(study, ir, bytes, estimate);
  }, [startAnalysis]);

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
      // passo único: dispara a análise completa automaticamente
      await analyzeStudy({ id, cidade: null, version: 1 }, ir, bytes);
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
    const newVersion = selected.lastVersion + 1;
    setBusy('recheck');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ir = await pptxToIr(bytes, file.name);
      const findings = irToFindings(ir).filter((f) => !f.ok);
      const diff = await recheck(
        selected.id,
        newVersion,
        { sha1: ir.sha1, nSlides: ir.n_slides, arquivo: file.name },
        findings
      );
      setLastDiff(diff);
      toast.success(`Reconferido (v${newVersion})`, {
        description: `${diff.resolved.length} resolvido(s) · ${diff.persistent.length} persistem · ${diff.fresh.length} novo(s)`,
      });
      await refreshList();
      setItems(await loadFindings(selected.id));
      setBusy(null);
      // re-roda a IA sobre a versão nova (visão puxa do cache → barato)
      await analyzeStudy({ id: selected.id, cidade: selected.cidade, version: newVersion }, ir, bytes);
    } catch (err) {
      toast.error('Falha ao reconferir', { description: err instanceof Error ? err.message : String(err) });
      setBusy(null);
    }
  }

  async function handleStatus(ruleId: string, s: FindingStatus) {
    if (!selected) return;
    setItems((prev) => prev.map((i) => (i.ruleId === ruleId ? { ...i, status: s } : i)));
    try {
      await setFindingStatus(selected.id, ruleId, s);
    } catch (err) {
      toast.error('Falha ao salvar status', { description: err instanceof Error ? err.message : String(err) });
      setItems(await loadFindings(selected.id));
    }
  }

  async function handleConclude() {
    if (!selected) return;
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
    return { pend, total: items.length, slides: [...bySlide.entries()], relational: [...byType.entries()] };
  }, [items]);

  const progressPct = wl.total > 0 ? Math.round(((wl.total - wl.pend) / wl.total) * 100) : 0;

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
    <div className="min-h-screen bg-background flex flex-col">
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
            title="Subir a versão corrigida do PPTX e comparar"
          >
            {busy === 'recheck' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Reconferir
          </button>
          {selected.status === 'pronto' ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 text-xs font-medium">
              <PackageCheck className="w-3.5 h-3.5" /> Pronto para o A&R
            </span>
          ) : (
            <button
              onClick={handleConclude}
              disabled={wl.pend > 0 || analysis?.running}
              className="text-xs rounded-md px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5 disabled:opacity-40"
              title={wl.pend > 0 ? `Ainda há ${wl.pend} pendente(s)` : 'Marcar como pronto para o A&R'}
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

      <div className="border-b bg-card px-6 py-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className={cn('font-medium', wl.pend === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
            {wl.pend === 0
              ? '0 pendentes — pronto para entregar 🎉'
              : `${wl.pend} pendente(s) de ${wl.total}`}
          </span>
          <span className="text-muted-foreground font-mono">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {lastDiff && (
        <div className="border-b bg-sky-500/5 px-6 py-2 text-xs text-muted-foreground flex items-center gap-3">
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

          {/* Ata: extraída no passo único vira o card permanente; senão, teste manual */}
          {selected.ata
            ? <AtaCard ata={selected.ata} />
            : selected.status !== 'pronto' && <AtaTestPanel studyId={selected.id} />}

          {loadingStudy ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando achados…
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <WlHead title="Por slide (ordem do deck)" count={wl.slides.reduce((a, [, fs]) => a + fs.length, 0)} />
                {wl.slides.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum erro local ativo.</p>
                )}
                {wl.slides.map(([n, fs]) => (
                  <div key={n} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold rounded bg-muted px-2 py-0.5">Slide {n}</span>
                      <span className="text-[10px] text-muted-foreground">{fs.length} {fs.length === 1 ? 'erro' : 'erros'}</span>
                    </div>
                    {fs.map((i) => (
                      <V3FindingCard key={i.ruleId} item={i} onStatus={(s) => handleStatus(i.ruleId, s)} />
                    ))}
                  </div>
                ))}
              </section>

              {wl.relational.length > 0 && (
                <section className="space-y-3">
                  <WlHead
                    title="Erros entre slides"
                    count={wl.relational.reduce((a, [, fs]) => a + fs.length, 0)}
                    hint="não pertencem a um slide só — decida qual lado corrigir"
                  />
                  {wl.relational.map(([type, fs]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{errorLabel(type as ErrorType)}</span>
                        <span className="text-[10px] text-muted-foreground">{fs.length}</span>
                      </div>
                      {fs.map((i) => (
                        <V3FindingCard key={i.ruleId} item={i} onStatus={(s) => handleStatus(i.ruleId, s)} />
                      ))}
                    </div>
                  ))}
                </section>
              )}

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
