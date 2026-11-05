import { CheckCircle2,AlertCircle,Clock3,Loader2,PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { SP_GENERATION_STEPS,type SpGenerationState,type SpStepStatus } from './generation';

const statusLabel:Record<SpStepStatus,string>={waiting:'Aguardando',running:'Em andamento',succeeded:'Concluída',warning:'Com observações',failed:'Não concluída',cancelled:'Interrompida'};
export function SpGenerationPanel({state,onCancel,onRetry}:{state:SpGenerationState;onCancel:()=>void;onRetry:()=>void}) {
  const active=state.steps.find(step=>step.status==='running');
  const done=state.steps.filter(step=>['succeeded','warning','failed'].includes(step.status)).length;
  const title=state.phase==='running'?'Gerando seu relatório':state.phase==='cancelled'?'Geração interrompida':state.phase==='failed'?'Não foi possível iniciar o relatório':state.phase==='observations'?'Relatório gerado com observações':'Relatório gerado';
  const retry=state.steps.some(step=>['failed','cancelled','waiting'].includes(step.status));
  return <section aria-label="Etapas de geração" className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{done} de {SP_GENERATION_STEPS.length} etapas processadas · {state.quarter}</p></div>
      {state.phase==='running'?<Button variant="outline" onClick={onCancel}>Cancelar geração</Button>:retry?<Button variant="outline" onClick={onRetry}>{state.phase==='cancelled'?'Retomar geração':'Repetir etapas pendentes'}</Button>:null}
    </div>
    {state.phase==='running'&&active&&<BrainLoadingState variant="operation" className="flex-wrap [&>div]:order-last [&>div]:w-full sm:flex-nowrap sm:[&>div]:order-none sm:[&>div]:w-auto" title={SP_GENERATION_STEPS.find(step=>step.id===active.id)!.title} description="As etapas avançam automaticamente. Você pode acompanhar os resultados já apurados abaixo." startedAt={state.startedAt}/>}
    <ol className="grid gap-3 md:grid-cols-2" aria-label="Andamento das etapas">
      {state.steps.map((step,index)=>{
        const definition=SP_GENERATION_STEPS[index],work=step.work,percent=work&&work.total>0?Math.min(100,Math.round(work.completed/work.total*100)):null;
        const Icon=step.status==='succeeded'?CheckCircle2:step.status==='running'?Loader2:step.status==='cancelled'?PauseCircle:['failed','warning'].includes(step.status)?AlertCircle:Clock3;
        return <li key={step.id} data-step={step.id} data-status={step.status} aria-current={step.status==='running'?'step':undefined} className={`rounded-lg border p-4 ${step.status==='running'?'border-primary bg-primary/5':step.status==='failed'?'border-destructive/40':'border-border'}`}>
          <div className="flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${step.status==='running'?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{index+1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{definition.title}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon aria-hidden="true" className={`h-3.5 w-3.5 ${step.status==='running'?'animate-spin text-primary':''}`}/>{statusLabel[step.status]}</p></div></div>
          {step.status==='running'&&<div className="mt-3 space-y-2">{percent!==null?<><Progress value={percent} aria-label={`Progresso: ${definition.title}`}/><p className="text-xs tabular-nums text-muted-foreground">{work!.completed.toLocaleString('pt-BR')} de {work!.total.toLocaleString('pt-BR')} {work!.unit} · {percent}%</p></>:<p className="text-xs text-muted-foreground">Aguardando a confirmação do volume desta etapa…</p>}<p className="text-xs text-muted-foreground" aria-live="polite">{step.message?.replace(/A API/g,'A fonte')}</p></div>}
          {step.status!=='running'&&step.status!=='waiting'&&<p className="mt-3 text-xs text-muted-foreground">{step.message}</p>}
        </li>;
      })}
    </ol>
    {state.phase==='cancelled'&&<p className="text-sm text-muted-foreground">Os resultados já conferidos foram preservados. Retomar continua a mesma geração; gerar novamente consulta uma nova posição dos dados.</p>}
    {state.phase==='observations'&&<p className="text-sm text-muted-foreground">A geração terminou. Os insights indicam o impacto das fontes parciais ou indisponíveis e os slides que precisam de atenção.</p>}
  </section>;
}
