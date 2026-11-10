import type { FortalezaGenerationState } from './useFortalezaMarket';
const labels = { waiting: 'Aguardando', running: 'Em andamento', done: 'Concluída', attention: 'Conferir', failed: 'Não concluída', cancelled: 'Cancelada' };
export function FortalezaGenerationPanel({ state, compact = false }: { state: FortalezaGenerationState; compact?: boolean }) {
  return <section aria-label="Etapas da prévia vertical" className={compact ? 'mt-5 w-full max-w-lg' : 'space-y-3 rounded-xl border bg-card p-4 sm:p-5'}>
    {!compact && <h2 className="font-semibold">{state.phase === 'cancelled' ? 'Prévia cancelada' : state.phase === 'error' ? 'Etapas não concluídas' : state.message}</h2>}
    <ol className={compact ? 'grid gap-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
      {state.steps.map((step, index) => <li key={step.id} aria-current={step.status === 'running' ? 'step' : undefined} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${step.status === 'running' ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span><div className="min-w-0"><p className="font-medium">{step.title}</p><p className="text-xs text-muted-foreground">{labels[step.status]}</p></div></li>)}
    </ol>
    {!compact && state.phase === 'done' && <p className="text-xs text-muted-foreground">{state.monthlyLaunches?.market ? 'Prévia mensal até o slide 25. Fontes incompletas continuam identificadas nos slides e nos insights; a exportação e os blocos seguintes permanecem em preparação.' : 'Núcleo municipal vertical integrado. A sequência editorial de referência não representa todos os conteúdos já gerados.'}</p>}
  </section>;
}
