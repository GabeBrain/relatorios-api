import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Trash,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  SkipForward,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useArchiveStore, type ArchivedProject, type ArchivedSlide } from '../store/archive-store';
import { downloadReport } from '../lib/report-generator';
import { formatUSDTotal, formatUSD } from '../lib/cost-calculator';
import type { ErrorType, Severity, Verdict } from '../store/analysis-store';
import { errorLabel } from '../lib/error-catalog';
import { cn } from '@/lib/utils';
import NewProjectForm from '../components/NewProjectForm';

// ─── Constants ────────────────────────────────────────────────────────────────

// Legenda v1 (subconjunto). Rótulos completos vêm do catálogo via errorLabel().
const ERROR_TYPE_LABELS: Partial<Record<ErrorType, string>> = {
  PERCENTAGE_SUM: 'Soma %',
  CITY_NAME: 'Nome Cidade',
  RADII: 'Raios',
  SPELLING: 'Ortografia',
  COHERENCE: 'Coerência',
};

const SEVERITY_COLORS: Record<Severity, 'destructive' | 'default' | 'secondary'> = {
  HIGH: 'destructive',
  MEDIUM: 'default',
  LOW: 'secondary',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};

type Filter = 'all' | ErrorType;

// ─── Veredito (bug real × falso positivo) ─────────────────────────────────────

function VerdictButtons({
  projectId,
  errorId,
  verdict,
}: {
  projectId: string;
  errorId?: string;
  verdict?: Verdict | null;
}) {
  const { setErrorVerdict } = useArchiveStore();
  if (!errorId) return null;

  async function handle(next: Verdict) {
    try {
      await setErrorVerdict(projectId, errorId!, verdict === next ? null : next);
    } catch {
      toast.error('Falha ao salvar o veredito. A migration do banco já foi aplicada?');
    }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handle('bug'); }}
        className={cn(
          'px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors',
          verdict === 'bug'
            ? 'bg-destructive text-destructive-foreground border-destructive'
            : 'border-border text-muted-foreground hover:border-destructive/60 hover:text-destructive'
        )}
        title="Confirmar como erro real do estudo"
      >
        Bug real
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handle('fp'); }}
        className={cn(
          'px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors',
          verdict === 'fp'
            ? 'bg-muted-foreground text-background border-muted-foreground'
            : 'border-border text-muted-foreground hover:text-foreground'
        )}
        title="Marcar como falso positivo da análise"
      >
        Falso positivo
      </button>
    </div>
  );
}

// ─── Slide Error Card ─────────────────────────────────────────────────────────

function SlideErrorCard({ slide, projectId }: { slide: ArchivedSlide; projectId: string }) {
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
            <div
              key={err.id ?? i}
              className={cn('px-4 py-3 space-y-1', err.verdict === 'fp' && 'opacity-50')}
            >
              <div className="flex items-center gap-2">
                <Badge variant={SEVERITY_COLORS[err.severity]} className="text-[10px] h-5">
                  {SEVERITY_LABELS[err.severity]}
                </Badge>
                <span className="text-xs font-medium flex-1">{errorLabel(err.type)}</span>
                <VerdictButtons projectId={projectId} errorId={err.id} verdict={err.verdict} />
              </div>
              <p className="text-sm">{err.description}</p>
              {err.location && (
                <p className="text-xs text-muted-foreground">Localização: {err.location}</p>
              )}
            </div>
          ))}
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

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  active,
  onChange,
  counts,
}: {
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
            {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────────────────

function ProjectDetail({ project }: { project: ArchivedProject }) {
  const { removeProject } = useArchiveStore();
  const [filter, setFilter] = useState<Filter>('all');

  const slides = project.slides ?? [];
  const withErrors = slides.filter((s) => s.errors.length > 0);
  const totalSlides = project.totalSlides;

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

  const isClean = project.totalErrors === 0;
  const savedDate = new Date(project.savedAt);
  const fullDate = format(savedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  // Calibração: contagem de vereditos sobre todos os erros do projeto
  const allErrors = slides.flatMap((s) => s.errors);
  const bugCount = allErrors.filter((e) => e.verdict === 'bug').length;
  const fpCount = allErrors.filter((e) => e.verdict === 'fp').length;
  const pendingCount = allErrors.length - bugCount - fpCount;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold truncate">{project.projectName}</h1>
          <p className="text-xs text-muted-foreground">
            {project.cityName} · {project.radii} · {project.model} · {fullDate}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadReport(project.reportText, project.projectName)}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Baixar Relatório
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                <AlertDialogDescription>
                  O histórico de "{project.projectName}" será removido permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => removeProject(project.id)}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Status strip */}
      <div className="border-b bg-card px-6 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {isClean ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            )}
            {isClean
              ? 'Análise concluída — nenhum erro encontrado'
              : `Análise concluída — ${withErrors.length} slide(s) com erros`}
          </span>
          {allErrors.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-medium">
                {bugCount} bug{bugCount !== 1 ? 's' : ''} real{bugCount !== 1 ? 'is' : ''}
              </span>
              <span className="inline-flex items-center rounded-md bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-medium">
                {fpCount} falso{fpCount !== 1 ? 's' : ''} positivo{fpCount !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center rounded-md bg-warning/10 text-warning px-2 py-0.5 text-[11px] font-medium">
                {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
              </span>
            </span>
          )}
          <span className="flex items-center gap-3 font-mono">
            <span>{formatUSDTotal(project.totalCost)}</span>
            <span>
              {((project.totalInputTokens + project.totalOutputTokens) / 1000).toFixed(1)}K tokens
            </span>
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: errors list */}
        <div className="flex-1 flex flex-col min-w-0 border-r">
          <div className="px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">
                {withErrors.length} slide{withErrors.length !== 1 ? 's' : ''} com erros
              </span>
            </div>
            {withErrors.length > 0 && (
              <FilterBar active={filter} onChange={setFilter} counts={filterCounts} />
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {slides.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 text-sm italic">
                  Detalhes por slide não disponíveis (projeto analisado antes desta versão).
                </div>
              ) : filteredSlides.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <p className="text-sm">
                    {withErrors.length === 0
                      ? 'Nenhum erro encontrado neste projeto.'
                      : 'Nenhum erro neste filtro.'}
                  </p>
                </div>
              ) : (
                filteredSlides.map((slide) => (
                  <SlideErrorCard key={slide.slideNumber} slide={slide} projectId={project.id} />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Status strip per slide */}
          {slides.length > 0 && (
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
                      : s.status === 'error'
                      ? 'bg-orange-400'
                      : 'bg-muted-foreground/10';
                  return (
                    <div
                      key={s.slideNumber}
                      title={`Slide ${s.slideNumber}: ${s.status}`}
                      className={`w-2 h-2 rounded-sm ${color}`}
                    />
                  );
                })}
              </div>
              <div className="flex gap-3 mt-1.5">
                {[
                  { color: 'bg-destructive', label: 'Com erros' },
                  { color: 'bg-green-500', label: 'OK' },
                  { color: 'bg-muted-foreground/30', label: 'Ignorado' },
                  { color: 'bg-orange-400', label: 'Falha' },
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

        {/* Right: metrics panel */}
        <div className="w-72 shrink-0">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Métricas Finais</span>
          </div>
          <ScrollArea className="h-[calc(100vh-160px)]">
            <div className="p-4 space-y-3">
              <div className="rounded-md border bg-card p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Distribuição
                </p>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-right font-mono font-semibold">{totalSlides}</span>
                  <span className="text-muted-foreground">OK</span>
                  <span className="text-right font-mono font-semibold text-green-600">
                    {project.slidesOk}
                  </span>
                  <span className="text-muted-foreground">Com erros</span>
                  <span
                    className={cn(
                      'text-right font-mono font-semibold',
                      project.slidesWithErrors > 0 ? 'text-destructive' : ''
                    )}
                  >
                    {project.slidesWithErrors}
                  </span>
                  <span className="text-muted-foreground">Ignorados</span>
                  <span className="text-right font-mono font-semibold text-muted-foreground">
                    {project.slidesSkipped}
                  </span>
                  {project.slidesError > 0 && (
                    <>
                      <span className="text-muted-foreground">Falhas</span>
                      <span className="text-right font-mono font-semibold text-orange-500">
                        {project.slidesError}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-md border bg-card p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Custos & Tokens
                </p>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Custo total</span>
                  <span className="text-right font-mono font-semibold">
                    {formatUSDTotal(project.totalCost)}
                  </span>
                  <span className="text-muted-foreground">Tokens entrada</span>
                  <span className="text-right font-mono">
                    {project.totalInputTokens.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground">Tokens saída</span>
                  <span className="text-right font-mono">
                    {project.totalOutputTokens.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground">Total erros</span>
                  <span
                    className={cn(
                      'text-right font-mono font-semibold',
                      project.totalErrors > 0 ? 'text-destructive' : 'text-green-600'
                    )}
                  >
                    {project.totalErrors}
                  </span>
                </div>
              </div>

              <Separator />
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Legenda de Erros
                </p>
                {(Object.entries(ERROR_TYPE_LABELS) as [ErrorType, string][]).map(
                  ([type, label]) => (
                    <div
                      key={type}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="font-medium">{label}</span>
                      <span className="text-[10px]">— {type}</span>
                    </div>
                  )
                )}
              </div>

              <Separator />
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
                      {s === 'HIGH'
                        ? 'Erro crítico, corrigir'
                        : s === 'MEDIUM'
                        ? 'Verificar e corrigir'
                        : 'Atenção opcional'}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                <SkipForward className="w-3 h-3 shrink-0 mt-0.5" />
                <p>
                  Slides "ignorados" são aqueles sem tabelas de dados — capas, gráficos sem
                  números, mapas. Não são cobrados.
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Project Item ─────────────────────────────────────────────────────

function SidebarItem({
  project,
  active,
  onClick,
}: {
  project: ArchivedProject;
  active: boolean;
  onClick: () => void;
}) {
  const isClean = project.totalErrors === 0;
  const relativeTime = formatDistanceToNow(new Date(project.savedAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg border-l-2 transition-colors',
        active
          ? 'bg-primary/10 border-l-primary'
          : isClean
          ? 'border-l-green-500/40 hover:bg-muted/60'
          : 'border-l-destructive/40 hover:bg-muted/60'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-xs font-semibold leading-tight truncate flex-1">
          {project.projectName}
        </h3>
        {isClean ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground truncate">{project.cityName}</p>
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span>{relativeTime}</span>
        <span className="font-mono">
          {project.totalSlides} sl · {project.totalErrors} err
        </span>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CorretorPage() {
  const { projects, loading, loadProjects, clearAll } = useArchiveStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? null,
    [projects, selectedId]
  );

  return (
    <div className="h-full bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'border-r bg-card flex flex-col transition-all duration-200 shrink-0',
          sidebarOpen ? 'w-72' : 'w-12'
        )}
      >
        {/* Sidebar header */}
        <div className="border-b px-3 py-3 flex items-center justify-between gap-2">
          {sidebarOpen && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <h2 className="text-xs font-semibold leading-none truncate">Análises</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {projects.length} projeto{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {sidebarOpen && (
              <button
                onClick={() => setSelectedId(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                title="Nova análise"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              title={sidebarOpen ? 'Recolher' : 'Expandir'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {sidebarOpen ? (
          <>
            <ScrollArea className="flex-1 min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Carregando…</span>
                </div>
              ) : projects.length === 0 ? null : (
                <div className="p-2 space-y-1">
                  {projects.map((p) => (
                    <SidebarItem
                      key={p.id}
                      project={p}
                      active={p.id === selectedId}
                      onClick={() => setSelectedId(p.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {projects.length > 0 && (
              <div className="border-t px-2 py-1.5 shrink-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full h-7 text-[11px] text-muted-foreground hover:text-destructive justify-start"
                    >
                      <Trash className="w-3 h-3 mr-1.5" />
                      Limpar histórico
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todos os {projects.length} projetos arquivados serão removidos
                        permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={clearAll}
                      >
                        Limpar tudo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center pt-2 gap-2">
            <button
              onClick={() => { setSidebarOpen(true); setSelectedId(null); }}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Nova análise"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      {selected ? (
        <ProjectDetail key={selected.id} project={selected} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-6 py-10">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight">Nova Análise</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Faça upload do estudo em PDF e configure os parâmetros de revisão.
              </p>
              <Link
                to="/auditoria/v2"
                className="mt-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-primary hover:bg-primary/10 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Ver a Auditoria v2 (demo com estudos reais, sem custo de IA)
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando…</span>
              </div>
            ) : (
              <NewProjectForm />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
