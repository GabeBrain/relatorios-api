import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {rentalSample,rentalSlide} from '../rentals';
import {DATA_DEFINITIONS} from '../blueprint';
import {fixture,selection} from './fixture';
import {diagnostic} from '../diagnostic';
import {calculateSlides} from '../calculate';
import {selectionKey} from '../model';
import {ReportSlide} from '../ReportSlide';
import type {Report} from '../types';
const definition=(n:number)=>DATA_DEFINITIONS.find(d=>d.sourcePage===n)!;
describe('Rental advertisement generation',()=>{
 it('flags later updates without claiming historical listing prices',()=>{
  const sources=fixture(),source=sources.find(s=>s.metric==='rentals')!;source.rows[0].atualizado_em='2026-11-26';
  const slide=rentalSlide(definition(123),selection,sources);
  expect(slide.warnings.join()).toContain('1 anúncio(s) com atualização posterior a 2026-06');
  expect(slide.warnings.join()).toContain('O período seleciona a coleta');
 });
 it('keeps cities separate and computes simple valid-value means, never zero for missing prices',()=>{
  const sources=fixture(),source=sources.find(s=>s.metric==='rentals')!;source.rows[0].preco=null;source.rows[0].preco_metro=null;
  const slide=rentalSlide(definition(123),selection,sources);expect(slide.status).toBe('available');expect(slide.tables).toHaveLength(2);expect(slide.tables[0].rows[0].values).toEqual([2,2000,50,40,1,2,1]);
  expect(slide.warnings.join()).toContain('preço/área ausente');
  const html=renderToStaticMarkup(<ReportSlide page={{slide,table:slide.tables[0],part:1,parts:2}} selection={selection}/>);expect(html).toContain('não são contratos ou estoque histórico ativo');
 });
 it('deduplicates exact listing IDs, rejects conflicting duplicates and excludes dates outside the cohort',()=>{
  const source=fixture().find(s=>s.metric==='rentals')!;source.rows.push({...source.rows[0]},{...source.rows[0],id:3,coletado_em:'2026-03-31'});
  expect(rentalSample(source,'2026-04','2026-06')).toMatchObject({duplicates:1,excluded:{'outside-collection-period':1}});
  source.rows.push({...source.rows[0],preco:999});expect(()=>rentalSample(source,'2026-04','2026-06')).toThrow('conflitante');
 });
 it('distinguishes confirmed empty collection from incomplete or invalid data and exports only aggregate audit',()=>{
  const sources=fixture(),source=sources.find(s=>s.metric==='rentals')!;source.rows=[];expect(rentalSlide(definition(124),selection,sources).tables[0].rows[0].values[0]).toBe(0);
  source.complete=false;const failed=rentalSlide(definition(124),selection,sources);expect(failed.status).toBe('waiting-source');expect(failed.sourceKeys).toContain(`${source.uf}/${source.city}/Vertical/rentals/Empreendimento`);source.complete=true;
  source.rows=[{id:5,cidade:source.city,estado:source.uf,tipo:'Apartamento',tipo_negocio:'ALUGUEL',coletado_em:null,logradouro:'Do not export'}];
  expect(rentalSlide(definition(124),selection,sources).tables[0].rows[0].values[0]).toBeNull();
  const report:Report={schema:'modelo-03-report-v1',selection,key:selectionKey(selection),startedAt:'2026-11-24',finishedAt:'2026-11-24',sources,slides:calculateSlides(selection,sources),errors:[],origin:'Geobrain API',homologated:false};const audit=diagnostic(report);
  expect(audit.sources.find(s=>s.metric==='rentals')!.rentalAudit).toMatchObject({excluded:{'missing-collection-date':1}});expect(JSON.stringify(audit)).not.toContain('Do not export');
 });
});
