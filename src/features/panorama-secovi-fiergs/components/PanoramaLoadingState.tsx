import brainLogo from '../../../../assets/logoBrain.png';

interface Props { label?: string; compact?: boolean; }

/** Estado de carregamento da feature seguindo o padrão de progresso visual da plataforma. */
export function PanoramaLoadingState({ label = 'Preparando relatório…', compact = false }: Props) {
  return <div className={compact ? 'flex items-center gap-2 py-1' : 'flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-border bg-card/80'} role="status" aria-live="polite">
    <div className={compact ? 'relative h-7 w-14' : 'relative h-12 w-24'}>
      <img src={brainLogo} alt="" className="absolute inset-0 h-full w-full object-contain opacity-15" />
      <img src={brainLogo} alt="" className="panorama-loading-logo absolute inset-0 h-full w-full object-contain" />
    </div>
    <span className={compact ? 'text-xs text-muted-foreground' : 'mt-3 text-sm text-muted-foreground'}>{label}</span>
  </div>;
}
