import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createCalculator,calculateSlides} from '../calculate';
import {DATA_DEFINITIONS,EXTERNAL_PAGES} from '../blueprint';
import {fixture,selection} from './fixture';
import {PRESETS,selectionKey,type Selection} from '../model';
import {deferredSourceInventory} from '../source-inventory';
import {diagnostic,conferenceCsv} from '../diagnostic';
import {presentationPages} from '../presentation';
import {ReportSlide} from '../ReportSlide';
import Insights from '../Modelo03Insights';
import {surveyCadence} from '../coverage';
import type {Report,Row} from '../types';

const def=(page:number)=>DATA_DEFINITIONS.find(d=>d.sourcePage===page)!;
describe('Modelo 03 · varredura de fontes e disponibilidade',()=>{
 it.each(PRESETS)('percorre três periodicidades de $city com recorte próprio e fontes completas',preset=>{
  for(const periodicity of ['monthly','quarterly','semiannual'] as const){
   const s:Selection={...selection,city:preset.city,uf:preset.uf,entity:preset.entity,includeRm:preset.regional!=='city',rmCities:preset.suggestions.map(c=>c.includes('|')?c:`${preset.uf}|${c}`),periodicity,position:periodicity==='monthly'?6:periodicity==='quarterly'?2:1};
   const slides=calculateSlides(s,fixture(s));
   expect(slides.filter(slide=>slide.status==='waiting-source').map(slide=>[slide.definition.sourcePage,slide.issue])).toEqual([]);
   for(const slide of slides)for(const table of slide.tables)for(const row of table.rows){expect(row.values).toHaveLength(table.columns.length);for(const value of row.values)if(typeof value==='number')expect(Number.isFinite(value)).toBe(true);}
   expect(presentationPages(slides).every(page=>page.part<=page.parts)).toBe(true);
  }
 });
 it('não usa uma RM desativada com seleção antiga nos detalhes combinados',()=>{
  const s:Selection={...selection,city:'Teresina',uf:'PI',includeRm:false,rmCities:['MA|Timon']};
  const slide=createCalculator(s,fixture(s)).evaluate(def(54));
  expect(slide.status).toBe('available');expect(slide.tables[0].rows.at(-1)?.values[0]).toBe(6);
  expect(slide.sourceKeys.some(key=>key.includes('Timon'))).toBe(false);
 });
 it('marca como pendente o quadro inteiramente sem fonte e preserva a rastreabilidade',()=>{
  const s={...selection,includeRm:false,rmCities:[]},sources=fixture(s);
  sources.find(source=>source.metric==='stock'&&source.group==='Padrão')!.complete=false;
  const slide=createCalculator(s,sources).evaluate(def(72));
  expect(slide.status).toBe('waiting-source');expect(slide.issue).toContain('fonte não concluída');expect(slide.sourceKeys).toContain('PR/Curitiba/Vertical/stock/Padrão');
  expect(slide.tables[0].rows.every(row=>row.values.every(value=>value===null))).toBe(true);
  const markup=renderToStaticMarkup(<ReportSlide page={presentationPages([slide])[0]} selection={s}/>);
  expect(markup).toContain('Aguardando fonte');expect(markup).not.toContain('Variação sobre período anterior');
 });
 it('mantém quantidades quando só a média de preço está ausente e distingue ausência total',()=>{
  const s={...selection,includeRm:false,rmCities:[]},sources=fixture(s);
  const detail=sources.find(source=>source.metric==='details'&&source.segment==='Vertical')!;
  for(const row of detail.rows[0].typologies_history as Row[]){row.price=null;row.price_private_area=null;}
  const calculator=createCalculator(s,sources),price=calculator.evaluate(def(80)),ticket=calculator.evaluate(def(86));
  expect(price.status).toBe('waiting-source');expect(price.issue).toContain('indisponível');
  expect(ticket.status).toBe('available');expect(ticket.tables[0].rows.at(-1)?.values).toEqual([null,80]);
 });
 it('não usa a cadência mensal posterior para invalidar uma edição histórica trimestral',()=>{
  const current:Selection={...selection,city:'Teresina',uf:'PI',includeRm:false,rmCities:[],position:4},sources=fixture(current);
  const keep=(row:Row)=>String(row.period)>='2026-01'||Number(String(row.period).slice(5,7))%3===0;
  for(const source of sources){
   if(source.metric==='details')for(const building of source.rows)building.typologies_history=(building.typologies_history as Row[]).filter(keep).map(row=>({...row,releases_in_period:String(row.period)<'2026-01'?3:1,sold_in_period:String(row.period)<'2026-01'?3:1}));
   else source.rows=source.rows.filter(keep).map(row=>({...row,releases_in_period:String(row.period)<'2026-01'?3:1,liquid_sales:String(row.period)<'2026-01'?3:1}));
  }
  const details=sources.find(source=>source.metric==='details'&&source.segment==='Vertical')!;
  expect(surveyCadence(details).months).toBe(1);expect(surveyCadence(details,'2025-06').months).toBe(3);
  const slide=createCalculator({...current,year:2025,position:2},sources).evaluate(def(54));
  expect(slide.status).toBe('available');expect(slide.tables[0].rows.at(-1)?.values[0]).toBe(6);
 });
 it('expõe todas as 45 posições externas omitidas nos insights e nos arquivos sem inventar endpoint',()=>{
  const inventory=deferredSourceInventory();expect(inventory.map(item=>item.referencePage)).toEqual(EXTERNAL_PAGES);expect(inventory).toHaveLength(45);
  const comparison=inventory.find(item=>item.referencePage===128)!;expect(comparison.endpoint).toBeNull();expect(comparison.reason).toContain('lado de usados');
  const sources=fixture(),report:Report={schema:'modelo-03-report-v1',selection,key:selectionKey(selection),startedAt:'2026-11-25',finishedAt:'2026-11-25',sources,slides:calculateSlides(selection,sources),errors:[],origin:'Geobrain API',homologated:false};
  expect(diagnostic(report).analystInsights.deferredSources).toEqual(inventory);
  expect(conferenceCsv(report)).toContain('fonte-não-integrada');expect(conferenceCsv(report)).toContain('Comparativo novos x usados');
  const markup=renderToStaticMarkup(<Insights report={report} onOpenSlide={()=>{}}/>);expect(markup).toContain('Fontes ainda não integradas (');expect(markup).toContain('Comparativo novos x usados');
 });
});
