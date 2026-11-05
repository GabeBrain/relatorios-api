import { useState } from 'react';
import { FileChartColumn,Play,Layers,CalendarDays } from 'lucide-react';
import { Alert,AlertDescription,AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { GeoApiScopeSelector,useGeoApiScope,type GeoScope } from '@/features/shared/geo-api-scope-engine';
import { useAuthStore } from '@/store/auth-store';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { spDefaultQuarter,spPeriodOptions,spQuarterInYear } from './periods';
import { SP_INSTITUTIONAL,isSpMunicipalPreview,spPeriodLabel } from './model';
import { SP_GENERATION_STEPS } from './generation';
import { useSpGeneration } from './useSpGeneration';
import { SpGenerationPanel } from './SpGenerationPanel';
import { SpAnalystInsights } from './SpAnalystInsights';
import { SpReportPages } from './SpReportPages';

const sameCity=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='sao paulo';
export default function SpInstitutionalPage() {
  const [geo,setGeo]=useState<GeoScope>({uf:'',city:''});
  const [quarter,setQuarter]=useState<Quarter>(()=>spDefaultQuarter());
  const token=useAuthStore(state=>state.getToken());
  const key=`${geo.uf}/${geo.city}/${quarter}`;
  const generation=useSpGeneration(quarter,key,token);
  const changeGeo=(next:GeoScope)=>{generation.clear();setGeo(next);};
  const scope=useGeoApiScope({value:geo,onChange:changeGeo});
  const supported=geo.uf==='SP'&&sameCity(geo.city);
  const ready=scope.strictReady&&scope.hasToken&&!scope.isLoading&&!scope.error&&supported;
  const state=generation.state,report=ready?state?.report:null,running=state?.phase==='running';
  const active=state?.steps.find(step=>step.status==='running');
  const initialLoading=Boolean(running&&!report);
  const periods=spPeriodOptions();
  const work=active?.work,percent=work&&work.total>0?Math.round(work.completed/work.total*100):null;
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relatórios institucionais</p><div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><FileChartColumn aria-hidden="true" className="h-7 w-7"/></span><div><h1 className="text-2xl font-semibold">{SP_INSTITUTIONAL.label}</h1><p className="text-sm text-muted-foreground">Do período selecionado ao relatório, em uma geração automática.</p></div></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Layers className="h-4 w-4" aria-hidden="true"/>8 etapas automáticas · 85 slides</span><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true"/>Trimestre completo ou parcial, conforme os meses disponíveis</span></div></header>
    <section aria-label="Seleção do estudo" className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
      <div><h2 className="font-semibold">Configure seu relatório</h2><p className="mt-1 text-sm text-muted-foreground">Selecione a cidade, o ano e o trimestre. As consultas e a preparação dos slides serão executadas em sequência.</p></div>
      {scope.error?<Alert variant="destructive"><AlertTitle>Não foi possível carregar as cidades autorizadas</AlertTitle><AlertDescription><p>Confira sua autenticação e tente novamente. A geração permanece bloqueada.</p><Button className="mt-3" variant="outline" onClick={scope.reload}>Tentar carregar cidades novamente</Button></AlertDescription></Alert>:<GeoApiScopeSelector value={geo} onChange={changeGeo} disabled={running}/>}
      {scope.isLoading&&<BrainLoadingState variant="field" title="Carregando municípios autorizados…"/>}
      {geo.city&&!supported&&<p className="text-sm text-muted-foreground">Este modelo contempla São Paulo capital. Selecione SP e São Paulo.</p>}
      <div className="flex flex-wrap items-end gap-4"><div className="w-32 space-y-1.5"><label htmlFor="sp-year" className="text-sm font-medium">Ano do estudo</label><Select value={quarter.slice(2)} disabled={running} onValueChange={year=>{generation.clear();setQuarter(spQuarterInYear(quarter,year));}}><SelectTrigger id="sp-year"><SelectValue/></SelectTrigger><SelectContent>{periods.years.map(year=><SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select></div><div className="w-48 space-y-1.5"><label htmlFor="sp-quarter" className="text-sm font-medium">Trimestre do estudo</label><Select value={quarter} disabled={running} onValueChange={value=>{generation.clear();setQuarter(value as Quarter);}}><SelectTrigger id="sp-quarter"><SelectValue/></SelectTrigger><SelectContent>{periods.quarters.filter(value=>value.slice(2)===quarter.slice(2)).map(value=><SelectItem key={value} value={value}>{value[0]}º trimestre</SelectItem>)}</SelectContent></Select></div><Button className="gap-2" onClick={()=>{if(ready)void generation.generate();}} disabled={!ready||running}><Play className="h-4 w-4" aria-hidden="true"/>Gerar relatório</Button></div>
      {!scope.error&&!scope.isLoading&&!ready&&<p className="text-sm text-muted-foreground">Faça login e selecione um município autorizado para continuar.</p>}
      <p className="text-xs text-muted-foreground">Uma nova geração consulta a disponibilidade atual. Se houver um ou dois meses, o relatório será identificado como parcial; com três meses, usará o trimestre completo.</p>
    </section>
    {!state&&<section aria-label="Como a geração funciona" className="rounded-xl border border-dashed bg-card/50 p-5 sm:p-6"><h2 className="font-semibold">Um clique, do início ao fim</h2><p className="mt-1 text-sm text-muted-foreground">Acompanhe o avanço de cada etapa sem precisar abrir slides ou acionar consultas separadas.</p><ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{SP_GENERATION_STEPS.map((step,index)=><li key={step.id} className="flex items-start gap-2 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{index+1}</span><span>{step.title}</span></li>)}</ol></section>}
    {state&&!initialLoading&&<SpGenerationPanel state={state} onCancel={generation.cancel} onRetry={()=>{if(ready)void generation.retry();}}/>}
    {report&&state&&<section aria-label="Resultado do estudo" className="space-y-4"><div><h2 className="text-xl font-semibold">São Paulo / SP · {report.quarter}</h2><p className="text-sm text-muted-foreground">{spPeriodLabel(report)}{running?' · geração em andamento':''}</p></div>{running?<SpAnalystInsights report={report} state={state}/>:<Tabs defaultValue={isSpMunicipalPreview(report)?'report':'insights'}><TabsList className="mb-4"><TabsTrigger value="report" disabled={!isSpMunicipalPreview(report)}>Relatório</TabsTrigger><TabsTrigger value="insights">Insights do analista</TabsTrigger></TabsList><TabsContent value="report">{isSpMunicipalPreview(report)&&<SpReportPages report={report}/>}</TabsContent><TabsContent value="insights"><SpAnalystInsights report={report} state={state}/></TabsContent></Tabs>}</section>}
    {initialLoading&&<section aria-label="Carregamento do relatório" aria-busy="true" className="relative min-h-[26rem] overflow-hidden rounded-xl border bg-card">
      <BrainLoadingState variant="overlay" className="absolute z-10" title="Etapa 1 de 8 · Identificar o período disponível" description={percent===null?active?.message: `${work!.completed} de ${work!.total} ${work!.unit} consultadas · ${percent}%`} startedAt={state?.startedAt}/>
      <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2"><Button variant="outline" onClick={generation.cancel}>Cancelar geração</Button></div>
    </section>}
  </div>;
}
