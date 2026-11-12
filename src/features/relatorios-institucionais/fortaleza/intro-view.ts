import { fortalezaPeriod, type FortalezaSelection } from './model';
import { introBins, introLaunchLists, type IntroBin, type IntroData, type IntroProject } from './intro-data';
import { normalizeMarketText } from './market';

export interface IntroView {
  year: number; month: number; monthly: boolean; position: number; scope: string; cities: string[];
  sample: { projects: number | null; companies: number | null; capital: number | null; rm: number | null };
  sampleMethod?:'registry';
  sampleWarnings?:string[];
  capital: IntroProject[] | null; rm: IntroProject[] | null;
  history: IntroBin[] | null; accumulated: IntroBin[] | null;
  changes: { total: number | null; capital: number | null; rm: number | null };
}
export function buildIntroView(selection: FortalezaSelection, cities: string[], data: IntroData | null): IntroView {
  const lists = introLaunchLists(data, selection), bins = introBins(data, selection);
  const month = Number(fortalezaPeriod(selection).end.slice(5, 7));
  const current = bins?.history.at(-1), previous = bins?.history.at(-(selection.periodicity === 'monthly' ? 13 : 5));
  const difference = (now: number | undefined, before: number | undefined) => now !== undefined && before !== undefined && before !== 0 ? (now - before) / before * 100 : null;
  const previousAccumulated = bins?.accumulated[0], currentAccumulated = bins?.accumulated[1];
  const registry=data?.status==='ready'?data.projects.filter(project=>project.date<=fortalezaPeriod(selection).end):null;
  const companies=new Set(registry?.flatMap(project=>project.developer.split(' / ').map(normalizeMarketText).filter(Boolean))??[]);
  const capital=registry?.filter(project=>normalizeMarketText(project.city)==='fortaleza').length??null;
  return {
    year: selection.year, month, monthly: selection.periodicity === 'monthly', position: selection.position,
    scope: cities.length === 5 ? 'Fortaleza e Região Metropolitana' : cities.length === 1 ? cities[0] : cities.join(', '), cities,
    // Label this as the consulted registry, never as a historical survey sample.
    sample: registry?{projects:registry.length,companies:companies.size,capital,rm:registry.length-capital!}:{projects:null,companies:null,capital:null,rm:null},
    ...(registry?{sampleMethod:'registry' as const,sampleWarnings:['Contagem do cadastro consultado, com lançamento até o fechamento; não representa amostra histórica de empresas pesquisadas.',`${registry.filter(project=>!project.developer.trim()).length} empreendimento(s) sem empresa identificada; contagem de empresas considera somente nomes informados, sem estimativas.`]}:{}),
    capital: data?.status === 'ready' ? lists.capital : null, rm: data?.status === 'ready' ? lists.rm : null,
    history: bins?.history ?? null, accumulated: bins?.accumulated ?? null,
    changes: { total: current?.unknownCapital||current?.unknownRm||previous?.unknownCapital||previous?.unknownRm?null:difference(current?.total, previous?.total), capital: currentAccumulated?.unknownCapital||previousAccumulated?.unknownCapital?null:difference(currentAccumulated?.capital, previousAccumulated?.capital), rm:currentAccumulated?.unknownRm||previousAccumulated?.unknownRm?null:difference(currentAccumulated?.rm, previousAccumulated?.rm) },
  };
}
export const introMonth = (month: number, short = false) => new Intl.DateTimeFormat('pt-BR', { month: short ? 'short' : 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month - 1, 1))).replace('.', '');
export const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
