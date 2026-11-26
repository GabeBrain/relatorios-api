import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import PptxGenJS from 'pptxgenjs';
import {strFromU8,unzipSync} from 'fflate';
import {calculateReport,physicalPages,highlightText,accumulatedLabel,RANKING_TOP} from '../calculate';
import {citiesFor,REGIONS} from '../model';
import {cityPopulation,statePopulation} from '../population';
import {ReportSlide} from '../ReportSlide';
import {TrendMarks} from '../TrendMarks';
import {addCharts,preserveChartBlanks} from '../native-charts';
import {sectionLines} from '../presentation';
import {diagnostic} from '../diagnostic';
import {fixture,selection,catalogFor} from './fixture';

const started='2026-11-26T12:00:00Z';
const reportFor=(region='sul',catalog=catalogFor(region),s={...selection,region})=>calculateReport(s,citiesFor(s,catalog),[],fixture(s,catalog),started);

describe('Modelo 02 · correção visual das cinco regiões',()=>{
 it('população e % Part. Total usam a população inteira da UF, mesma fonte, ordenação decrescente e ausência ao final',()=>{
  const catalog={PR:['Pinhais','Curitiba','Cidade Inexistente'],SC:['Florianópolis'],RS:['Porto Alegre']},report=reportFor('sul',catalog),scope=report.slides.find(s=>s.id==='scope')!;
  const pr=scope.tables[0].rows.filter(r=>r.values[0]==='PR');
  expect(pr.map(r=>r.label)).toEqual(['Curitiba','Pinhais','Cidade Inexistente']);
  const curitiba=cityPopulation('PR','Curitiba')!.population,state=statePopulation('PR')!.population;
  expect(pr[0].values).toEqual(['PR',curitiba,curitiba/state*100]);
  expect(pr[2].values).toEqual(['PR',null,null]);
  const coverage=scope.tables[1].rows.find(r=>r.label==='PR')!;
  expect(coverage.values[0]).toBe('Paraná');expect(coverage.values[2]).toBe(curitiba+cityPopulation('PR','Pinhais')!.population);expect(coverage.values[4]).toBe(1);
  expect(scope.warnings.join(' ')).toMatch(/Cidade Inexistente \/ PR/);expect(scope.coverage).toBe('partial');
  const html=renderToStaticMarkup(<ReportSlide page={physicalPages([scope])[0]} selection={selection}/>);
  expect(html).toContain('% Part. Total PR');expect(html).toMatch(/\(cobertura(<\/text><text[^>]*>|\s)parcial;/);expect(html).toContain('IBGE, Censo Demográfico 2022');
 });
 it.each(REGIONS)('cidades de $label mantêm todas as linhas do catálogo e todas as UFs autorizadas',region=>{
  const report=reportFor(region.id),scope=report.slides.find(s=>s.id==='scope')!,pages=physicalPages([scope]);
  expect(pages.flatMap(p=>p.table!.rows)).toHaveLength(report.cities.length);
  expect(new Set(pages.flatMap(p=>p.cityColumns!.flat().map(c=>c.uf)))).toEqual(new Set(region.capitals.map(([uf])=>uf)));
  expect(scope.tables[0].rows.every(r=>typeof r.values[1]==='number')).toBe(true);
 });
 it('divide UF extensa em colunas de até 28 linhas, com cobertura só no último bloco',()=>{
  const names=Array.from({length:30},(_,i)=>i===0?'Curitiba':`Inexistente ${i}`),report=reportFor('sul',{PR:names,SC:['Florianópolis'],RS:['Porto Alegre']});
  const columns=physicalPages(report.slides.filter(s=>s.id==='scope')).flatMap(p=>p.cityColumns!).flat().filter(c=>c.uf==='PR');
  expect(columns.map(c=>c.rows.length)).toEqual([28,2]);expect(columns.map(c=>c.last)).toEqual([false,true]);
 },60000);
 it('destaques: títulos completos, rótulos com competência e acumulado parcial sem se passar por ano completo',()=>{
  const report=reportFor(),slide=report.slides.find(s=>s.id==='highlights-MCMV')!;
  expect(slide.title).toBe('Destaques residencial vertical MCMV - Lançamentos, vendas, oferta final');
  expect(slide.presentation!.displayTable!.rows.map(r=>r.label)).toEqual(['3T2025 X 3T2026','2T2026 X 3T2026','JAN–SET/2025 X JAN–SET/2026']);
  expect(accumulatedLabel(2025,'12',true)).toBe('2025');
  const html=renderToStaticMarkup(<ReportSlide page={physicalPages([slide])[0]} selection={selection}/>);
  expect(html).toContain('RESIDENCIAL VERTICAL MCMV');expect(html).toContain('data-native-table');
 });
 it('manchete só fala de comparações válidas; zero não vira crescimento nem queda',()=>{
  const down=highlightText('Sul','','3T2026','3T2025','2T2026',[-8,-5.5],[-0.5,-7.2]);
  expect(down.headline).toBe('Lançamentos e vendas recuam na Região Sul frente ao 3T2025');expect(down.bullets).toEqual(['Comparando o 3T2026 com o 3T2025 e com o 2T2026, nota-se queda nos lançamentos e nas vendas.']);
  const mixed=highlightText('Sul',' de luxo','3T2026','3T2025','2T2026',[12,-3],[1,2]);
  expect(mixed.headline).toBe('Lançamentos de luxo avançam e vendas recuam na Região Sul frente ao 3T2025');expect(mixed.bullets).toHaveLength(2);
  const gap=highlightText('Sul','','3T2026','3T2025','2T2026',[null,null],[0.01,null]);
  expect(gap.headline).toBe('Lançamentos ficam estáveis na Região Sul frente ao 2T2026');expect(gap.bullets[0]).toMatch(/Sem base comparável/);
  expect(highlightText('Sul','','3T2026','3T2025','2T2026',[null,null],[null,null]).headline).toBeUndefined();
 });
 it('setas: verde para alta, vermelha para queda, nenhuma para zero ou indisponível',()=>{
  const report=reportFor(),slide=report.slides.find(s=>s.id==='highlights-Residencial vertical')!;
  slide.presentation!.displayTable!.rows=[{label:'a',values:[5,-5]},{label:'b',values:[0,null]},{label:'c',values:[0.04,-0.04]}];
  const html=renderToStaticMarkup(<ReportSlide page={physicalPages([slide])[0]} selection={selection}/>);
  expect((html.match(/<polygon[^>]*fill="#6aa040"/g)??[]).length).toBe(1);expect((html.match(/<polygon[^>]*fill="#ff0000"/g)??[]).length).toBe(1);expect(html).toContain('—');
 });
 it('série trimestral: colchete e setas usam as mesmas células; lacuna aparece como "Sem dado" e suprime a comparação',()=>{
  const sources=fixture();for(const s of sources.filter(s=>s.metric==='releases'))s.rows=s.rows.filter(r=>!String(r.period).startsWith('2025-08'));
  const report=calculateReport(selection,citiesFor(selection,catalogFor()),[],sources,started),slide=report.slides.find(s=>s.id==='releases-units-quarters')!,trend=slide.presentation!.trend!;
  const rows=slide.tables[0].rows;expect(rows[4].values[0]).toBeNull();expect(trend.annual).toBeNull();expect(trend.quarter).toBe(0);
  const html=renderToStaticMarkup(<svg><TrendMarks charts={slide.presentation!.charts!} trend={trend}/></svg>);
  expect(html).toContain('Sem dado');expect(html).not.toContain('<polyline');expect(html).toContain('data-modelo02-overlay');expect(slide.coverage).toBe('partial');
  const full=reportFor().slides.find(s=>s.id==='sales-money-quarters')!;expect(full.title).toBe('VGV por trimestre (em R$ milhões)');
  const complete=renderToStaticMarkup(<svg><TrendMarks charts={full.presentation!.charts!} trend={full.presentation!.trend!}/></svg>);expect(complete).toContain('<polyline');expect((complete.match(/<polygon/g)??[]).length).toBe(3);
 });
 it('gráfico nativo trimestral usa a mesma área, escala e rótulos internos legíveis da prévia',async()=>{
  const charts=reportFor().slides.find(s=>s.id==='releases-units-quarters')!.presentation!.charts!,pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';addCharts(pptx.addSlide(),charts);
  const zip=unzipSync(preserveChartBlanks(await pptx.write({outputType:'uint8array'}) as Uint8Array)),xml=strFromU8(zip['ppt/charts/chart1.xml']);
  expect(xml).toContain('<c:manualLayout>');expect(xml).toContain(`<c:max val="${charts[0].scaleMax}"/>`);expect(xml).toContain('<c:gapWidth val="70"/>');
  expect(xml).toContain('<a:bodyPr wrap="none"/>');expect(xml).toMatch(/<c:dLbl><c:idx val="0"\/>[\s\S]*?FFFFFF/);expect(xml).toMatch(/<c:dLbl><c:idx val="8"\/>[\s\S]*?273F1C/);
 });
 it('rankings mostram o Top 10 em uma página e preservam todos os municípios na tabela de conferência',()=>{
  const names=Array.from({length:14},(_,i)=>i===0?'Curitiba':`Cidade ${i}`),report=reportFor('sul',{PR:names,SC:['Florianópolis'],RS:['Porto Alegre']}),ranking=report.slides.find(s=>s.id==='ranking-meter')!;
  expect(ranking.tables[0].rows).toHaveLength(16);expect(physicalPages([ranking])).toHaveLength(1);expect(ranking.presentation!.charts![0].table.rows.length).toBeLessThanOrEqual(RANKING_TOP);
  expect(ranking.title).toBe('Maior R$/m² médio | 3T2026');
 });
 it.each(REGIONS)('divisórias de $label usam arte sem título e um único texto por linha',region=>{
  const report=reportFor(region.id);
  for(const id of ['regional-opening','section-highlights','section-releases','section-sales','section-comparison','section-analysis','section-maps']){
   const slide=report.slides.find(s=>s.id===id)!,html=renderToStaticMarkup(<ReportSlide page={physicalPages([slide])[0]} selection={{...selection,region:region.id}}/>);
   for(const line of sectionLines(id,region.label))expect(html.split(`>${line}</text>`).length-1).toBe(1);
   expect(html).not.toContain('width="650" height="325"');
  }
 });
 it('diagnóstico separa disponível parcial e registra a fonte populacional',()=>{
  const sources=fixture(),releases=sources.find(s=>s.city==='Curitiba'&&s.metric==='releases')!;releases.rows=releases.rows.filter(r=>!String(r.period).startsWith('2025-08'));
  const audit=diagnostic(calculateReport(selection,citiesFor(selection,catalogFor()),[],sources,started));
  expect(audit.summary.partial).toBeGreaterThan(0);expect(audit.summary.partialIds).toContain('releases-units-quarters');expect(audit.population.table).toBe('4714');
 });
});
