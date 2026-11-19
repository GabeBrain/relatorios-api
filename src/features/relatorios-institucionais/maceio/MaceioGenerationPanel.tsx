import type { MaceioGenerationState } from './useMaceioMarket';
import { Progress } from '@/components/ui/progress';
const labels = { waiting: 'Aguardando', running: 'Em andamento', done: 'Concluída', attention: 'Conferir', failed: 'Não concluída', cancelled: 'Cancelada' };
export function MaceioGenerationPanel({ state, compact = false }: { state: MaceioGenerationState; compact?: boolean }) {
  return <section aria-label="Etapas da prévia vertical" className={compact ? 'mt-5 w-full max-w-lg' : 'space-y-3 rounded-xl border bg-card p-4 sm:p-5'}>
    {!compact && <h2 className="font-semibold">{state.phase === 'cancelled' ? 'Prévia cancelada' : state.phase === 'error' ? 'Etapas não concluídas' : state.message}</h2>}
    <ol className={compact ? 'grid gap-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
      {state.steps.map((step, index) => {const percent=step.status==='done'?100:step.percent??0;return <li key={step.id} aria-current={step.status === 'running' ? 'step' : undefined} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${step.status === 'running' ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span><div className="min-w-0 flex-1"><p className="font-medium">{step.title}</p><p className="text-xs text-muted-foreground">{state.waitingForApi&&step.status==='running'?'Aguardando resposta da API':labels[step.status]} · {percent}%</p><Progress className="mt-2 h-1.5 bg-primary/15" value={percent} aria-valuenow={percent} aria-label={`Progresso: ${step.title}`} /></div></li>;})}
    </ol>
    {!compact && state.phase === 'done' && <p className="text-xs text-muted-foreground">Núcleo municipal vertical desta implantação. As composições das páginas, os demais segmentos e a exportação seguem em blocos próprios; nada aqui representa homologação dos números.</p>}
  </section>;
}
