import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createCalculator,calculateSlides} from '../calculate';
import {DATA_DEFINITIONS} from '../blueprint';
import {standardFamily} from '../classification';
import {surveyCadence} from '../coverage';
import {PRESETS,location,geographyMode,type Selection} from '../model';
import {fixture,selection} from './fixture';
import {auditSource} from '../diagnostic';
import {ReportSlide} from '../ReportSlide';
import {presentationPages} from '../presentation';
import type {Source,Row} from '../types';
const definition=(page:number)=>DATA_DEFINITIONS.find(d=>d.sourcePage===page)!;
function quarterly(sources:Source[],city:string){for(const src of sources.filter(src=>src.city===city)){
 if(src.metric==='details')for(const b of src.rows)b.typologies_history=(b.typologies_history as Row[]).filter(r=>Number(String(r.period).slice(5,7))%3===0).map(r=>({...r,releases_in_period:3,sold_in_period:3}));
 else src.rows=src.rows.filter(r=>Number(String(r.period).slice(5,7))%3===0).map(r=>({...r,releases_in_period:3,liquid_sales:3,vgv_release:1500000,vgv_liquid_sales:1500000}));
}}
describe('Modelo 03 · regressões do diagnóstico Curitiba 3T2026 e recortes dos originais',()=>{
 it('mantém bloqueio da derivação de lançamentos quando a capacidade não reconcilia com a API',()=>{
  const sources=fixture(),detail=sources.find(src=>src.city==='Curitiba'&&src.metric==='details'&&src.segment==='Vertical')!;
  detail.rows[0].release_date='2026-06-01';for(const r of detail.rows[0].typologies_history as Row[])r.releases_in_period=null;
  const slide=createCalculator(selection,sources).evaluate(definition(54));expect(slide.status).toBe('waiting-source');expect(slide.warnings.join()).toContain('não há reconciliação para comprovar');expect(slide.tables[0].rows[0].values.every(v=>v===null)).toBe(true);
 });
 it.each([66,67,68])('preserva fluxo detalhado divergente e a cidade parceira sem inventar categorias no slide %s',page=>{
  const s={...selection,city:'Itajaí',uf:'SC',rmCities:['SC|Navegantes'],position:3},sources=fixture(s),detail=sources.find(src=>src.city==='Itajaí'&&src.metric==='details'&&src.segment==='Vertical')!;
  const rows=detail.rows[0].typologies_history as Row[];rows.find(r=>r.period==='2026-09-01'&&r.typology_id===1)!.sold_in_period=-1;
  const c=createCalculator(s,sources),slide=c.evaluate(definition(page));expect(slide.status).toBe('available');expect(slide.tables.map(t=>t.unit)).toEqual(['Itajaí','Navegantes']);expect(slide.tables[0].rows.at(-1)?.values[0]).toBe(4);expect(slide.tables[1].rows.at(-1)?.values[0]).toBe(6);expect(slide.warnings.join()).toContain('diferença -2');
  expect(c.evaluate(definition(61)).tables[0].rows.at(-1)?.values).toEqual([6,6]);
 });
 it.each([['Compacto','Compactos'],['Econômico','MCMV'],['Standard','Médio Padrão'],['Médio','Médio Padrão'],['Médio-Alto','Médio Padrão'],['Alto','Luxo'],['Luxo','Luxo']])('agrupa %s em %s sem perder unidades', (input,output)=>expect(standardFamily(input)).toBe(output));
 it.each(['quarterly','semiannual'] as const)('aceita Curitiba mensal e RM trimestral na edição %s sem inventar meses zero',periodicity=>{
  const s={...selection,periodicity,position:periodicity==='quarterly'?3:1},sources=fixture(s);quarterly(sources,'Araucária');
  const slides=calculateSlides(s,sources);expect(slides.filter(s=>s.status==='waiting-source').map(s=>[s.definition.sourcePage,s.issue])).toEqual([]);
  expect(createCalculator(s,sources).evaluate(definition(49)).tables[0].rows.at(-1)?.values).toEqual([periodicity==='quarterly'?6:12,periodicity==='quarterly'?6:12]);
  expect(surveyCadence(sources.find(s=>s.city==='Araucária')!).months).toBe(3);
 });
 it('não apresenta o fluxo de um trimestre como valor de um único mês',()=>{
  const s={...selection,periodicity:'monthly' as const,position:6},sources=fixture(s);quarterly(sources,'Araucária');const slide=createCalculator(s,sources).evaluate(definition(49));
  expect(slide.status).toBe('available');expect(slide.tables[0].rows.at(-1)?.values).toEqual([2,null]);expect(slide.warnings.join()).toContain('decomposição mensal');
 });
 it('calcula fluxos por tipologia de uma cidade principal trimestral usando as fotografias trimestrais',()=>{
  const s={...selection,city:'Teresina',uf:'PI',includeRm:false,rmCities:[],position:3},sources=fixture(s);quarterly(sources,'Teresina');
  expect(calculateSlides(s,sources).filter(s=>s.status==='waiting-source').map(s=>[s.definition.sourcePage,s.issue])).toEqual([]);
  expect(createCalculator(s,sources).evaluate(definition(54)).tables[0].rows.at(-1)?.values[0]).toBe(6);
 });
 it('respeita detalhes combinados de Teresina e os bairros identificados por cidade em Natal',()=>{
  const ter={...selection,city:'Teresina',uf:'PI',rmCities:['MA|Timon']},t=createCalculator(ter,fixture(ter)).evaluate(definition(54));expect(t.tables[0].rows.at(-1)?.values[0]).toBe(12);
  const nat={...selection,city:'Natal',uf:'RN',rmCities:['RN|Parnamirim']},c=createCalculator(nat,fixture(nat)),n=c.evaluate(definition(56));
  expect(n.tables[0].rows.map(r=>r.label)).toEqual(['Natal: Centro','Parnamirim: Centro','Total']);expect(n.tables[0].rows.at(-1)?.values[0]).toBe(12);
  expect(c.evaluate(definition(54)).tables[0].rows.at(-1)?.values[0]).toBe(6);
 });
 it('confirma zero pós-esgotamento pelo histórico completo, mas nunca transforma agregado faltante com estoque em zero',()=>{
  const sources=fixture();for(const src of sources.filter(src=>src.city==='Araucária'))if(src.metric==='details')for(const b of src.rows)for(const r of b.typologies_history as Row[]){r.typology_stock=0;r.sold_in_period=0;}else src.rows=src.rows.filter(r=>!String(r.period).startsWith('2026-06'));
  const slide=createCalculator(selection,sources).evaluate(definition(72));expect(slide.status).toBe('available');expect(slide.tables[0].rows.at(-1)?.values).toEqual([80,0]);expect(slide.warnings.join()).toContain('zero confirmado');
 });
 it.each([86,87,88,89,93,94,142])('isola fotografia incompleta sem bloquear todos os municípios no slide %s',page=>{
  const sources=fixture(),src=sources.find(s=>s.city==='Araucária'&&s.segment==='Vertical'&&s.metric==='details')!,bad=structuredClone(src.rows[0]);bad.building_id='incomplete';bad.typologies_history=(bad.typologies_history as Row[]).filter(r=>!(r.period==='2026-06-01'&&r.typology_id===2));src.rows.push(bad);
  const slide=createCalculator(selection,sources).evaluate(definition(page));expect(slide.status).toBe('available');expect(slide.warnings.join()).toContain('excluído');expect(slide.warnings.join()).toContain('base parcial');expect(JSON.stringify(slide.tables)).not.toContain('incomplete');
  const repeat=createCalculator(selection,sources);repeat.evaluate(definition(86));expect(repeat.evaluate(definition(page)).warnings.join()).toContain('excluído');
 });
 it('não chama base totalmente inválida de oferta zero e não aceita duplicata conflitante',()=>{
  const sources=fixture(),src=sources.find(s=>s.city==='Curitiba'&&s.segment==='Vertical'&&s.metric==='details')!,duplicate=structuredClone(src.rows[0]);(duplicate.typologies_history as Row[])[0].price=999;src.rows.push(duplicate);
  const slide=createCalculator(selection,sources).evaluate(definition(87));expect(slide.status).toBe('available');expect(slide.tables[0].rows[0].label).toBe('Sem cobertura válida');expect(slide.tables[0].rows[0].values.every(v=>v===null)).toBe(true);
 });
 it('calcula IVV pela fórmula original com dados observados e registra ajuste de base sem reescrever estoque',()=>{
  const sources=fixture();for(const src of sources.filter(s=>s.city==='Curitiba'&&s.metric==='stock'))for(const r of src.rows)if(r.period==='2026-06-01')r.stock=39;
  const c=createCalculator(selection,sources),series=c.evaluate(definition(76)),grouped=c.evaluate(definition(77));expect(series.status).toBe('available');expect(grouped.status).toBe('available');expect(series.warnings.join()).toContain('ajuste de base');expect(grouped.tables[0].rows[0].values.slice(0,4)).toEqual([40,3,3,39]);expect(grouped.tables[0].rows[0].values[4]).toBeCloseTo(3/43*100);
 });
 it.each(PRESETS)('respeita o modo geográfico de $city confirmado no original',preset=>{
  const s:Selection={...selection,uf:preset.uf,city:preset.city,entity:preset.entity,includeRm:preset.regional!=='city',rmCities:preset.suggestions.map(v=>v.includes('|')?v:`${preset.uf}|${v}`)},sources=fixture(s),c=createCalculator(s,sources),slide=c.evaluate(definition(47));
  expect(slide.status).toBe('available');
  if(preset.regional==='city')expect(slide.tables[0].columns).toEqual([preset.city]);
  else if(preset.regional==='pair'){expect(slide.tables[0].columns).toEqual([preset.city,...s.rmCities.map(v=>location(v,s.uf).city)]);const markup=renderToStaticMarkup(<ReportSlide page={presentationPages([slide])[0]} selection={s}/>);expect(markup).not.toContain('+ RM');expect(markup).toContain(preset.suggestions[0]);}
  else if(preset.id==='joinville'){expect(geographyMode(s)).toBe('combined-cities');expect(slide.tables[0].columns).toEqual(['Joinville e Araquari']);}
  else if(preset.id==='belem'){expect(geographyMode(s)).toBe('named-cities');expect(c.evaluate(definition(49)).tables[0].columns).toEqual(['Belém','Ananindeua','Marituba']);}
  else {expect(geographyMode(s)).toBe('city-and-rm');expect(c.evaluate(definition(49)).tables[0].columns).toEqual([s.city,'RM']);}
 });
 it('não aponta campos de outras métricas como falhas de fonte',()=>{const source=fixture().find(s=>s.metric==='releases')!;source.rows=source.rows.map(r=>({period:r.period,group:r.group,releases_in_period:r.releases_in_period,vgv_release:r.vgv_release}));expect(auditSource(source).missingFields).toEqual({});});
});
