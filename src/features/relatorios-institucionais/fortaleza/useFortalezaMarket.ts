import { useEffect, useRef, useState } from 'react';
import { collectFortalezaMarket, type FortalezaCollection } from './api';
import type { FortalezaMarketReport } from './market';
import { prepareFortalezaBlueprint, type FortalezaBlueprint, type FortalezaSelection } from './model';
import { fetchFortalezaIntro, type IntroData } from './intro-data';
import { fetchMonthlyLaunches } from './monthly-launch-api';
import type { MonthlyLaunchData } from './monthly-launches';

export const FORTALEZA_GENERATION_STEPS = [
  { id: 'validation', title: 'Validar o recorte' },
  { id: 'sources', title: 'Consultar fontes municipais' },
  { id: 'reconciliation', title: 'Conferir balanços' },
  { id: 'structure', title: 'Organizar a prévia' },
] as const;
type StageId = typeof FORTALEZA_GENERATION_STEPS[number]['id'];
export interface FortalezaGenerationState {
  key: string;
  phase: 'loading' | 'done' | 'error' | 'cancelled';
  startedAt: number;
  message: string;
  report: FortalezaMarketReport | null;
  hasFailedCities: boolean;
  blueprint: FortalezaBlueprint | null;
  intro: IntroData | null;
  monthlyLaunches: MonthlyLaunchData | null;
  steps: { id: StageId; title: string; status: 'waiting' | 'running' | 'done' | 'attention' | 'failed' | 'cancelled' }[];
}
export function useFortalezaMarket(selection: FortalezaSelection, authorizedCities: string[], token: string, ready: boolean) {
  // Session identity stays in memory only; it is never returned in report provenance.
  const key = JSON.stringify([token, selection, authorizedCities]);
  const operation = useRef<AbortController | null>(null);
  const cache = useRef<FortalezaCollection | undefined>(undefined);
  const introCache = useRef<IntroData | null>(null);
  const monthlyCache = useRef<MonthlyLaunchData | null>(null);
  const [state, setState] = useState<FortalezaGenerationState | null>(null);
  useEffect(() => {
    operation.current?.abort(); cache.current = undefined; introCache.current = null; monthlyCache.current = null; setState(null);
    return () => { operation.current?.abort(); };
  }, [key, ready]);
  async function consult(retryMissing = false) {
    if (!ready || operation.current && !operation.current.signal.aborted) return;
    operation.current?.abort();
    const controller = new AbortController(); operation.current = controller;
    const seed = retryMissing ? cache.current : undefined;
    cache.current = undefined;
    const startedAt = Date.now();
    const steps: FortalezaGenerationState['steps'] = FORTALEZA_GENERATION_STEPS.map((step, index) => ({ ...step, status: index === 0 ? 'running' : 'waiting' }));
    const preservedIntro = retryMissing ? introCache.current : null;
    const preservedMonthly = retryMissing ? monthlyCache.current : null;
    monthlyCache.current = null;
    introCache.current = null;
    setState({ key, phase: 'loading', startedAt, message: 'Conferindo o recorte vertical', report: null, hasFailedCities: false, blueprint: null, intro: null, monthlyLaunches: null, steps });
    const activate = (id: StageId) => {
      if (controller.signal.aborted) return;
      setState(current => current?.key === key ? { ...current, steps: current.steps.map(step => ({ ...step, status: step.id === id ? 'running' : step.status === 'running' ? 'done' : step.status })) } : current);
    };
    try {
      const { report, result } = await collectFortalezaMarket(selection, authorizedCities, {
        token, signal: controller.signal,
        onStage: stage => { if (stage !== 'reconciliation') activate(stage); },
        onProgress: message => { if (!controller.signal.aborted) setState(current => current?.key === key ? { ...current, message } : current); },
      }, seed);
      if (controller.signal.aborted) return;
      cache.current = result;
      const intro: IntroData = preservedIntro?.status === 'ready' ? preservedIntro : result.collection.failedCities.length ? { status: 'blocked', projects: [], issues: ['Conclua as fontes municipais antes de consultar o cadastro dos slides iniciais.'], requests: 0, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() } : await fetchFortalezaIntro(selection, authorizedCities, { token, signal: controller.signal, onProgress: message => { if (!controller.signal.aborted) setState(current => current?.key === key ? { ...current, message } : current); } });
      if (controller.signal.aborted) return;
      introCache.current = intro;
      const monthlyLaunches = selection.periodicity === 'monthly' && report.metrics ? await fetchMonthlyLaunches(selection, authorizedCities, {
        token, signal: controller.signal, includeMonthlyReport: true,
        onProgress: message => { if (!controller.signal.aborted) setState(current => current?.key === key ? { ...current, message } : current); },
      }, preservedMonthly) : null;
      if (controller.signal.aborted) return;
      monthlyCache.current = monthlyLaunches;
      activate('reconciliation');
      let blueprint: FortalezaBlueprint | null = null;
      if (report.metrics) {
        activate('structure');
        blueprint = await prepareFortalezaBlueprint(selection, authorizedCities, { signal: controller.signal, onProgress: (completed, total) => {
          if (!controller.signal.aborted) setState(current => current?.key === key ? { ...current, message: `${completed} de ${total} posições editoriais organizadas` } : current);
        } });
      }
      if (controller.signal.aborted) return;
      const finishedSteps: FortalezaGenerationState['steps'] = FORTALEZA_GENERATION_STEPS.map(step => ({ ...step, status: step.id === 'validation' ? 'done' : step.id === 'sources' ? report.metrics && intro.status === 'ready' && !monthlyLaunches?.issues.length ? 'done' : 'attention' : step.id === 'reconciliation' ? report.metrics && !report.issues.length ? 'done' : 'attention' : blueprint ? 'done' : 'waiting' }));
      setState({ key, phase: 'done', startedAt, message: report.metrics ? report.issues.length || intro.status !== 'ready' || monthlyLaunches?.issues.length ? 'Prévia organizada; confira os balanços e as fontes pendentes.' : monthlyLaunches?.market ? 'Prévia mensal organizada até o slide 45.' : 'Prévia vertical e slides iniciais organizados.' : 'Há fontes ou cobertura a conferir antes de organizar a prévia.', report, hasFailedCities: result.collection.failedCities.length > 0 || Boolean(monthlyLaunches?.issues.length), blueprint, intro, monthlyLaunches, steps: finishedSteps });
    } catch {
      if (!controller.signal.aborted) setState(current => ({ key, phase: 'error', startedAt, message: 'Não foi possível concluir a consulta. Confira sua autenticação e tente novamente.', report: null, hasFailedCities: false, blueprint: null, intro: null, monthlyLaunches: null, steps: (current?.steps ?? steps).map(step => ({ ...step, status: step.status === 'running' ? 'failed' : step.status })) }));
    } finally { if (operation.current === controller) operation.current = null; }
  }
  function cancel() {
    operation.current?.abort(); cache.current = undefined; introCache.current = null; monthlyCache.current = null;
    setState(current => current ? { ...current, phase: 'cancelled', report: null, blueprint: null, intro: null, monthlyLaunches: null, message: 'Consulta cancelada. Nenhum resultado parcial foi consolidado.', hasFailedCities: false, steps: current.steps.map(step => ({ ...step, status: step.status === 'running' ? 'cancelled' : step.status })) } : null);
  }
  return { state: ready && state?.key === key ? state : null, consult, cancel };
}
