import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {calculateSlides,createCalculator} from '../calculate';
import {diagnostic,conferenceCsv} from '../diagnostic';
import {period,periodIssue,scopeIssue,PRESETS,selectionKey,regionalOptions,regionalDefaults,regionalMissing} from '../model';
import {DATA_DEFINITIONS,DEFINITIONS,DEFINITIONS_FOR} from '../blueprint';
import {presentationPages} from '../presentation';
import {ReportSlide} from '../ReportSlide';
import type {Report} from '../types';
import {selection,fixture} from './fixture';
function report():Report{const sources=fixture();return {schema:'modelo-03-report-v1',selection,key:selectionKey(selection),startedAt:'2026-11-24T12:00:00Z',finishedAt:'2026-11-24T12:01:00Z',sources,slides:calculateSlides(selection,sources),errors:[],origin:'Geobrain API',homologated:false};}
describe('Modelo 03 · recortes, períodos e integridade',()=>{
 it('pré-seleciona os dez municípios ADEMI-PR autorizados e permite ampliar dentro da RMC',()=>{
  const cities=PRESETS.find(p=>p.id==='curitiba')!.suggestions,catalog={PR:['Curitiba',...cities,'Quatro Barras','Londrina'],MA:['Timon']};
  expect(regionalDefaults('PR','Curitiba',catalog)).toHaveLength(10);
  expect(regionalOptions('PR','Curitiba',catalog).map(o=>o.value)).toContain('PR|Quatro Barras');
  expect(regionalOptions('PR','Curitiba',catalog).map(o=>o.value)).not.toContain('PR|Londrina');
  expect(regionalOptions('PR','Curitiba',catalog).map(o=>o.value)).not.toContain('MA|Timon');
  expect(scopeIssue({...selection,rmCities:['PR|Londrina']},catalog)).toContain('recorte regional');
 });
 it('explicita municípios da referência sem acesso e nunca inventa RM pela UF',()=>{
  expect(regionalDefaults('PR','Curitiba',{PR:['Curitiba','Araucária']})).toEqual(['PR|Araucária']);
  expect(regionalMissing('PR','Curitiba',{PR:['Curitiba','Araucária']})).toHaveLength(9);
  expect(regionalOptions('PR','Londrina',{PR:['Londrina','Curitiba']})).toEqual([]);
 });
 it('mantém os recortes regionais e os pares dos originais, com Timon na referência de Teresina',()=>{
  for(const p of PRESETS.filter(p=>p.regional!=='city')){
   const catalog:Record<string,string[]>={[p.uf]:[p.city]};
   for(const v of p.suggestions){const [uf,city]=v.includes('|')?v.split('|'):[p.uf,v];(catalog[uf]??=[]).push(city);}
   expect(regionalDefaults(p.uf,p.city,catalog)).toHaveLength(p.suggestions.length);
   expect(scopeIssue({...selection,uf:p.uf,city:p.city,rmCities:regionalDefaults(p.uf,p.city,catalog)},catalog)).toBeNull();
  }
  expect(regionalDefaults('PI','Teresina',{PI:['Teresina'],MA:['Timon']})).toEqual(['MA|Timon']);
 });
 it('preserva as 58 posições de indicadores e 39 editoriais da referência',()=>{expect(DATA_DEFINITIONS).toHaveLength(58);expect(DEFINITIONS).toHaveLength(97);expect(PRESETS).toHaveLength(16);expect(new Set(DEFINITIONS.map(d=>d.sourcePage)).size).toBe(97);expect(DEFINITIONS.some(d=>d.sourcePage>=9&&d.sourcePage<=24)).toBe(false);});
 it.each([['monthly',5,'2026-05','2026-05'],['quarterly',2,'2026-04','2026-06'],['semiannual',1,'2026-01','2026-06']] as const)('calcula janela %s', (periodicity,position,start,end)=>{expect(period({...selection,periodicity,position})).toMatchObject({start,end});});
 it('bloqueia competências abertas, inválidas e recortes sem acesso',()=>{expect(periodIssue({...selection,position:4},new Date('2026-11-24T12:00:00Z'))).toBeTruthy();expect(periodIssue({...selection,position:5})).toBeTruthy();expect(scopeIssue(selection,{PR:['Curitiba']})).toBeTruthy();expect(scopeIssue({...selection,rmCities:['PR|Curitiba']},{PR:['Curitiba']})).toBeTruthy();expect(scopeIssue({...selection,includeRm:false},null)).toBeTruthy();});
 it('aceita RM interestadual autorizada sem repetir a principal',()=>{const s={...selection,city:'Teresina',uf:'PI',rmCities:['MA|Timon']};expect(scopeIssue(s,{PI:['Teresina'],MA:['Timon']})).toBeNull();expect(scopeIssue({...s,rmCities:['MA|Timon','MA|Timon']},{PI:['Teresina'],MA:['Timon']})).toBeTruthy();});
 it('calcula todas as 58 posições com fontes completas e balanço reconciliado',()=>{const r=report();expect(r.slides.filter(s=>s.status==='waiting-source').map(s=>[s.definition.sourcePage,s.issue])).toEqual([]);expect(r.slides.filter(s=>s.status==='available')).toHaveLength(58);});
 it.each([['monthly',6],['semiannual',1]] as const)('calcula as 58 posições na edição %s sem exigir estoque anterior à cobertura', (periodicity,position)=>{const s={...selection,periodicity,position},slides=calculateSlides(s,fixture(s));expect(slides.filter(s=>s.status==='waiting-source').map(s=>[s.definition.sourcePage,s.issue])).toEqual([]);expect(slides.filter(s=>s.status==='available')).toHaveLength(58);});
 it('não soma a cidade principal novamente na RM',()=>{const r=report(),slide=r.slides.find(s=>s.definition.sourcePage===72)!;expect(slide.tables[0].columns).toEqual(['Curitiba','RM']);expect(slide.tables[0].rows.at(-1)?.values).toEqual([80,80]);});
 it('preserva erro de fonte e cobertura ausente sem apagar o território com dados',()=>{const sources=fixture();sources.find(s=>s.city==='Curitiba'&&s.metric==='stock'&&s.group==='Padrão')!.complete=false;const failed=createCalculator(selection,sources).evaluate(DATA_DEFINITIONS.find(d=>d.sourcePage===72)!);expect(failed.status).toBe('available');expect(failed.tables[0].rows.at(-1)?.values).toEqual([null,80]);expect(failed.sourceKeys).toContain('PR/Curitiba/Vertical/stock/Padrão');expect(failed.warnings.join()).toContain('fonte não concluída');const missing=fixture();missing.find(s=>s.city==='Curitiba'&&s.metric==='stock'&&s.group==='Padrão')!.rows=missing.find(s=>s.city==='Curitiba'&&s.metric==='stock'&&s.group==='Padrão')!.rows.filter(r=>!String(r.period).startsWith('2026-06'));const partial=createCalculator(selection,missing).evaluate(DATA_DEFINITIONS.find(d=>d.sourcePage===72)!);expect(partial.status).toBe('available');expect(partial.tables[0].rows.at(-1)?.values[0]).toBeNull();expect(partial.warnings.join()).toContain('ausentes');});
 it('não usa preço cadastral para substituir preço histórico ausente',()=>{const sources=fixture(),b=sources.find(s=>s.city==='Curitiba'&&s.metric==='details'&&s.segment==='Vertical')!.rows[0];b.price=99999999;for(const r of b.typologies_history as Record<string,unknown>[])if(r.period==='2026-06-01')r.price=null;const partial=createCalculator(selection,sources).evaluate(DATA_DEFINITIONS.find(d=>d.sourcePage===87)!);expect(partial.status).toBe('available');expect(partial.tables[0].rows.at(-1)?.values[0]).toBeNull();expect(partial.warnings.join()).toContain('nenhum pre\u00e7o cadastral'.replace('\u00e7','ç'));});
 it('identifica INCC-DI e bloqueia base monetária ausente sem afetar quantidades',()=>{const c=createCalculator(selection,fixture(),{});expect(c.evaluate(DATA_DEFINITIONS.find(d=>d.sourcePage===57)!).issue).toContain('INCC-DI');expect(c.evaluate(DATA_DEFINITIONS.find(d=>d.sourcePage===49)!).status).toBe('available');});
 it('não inventa IVV de zero por cento quando não existe oferta no denominador',()=>{const sources=fixture();for(const source of sources.filter(s=>s.metric!=='details'))for(const row of source.rows){row.stock=0;row.releases_in_period=0;row.liquid_sales=0;}const slide=createCalculator(selection,sources).evaluate(DATA_DEFINITIONS.find(d=>d.sourcePage===76)!);expect(slide.status).toBe('available');expect(slide.tables[0].rows.every(r=>r.values[0]===null)).toBe(true);});
 it('agrupa Econômico em MCMV conforme confirmação explícita para o Modelo 03',()=>{const sources=fixture();for(const s of sources)for(const r of s.rows)if(r.group==='MCMV')r.group='Econômico';const result=createCalculator(selection,sources).evaluate(DATA_DEFINITIONS.find(d=>d.sourcePage===52)!);expect(result.status).toBe('available');expect(result.warnings.join()).toContain('agrupamento confirmado');});
 it('conserva divergência municipal/detalhado na auditoria',()=>{const sources=fixture();for(const s of sources.filter(s=>s.city==='Curitiba'&&s.metric==='stock'))for(const r of s.rows)r.stock=39;const slide=createCalculator(selection,sources).evaluate(DATA_DEFINITIONS.find(d=>d.sourcePage===92)!);expect(slide.status).toBe('available');expect(slide.warnings.join()).toContain('detalhado 80 versus municipal 78');});
 it('exporta todos os indicadores e agregados sem cadastro individual ou segredo',()=>{const r=report(),json=JSON.stringify(diagnostic(r)),csv=conferenceCsv(r);for(const secret of ['private-id','Private project name','Private address','Authorization','Bearer']){expect(json).not.toContain(secret);expect(csv).not.toContain(secret);}const audit=diagnostic(r);expect(audit.summary).toEqual({total:97,available:58,waitingSource:0,editorial:39,notApplicable:0});expect(audit.sources[0].observations.length).toBeGreaterThan(0);expect(csv).toContain('fonte-agregada');expect(audit.criteria.monetarySeries).toBe('INCC-DI');});
 it('mantém zero observado e null distinto nos arquivos de conferência',()=>{const r=report();r.slides[0].tables=[{columns:['Zero','Ausente'],rows:[{label:'=HYPERLINK("bad")',values:[0,null]}],formats:['count','count'],unit:'unidades'}];const csv=conferenceCsv(r);expect(csv).toContain('"0"');expect(csv).toContain("'=HYPERLINK");expect(diagnostic(r).slides[0].tables[0].rows[0].values).toEqual([0,null]);});
 it('pagina tabelas longas sem descartar valores e remove apenas RM não selecionada',()=>{const r=report();r.slides[0].tables=[{columns:['Valor'],rows:Array.from({length:35},(_,i)=>({label:String(i),values:[i]})),formats:['count'],unit:'unidades'}];const pages=presentationPages([r.slides[0]]);expect(pages).toHaveLength(3);expect(pages.flatMap(p=>p.table!.rows)).toHaveLength(35);expect(DEFINITIONS_FOR(false).some(d=>d.rmOnly)).toBe(false);});
 it('renderiza capa parametrizada e indicador sem vazamento da cidade de referência',()=>{const r=report(),s={...selection,city:'Blumenau',entity:'SINDUSCON Blumenau'};const markup=renderToStaticMarkup(<ReportSlide page={presentationPages(r.slides)[0]} selection={s}/>);expect(markup).toContain('BLUMENAU');expect(markup).not.toContain('CURITIBA');expect(markup).toContain('SINDUSCON Blumenau');expect(markup).not.toContain('NaN');});
});
