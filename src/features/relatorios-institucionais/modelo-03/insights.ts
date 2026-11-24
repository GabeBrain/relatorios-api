import {norm,period,geographyMode,studyLabel} from './model';
import {presentationPages} from './presentation';
import type {Report} from './types';
import {reportStandardFamily} from '../shared/standard-families';

export type InsightKind='pending'|'divergence'|'coverage'|'ambiguity'|'method';
export interface AnalystIssue {message:string;kind:InsightKind;slides:number[];referencePages:number[]}
/** Uses the generated report only. Never starts a new collection or reads credentials. */
export function buildModelo03Insights(report:Report){
 const pages=presentationPages(report.slides),issues=new Map<string,AnalystIssue>();
 const add=(message:string,kind:InsightKind,referencePage:number)=>{
  const key=`${kind}/${message}`,old=issues.get(key)??{message,kind,slides:[],referencePages:[]};
  for(let i=0;i<pages.length;i++)if(pages[i].slide.definition.sourcePage===referencePage&&!old.slides.includes(i+1))old.slides.push(i+1);
  if(!old.referencePages.includes(referencePage))old.referencePages.push(referencePage);issues.set(key,old);
 };
 let withWarnings=0,withMissingValues=0;
 for(const slide of report.slides){
  const ref=slide.definition.sourcePage;if(slide.status==='editorial'||slide.status==='not-applicable')continue;
  if(slide.status==='waiting-source')add(slide.issue??'Fonte pendente de conferência.','pending',ref);
  if(slide.warnings.length)withWarnings++;
  if(slide.tables.some(t=>t.rows.some(r=>r.values.some(v=>v===null)))){withMissingValues++;add(`Quadro com células sem valor: ${slide.definition.title}. Conferir cobertura, denominadores e ressalvas; traço não representa zero.`,'coverage',ref);}
  for(const message of slide.warnings){const text=norm(message),kind:InsightKind=/versus|diferenca|ajuste de base|nao reconciliad/.test(text)?'divergence':/ausen|sem cobertura|base parcial|excluid|fotografia|decomposicao|indisponivel/.test(text)?'coverage':/sem classificacao|nao identific|desconhecid|ambigu/.test(text)?'ambiguity':'method';add(message,kind,ref);}
  for(const t of slide.tables)for(const r of t.rows){
   if(!r.label.trim()||/sem (classificacao|padrao|dormitorios|informacao)|nao informado/.test(norm(r.label)))add(`Categoria sem identificação completa: ${r.label.trim()||'rótulo vazio'}. Quadro: ${slide.definition.title}.`,'ambiguity',ref);
   if(slide.definition.group==='standard'&&!['total','sem oferta no recorte','sem cobertura valida'].includes(norm(r.label))&&!reportStandardFamily(r.label))add(`Padrão sem equivalência no agrupamento confirmado: ${r.label}.`,'ambiguity',ref);
  }
 }
 const all=[...issues.values()].map(i=>({...i,slides:i.slides.sort((a,b)=>a-b)}));
 return {period:period(report.selection),geography:{mode:geographyMode(report.selection),label:studyLabel(report.selection)},generatedAt:report.finishedAt,
  summary:{available:report.slides.filter(s=>s.status==='available').length,pending:report.slides.filter(s=>s.status==='waiting-source').length,editorial:report.slides.filter(s=>s.status==='editorial').length,withWarnings,withMissingValues,divergences:all.filter(i=>i.kind==='divergence').length,ambiguities:all.filter(i=>i.kind==='ambiguity').length,sourceFailures:report.sources.filter(s=>!s.complete).length},issues:all,
  sources:report.sources.map(s=>({city:s.city,uf:s.uf,segment:s.segment,metric:s.metric,group:s.group,complete:s.complete,records:s.rows.length,requests:s.requests,failure:s.failure})),
  limits:{homologated:false,interpretation:'Slide disponível pode conter base parcial, ressalvas ou células sem valor. Traço não é zero; ausência de pendência não é homologação.'}};
}
