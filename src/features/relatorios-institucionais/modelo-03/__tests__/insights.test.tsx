import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {calculateSlides} from '../calculate';
import {buildModelo03Insights} from '../insights';
import Insights from '../Modelo03Insights';
import {diagnostic} from '../diagnostic';
import {selectionKey} from '../model';
import type {Report} from '../types';
import {selection,fixture} from './fixture';
function report():Report {const sources=fixture();return {schema:'modelo-03-report-v1',selection,key:selectionKey(selection),startedAt:'2026-11-24T12:00:00Z',finishedAt:'2026-11-24T12:01:00Z',sources,slides:calculateSlides(selection,sources),errors:[],origin:'Geobrain API',homologated:false};}
describe('Insights do Modelo 03',()=>{
 it('liga diverg?ncias ?s p?ginas f?sicas e exporta a mesma an?lise no JSON',()=>{
  const r=report(),slide=r.slides.find(s=>s.status==='available')!;
  slide.warnings.push('Itaja?: vendas detalhadas 825 versus municipal 827 (diferen?a -2).');
  const view=buildModelo03Insights(r),issue=view.issues.find(i=>i.message.includes('825'))!;
  expect(issue.kind).toBe('divergence');expect(issue.slides.length).toBeGreaterThan(0);expect(issue.referencePages).toEqual([slide.definition.sourcePage]);
  expect(diagnostic(r).analystInsights).toEqual(view);
 });
 it('distingue aus?ncia de valor, zero e categoria amb?gua sem nova consulta',()=>{
  const r=report(),slide=r.slides.find(s=>s.status==='available'&&s.tables.length)!;
  slide.tables[0].rows=[{label:'Sem classificação',values:[null,0]}];
  const v=buildModelo03Insights(r);expect(v.summary.withMissingValues).toBeGreaterThan(0);expect(v.summary.ambiguities).toBeGreaterThan(0);expect(v.limits.homologated).toBe(false);
  const html=renderToStaticMarkup(<Insights report={r} onOpenSlide={()=>{}}/>);
  for(const text of ['Critérios utilizados','INCC-DI','MCMV','Econômico','Divergências dos dados','Ambiguidades e classificações','Fontes consultadas','Slide '])expect(html).toContain(text);
 });
});
