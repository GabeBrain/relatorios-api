// Corretor v3 — fluxo unificado de correção (DESIGN_corretor_v3.md).
// v3.0: Triagem DET (R$ 0) → Corrigir (worklist c/ status) → Reconferir (diff) → Entregar.
// IA por demanda (v3.1/v3.2) entra como estágio "Aprofundar" nas próximas fatias.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Upload, Loader2, CheckCircle2, AlertTriangle, RefreshCw, PackageCheck,
  Trash2, FileUp, ChevronRight, Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { errorLabel, ERROR_CATALOG, MODE_META, type ErrorType } from '../lib/error-catalog';
import type { Finding } from '../lib/audit/model';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import { irToFindings } from '../lib/audit/ir-rules';
import { VizSwitch } from '../components/audit/FindingCard';
import {
  createStudy, listStudies, loadFindings, setFindingStatus, recheck,
  concludeStudy, deleteStudy,
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
            : f.ok
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
            {mode && (
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

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CorretorV3Page() {
  const [studies, setStudies] = useState<StudyV3[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<FindingV3[]>([]);
  const [loadingStudy, setLoadingStudy] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'recheck' | null>(null);
  const [lastDiff, setLastDiff] = useState<DiffResult | null>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const recheckRef = useRef<HTMLInputElement>(null);

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

  // ── upload novo estudo ──
  async function handleNew(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setBusy('upload');
    try {
      const ir = await pptxToIr(file);
      const findings = irToFindings(ir).filter((f) => !f.ok); // worklist = só problemas
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
    } catch (err) {
      toast.error('Falha na triagem', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  // ── reconferir (versão corrigida) ──
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

  // ── worklist derivada ──
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Rail: estudos */}
      <aside className="w-64 shrink-0 border-r flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold">Corretor</h1>
            <p className="text-[10px] text-muted-foreground">v3 · fluxo de correção</p>
          </div>
          <input ref={newRef} type="file" accept=".pptx" className="hidden" onChange={handleNew} />
          <button
            onClick={() => newRef.current?.click()}
            disabled={busy !== null}
            className="text-xs rounded-md px-2 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {busy === 'upload' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
            Novo
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingList ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
            </div>
          ) : studies.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-6 text-center">
              Suba o .pptx de um estudo para começar. Triagem determinística em segundos, sem custo de IA.
            </p>
          ) : (
            studies.map((s) => (
              <button
                key={s.id}
                onClick={() => openStudy(s.id)}
                className={cn(
                  'w-full text-left rounded-md px-2.5 py-2 border transition-colors',
                  s.id === selectedId ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-1.5">
                  {s.status === 'pronto'
                    ? <PackageCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <span className="text-xs font-medium truncate">{s.nome}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                  v{s.lastVersion} · {s.nSlides} slides · {s.status === 'pronto' ? 'pronto p/ A&R' : `${s.pendentes} pendente(s)`}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Workspace */}
      <main className="flex-1 min-w-0 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm space-y-2">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
              <h2 className="text-sm font-semibold">Suba o estudo (.pptx)</h2>
              <p className="text-xs text-muted-foreground">
                Triagem determinística instantânea → worklist de correção → reconferir a versão
                corrigida → entregar ao A&R com 0 pendentes.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header do estudo */}
            <header className="border-b bg-card px-6 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">{selected.nome}</h2>
                <p className="text-xs text-muted-foreground">
                  versão {selected.lastVersion} · {selected.nSlides} slides · triagem DET (R$ 0)
                </p>
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

            {/* Progresso rumo a zero */}
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

            {/* Diff do último recheck */}
            {lastDiff && (
              <div className="border-b bg-sky-500/5 px-6 py-2 text-xs text-muted-foreground flex items-center gap-3">
                <RefreshCw className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span><strong className="text-emerald-600 dark:text-emerald-400">{lastDiff.resolved.length} resolvido(s)</strong> na versão nova</span>
                <span>· {lastDiff.persistent.length} persistem</span>
                <span>· {lastDiff.fresh.length} novo(s)</span>
              </div>
            )}

            {/* Worklist */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-5 space-y-5">
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
          </>
        )}
      </main>
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
