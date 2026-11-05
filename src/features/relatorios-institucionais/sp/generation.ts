import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { fetchSpTemporalInput,fetchSpLaunchSeriesRows,fetchSpSalesSeriesRows,fetchSpStockSeriesRows } from './api';
import { blockedSpProjects,fetchSpProjects,fetchSpBuildingRecords } from './projects';
import { buildSpTemporalPreview } from './temporal';
import { buildSpLaunchSeries,buildSpSalesSeries,blockedSpLaunchSeries } from './launch-series';
import { buildSpVglSeries,buildSpVgvSeries } from './vgl-series';
import { buildSpStockSeries,blockedSpStockSeries } from './stock-series';
import { buildSpTypologies } from './typologies';
import { buildSpTypologyHistory,blockedSpTypologyHistory } from './typology-history';
import { priorYearQuarter } from './history-batch';
import { buildSpSalesNeighborhoods,blockedSpSalesNeighborhoods } from './sales-neighborhoods';
import { buildSpGranularDetailsAsync,blockedSpGranularDetails } from './granular-details';
import { isSpMunicipalPreview,type SpPreview } from './model';
import { reviewSpSlides } from './review';
import { spReadFailure } from './read-errors';
import type { SpWorkProgress } from './work-progress';

export const SP_GENERATION_STEPS=[
  {id:'municipal',title:'Identificar o período disponível',description:'Verificar os meses de lançamentos, vendas e estoque.'},
  {id:'projects',title:'Contar empreendimentos',description:'Conferir os empreendimentos e suas datas de lançamento.'},
  {id:'launches',title:'Analisar lançamentos',description:'Preparar séries, comparativos e valores corrigidos.'},
  {id:'sales',title:'Analisar vendas',description:'Preparar vendas líquidas, comparativos e valores corrigidos.'},
  {id:'stock',title:'Analisar oferta e IVV',description:'Conferir as fotografias históricas de estoque.'},
  {id:'typologies',title:'Comparar tipologias',description:'Conferir dormitórios no período atual e no ano anterior.'},
  {id:'details',title:'Analisar bairros, áreas e preços',description:'Compartilhar uma coleta entre rankings, preços, oferta e mapas.'},
  {id:'slides',title:'Preparar os slides',description:'Conferir a disponibilidade das 85 páginas e organizar os insights.'},
] as const;
export type SpGenerationStepId=typeof SP_GENERATION_STEPS[number]['id'];
export type SpStepStatus='waiting'|'running'|'succeeded'|'warning'|'failed'|'cancelled';
export interface SpGenerationStep {id:SpGenerationStepId;status:SpStepStatus;message?:string;work?:SpWorkProgress;startedAt?:number;finishedAt?:number}
export interface SpGenerationState {
  quarter:Quarter;phase:'running'|'completed'|'observations'|'failed'|'cancelled';
  startedAt:number;finishedAt?:number;steps:SpGenerationStep[];report:SpPreview|null;
}
/** Raw details exist only in this private, in-memory generation session, never in UI/JSON. */
export interface SpGenerationSession {state:SpGenerationState;buildings?:Record<string,unknown>[]}
export function createSpGeneration(quarter:Quarter):SpGenerationSession {
  return {state:{quarter,phase:'running',startedAt:Date.now(),steps:SP_GENERATION_STEPS.map(step=>({id:step.id,status:'waiting'})),report:null}};
}
const defaults={fetchSpTemporalInput,fetchSpProjects,fetchSpLaunchSeriesRows,fetchSpSalesSeriesRows,fetchSpStockSeriesRows,fetchSpBuildingRecords,buildSpGranularDetailsAsync};
export type SpGenerationServices=typeof defaults;
export function cancelSpGeneration(session:SpGenerationSession):SpGenerationSession {
  return {...session,state:{...session.state,phase:'cancelled',finishedAt:Date.now(),steps:session.state.steps.map(step=>step.status==='running'?{...step,status:'cancelled',message:'Etapa interrompida. Os resultados anteriores foram preservados.',finishedAt:Date.now()}:step)}};
}
export async function runSpGeneration(seed:SpGenerationSession,options:{signal:AbortSignal;onUpdate:(session:SpGenerationSession)=>void;retry?:boolean;services?:Partial<SpGenerationServices>}):Promise<SpGenerationSession> {
  const api={...defaults,...options.services},signal=options.signal;
  // A resumed run owns a new session object: late settlements from a cancelled run
  // cannot mutate it, even if a provider ignores its AbortSignal.
  let session:SpGenerationSession={...seed,state:{...seed.state,phase:'running',finishedAt:undefined,steps:seed.state.steps.map(step=>({...step}))}};
  if(options.retry&&!isSpMunicipalPreview(session.state.report))session=createSpGeneration(seed.state.quarter);
  const retryStock=options.retry&&session.state.steps.find(step=>step.id==='stock')?.status==='failed';
  const check=()=>{if(signal.aborted)throw new DOMException('Geração cancelada.','AbortError');};
  const emit=()=>{check();options.onUpdate({...session,state:{...session.state,steps:session.state.steps.map(step=>({...step}))}});};
  const update=(id:SpGenerationStepId,patch:Partial<SpGenerationStep>)=>{
    session.state={...session.state,steps:session.state.steps.map(step=>step.id===id?{...step,...patch}:step)};emit();
  };
  const setReport=(report:SpPreview)=>{session.state={...session.state,report};emit();};
  const patchReport=(patch:Partial<SpPreview>)=>setReport({...session.state.report!,...patch});
  emit();
  for(const definition of SP_GENERATION_STEPS){
    const id=definition.id,previous=session.state.steps.find(step=>step.id===id)!;
    if(options.retry&&['succeeded','warning'].includes(previous.status)&&id!=='slides'&&!(id==='details'&&retryStock))continue;
    try{
      check();update(id,{status:'running',message:definition.description,work:undefined,startedAt:Date.now(),finishedAt:undefined});
      const progress={signal,onProgress:(message:string)=>{if(!signal.aborted)update(id,{message});},onWorkProgress:(work:SpWorkProgress)=>{if(!signal.aborted)update(id,{work});}};
      let status:SpStepStatus='succeeded',message='Etapa concluída.';
      if(id==='municipal'){
        const input=await api.fetchSpTemporalInput(session.state.quarter,progress);check();
        const report=buildSpTemporalPreview(input,session.state.quarter);setReport(report);
        if(!isSpMunicipalPreview(report)){
          update(id,{status:'failed',message:report.issues[0]??'Não há meses suficientes para gerar o relatório.',finishedAt:Date.now()});
          session.state={...session.state,phase:'failed',finishedAt:Date.now()};emit();return session;
        }
        status=report.status==='partial'?'warning':'succeeded';
        message=report.status==='partial'?`${report.monthly!.length} de 3 meses disponíveis. O relatório será parcial.`:'Os três meses do trimestre estão disponíveis.';
      }else{
        const report=session.state.report!;check();
        if(id==='projects'){
          const projects=await api.fetchSpProjects(report,progress);check();
          patchReport({projects,metrics:{...report.metrics,projects:projects.total}});
          status=projects.status==='ready'?'succeeded':'failed';message=projects.status==='ready'?`${projects.distinct.toLocaleString('pt-BR')} empreendimentos conferidos.`:projects.issues[0];
        }else if(id==='launches'||id==='sales'){
          const rows=await (id==='launches'?api.fetchSpLaunchSeriesRows:api.fetchSpSalesSeriesRows)(report,progress);check();
          const series=id==='launches'?buildSpLaunchSeries(rows,report):buildSpSalesSeries(rows,report);
          const money=id==='launches'?buildSpVglSeries(rows,report):buildSpVgvSeries(rows,report);
          patchReport(id==='launches'?{launchSeries:series,vglSeries:money}:{salesSeries:series,vgvSeries:money});
          status=series.status!=='ready'?'failed':money.status!=='ready'?'warning':'succeeded';
          message=series.status!=='ready'?series.issues[0]:money.status!=='ready'?money.issues[0]:'Séries e comparativos preparados.';
        }else if(id==='stock'){
          const rows=await api.fetchSpStockSeriesRows(report,progress);check();
          const stockSeries=buildSpStockSeries(rows,report);patchReport({stockSeries});
          status=stockSeries.status==='ready'?'succeeded':'failed';message=stockSeries.status==='ready'?'Oferta histórica e bases do IVV conferidas.':stockSeries.issues[0];
        }else if(id==='typologies'){
          const current=await api.fetchSpTemporalInput(report.quarter,{...progress,groupBy:'Tipologia',windowEnd:report.throughMonth,onWorkProgress:work=>progress.onWorkProgress({...work,total:8})});check();
          const typologies=buildSpTypologies(current,report);patchReport({typologies});
          if(typologies.status==='ready'){
            const end=`${Number(report.throughMonth!.slice(0,4))-1}${report.throughMonth!.slice(4)}`;
            const previous=await api.fetchSpTemporalInput(priorYearQuarter(report.quarter),{...progress,groupBy:'Tipologia',windowEnd:end,onWorkProgress:work=>progress.onWorkProgress({...work,completed:work.completed+4,total:8})});check();
            const typologyHistory=buildSpTypologyHistory(current,previous,report);patchReport({typologyHistory});
            const blocked=Object.values(typologyHistory).find(comparison=>comparison.status!=='ready');
            status=blocked?'failed':'succeeded';message=blocked?blocked.issues[0]:'Tipologias dos dois anos conferidas.';
          }else{status='failed';message=typologies.issues[0];}
        }else if(id==='details'){
          progress.onProgress(session.buildings?'Reaproveitando os históricos desta geração…':'Consultando os históricos detalhados…');
          const buildings=session.buildings??await api.fetchSpBuildingRecords(report,progress);check();session.buildings=buildings;
          const granularDetails=await api.buildSpGranularDetailsAsync(buildings,report,progress);check();
          const salesNeighborhoods=buildSpSalesNeighborhoods(buildings,report);patchReport({granularDetails,salesNeighborhoods});
          const reviews=reviewSpSlides(session.state.report!).filter(slide=>[39,51,...Array.from({length:28},(_,i)=>i+53)].includes(slide.number));
          status=granularDetails.status!=='ready'||salesNeighborhoods.status!=='ready'?'failed':reviews.some(slide=>['partial','blocked','pending'].includes(slide.state))?'warning':'succeeded';
          message=granularDetails.status!=='ready'?granularDetails.issues[0]:salesNeighborhoods.status!=='ready'?salesNeighborhoods.issues[0]:status==='warning'?'Detalhamentos preparados; há observações de cobertura nos insights.':'Bairros, áreas, preços, oferta e mapas preparados.';
        }else if(id==='slides'){
          const reviews=reviewSpSlides(report);check();
          progress.onWorkProgress({completed:reviews.length,total:85,unit:'slides'});
          const unavailable=reviews.filter(slide=>['partial','blocked','pending'].includes(slide.state)).length;
          status=unavailable?'warning':'succeeded';message=unavailable?`${unavailable} slides têm dados parciais ou fontes pendentes. Consulte os insights.`:'Os 85 slides foram organizados para revisão.';
        }
      }
      check();update(id,{status,message,finishedAt:Date.now()});
    }catch(error){
      if(signal.aborted){session=cancelSpGeneration(session);options.onUpdate(session);return session;}
      const message=spReadFailure(error,`Não foi possível concluir: ${definition.title.toLocaleLowerCase('pt-BR')}. Os outros resultados serão preservados.`);
      if(id==='municipal'){
        update(id,{status:'failed',message,finishedAt:Date.now()});session.state={...session.state,phase:'failed',finishedAt:Date.now()};emit();return session;
      }
      if(id==='projects')patchReport({projects:blockedSpProjects(message),metrics:{...session.state.report!.metrics,projects:null}});
      if(id==='launches')patchReport({launchSeries:blockedSpLaunchSeries(message),vglSeries:blockedSpLaunchSeries(message)});
      if(id==='sales')patchReport({salesSeries:blockedSpLaunchSeries(message),vgvSeries:blockedSpLaunchSeries(message)});
      if(id==='stock')patchReport({stockSeries:blockedSpStockSeries(message)});
      if(id==='typologies')patchReport({typologyHistory:blockedSpTypologyHistory(message)});
      if(id==='details')patchReport({salesNeighborhoods:blockedSpSalesNeighborhoods(message),granularDetails:blockedSpGranularDetails(message)});
      update(id,{status:'failed',message,finishedAt:Date.now()});
    }
  }
  check();session.state={...session.state,phase:session.state.steps.some(step=>step.status==='failed'||step.status==='warning')?'observations':'completed',finishedAt:Date.now()};emit();return session;
}
