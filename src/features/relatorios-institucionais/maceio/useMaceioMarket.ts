import { MaceioSourceError } from './source-contract';
import { createMaceioRequestLane } from './request-lane';
import { useEffect, useRef, useState } from 'react';
import { collectMaceioMarket, type MaceioCollection } from './api';
import type { MaceioMarketReport } from './market';
import { maceioScope, prepareMaceioBlueprint, type MaceioBlueprint, type MaceioSelection } from './model';
import { collectMaceioIntro, type MaceioIntroData } from './intro-data';
import { collectMaceioMarketSlides } from './market-slides-data';
import {collectMaceioCaged} from './caged-api';
import {cagedIssue} from './caged';

export const MACEIO_GENERATION_STEPS = [
  { id: 'validation', title: 'Validar o recorte' },
  { id: 'sources', title: 'Consultar fontes municipais' },
  { id: 'caged', title: 'Consultar emprego CAGED' },
  { id: 'reconciliation', title: 'Conferir balanços' },
  { id: 'structure', title: 'Organizar a prévia' },
] as const;
type StageId = typeof MACEIO_GENERATION_STEPS[number]['id'];
export interface MaceioGenerationState {
  key: string;
  phase: 'loading' | 'done' | 'error' | 'cancelled';
  startedAt: number;
  finishedAt?: string;
  message: string;
  waitingForApi?: boolean;
  report: MaceioMarketReport | null;
  hasFailedCities: boolean;
  blueprint: MaceioBlueprint | null;
  intro?: MaceioIntroData | null;
  steps: { id: StageId; title: string; percent?:number; status: 'waiting' | 'running' | 'done' | 'attention' | 'failed' | 'cancelled' }[];
}
export function useMaceioMarket(selection: MaceioSelection, authorizedCities: string[], token: string, ready: boolean) {
  // Session identity stays in memory only; it is never returned in report provenance.
  const key = JSON.stringify([token, selection, authorizedCities]);
  const operation = useRef<AbortController | null>(null);
  const cache = useRef<MaceioCollection | undefined>(undefined);
  const [state, setState] = useState<MaceioGenerationState | null>(null);
  useEffect(() => {
    operation.current?.abort(); cache.current = undefined; setState(null);
    return () => { operation.current?.abort(); };
  }, [key, ready]);
  async function consult(retryMissing = false) {
    if (!ready || operation.current && !operation.current.signal.aborted) return;
    operation.current?.abort();
    const controller = new AbortController(); operation.current = controller;
    const seed = retryMissing ? cache.current : undefined;
    cache.current = undefined;
    const startedAt = Date.now();
    const steps: MaceioGenerationState['steps'] = MACEIO_GENERATION_STEPS.map((step, index) => ({ ...step, status: index === 0 ? 'running' : 'waiting' }));
    setState({ key, phase: 'loading', startedAt, message: 'Conferindo o recorte vertical', report: null, hasFailedCities: false, blueprint: null, steps });
    const activate = (id: StageId) => {
      if (controller.signal.aborted) return;
      setState(current => current?.key === key ? { ...current, steps: current.steps.map(step => ({ ...step, status: step.id === id ? 'running' : step.status === 'running' ? 'done' : step.status })) } : current);
    };
    const count=maceioScope(selection,authorizedCities).cities.length;
    const batches=[count,count*2,count*7,count*2,selection.periodicity==='quarterly'?2:0];
    const totalUnits=batches.reduce((sum,value)=>sum+value,0);
    const progress=(id:StageId,percent:number)=>{if(!controller.signal.aborted)setState(current=>current?.key===key?{...current,steps:current.steps.map(step=>step.id===id?{...step,percent:Math.min(100,Math.max(step.percent??0,Math.floor(percent)))}:step)}:current);};
    const units=(batch:number)=>(completed:number,total:number)=>progress('sources',(batches.slice(0,batch).reduce((sum,value)=>sum+value,0)+batches[batch]*(total?completed/total:0))/totalUnits*100);
    const lane=createMaceioRequestLane({onWaiting:waitingForApi=>{if(!controller.signal.aborted)setState(current=>current?.key===key?{...current,waitingForApi}:current);},onProgress:message=>{if(!controller.signal.aborted)setState(current=>current?.key===key?{...current,message}:current);}});
    try {
      const { report, result } = await collectMaceioMarket(selection, authorizedCities, {
        token, signal: controller.signal, request:lane.request,
        onUnitsProgress:units(0),
        onStage: stage => { if (stage !== 'reconciliation') activate(stage); },
        onProgress: message => { if (!controller.signal.aborted) setState(current => current?.key === key ? { ...current, message } : current); },
      }, seed);
      if (controller.signal.aborted) return;
      cache.current = result;
      const intro = await collectMaceioIntro(selection, authorizedCities, {token,signal:controller.signal,request:lane.request,onUnitsProgress:units(1),onProgress:message=>{
        if(!controller.signal.aborted)setState(current=>current?.key===key?{...current,message}:current);
      }});
      if(controller.signal.aborted)return;
      intro.slides=await collectMaceioMarketSlides(selection,authorizedCities,intro,{token,signal:controller.signal,request:lane.request,onUnitsProgress:units(2),onProgress:message=>{
        if(!controller.signal.aborted)setState(current=>current?.key===key?{...current,message}:current);
      }});
      if(controller.signal.aborted)return;
      const extraOptions={token,signal:controller.signal,request:lane.request,closingOnly:true,onProgress:(message:string)=>{
        if(!controller.signal.aborted)setState(current=>current?.key===key?{...current,message}:current);
      }};
      intro.slides.horizontal=(await collectMaceioMarketSlides(selection,authorizedCities,intro,{...extraOptions,onUnitsProgress:units(3),segment:'Horizontal'})).sources;
      if(controller.signal.aborted)return;
      if(selection.periodicity==='quarterly')intro.slides.commercial=(await collectMaceioMarketSlides({...selection,territory:'city',city:selection.city},authorizedCities,intro,{...extraOptions,onUnitsProgress:units(4),segment:'Comercial'})).sources;
      if(controller.signal.aborted)return;
      activate('caged');
      setState(current=>current?.key===key?{...current,message:'Consultando agregados CAGED do MTE'}:current);
      intro.caged=await collectMaceioCaged(selection,authorizedCities,{token,signal:controller.signal});
      progress('caged',100);
      if(controller.signal.aborted)return;
      const cagedFailed=Boolean(cagedIssue(selection,intro.caged));
      const cagedBackup=intro.caged.delivery?.kind==='verified-snapshot';
      const introFailed=intro.cities.some(city=>!city.unitsComplete||!city.buildingsComplete)||[...intro.slides.sources,...intro.slides.horizontal??[],...intro.slides.commercial??[]].some(source=>!source.complete);
      activate('reconciliation');
      activate('structure');
      progress('reconciliation',100);
      const blueprint = await prepareMaceioBlueprint(selection, authorizedCities, { signal: controller.signal, onProgress: (completed, total) => {
        progress('structure',total?completed/total*100:0);
        if (!controller.signal.aborted) setState(current => current?.key === key ? { ...current, message: `${completed} de ${total} posições organizadas` } : current);
      } });
      if (controller.signal.aborted) return;
      const finishedSteps: MaceioGenerationState['steps'] = MACEIO_GENERATION_STEPS.map(step => ({ ...step, percent:100, status: step.id === 'validation' ? 'done' : step.id === 'caged' ? cagedFailed||cagedBackup?'attention':'done' : step.id === 'sources' ? report.metrics&&!introFailed ? 'done' : 'attention' : step.id === 'reconciliation' ? report.metrics && !report.issues.length ? 'done' : 'attention' : blueprint ? 'done' : 'waiting' }));
      setState({
        key, phase: 'done', startedAt, finishedAt: new Date().toISOString(),
        message: cagedBackup ? 'Prévia organizada. CAGED usa cópia verificada da fonte MTE; serviço online indisponível. Confira os balanços e as demais fontes.' : !report.metrics || report.issues.length || introFailed || cagedFailed ? 'Prévia organizada; confira os balanços e as fontes pendentes.' : 'Fontes imobiliárias e CAGED consultados; confira os slides e as pendências de conteúdo.',
        report, intro, hasFailedCities: cagedFailed || cagedBackup || introFailed || result.collection.failedCities.length > 0 || report.cities.some(city => city.status === 'incomplete'), blueprint, steps: finishedSteps,
      });
    } catch (error) {
      if (!controller.signal.aborted) setState(current => ({ key, phase: 'error', startedAt, message: error instanceof MaceioSourceError && error.httpStatus===429 ? 'A API manteve o limite de consultas após a pausa (429). Coleta interrompida; tente novamente mais tarde.' : 'Não foi possível concluir a consulta. Confira sua autenticação e tente novamente.', report: null, hasFailedCities: false, blueprint: null, steps: (current?.steps ?? steps).map(step => ({ ...step, status: step.status === 'running' ? 'failed' : step.status })) }));
    } finally { if (operation.current === controller) operation.current = null; }
  }
  function cancel() {
    operation.current?.abort(); cache.current = undefined;
    setState(current => current ? { ...current, phase: 'cancelled', report: null, blueprint: null, message: 'Consulta cancelada. Nenhum resultado parcial foi consolidado.', hasFailedCities: false, steps: current.steps.map(step => ({ ...step, status: step.status === 'running' ? 'cancelled' : step.status })) } : null);
  }
  return { state: ready && state?.key === key ? state : null, consult, cancel };
}
