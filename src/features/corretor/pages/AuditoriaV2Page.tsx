import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FlaskConical, AlertTriangle, CheckCircle2, Layers, Download, Target, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ERROR_CATALOG, MODE_META, errorLabel,
  type ErrorType, type ErrorMode,
} from '../lib/error-catalog';
import { STUDIES } from '../lib/audit/fixtures';
import type { StudyFixture } from '../lib/audit/model';
import { isIr } from '../lib/audit/ir';
import { parseIrToStudy } from '../lib/audit/ir-rules';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import { FindingCard } from '../components/audit/FindingCard';
import {
  loadVerdicts, saveVerdicts, calibrationFor, exportReviewCsv, type VerdictMap,
} from '../lib/audit/session';

const ALL_TYPES = Object.keys(ERROR_CATALOG) as ErrorType[];

/** Erro LOCAL = mora num único slide (slideRef "sNN"). Relacional/global = resto. */
function isLocal(f: { slideRef: string }): boolean {
  return /^s\d+$/.test(f.slideRef.trim());
}
function slideNumOf(f: { slideRef: string }): number {
  return parseInt(f.slideRef.replace(/\D/g, ''), 10) || 0;
}

export default function AuditoriaV2Page() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<StudyFixture[]>([]);
  const [studyId, setStudyId] = useState(STUDIES[0].id);
  const [verdicts, setVerdicts] = useState<VerdictMap>(() => loadVerdicts());
  const [typeFilter, setTypeFilter] = useState<ErrorType | 'all'>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const allStudies = useMemo(() => [...STUDIES, ...loaded], [loaded]);
  const study = allStudies.find((s) => s.id === studyId) ?? allStudies[0];

  useEffect(() => { saveVerdicts(verdicts); }, [verdicts]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const isPptx = /\.pptx$/i.test(file.name);
    setImporting(true);
    try {
      const ir = isPptx ? await pptxToIr(file) : JSON.parse(await file.text());
      if (!isIr(ir)) throw new Error('Arquivo inválido: esperado um .pptx de estudo ou um .ir.json.');
      const parsed = parseIrToStudy(ir, file.name);
      setLoaded((prev) => [...prev.filter((s) => s.id !== parsed.id), parsed]);
      setStudyId(parsed.id);
      toast.success(`Estudo carregado: ${parsed.label}`, {
        description: `${parsed.slides} slides · ${parsed.findings.length} achados determinísticos (custo de IA: R$ 0)`,
      });
    } catch (err) {
      toast.error('Falha ao importar o estudo', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setImporting(false);
    }
  }

  const calib = useMemo(() => calibrationFor(study.findings, verdicts), [study, verdicts]);

  const stats = useMemo(() => {
    const issues = study.findings.filter((f) => !f.ok).length;
    const checks = study.findings.filter((f) => f.ok).length;
    const byMode: Record<ErrorMode, number> = { PLENO: 0, BETA: 0, MOCK: 0 };
    const typesPresent = new Set<ErrorType>();
    for (const f of study.findings) {
      byMode[ERROR_CATALOG[f.type].mode]++;
      typesPresent.add(f.type);
    }
    return { issues, checks, byMode, typesPresent };
  }, [study]);

  // Worklist: erros LOCAIS (um slide) na espinha sequencial por slide;
  // erros RELACIONAIS/globais (entre slides) numa seção à parte, por tipo.
  const worklist = useMemo(() => {
    const local = study.findings.filter((f) => isLocal(f));
    const relational = study.findings.filter((f) => !isLocal(f));
    const bySlide = new Map<number, typeof study.findings>();
    for (const f of local) {
      const n = slideNumOf(f);
      if (!bySlide.has(n)) bySlide.set(n, []);
      bySlide.get(n)!.push(f);
    }
    const byType = new Map<ErrorType, typeof study.findings>();
    for (const f of relational) {
      if (!byType.has(f.type)) byType.set(f.type, []);
      byType.get(f.type)!.push(f);
    }
    return {
      slides: [...bySlide.entries()].sort((a, b) => a[0] - b[0]),
      relational: [...byType.entries()],
    };
  }, [study]);

  useEffect(() => { setTypeFilter('all'); }, [studyId]);

  const filtered = typeFilter === 'all' ? [] : study.findings.filter((f) => f.type === typeFilter);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/auditoria')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold flex items-center gap-2">
              Auditoria do Estudo <span className="text-[10px] rounded bg-primary/10 text-primary px-1.5 py-0.5">v2 · demo</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {study.city} · {study.type} · {study.slides} slides · raios {study.radii}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allStudies.map((s) => (
            <button
              key={s.id}
              onClick={() => setStudyId(s.id)}
              className={cn(
                'text-xs rounded-md px-2.5 py-1 border transition-colors max-w-[220px] truncate',
                s.id === study.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'
              )}
              title={s.label}
            >
              {s.label}
            </button>
          ))}
          <input ref={fileRef} type="file" accept=".pptx,.json,application/json" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="text-xs rounded-md px-2.5 py-1 border border-border bg-background hover:border-primary/50 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
            title="Carregar um estudo em .pptx (extração no navegador) ou um .ir.json já gerado"
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {importing ? 'Extraindo…' : 'Carregar estudo (.pptx)'}
          </button>
          <button
            onClick={() => exportReviewCsv(study, verdicts)}
            className="text-xs rounded-md px-2.5 py-1 border border-border bg-background hover:border-primary/50 transition-colors inline-flex items-center gap-1.5"
            title="Exportar a revisão (achados + veredito + gabarito) em CSV"
          >
            <Download className="w-3.5 h-3.5" /> Exportar revisão
          </button>
        </div>
      </header>

      {/* Faixa de demo / custo */}
      <div className="border-b bg-sky-500/5 px-6 py-2 flex items-center gap-2 text-xs text-muted-foreground">
        <FlaskConical className="w-3.5 h-3.5 text-sky-500 shrink-0" />
        {study.type === 'IR carregado' ? (
          <>Rodada sobre o <strong className="font-medium text-foreground">IR carregado</strong> (motor determinístico no navegador) —
          custo de IA: <strong className="font-medium text-foreground">R$ 0,00</strong>.</>
        ) : (
          <>Rodada sobre <strong className="font-medium text-foreground">fixtures reais do piloto</strong> (Fase C) —
          custo de IA: <strong className="font-medium text-foreground">R$ 0,00</strong>. Carregue um <code className="text-[11px]">.pptx</code> para auditar outro estudo.</>
        )}
        {' '}Cada achado exibe seu modo (pleno / β / demo).
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-5 space-y-5">
          {/* Sumário */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} value={stats.issues} label="Achados a revisar" />
            <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} value={stats.checks} label="Checagens OK" />
            <StatCard icon={<Layers className="w-4 h-4 text-muted-foreground" />} value={stats.typesPresent.size} label="Tipos acionados" />
            <StatCard icon={<CheckCircle2 className="w-4 h-4 text-primary" />} value={`${calib.reviewed}/${study.findings.length}`} label="Com veredito" />
          </div>

          {/* Calibração ao vivo — recall vs o gabarito das notas do analista */}
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Calibração da rodada</h2>
              <span className="text-[10px] text-muted-foreground">
                gabarito = achados que reproduzem uma nota real do analista
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <CalibStat label="No gabarito" value={String(calib.gabaritoTotal)} hint="notas reais reproduzidas" />
              <CalibStat label="Confirmados (bug)" value={String(calib.gabaritoConfirmed)} hint="do gabarito, marcados bug" tone="good" />
              <CalibStat
                label="Recall"
                value={calib.recallPct === null ? '—' : `${calib.recallPct}%`}
                hint="confirmados / gabarito"
                tone={calib.recallPct !== null && calib.recallPct >= 80 ? 'good' : 'warn'}
              />
              <CalibStat label="Falsos positivos" value={String(calib.fpMarked)} hint="marcados fp na rodada" tone={calib.fpMarked > 0 ? 'warn' : undefined} />
            </div>
            {calib.reviewed < study.findings.length && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Dê veredito em todos os achados para fechar recall/precisão. Faltam {study.findings.length - calib.reviewed}.
              </p>
            )}
          </div>

          {/* Distribuição por modo */}
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(MODE_META) as ErrorMode[]).map((m) => (
              <span key={m} className={cn('rounded-full px-2.5 py-1 border', MODE_META[m].className)} title={MODE_META[m].hint}>
                {MODE_META[m].label}: {stats.byMode[m]} · {MODE_META[m].hint}
              </span>
            ))}
          </div>

          {/* Cobertura de tipos (todos os 20, com modo) */}
          <details className="rounded-lg border border-border bg-card">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium select-none">
              Cobertura de tipos de erro ({stats.typesPresent.size}/{ALL_TYPES.length} acionados neste estudo)
            </summary>
            <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              {ALL_TYPES.map((t) => {
                const present = stats.typesPresent.has(t);
                const meta = ERROR_CATALOG[t];
                return (
                  <div key={t} className="flex items-center gap-2 text-xs py-0.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', present ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                    <span className={cn('font-medium', !present && 'text-muted-foreground')}>{errorLabel(t)}</span>
                    <span className={cn('text-[9px] rounded px-1 border', MODE_META[meta.mode].className)}>{MODE_META[meta.mode].label}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{meta.description}</span>
                  </div>
                );
              })}
            </div>
          </details>

          {/* Worklist de correção */}
          {(() => {
            const card = (f: (typeof study.findings)[number]) => (
              <FindingCard
                key={f.id}
                finding={f}
                verdict={verdicts[f.id]}
                onVerdict={(v) => setVerdicts((prev) => ({ ...prev, [f.id]: v }))}
              />
            );

            // Barra de filtro por tipo (lente alternativa)
            const chips = [...stats.typesPresent].sort((a, b) => errorLabel(a).localeCompare(errorLabel(b)));
            const filterBar = (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-muted-foreground mr-1">Corrigir por slide</span>
                <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} label="Sequencial" />
                <span className="text-[11px] text-muted-foreground mx-1">ou por tipo:</span>
                {chips.map((t) => (
                  <FilterChip
                    key={t}
                    active={typeFilter === t}
                    onClick={() => setTypeFilter(t)}
                    label={`${errorLabel(t)} ${study.findings.filter((f) => f.type === t).length}`}
                  />
                ))}
              </div>
            );

            return (
              <div className="space-y-4">
                {filterBar}

                {typeFilter !== 'all' ? (
                  // Lente por tipo: lista plana
                  <section className="space-y-2">
                    <SectionHead title={errorLabel(typeFilter)} count={filtered.length} />
                    {filtered.map(card)}
                  </section>
                ) : (
                  <>
                    {/* Espinha: sequencial por slide (erros locais) */}
                    <section className="space-y-3">
                      <SectionHead title="Por slide (ordem do deck)" count={worklist.slides.reduce((a, [, fs]) => a + fs.length, 0)} />
                      {worklist.slides.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum erro local neste estudo.</p>
                      )}
                      {worklist.slides.map(([n, fs]) => (
                        <div key={n} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold rounded bg-muted px-2 py-0.5">Slide {n}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {fs.length} {fs.length === 1 ? 'erro' : 'erros'}
                            </span>
                          </div>
                          {fs.map(card)}
                        </div>
                      ))}
                    </section>

                    {/* Seção relacional: erros entre slides, por tipo */}
                    {worklist.relational.length > 0 && (
                      <section className="space-y-3">
                        <SectionHead
                          title="Erros entre slides"
                          count={worklist.relational.reduce((a, [, fs]) => a + fs.length, 0)}
                          hint="não pertencem a um slide só — decida qual lado corrigir"
                        />
                        {worklist.relational.map(([type, fs]) => (
                          <div key={type} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{errorLabel(type)}</span>
                              <span className="text-[10px] text-muted-foreground">{fs.length}</span>
                            </div>
                            {fs.map(card)}
                          </div>
                        ))}
                      </section>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'
      )}
    >
      {label}
    </button>
  );
}

function SectionHead({ title, count, hint }: { title: string; count: number; hint?: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <h2 className="text-sm font-semibold">{title}</h2>
      <span className="text-[10px] text-muted-foreground">{count} achado(s)</span>
      {hint && <span className="text-[10px] text-muted-foreground italic">· {hint}</span>}
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5">{icon}<span className="text-lg font-semibold tabular-nums">{value}</span></div>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function CalibStat({ label, value, hint, tone }: {
  label: string; value: string; hint: string; tone?: 'good' | 'warn';
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn(
        'text-base font-semibold tabular-nums',
        tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
        tone === 'warn' && 'text-amber-600 dark:text-amber-400'
      )}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
