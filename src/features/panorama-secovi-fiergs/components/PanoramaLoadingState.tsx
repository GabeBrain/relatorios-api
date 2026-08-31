import { useEffect, useState } from 'react';
import brainLogo from '../../../../assets/logoBrain.png';
import { formatRemainingTime, observedRemainingMs, type PanoramaGenerationProgress } from '../domain/generation-progress';

interface Props { label?: string; compact?: boolean; progress?: PanoramaGenerationProgress | null; }

/** Estado de carregamento da feature seguindo o padrão de progresso visual da plataforma. */
export function PanoramaLoadingState({ label = 'Preparando relatório…', compact = false, progress }: Props) {
  const [eta, setEta] = useState<number | null>(null);
  useEffect(() => {
    if (!progress) { setEta(null); return; }
    const observed = observedRemainingMs(progress);
    setEta((previous) => observed === null ? null : previous === null ? observed : Math.min(previous, observed));
  }, [progress?.completed, progress?.total, progress?.startedAt]);
  const etaLabel = formatRemainingTime(eta);
  const detail = progress ? `${progress.percent}% concluído · ${progress.completed} de ${progress.total} etapas` : null;
  const phase = progress?.operation ? `${progress.city ? `${progress.city}: ` : ''}${progress.operation}` : null;
  return <div className={compact ? 'flex items-center gap-2 py-1' : 'flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-border bg-card/80 px-5'} role="status" aria-live="polite">
    <div className={compact ? 'relative h-7 w-14' : 'relative h-12 w-24'}>
      <img src={brainLogo} alt="" className="absolute inset-0 h-full w-full object-contain opacity-15" />
      <img src={brainLogo} alt="" className="panorama-loading-logo absolute inset-0 h-full w-full object-contain" />
    </div>
    <span className={compact ? 'text-xs text-muted-foreground' : 'mt-3 text-sm text-muted-foreground'}>{label}</span>
    {progress && <div className={compact ? 'hidden' : 'mt-4 w-full max-w-sm space-y-1.5'}>
      <div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>{detail}</span><span>{etaLabel ? `Até ${etaLabel}` : 'Calculando ETA…'}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progresso da geração do relatório" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><span className="block h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress.percent}%` }}/></div>
      <p className="text-center text-xs text-muted-foreground">{phase ?? 'Preparando coleta…'}</p>
    </div>}
  </div>;
}
