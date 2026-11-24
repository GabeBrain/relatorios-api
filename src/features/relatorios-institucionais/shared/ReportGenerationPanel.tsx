import type {ReactNode} from 'react';
import {CheckCircle2,AlertCircle,Clock3,Loader2,PauseCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';

export interface ReportGenerationStep {id:string;title:string;status:'waiting'|'running'|'succeeded'|'warning'|'failed'|'cancelled'|'done'|'attention';message?:string;percent?:number;work?:{completed:number;total:number;unit:string}}
const canonical=(status:ReportGenerationStep['status'])=>status==='done'?'succeeded':status==='attention'?'warning':status;
const labels={waiting:'Aguardando',running:'Em andamento',succeeded:'Concluída',warning:'Com observações',failed:'Não concluída',cancelled:'Interrompida'};
/** Exact SP generation-panel layout, shared rather than imitated by each model. */
export function ReportGenerationPanel({title,subtitle,steps,running,startedAt,description,onCancel,cancelLabel='Cancelar geração',onRetry,retryLabel='Repetir etapas pendentes',footer,label='Etapas de geração'}:{title:string;subtitle?:string;steps:readonly ReportGenerationStep[];running:boolean;startedAt?:number|null;description?:string;onCancel?:()=>void;cancelLabel?:string;onRetry?:()=>void;retryLabel?:string;footer?:ReactNode;label?:string}){
 const active=steps.find(s=>s.status==='running'),done=steps.filter(s=>['succeeded','warning','failed'].includes(canonical(s.status))).length;
 return <section aria-label={label} aria-busy={running} className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{done} de {steps.length} etapas processadas{subtitle&&` · ${subtitle}`}</p></div>{running&&onCancel?<Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>:!running&&onRetry?<Button variant="outline" onClick={onRetry}>{retryLabel}</Button>:null}</div>
  {running&&active&&<BrainLoadingState variant="operation" className="flex-wrap [&>div]:order-last [&>div]:w-full sm:flex-nowrap sm:[&>div]:order-none sm:[&>div]:w-auto" title={active.title} description={description??'As etapas avançam automaticamente. Você pode acompanhar os resultados já apurados abaixo.'} startedAt={startedAt}/>}
  <ol className="grid gap-3 md:grid-cols-2" aria-label="Andamento das etapas">{steps.map((step,index)=>{
   const status=canonical(step.status),work=step.work,percent=work&&work.total>0?Math.min(100,Math.floor(work.completed/work.total*100)):step.percent??null,Icon=status==='succeeded'?CheckCircle2:status==='running'?Loader2:status==='cancelled'?PauseCircle:['failed','warning'].includes(status)?AlertCircle:Clock3;
   return <li key={step.id} data-step={step.id} data-status={status} aria-current={status==='running'?'step':undefined} className={`rounded-lg border p-4 ${status==='running'?'border-primary bg-primary/5':status==='failed'?'border-destructive/40':'border-border'}`}>
    <div className="flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${status==='running'?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{index+1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{step.title}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon aria-hidden="true" className={`h-3.5 w-3.5 ${status==='running'?'animate-spin text-primary':''}`}/>{labels[status]}</p></div></div>
    {status==='running'&&<div className="mt-3 space-y-2">{percent!==null?<><Progress value={percent} aria-label={`Progresso: ${step.title}`}/><p className="text-xs tabular-nums text-muted-foreground">{work?`${work.completed.toLocaleString('pt-BR')} de ${work.total.toLocaleString('pt-BR')} ${work.unit} · `:''}{percent}%</p></>:<p className="text-xs text-muted-foreground">Aguardando a confirmação do volume desta etapa…</p>}<p className="text-xs text-muted-foreground" aria-live="polite">{step.message?.replace(/A API/g,'A fonte')}</p></div>}
    {status!=='running'&&status!=='waiting'&&<p className="mt-3 text-xs text-muted-foreground">{step.message}</p>}
   </li>;
  })}</ol>{footer}
 </section>;
}
