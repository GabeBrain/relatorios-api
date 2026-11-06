import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { type PanoramaGenerationProgress } from '../domain/generation-progress';

interface Props { label?: string; compact?: boolean; progress?: PanoramaGenerationProgress | null; }

/** Estado de carregamento da feature seguindo o padrão de progresso visual da plataforma. */
export function PanoramaLoadingState({ label = 'Preparando relatório…', compact = false, progress }: Props) {
  const detail = progress ? `${progress.percent}% concluído · ${progress.completed} de ${progress.total} etapas` : null;
  const phase = progress?.operation ? `${progress.city ? `${progress.city}: ` : ''}${progress.operation} · ${progress.completedCities.length}/${progress.totalCities} cidades${progress.attempt ? ` · tentativa ${progress.attempt}` : ''}` : null;
  return <BrainLoadingState title={label} description={phase ?? 'Preparando coleta…'} startedAt={progress?.startedAt} variant={compact ? 'operation' : 'overlay'}>
    {progress && !compact && <div className="mt-4 w-full max-w-sm space-y-1.5">
      <p className="text-center text-xs text-muted-foreground">{detail}</p>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progresso da geração do relatório" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><span className="block h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress.percent}%` }}/></div>
    </div>}
  </BrainLoadingState>;
}
