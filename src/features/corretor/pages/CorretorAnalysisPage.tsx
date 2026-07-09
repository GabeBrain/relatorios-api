import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  SkipForward,
  XCircle,
  ArrowLeft,
  DollarSign,
  Zap,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAnalysisStore, type SlideResult, type ErrorType } from '../store/analysis-store';
import { errorLabel } from '../lib/error-catalog';
import { useArchiveStore } from '../store/archive-store';
import { analyzeSlide } from '../lib/openai-analyzer';
import { formatUSD, formatUSDTotal } from '../lib/cost-calculator';
import { generateReportText, downloadReport } from '../lib/report-generator';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const CONCURRENCY = 4;

// Legenda v1 (5 tipos usados na análise IA por slide). Rótulos completos vêm
// do catálogo via errorLabel(); este mapa serve só à legenda lateral.
const ERROR_TYPE_LABELS: Partial<Record<ErrorType, string>> = {
  PERCENTAGE_SUM: 'Soma %',
  CITY_NAME: 'Nome Cidade',
  RADII: 'Raios',
  SPELLING: 'Ortografia',
  COHERENCE: 'Coerência',
};

const SEVERITY_COLORS = {
  HIGH: 'destructive',
  MEDIUM: 'default',
  LOW: 'secondary',
} as const;

const SEVERITY_LABELS = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' };

// ─── Cost Metrics Panel ────────────────────────────────────────────────────────

function CostMetricsPanel({
  currentSlide,
  totalSlides,
}: {
  currentSlide: SlideResult | null;
  totalSlides: number;
}) {
  const getCostSummary = useAnalysisStore((s) => s.getCostSummary);
  const summary = getCostSummary();

  const row = (label: string, value: string, sub?: string) => (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-xs font-mono font-semibold">{value}</span>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {currentSlide && currentSlide.status === 'done' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5 text-primary">
              <Zap className="w-3 h-3" />
              Último Slide Processado — #{currentSlide.slideNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {row('Tokens entrada', currentSlide.inputTokens.toLocaleString('pt-BR'))}
            {row('Tokens saída', currentSlide.outputTokens.toLocaleString('pt-BR'))}
            {row(
              'Custo real',
              formatUSD(currentSlide.cost),
              `${currentSlide.errors.length} erro(s)`
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" />
            Totais do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 divide-y divide-border">
          <div className="pb-2">
            {row('Tokens de entrada', summary.totalInputTokens.toLocaleString('pt-BR'))}
            {row('Tokens de saída', summary.totalOutputTokens.toLocaleString('pt-BR'))}
          </div>
          <div className="py-2">
            {row('Custo acumulado', formatUSDTotal(summary.totalCost))}
            {row('Média por slide', formatUSD(summary.avgCostPerSlide))}
            {summary.processedSlides > 0 &&
              row(
                'Projeção total',
                formatUSDTotal(summary.projectedTotal),
                `base: ${summary.processedSlides} slides`
              )}
          </div>
          <div className="pt-2">
            {row('Slides analisados', String(summary.processedSlides))}
            {row('Slides ignorados', String(summary.skippedSlides), 'sem dados tabulares')}
            {row('Slides com erros', String(summary.slidesWithErrors))}
            {row('Total de slides', String(totalSlides))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Slide Error Card ──────────────────────────────────────────────────────────

function SlideErrorCard({ slide }: { slide: SlideResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-xs font-mono text-muted-foreground w-14 shrink-0">
          Slide {slide.slideNumber}
        </span>
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {slide.errors.map((err, i) => (
            <Badge key={i} variant={SEVERITY_COLORS[err.severity]} className="text-[10px] h-5">
              {errorLabel(err.type)}
            </Badge>
          ))}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {slide.errors.length} erro{slide.errors.length !== 1 ? 's' : ''}
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t bg-muted/20 divide-y divide-border">
          {slide.errors.map((err, i) => (
            <div key={i} className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={SEVERITY_COLORS[err.severity]} className="text-[10px] h-5">
                  {SEVERITY_LABELS[err.severity]}
                </Badge>
                <span className="text-xs font-medium">{errorLabel(err.type)}</span>
              </div>
              <p className="text-sm">{err.description}</p>
              {err.location && (
                <p className="text-xs text-muted-foreground">
                  Localização: {err.location}
                </p>
              )}
            </div>
          ))}
          {slide.imageDataUrl && (
            <div className="px-4 py-3">
              <img
                src={slide.imageDataUrl}
                alt={`Slide ${slide.slideNumber}`}
                className="rounded border max-h-52 w-full object-contain bg-white"
              />
            </div>
          )}
          <div className="px-4 py-2">
            <p className="text-[10px] text-muted-foreground font-mono">
              {slide.inputTokens} in · {slide.outputTokens} out · {formatUSD(slide.cost)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Error Filter Bar ──────────────────────────────────────────────────────────

type Filter = 'all' | ErrorType;

function FilterBar({ active, onChange, counts }: {
  active: Filter;
  onChange: (f: Filter) => void;
  counts: Partial<Record<Filter, number>>;
}) {
  const options: { label: string; value: Filter }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Soma %', value: 'PERCENTAGE_SUM' },
    { label: 'Cidade', value: 'CITY_NAME' },
    { label: 'Raios', value: 'RADII' },
    { label: 'Ortografia', value: 'SPELLING' },
    { label: 'Coerência', value: 'COHERENCE' },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const count = counts[o.value] ?? 0;
        if (o.value !== 'all' && count === 0) return null;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              active === o.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:border-primary/50'
            }`}
          >
            {o.label}
            {count > 0 && (
              <span className="ml-1 opacity-70">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CorretorAnalysisPage() {
  const navigate = useNavigate();
  const { file, config, slides, status, currentSlide, initSlides, updateSlide, setStatus, setCurrentSlide } =
    useAnalysisStore();
  const { addProject } = useArchiveStore();

  const cancelRef = useRef(false);
  const processingRef = useRef(false);
  const savedRef = useRef(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [elapsedSec, setElapsedSec] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!file || !config) navigate('/auditoria');
  }, [file, config, navigate]);

  useEffect(() => {
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const processSlide = useCallback(
    async (pdfDoc: pdfjsLib.PDFDocumentProxy, slideNum: number, total: number) => {
      if (cancelRef.current) return;
      updateSlide(slideNum, { status: 'processing' });

      try {
        const page = await pdfDoc.getPage(slideNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];

        if (cancelRef.current) return;

        const result = await analyzeSlide(
          base64,
          slideNum,
          total,
          config!.cityName,
          config!.radii,
          config!.model
        );

        updateSlide(slideNum, {
          status: result.skipped ? 'skipped' : 'done',
          errors: result.errors,
          hasData: result.hasData,
          summary: result.summary,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cost: result.cost,
          // persiste a thumbnail de todos os slides (auditoria de falso negativo);
          // as dos slides OK são podadas ao concluir a revisão.
          imageDataUrl: result.skipped ? undefined : dataUrl,
        });
      } catch (err) {
        updateSlide(slideNum, {
          status: 'error',
          summary: `Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`,
        });
      }
    },
    [config, updateSlide]
  );

  useEffect(() => {
    if (!file || !config || processingRef.current) return;
    processingRef.current = true;
    cancelRef.current = false;
    startTimeRef.current = Date.now();

    (async () => {
      setStatus('processing');
      const buf = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      const total = pdfDoc.numPages;
      initSlides(total);

      const slideNums = Array.from({ length: total }, (_, i) => i + 1);

      let idx = 0;
      async function worker() {
        while (idx < slideNums.length && !cancelRef.current) {
          const slideNum = slideNums[idx++];
          setCurrentSlide(slideNum);
          await processSlide(pdfDoc, slideNum, total);
        }
      }

      const workers = Array.from({ length: CONCURRENCY }, () => worker());
      await Promise.all(workers);

      pdfDoc.destroy();
      if (!cancelRef.current) setStatus('done');
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCancel() {
    cancelRef.current = true;
    setStatus('cancelled');
  }

  useEffect(() => {
    if (status !== 'done' || savedRef.current || !config) return;
    savedRef.current = true;

    const { slides: all, getCostSummary } = useAnalysisStore.getState();
    const summary = getCostSummary();
    const reportText = generateReportText(config, summary, all);

    addProject(
      {
        projectName: config.projectName,
        cityName: config.cityName,
        radii: config.radii,
        model: config.model,
        totalSlides: summary.totalSlides,
        slidesOk: all.filter((s) => s.status === 'done' && s.errors.length === 0).length,
        slidesWithErrors: summary.slidesWithErrors,
        slidesSkipped: summary.skippedSlides,
        slidesError: all.filter((s) => s.status === 'error').length,
        totalErrors: all.reduce((sum, s) => sum + s.errors.length, 0),
        totalCost: summary.totalCost,
        totalInputTokens: summary.totalInputTokens,
        totalOutputTokens: summary.totalOutputTokens,
        reportText,
      },
      all
    ).catch(console.error);
  }, [status, config, addProject]);

  function handleDownloadReport() {
    const { config: cfg, slides: all, getCostSummary } = useAnalysisStore.getState();
    if (!cfg) return;
    const reportText = generateReportText(cfg, getCostSummary(), all);
    downloadReport(reportText, cfg.projectName);
  }

  if (!file || !config) return null;

  const total = slides.length;
  const done = slides.filter((s) => ['done', 'skipped', 'error'].includes(s.status)).length;
  const withErrors = slides.filter((s) => s.errors.length > 0);
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const avgSecPerSlide = done > 0 ? elapsedSec / done : null;
  const remaining = avgSecPerSlide ? Math.ceil(avgSecPerSlide * (total - done)) : null;
  const remainStr = remaining
    ? remaining > 60
      ? `~${Math.ceil(remaining / 60)}min restantes`
      : `~${remaining}s restantes`
    : null;

  const filterCounts: Partial<Record<Filter, number>> = { all: withErrors.length };
  for (const slide of withErrors) {
    for (const err of slide.errors) {
      filterCounts[err.type] = (filterCounts[err.type] ?? 0) + 1;
    }
  }

  const filteredSlides =
    filter === 'all'
      ? withErrors
      : withErrors.filter((s) => s.errors.some((e) => e.type === filter));

  const lastDone = [...slides].reverse().find((s) => s.status === 'done') ?? null;
  const isDone = status === 'done' || status === 'cancelled';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => { handleCancel(); navigate('/auditoria'); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{config.projectName}</h1>
            <p className="text-xs text-muted-foreground">
              {config.cityName} · {config.radii} · {config.model}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDone && (
            <Button size="sm" variant="outline" onClick={handleDownloadReport}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Baixar Relatório
            </Button>
          )}
          {!isDone && (
            <Button size="sm" variant="destructive" onClick={handleCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b bg-card px-6 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {isDone ? (
              status === 'done' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-destructive" />
              )
            ) : (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            )}
            {isDone
              ? status === 'done'
                ? `Análise concluída — ${withErrors.length} slide(s) com erros`
                : 'Análise cancelada'
              : `Processando slide ${currentSlide} de ${total}…`}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {elapsedStr}
            {remainStr && !isDone && (
              <span className="text-muted-foreground/60">· {remainStr}</span>
            )}
            <span className="font-mono">{progress}%</span>
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Error list */}
        <div className="flex-1 flex flex-col min-w-0 border-r">
          <div className="px-5 py-3 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">
                {withErrors.length} slide{withErrors.length !== 1 ? 's' : ''} com erros
              </span>
            </div>
            <FilterBar active={filter} onChange={setFilter} counts={filterCounts} />
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {filteredSlides.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  {status === 'processing' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <p className="text-sm">Analisando slides…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                      <p className="text-sm">Nenhum erro encontrado neste filtro.</p>
                    </div>
                  )}
                </div>
              ) : (
                filteredSlides.map((slide) => (
                  <SlideErrorCard key={slide.slideNumber} slide={slide} />
                ))
              )}
            </div>
          </ScrollArea>

          {total > 0 && (
            <div className="border-t px-4 py-2 bg-muted/20">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                Status por slide
              </p>
              <div className="flex flex-wrap gap-0.5">
                {slides.map((s) => {
                  const color =
                    s.status === 'done' && s.errors.length > 0
                      ? 'bg-destructive'
                      : s.status === 'done'
                      ? 'bg-green-500'
                      : s.status === 'skipped'
                      ? 'bg-muted-foreground/30'
                      : s.status === 'processing'
                      ? 'bg-primary animate-pulse'
                      : s.status === 'error'
                      ? 'bg-orange-400'
                      : 'bg-muted-foreground/10';
                  return (
                    <div
                      key={s.slideNumber}
                      title={`Slide ${s.slideNumber}: ${s.status}`}
                      className={`w-2 h-2 rounded-sm ${color} transition-colors`}
                    />
                  );
                })}
              </div>
              <div className="flex gap-3 mt-1.5">
                {[
                  { color: 'bg-destructive', label: 'Com erros' },
                  { color: 'bg-green-500', label: 'OK' },
                  { color: 'bg-muted-foreground/30', label: 'Ignorado' },
                  { color: 'bg-muted-foreground/10', label: 'Pendente' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-sm ${item.color}`} />
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Cost metrics */}
        <div className="w-72 shrink-0">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Métricas de Custo</span>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4">
              <CostMetricsPanel currentSlide={lastDone} totalSlides={total} />

              <Separator className="my-4" />
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Legenda de Erros
                </p>
                {(Object.entries(ERROR_TYPE_LABELS) as [ErrorType, string][]).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="font-medium">{label}</span>
                    <span className="text-[10px]">— {type}</span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Severidade
                </p>
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <Badge variant={SEVERITY_COLORS[s]} className="text-[10px] h-4">
                      {SEVERITY_LABELS[s]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {s === 'HIGH' ? 'Erro crítico, corrigir' : s === 'MEDIUM' ? 'Verificar e corrigir' : 'Atenção opcional'}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                <SkipForward className="w-3 h-3 shrink-0 mt-0.5" />
                <p>
                  Slides "ignorados" são aqueles sem tabelas de dados — capas, gráficos sem números, mapas. Não são cobrados.
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
