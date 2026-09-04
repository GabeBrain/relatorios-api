import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import brainLogo from '../../../assets/logoBrain.png';
import { cn } from '@/lib/utils';

type BrainLoadingVariant = 'page' | 'field' | 'operation' | 'overlay';

interface BrainLoadingStateProps {
  title: string;
  description?: string;
  startedAt?: number | null;
  variant?: BrainLoadingVariant;
  className?: string;
}

function elapsedLabel(startedAt: number | null | undefined, now: number) {
  if (!startedAt) return null;
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Estado de progresso Brain: comunica etapa e tempo real, sem prometer ETA. */
export function BrainLoadingState({ title, description, startedAt, variant = 'operation', className }: BrainLoadingStateProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return undefined;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  const elapsed = elapsedLabel(startedAt, now);
  const compact = variant === 'field';

  if (variant === 'overlay') {
    return <div className={cn('fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 px-6 backdrop-blur-sm', className)} role="status" aria-live="polite" aria-busy="true">
      <div className="relative h-28 w-64 sm:h-32 sm:w-80">
        <img src={brainLogo} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain opacity-15" />
        <img src={brainLogo} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full animate-pulse object-contain" />
      </div>
      <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />{title}</div>
      {description && <p className="mt-2 text-center text-sm text-muted-foreground">{description}</p>}
      {elapsed && <p className="mt-3 font-mono text-xs tabular-nums text-muted-foreground">{elapsed} decorridos</p>}
    </div>;
  }

  return <div className={cn(
    'flex items-center gap-3 text-sm text-muted-foreground',
    variant === 'page' && 'rounded-xl border border-primary/15 bg-card px-5 py-6 shadow-sm',
    variant === 'operation' && 'rounded-xl border border-primary/15 bg-primary/[0.035] px-4 py-3',
    compact && 'gap-2 text-xs',
    className,
  )} role="status" aria-live="polite">
    {!compact && <img src={brainLogo} alt="" aria-hidden="true" className="h-7 w-auto shrink-0 opacity-85" />}
    <Loader2 className={cn('h-4 w-4 shrink-0 animate-spin text-primary', compact && 'h-3.5 w-3.5')} aria-hidden="true" />
    <div className="min-w-0">
      <p className={cn('font-medium text-foreground', compact && 'text-xs')}>{title}</p>
      {description && <p className={cn('mt-0.5 text-muted-foreground', compact && 'sr-only')}>{description}</p>}
    </div>
    {elapsed && <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted-foreground" aria-label={`${elapsed} decorridos`}>{elapsed}</span>}
  </div>;
}
