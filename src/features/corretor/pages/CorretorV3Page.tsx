// Corretor v3 — fluxo unificado de correção (DESIGN_corretor_v3.md).
// v3.0: Triagem DET (R$ 0) → Corrigir → Reconferir (diff) → Entregar.
// v3.1: estágio "Aprofundar com IA" (texto em batch, custo estimado antes).
// Navegação sem rail duplo: landing com cards de estudos → workspace com voltar.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, RefreshCw, PackageCheck,
  Trash2, FileUp, ArrowLeft, Quote, Sparkles, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { errorLabel, ERROR_CATALOG, MODE_META, type ErrorType } from '../lib/error-catalog';
import type { Finding } from '../lib/audit/model';
import type { Ir } from '../lib/audit/ir';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import { irToFindings } from '../lib/audit/ir-rules';
import { VizSwitch } from '../components/audit/FindingCard';
import { MODEL_PRICING, formatUSD, type ModelId } from '../lib/cost-calculator';
import { estimateTextPass, runTextPass } from '../lib/v3/ia-text';
import {
  createStudy, listStudies, loadFindings, setFindingStatus, recheck,
  concludeStudy, deleteStudy, insertIaFindings, registerIaPass,
  type StudyV3, type FindingV3, type FindingStatus, type DiffResult,
} from '../lib/v3/db';

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

// ─── Painel Aprofundar com IA (v3.1 — texto) ─────────────────────────────────

function IaPanel({ study, ir, onNeedFile, onRan }: {
  study: StudyV3;
  ir: Ir | null;
  onNeedFile: () => void;
  onRan: () => Promise<void>;
}) {
  const [model, setModel] = useState<ModelId>('gpt-4o-mini');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);

  const estimate = ir ? estimateTextPass(ir, model) : null;

  async function run() {
    if (!ir) return;
    setRunning(true);
    setProgress([0, estimate?.batches ?? 0]);
    try {
      const res = await runTextPass(ir, study.cidade ?? '', model, (d, t) => setProgress([d, t]));
      const inserted = await insertIaFindings(study.id, res.findings, 'IA_texto', study.lastVersion);
      await registerIaPass(
        study.id, 'texto',
        `${estimate?.slides ?? 0} slides · ${res.batches} batches · ${model}`,
        res.costUsd, res.inputTokens, res.outputTokens
      );
      toast.success(`IA de texto concluída — ${formatUSD(res.costUsd)}`, {
        description: `${res.findings.length} achado(s) da IA · ${inserted} novo(s) na worklist`,
      });
      await onRan();
    } catch (err) {
      toast.error('Falha no passe de IA', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold">Aprofundar com IA — revisão de texto</h3>
        <span className="text-[10px] text-muted-foreground">ortografia · cidade/contexto · coerência texto×tabela</span>
      </div>
      {!ir ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Para rodar a IA, selecione o .pptx da versão atual (v{study.lastVersion}) — o arquivo não fica salvo no servidor.
          </p>
          <button
            onClick={onNeedFile}
            className="text-xs rounded-md px-2.5 py-1.5 border border-border hover:border-violet-500/50 inline-flex items-center gap-1.5 shrink-0"
          >
            <FileUp className="w-3.5 h-3.5" /> Selecionar .pptx
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelId)}
            disabled={running}
            className="text-xs rounded-md border border-border bg-background px-2 py-1.5"
          >
            {(Object.keys(MODEL_PRICING) as ModelId[]).map((m) => (
              <option key={m} value={m}>{MODEL_PRICING[m].label}</option>
            ))}
          </select>
          {estimate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {estimate.slides} slides · {estimate.batches} chamada(s) · custo estimado{' '}
              <strong className="text-foreground">{formatUSD(estimate.costUsd)}</strong>
            </span>
          )}
          <button
            onClick={run}
            disabled={running}
            className="text-xs rounded-md px-3 py-1.5 bg-violet-600 text-white hover:bg-violet-700 inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {running
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {progress ? `lote ${progress[0]}/${progress[1]}` : 'rodando…'}</>
              : <><Sparkles className="w-3.5 h-3.5" /> Rodar IA de texto</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CorretorV3Page() {
  const [studies, setStudies] = useState<StudyV3[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<FindingV3[]>([]);
  const [loadingStudy, setLoadingStudy] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'recheck' | 'iafile' | null>(null);
  const [lastDiff, setLastDiff] = useState<DiffResult | null>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const recheckRef = useRef<HTMLInputElement>(null);
  const iaFileRef = useRef<HTMLInputElement>(null);
  // IR em memória por estudo (não persiste; usado p/ passes de IA e recheck)
  const irCache = useRef<Map<string, Ir>>(new Map());

  const selected = studies.find((s) => s.id === selectedId) ?? null;
  const selectedIr = selected ? (irCache.current.get(selected.id) ?? null) : null;

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

  async function handleNew(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setBusy('upload');
    try {
      const ir = await pptxToIr(file);
      const findings = irToFindings(ir).filter((f) => !f.ok);
      const id = await createStudy(
        file.name.replace(/\.pptx$/i, ''),
        { sha1: ir.sha1, nSlides: ir.n_slides, arquivo: file.name },
        findings
      );
      irCache.current.set(id, ir);
      toast.success('Triagem concluída (R$ 0)', {
        description: `${ir.n_slides} slides · ${findings.length} pendências determinísticas`,
      });
      await refreshList();
      await openStudy(id);
    } catch (err) {
      toast.error('Falha na triagem', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function handleRecheck(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    e.target.value = '';
    setBusy('recheck');
    try {
      const ir = await pptxToIr(file);
      const findings = irToFindings(ir).filter((f) => !f.ok);
      const diff = await recheck(
        selected.id,
        selected.lastVersion + 1,
        { sha1: ir.sha1, nSlides: ir.n_slides, arquivo: file.name },
        findings
      );
      irCache.current.set(selected.id, ir);
      setLastDiff(diff);
      toast.success(`Reconferido (v${selected.lastVersion + 1})`, {
        description: `${diff.resolved.length} resolvido(s) · ${diff.persistent.length} persistem · ${diff.fresh.length} novo(s)`,
      });
      await refreshList();
      setItems(await loadFindings(selected.id));
    } catch (err) {
      toast.error('Falha ao reconferir', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  /** Carrega o .pptx da versão ATUAL só para habilitar a IA (valida por sha1). */
  async function handleIaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    e.target.value = '';
    setBusy('iafile');
    try {
      const ir = await pptxToIr(file);
      if (selected.lastSha1 && ir.sha1 && ir.sha1 !== selected.lastSha1) {
        toast.error('Arquivo diferente da versão atual', {
          description: `Este .pptx não corresponde à v${selected.lastVersion}. Se você corrigiu o arquivo, use "Reconferir" primeiro.`,
        });
        return;
      }
      irCache.current.set(selected.id, ir);
      setStudies((prev) => [...prev]); // re-render
      toast.success('Arquivo carregado — IA habilitada');
    } catch (err) {
      toast.error('Falha ao ler o arquivo', { description: err instanceof Error ? err.message : String(err) });
    } finally {
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

  // ─── LANDING (sem rail: cards de estudos) ───────────────────────────────────
  if (!selected) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Corretor</h1>
            <p className="text-xs text-muted-foreground">
              Suba o estudo (.pptx) → corrija a worklist → entregue ao A&R com 0 pendentes
            </p>
          </div>
          <input ref={newRef} type="file" accept=".pptx" className="hidden" onChange={handleNew} />
          <button
            onClick={() => newRef.current?.click()}
            disabled={busy !== null}
            className="text-sm rounded-md px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            Novo estudo
          </button>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-6">
          {loadingList ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando estudos…
            </div>
          ) : studies.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Nenhum estudo ainda. Suba um .pptx — a triagem determinística roda em segundos, sem custo de IA.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {studies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openStudy(s.id)}
                  className="text-left rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/50 transition-colors space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    {s.status === 'pronto'
                      ? <PackageCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                    <span className="text-sm font-medium truncate">{s.nome}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    v{s.lastVersion} · {s.nSlides} slides
                    {s.custoTotal > 0 && <> · IA {formatUSD(s.custoTotal)}</>}
                  </p>
                  <p className={cn(
                    'text-[11px] font-medium',
                    s.status === 'pronto' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  )}>
                    {s.status === 'pronto' ? 'Pronto para o A&R' : `${s.pendentes} pendente(s)`}
                  </p>
                </button>
              ))}
            </div>
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
            disabled={busy !== null || selected.status === 'pronto'}
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
              disabled={wl.pend > 0}
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
          {/* Aprofundar com IA (v3.1) */}
          <input ref={iaFileRef} type="file" accept=".pptx" className="hidden" onChange={handleIaFile} />
          {selected.status !== 'pronto' && (
            <IaPanel
              study={selected}
              ir={selectedIr}
              onNeedFile={() => iaFileRef.current?.click()}
              onRan={async () => { setItems(await loadFindings(selected.id)); await refreshList(); }}
            />
          )}

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
            </>
          )}
        </div>
      </div>
    </div>
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
