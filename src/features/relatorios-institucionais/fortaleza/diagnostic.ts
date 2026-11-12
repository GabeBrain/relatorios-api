import { FORTALEZA_REFERENCES,type FortalezaSelection } from './model';
import type { FortalezaGenerationState } from './useFortalezaMarket';
import { buildIntroView } from './intro-view';
import { INTRO_LAYOUTS } from './intro-layout';
import { monthlyProjectLaunches,monthlyUnitLaunches } from './monthly-launches';
import { buildMonthlySlide } from './monthly-market';
import { buildPriceSlide } from './monthly-prices';
import { buildMonthlyIvv } from './monthly-ivv';
import { buildOfferTable } from './monthly-tables';
import { quarterlyTableForPage } from './quarterly-details';
import { createFortalezaEditorial } from './monthly-closing';
import { buildQuarterlyPrice,buildQuarterlyIvv,QUARTERLY_PRICE_PAGES } from './quarterly-analysis';
import { buildQuarterlyLaunchSlide,buildQuarterlyMunicipalTable,buildQuarterlyStockTable } from './quarterly-launches';
export type DiagnosticStatus='available'|'source-pending'|'editorial-review'|'not-implemented';
export interface DiagnosticSlide { number:number; title:string; scope:string[]; status:DiagnosticStatus; issue:string|null; warnings:string[]; values:unknown }
/** Whitelist only: no auth state, raw projects, images or request headers enter this snapshot. */
export type DiagnosticGeneration=Pick<FortalezaGenerationState,'phase'|'startedAt'|'finishedAt'|'blueprint'|'report'|'intro'|'monthlyLaunches'>;
export function buildFortalezaDiagnostic(selection:FortalezaSelection,state:DiagnosticGeneration){
  const monthly=selection.periodicity==='monthly',reference=FORTALEZA_REFERENCES[monthly?1:0],cities=state.blueprint?.cities??state.report?.cities.map(city=>city.city)??[],sources=state.monthlyLaunches,view=buildIntroView(selection,cities,state.intro);
  const rm=cities.filter(city=>city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()!=='fortaleza');
  const scopeFor=(page:number)=>[5,6,7,14,15,25,26,35,39,40,41,42,43,46,47,49,51].includes(page)?rm:[3,4,11,13,17,23,24,28,34,36,37,38,45,48,50,52,53,54,55].includes(page)?cities.filter(city=>!rm.includes(city)):cities;
  const capacity=(start:number,end:number)=>INTRO_LAYOUTS[monthly?'julho':'junho'].slice(start-1,end).reduce((sum,layout)=>sum+(layout.shapes.find(shape=>shape.slot==='table')?.rows??1)-1,0);
  const tableCache=new Map<number,ReturnType<typeof buildOfferTable>>();
  const slides:DiagnosticSlide[]=reference.slides.map(definition=>{
    const page=definition.number,base:DiagnosticSlide={number:page,title:definition.title,scope:monthly?scopeFor(page):[11,13,18,25,26,30,38,41,42,43,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69].includes(page)?cities.filter(city=>!rm.includes(city)):[14,15,27,28,39,44,45,46,47,48,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84].includes(page)?rm:cities,status:'editorial-review',issue:'Conteúdo editorial da referência; revisar para a edição atual.',warnings:[],values:null};
    const calculated=(value:{status:string;issue:string|null;warnings?:string[]})=>({...base,status:value.status==='ready'?'available' as const:'source-pending' as const,issue:value.issue,warnings:value.warnings??[],values:value});
    if([1,8,9].includes(page))return base;
    if(page===2)return {...base,status:'source-pending',issue:'Amostra histórica e empresas pesquisadas não possuem fonte própria confirmada.',values:view.sample};
    if(page>=3&&page<=7){const rows=page<=4?view.capital:view.rm,limit=page<=4?capacity(3,4):capacity(5,7),overflow=Math.max(0,(rows?.length??0)-limit);return {...base,status:rows&&!overflow?'available':'source-pending',issue:!rows?'Cadastro de lançamentos não concluído.':overflow?`${overflow} lançamentos exigem continuação antes da exportação.`:null,values:{projects:rows?.length??null,capacity:limit,overflow}};}
    if(page===10)return {...base,status:view.history?'available':'source-pending',issue:view.history?null:'Série de empreendimentos indisponível.',values:{history:view.history,accumulated:view.accumulated,changes:view.changes}};
    if(!monthly){
      if(page>=41){
        if([41,44,65,70,80,85,86,87,88,89].includes(page))return base;
        if(QUARTERLY_PRICE_PAGES[page])return calculated(buildQuarterlyPrice(page,sources?.prices??null,selection,cities));
        if(page===54||page===72)return calculated(buildQuarterlyIvv(sources?.market??null,selection,cities,page===72));
        const detail=quarterlyTableForPage(page,{selection,cities,data:state.intro,monthlyLaunches:sources,editorial:createFortalezaEditorial()});
        const {points,...aggregates}=detail;return {...calculated(detail),values:{...aggregates,...(points?{locatedProjects:points.length}: {})}};
      }
      if(page===40)return calculated(buildQuarterlyStockTable(sources?.market??null,selection,cities));
      if([16,19,31,32].includes(page))return calculated(buildQuarterlyMunicipalTable(page,sources?.market??null,selection,cities));
      if(page>=11&&page<=39&&![20,23,33,36].includes(page))return calculated(buildQuarterlyLaunchSlide(page,sources?.market??null,state.intro,selection,cities));
      return page<=40?base:{...base,status:'not-implemented',issue:'A continuação trimestral ainda não foi implementada.'};
    }
    if(page===11)return calculated(monthlyProjectLaunches(state.intro,selection,cities));
    if(page===13||page===15)return calculated(monthlyUnitLaunches(sources,selection,cities,page===13?'capital':'rm'));
    if([18,21,29,32,36,39,44,56,57,58,59,60].includes(page))return base;
    if(page<=35)return calculated(buildMonthlySlide(page,sources?.market??null,selection,cities));
    if([37,38,40,41,42,43].includes(page))return calculated(buildPriceSlide(page,sources?.prices??null,selection,cities));
    if(page===45||page===46)return calculated(buildMonthlyIvv(sources?.market??null,selection,cities,page===46));
    if(page>=47&&page<=55){const key=Math.min(page,52);if(!tableCache.has(key))tableCache.set(key,buildOfferTable(key,sources?.market??null,sources?.prices??null,selection,cities));const data=tableCache.get(key)!;return {...calculated(data),values:page>=52?{...data,rows:data.rows.slice((page-52)*14,(page-51)*14),page:page-51,allGroups:data.rows.length}:data};}
    return base;
  });
  const statuses=['available','source-pending','editorial-review','not-implemented'] as const;
  return {schema:'fortaleza-diagnostic-v1',generatedAt:state.finishedAt??new Date(state.startedAt).toISOString(),generationStatus:state.phase,selection:{uf:'CE',city:selection.city,territory:'capital-rm',periodicity:selection.periodicity,year:selection.year,position:selection.position},cities,reference:{file:reference.file,sourceId:reference.sourceId,sha256:reference.sha256,slideCount:reference.slideCount},homologated:false,summary:Object.fromEntries(statuses.map(status=>[status,slides.filter(slide=>slide.status===status).length])),slides,sources:{core:state.report?.provenance??[],intro:state.intro?{status:state.intro.status,requests:state.intro.requests,finishedAt:state.intro.finishedAt,issues:state.intro.issues}:null,municipal:sources?.market?.sources.map(source=>({city:source.city,segment:source.segment,metric:source.metric,complete:source.complete,rows:source.rows.length,requests:source.requests,startedAt:source.startedAt,finishedAt:source.finishedAt,issue:source.issue,coverage:source.coverage??null}))??[],detailed:sources?.prices?.sources.map(source=>({city:source.city,segment:source.segment,complete:source.complete,projects:source.records.length,requests:source.requests,startedAt:source.startedAt,finishedAt:source.finishedAt,issue:source.issue}))??[]},warnings:[...(state.report?.issues??[]),...(sources?.issues??[])],limits:['Diagnóstico de conferência; não equivale a homologação.','Critérios candidatos de INCC, preços, IVV e universo ativo precisam de validação.','A equipe inicial dos slides57–59 pertence à referência de julho/2026.','Nomes, fotos, token e históricos individuais não são exportados.']};
}
