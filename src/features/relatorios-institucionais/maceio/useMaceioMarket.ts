import { useEffect, useRef, useState } from 'react';
import { collectMaceioMarket, type MaceioCollection } from './api';
import type { MaceioMarketReport } from './market';
import { prepareMaceioBlueprint, type MaceioBlueprint, type MaceioSelection } from './model';
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
  report: MaceioMarketReport | null;
  hasFailedCities: boolean;
  blueprint: MaceioBlueprint | null;
  intro?: MaceioIntroData | null;
  steps: { id: StageId; title: string; status: 'waiting' | 'running' | 'done' | 'attention' | 'failed' | 'cancelled' }[];
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
    try {
      const { report, result } = await collectMaceioMarket(selection, authorizedCities, {
        token, signal: controller.signal,
        onStage: stage => { if (stage !== 'reconciliation') activate(stage); },
        onProgress: message => { if (!controller.signal.aborted) setState(current => current?.key === key ? { ...current, message } : current); },
      }, seed);
      if (controller.signal.aborted) return;
      cache.current = result;
      const intro = await collectMaceioIntro(selection, authorizedCities, {token,signal:controller.signal,onProgress:message=>{
        if(!controller.signal.aborted)setState(current=>current?.key===key?{...current,message}:current);
      }});
      if(controller.signal.aborted)return;
      intro.slides=await collectMaceioMarketSlides(selection,authorizedCities,intro,{token,signal:controller.signal,onProgress:message=>{
        if(!controller.signal.aborted)setState(current=>current?.key===key?{...current,message}:current);
      }});
      if(controller.signal.aborted)return;
      const extraOptions={token,signal:controller.signal,closingOnly:true,onProgress:(message:string)=>{
        if(!controller.signal.aborted)setState(current=>current?.key===key?{...current,message}:current);
      }};
      intro.slides.horizontal=(await collectMaceioMarketSlides(selection,authorizedCities,intro,{...extraOptions,segment:'Horizontal'})).sources;
      if(controller.signal.aborted)return;
      if(selection.periodicity==='quarterly')intro.slides.commercial=(await collectMaceioMarketSlides({...selection,territory:'city',city:selection.city},authorizedCities,intro,{...extraOptions,segment:'Comercial'})).sources;
      if(controller.signal.aborted)return;
      activate('caged');
      setState(current=>current?.key===key?{...current,message:'Consultando agregados CAGED do MTE'}:current);
      intro.caged=await collectMaceioCaged(selection,authorizedCities,{token,signal:controller.signal});
      if(controller.signal.aborted)return;
      const cagedFailed=Boolean(cagedIssue(selection,intro.caged));
      const introFailed=intro.cities.some(city=>!city.unitsComplete||!city.buildingsComplete)||[...intro.slides.sources,...intro.slides.horizontal??[],...intro.slides.commercial??[]].some(source=>!source.complete);
      activate('reconciliation');
      activate('structure');
      const blueprint = await prepareMaceioBlueprint(selection, authorizedCities, { signal: controller.signal, onProgress: (completed, total) => {
        if (!controller.signal.aborted) setState(current => current?.key === key ? { ...current, message: `${completed} de ${total} posições organizadas` } : current);
      } });
      if (controller.signal.aborted) return;
      const finishedSteps: MaceioGenerationState['steps'] = MACEIO_GENERATION_STEPS.map(step => ({ ...step, status: step.id === 'validation' ? 'done' : step.id === 'caged' ? cagedFailed?'attention':'done' : step.id === 'sources' ? report.metrics&&!introFailed ? 'done' : 'attention' : step.id === 'reconciliation' ? report.metrics && !report.issues.length ? 'done' : 'attention' : blueprint ? 'done' : 'waiting' }));
      setState({
        key, phase: 'done', startedAt, finishedAt: new Date().toISOString(),
        message: !report.metrics || report.issues.length || introFailed || cagedFailed ? 'Prévia organizada; confira os balanços e as fontes pendentes.' : 'Fontes imobiliárias e CAGED consultados; confira os slides e as pendências de conteúdo.',
        report, intro, hasFailedCities: cagedFailed || introFailed || result.collection.failedCities.length > 0 || report.cities.some(city => city.status === 'incomplete'), blueprint, steps: finishedSteps,
      });
    } catch {
      if (!controller.signal.aborted) setState(current => ({ key, phase: 'error', startedAt, message: 'Não foi possível concluir a consulta. Confira sua autenticação e tente novamente.', report: null, hasFailedCities: false, blueprint: null, steps: (current?.steps ?? steps).map(step => ({ ...step, status: step.status === 'running' ? 'failed' : step.status })) }));
    } finally { if (operation.current === controller) operation.current = null; }
  }
  function cancel() {
    operation.current?.abort(); cache.current = undefined;
    setState(current => current ? { ...current, phase: 'cancelled', report: null, blueprint: null, message: 'Consulta cancelada. Nenhum resultado parcial foi consolidado.', hasFailedCities: false, steps: current.steps.map(step => ({ ...step, status: step.status === 'running' ? 'cancelled' : step.status })) } : null);
  }
  return { state: ready && state?.key === key ? state : null, consult, cancel };
}
