import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FlaskConical, AlertTriangle, CheckCircle2, Layers, Download, Target, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ERROR_CATALOG, MODE_META, SECTION_LABELS, errorLabel,
  type ErrorType, type AuditSection, type ErrorMode,
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

const SECTION_ORDER: AuditSection[] = [
  'ESTRUTURA', 'SOCIO', 'MERCADO', 'LACUNAS', 'ABSORCAO', 'ENTORNO', 'ATA', 'GLOBAL',
];
const ALL_TYPES = Object.keys(ERROR_CATALOG) as ErrorType[];

export default function AuditoriaV2Page() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<StudyFixture[]>([]);
  const [studyId, setStudyId] = useState(STUDIES[0].id);
  const [verdicts, setVerdicts] = useState<VerdictMap>(() => loadVerdicts());
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

  const bySection = useMemo(() => {
    const map = new Map<AuditSection, typeof study.findings>();
    for (const f of study.findings) {
      if (!map.has(f.section)) map.set(f.section, []);
      map.get(f.section)!.push(f);
    }
    return SECTION_ORDER.filter((s) => map.has(s)).map((s) => [s, map.get(s)!] as const);
  }, [study]);

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

          {/* Achados por seção */}
          {bySection.map(([section, findings]) => (
            <section key={section} className="space-y-2">
              <div className="flex items-center gap-2 pt-1">
                <h2 className="text-sm font-semibold">{SECTION_LABELS[section]}</h2>
                <span className="text-[10px] text-muted-foreground">{findings.length} achado(s)</span>
                <div className="flex-1 border-t border-border" />
              </div>
              {findings.map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  verdict={verdicts[f.id]}
                  onVerdict={(v) => setVerdicts((prev) => ({ ...prev, [f.id]: v }))}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
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
