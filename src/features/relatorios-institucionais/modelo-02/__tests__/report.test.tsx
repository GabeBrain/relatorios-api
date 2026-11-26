import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {REGIONS,citiesFor,missingUfs,period,historyStart,periodIssue} from '../model';
import {calculateReport,physicalPages,MAX_MAP_POINTS,mapPartitions} from '../calculate';
import {diagnostic,conferenceCsv} from '../diagnostic';
import {ReportSlide} from '../ReportSlide';
import {capitalMapPlan} from '../map-plan';
import {fixture,selection,catalogFor} from './fixture';
const started='2026-11-26T12:00:00Z';
describe('Modelo 02 regional',()=>{
 it.each(REGIONS)('calcula $label com a fotografia histórica e mapas exclusivamente das capitais',region=>{
  const s={...selection,region:region.id},catalog=catalogFor(region.id),cities=citiesFor(s,catalog),sources=fixture(s,catalog),report=calculateReport(s,cities,[],sources,started);
  expect(report.slides.filter(s=>s.status==='waiting-source')).toEqual([]);
  const current=report.slides.find(s=>s.id==='highlights-Residencial vertical')!.tables[0].rows[0];expect(current.values).toEqual([cities.length*6,cities.length*6,cities.length*80]);
  const maps=report.slides.filter(s=>s.kind==='map');expect(maps).toHaveLength(region.capitals.length);expect(maps.every(s=>s.map?.points[0].stock===80)).toBe(true);
  expect(maps.map(s=>s.map?.city.city)).toEqual(region.capitals.map(([,city])=>city));
  expect(report.slides.find(s=>s.id==='meter-states')!.tables[0].rows.every(r=>r.values[0]===10000)).toBe(true);
  expect(physicalPages(report.slides)[0].slide.kind).toBe('cover');expect(physicalPages(report.slides).at(-1)?.slide.kind).toBe('closing');
 });
 it('limita o catálogo às UFs da região, mantendo cidades não capitais nos indicadores mas fora dos mapas',()=>{
  const catalog={...catalogFor(),PR:['Curitiba','Pinhais'],SP:['São Paulo']},cities=citiesFor(selection,catalog),report=calculateReport(selection,cities,[],fixture(selection,catalog),started);
  expect(cities.map(c=>c.city)).toContain('Pinhais');expect(cities.some(c=>c.uf==='SP')).toBe(false);
  expect(report.slides.filter(s=>s.map).some(s=>s.map?.city.city==='Pinhais')).toBe(false);
  expect(report.slides.find(s=>s.id==='highlights-Residencial vertical')!.tables[0].rows[0].values[2]).toBe(320);
 });
 it('pagina capital grande sem descartar, repetir ou deslocar empreendimentos',()=>{
  const catalog=catalogFor(),sources=fixture(),src=sources.find(s=>s.city==='Curitiba'&&s.metric==='details')!,original=src.rows[0];
  src.rows=Array.from({length:MAX_MAP_POINTS+5},(_,i)=>({...structuredClone(original),building_id:`project-${i}`,name:`Projeto ${i}`,latitude:-25+i*.001,longitude:-49+i*.001}));
  const report=calculateReport(selection,citiesFor(selection,catalog),[],sources,started),maps=report.slides.flatMap(s=>s.map?.city.city==='Curitiba'?[s.map]:[]),points=maps.flatMap(m=>m.points);
  expect(maps).toHaveLength(2);expect(points).toHaveLength(MAX_MAP_POINTS+5);expect(new Set(points.map(p=>p.id)).size).toBe(MAX_MAP_POINTS+5);expect(points[0].latitude).toBe(-25);expect(maps[0].parts).toBe(2);
 });
 it('expõe coordenadas inválidas e não substitui capital sem acesso por município da RM',()=>{
  const catalog={PR:['Pinhais'],SC:['Florianópolis'],RS:['Porto Alegre']},sources=fixture(selection,catalog),src=sources.find(s=>s.city==='Florianópolis'&&s.metric==='details')!;src.rows[0].latitude=0;src.rows[0].longitude=0;
  const report=calculateReport(selection,citiesFor(selection,catalog),[],sources,started);
  expect(report.slides.find(s=>s.id==='map-PR-missing')?.status).toBe('waiting-source');
  const map=report.slides.find(s=>s.map?.city.city==='Florianópolis')!.map!;expect(map.missingCoordinates).toBe(1);expect(map.points).toEqual([]);
 });
 it('abre continuações para uma cidade geograficamente extensa mesmo com menos de 60 pontos',()=>{
  const points=Array.from({length:20},(_,i)=>({id:String(i),name:String(i),latitude:-25+i*.02,longitude:-49,stock:1,family:'MCMV'})),parts=mapPartitions(points);
  expect(parts.length).toBeGreaterThan(1);expect(parts.flat()).toHaveLength(20);expect(parts.flat().map(p=>p.latitude)).toEqual(points.map(p=>p.latitude));
 });
 it('enquadra os pontos em mapa largo sem cortar tiles ou forçar coordenadas para bordas',()=>{
  const points=Array.from({length:60},(_,i)=>({latitude:-25.5+i*.001,longitude:-49.3+i*.001})),plan=capitalMapPlan(points,'synthetic')!;
  expect(plan.columns).toBe(4);expect(plan.rows).toBe(2);expect(plan.tiles).toHaveLength(8);expect(points.every(point=>{const p=plan.positionOf(point);return p.left>0&&p.left<100&&p.top>0&&p.top<100;})).toBe(true);expect(plan.tiles.every(t=>t.url.includes(`/${plan.zoom}/${t.x}/${t.y}?`))).toBe(true);
 });
 it('fonte não concluída não vira zero e mantém a chave da pendência',()=>{
  const catalog=catalogFor(),sources=fixture(),failed=sources.find(s=>s.city==='Curitiba'&&s.metric==='releases')!;failed.complete=false;failed.failure='Fonte não concluída (HTTP 503).';
  const report=calculateReport(selection,citiesFor(selection,catalog),[],sources,started),slide=report.slides.find(s=>s.id==='highlights-Residencial vertical')!;
  expect(slide.tables[0].rows[0].values[0]).toBeNull();expect(slide.warnings.join(' ')).toMatch(/não concluída/);expect(slide.sourceKeys).toContain('PR/Curitiba/Vertical/releases/Padrão');
 });
 it.each(REGIONS)('região $label com coleta comprovadamente vazia mostra zero e preço sem base, sem falso bloqueio',region=>{
  const s={...selection,region:region.id},catalog=catalogFor(region.id),sources=fixture(s,catalog);sources.forEach(source=>{source.rows=[];});const report=calculateReport(s,citiesFor(s,catalog),[],sources,started);
  expect(report.slides.filter(s=>s.status==='waiting-source')).toEqual([]);expect(report.slides.find(s=>s.id==='stock-Padrão')!.tables[0].rows[0].values[0]).toBe(0);expect(report.slides.find(s=>s.id==='meter-states')!.tables[0].rows.every(r=>r.values[0]===null&&r.values[3]===0)).toBe(true);
 });
 it('mantém no quadro de lançamentos uma categoria que não aparece na série de estoque',()=>{
  const sources=fixture();for(const source of sources.filter(s=>s.metric==='releases'))for(const row of source.rows)if(row.group==='MCMV')row.group='Padrão apenas lançado';
  const report=calculateReport(selection,citiesFor(selection,catalogFor()),[],sources,started);expect(report.slides.find(s=>s.id==='releases-units-standards')!.tables[0].rows.find(r=>r.label==='Padrão apenas lançado')?.values[0]).toBe(9);
 });
 it('conserva padrão desconhecido e a equivalência global no diagnóstico',()=>{
  const catalog=catalogFor(),sources=fixture();for(const s of sources.filter(s=>s.group==='Padrão'))for(const r of s.rows)if(r.group==='Standard')r.group='Categoria nova';
  const report=calculateReport(selection,citiesFor(selection,catalog),[],sources,started);expect(report.slides.find(s=>s.id==='stock-Padrão')!.tables[0].rows.some(r=>r.label==='Categoria nova')).toBe(true);
  expect(diagnostic(report).criteria.families.Luxo).toEqual(['Alto','Luxo']);
 });
 it('JSON completo agrega sem cadastro bruto; CSV inclui cada localização e protege fórmulas',()=>{
  const catalog=catalogFor(),sources=fixture(),report=calculateReport(selection,citiesFor(selection,catalog),[],sources,started),audit=diagnostic(report),json=JSON.stringify(audit);
  expect(audit.summary.available+audit.summary.waiting).toBe(audit.summary.positions);expect(audit.selection.month).toBe(9);expect(audit.sources.every(s=>s.requiredMonths.length>0)).toBe(true);
  for(const forbidden of ['PRIVATE_NAME_DO_NOT_EXPORT','PRIVATE_ADDRESS','private-id','typologies_history','Bearer'])expect(json).not.toContain(forbidden);
  report.slides.find(s=>s.map)!.map!.points[0].name='=malicioso';const csv=conferenceCsv(report);expect(csv).toContain("'=malicioso");expect(csv).toContain('latitude');expect(csv).toContain('agregado');
 });
 it('mês é o encerramento do trimestre e competência futura é recusada',()=>{
  expect(period({...selection,quarter:2})).toMatchObject({start:'2026-04',end:'2026-06'});expect(periodIssue({...selection,quarter:4},new Date('2026-11-26T12:00:00Z'))).toMatch(/encerrado/);expect(missingUfs(selection,{PR:['Curitiba']})).toEqual(['SC','RS']);
 });
 it('consulta a janela necessária e não fabrica zeros em comparativos anteriores a 2021',()=>{
  expect(historyStart(selection)).toBe('2024-10');const s={...selection,year:2021,quarter:1},catalog=catalogFor(),report=calculateReport(s,citiesFor(s,catalog),[],fixture(s,catalog),started);
  expect(historyStart(s)).toBe('2021-01');expect(report.slides.find(s=>s.id==='annual-state-comparison')!.tables[0].rows.every(r=>r.values[1]===null&&r.values[3]===null&&r.values[5]===null)).toBe(true);
 });
 it('renderiza capa regional com competência editável e continuações com mesma numeração física',()=>{
  const report=calculateReport(selection,citiesFor(selection,catalogFor()),[],fixture(),started),pages=physicalPages(report.slides),html=renderToStaticMarkup(<ReportSlide page={pages[0]} selection={selection}/>);
  expect(html).toContain('3º TRIMESTRE/2026');expect(html).toContain('Região Sul');expect(html).toContain('<text');expect(pages.every(p=>p.table===null||p.table.rows.length<=12)).toBe(true);
 });
});
