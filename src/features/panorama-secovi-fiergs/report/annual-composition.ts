import type { MarketCube } from '../domain/cube';
import { normalizeBuildingHistory } from '../domain/building-history';
import { canonicalStandard, orderStandards } from '../domain/taxonomy';
import { quarterRange, quarterEndMonth } from '../domain/quarters';
import type { PanoramaScope, Quarter } from '../types';

export interface AnnualLaunchFact { key: string; city: string; quarter: Quarter; standard: string | null; units: number | null; vgl: number | null; }
export interface AnnualComposition {
  metric: 'projects' | 'units' | 'vgl'; title: string; categories: string[];
  years: { year: number; from: Quarter; through: Quarter; total: number | null; status: 'ready' | 'empty' | 'incomplete' | 'negative';
    values: { label: string; value: number | null; share: number | null }[] }[];
  unclassified: number;
}
/** Only a pattern actually observed at release may label the release-year composition. */
export function annualLaunchFacts(buildings: Record<string, unknown>[], cube: MarketCube): AnnualLaunchFact[] {
  const source = new Map(buildings.map((b) => [String(b.building_id ?? b.id), b]));
  return cube.projects.filter((p) => p.segment === 'Vertical').map((p) => {
    const raw = source.get(p.buildingId);
    const rows = raw ? normalizeBuildingHistory(raw, quarterEndMonth(cube.endQuarter), p.key).releaseRows : [];
    const patterns = [...new Set(rows.map((r) => r.pattern ?? r.standard).filter((p) => p != null && String(p).trim()).map(canonicalStandard))];
    return { key: p.key, city: p.city, quarter: p.releaseQuarter, standard: patterns.length === 1 ? patterns[0] : null,
      units: p.launchedUnits, vgl: p.launchedVgvMillions };
  });
}
export function buildAnnualCompositions(facts: AnnualLaunchFact[], scope: PanoramaScope): AnnualComposition[] {
  const periods = quarterRange(scope.startQuarter ?? scope.endQuarter,scope.endQuarter);
  const valid = [...new Map(facts.filter((f) => periods.includes(f.quarter)).map((f) => [f.key,f])).values()];
  const categories = orderStandards(new Set(valid.map((f) => f.standard ?? 'Não classificado')) as never) as string[];
  const years = [...new Set(periods.map((q) => Number(q.slice(2))))];
  return (['projects','units','vgl'] as const).map((metric) => ({ metric,
    title: metric === 'projects' ? 'Empreendimentos lançados por padrão · composição anual' : metric === 'units' ? 'Unidades lançadas por padrão · composição anual' : 'VGL — Valor Geral Lançado por padrão · composição anual',
    categories, unclassified:valid.filter((f)=>!f.standard || f.standard==='Não classificado').length,
    years:years.map((year) => {
      const window = periods.filter((q) => Number(q.slice(2))===year); const items=valid.filter((f)=>Number(f.quarter.slice(2))===year);
      const number = (f:AnnualLaunchFact) => metric === 'projects' ? 1 : f[metric];
      const complete = items.every((f)=>number(f)!==null);
      const total=complete ? items.reduce((s,f)=>s+number(f)!,0) : null;
      const negative=items.some((f)=>number(f)!<0);
      const status = !complete ? 'incomplete' as const : negative ? 'negative' as const : total === 0 ? 'empty' as const : 'ready' as const;
      const values=categories.map((label)=>{
        const members=items.filter((f)=>(f.standard??'Não classificado')===label);
        const value=members.every((f)=>number(f)!==null) ? members.reduce((s,f)=>s+number(f)!,0) : null;
        return {label,value,share:status==='ready' && value!==null ? value/total!*100 : null};
      });
      return {year,from:window[0],through:window.at(-1)!,total,status,values};
    }) }));
}
export function annualCompositionPublishable(block: AnnualComposition): boolean {
  return block.categories.some((c)=>c!=='Não classificado') && block.years.some((y)=>y.status==='ready');
}
