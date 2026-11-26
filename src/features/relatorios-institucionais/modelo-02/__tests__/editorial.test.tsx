import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import PptxGenJS from 'pptxgenjs';
import {strFromU8,unzipSync} from 'fflate';
import {calculateReport,physicalPages} from '../calculate';
import {citiesFor,REGIONS} from '../model';
import {diagnostic,conferenceCsv} from '../diagnostic';
import {regionalReference,institutionalApproved} from '../presentation';
import {addCharts,preserveChartBlanks} from '../native-charts';
import {Chart} from '../Chart';
import {mapPriceBand} from '../map-price-bands';
import {fixture,selection,catalogFor} from './fixture';

const reportFor=(region='sul')=>{const s={...selection,region},catalog=catalogFor(region);return calculateReport(s,citiesFor(s,catalog),[],fixture(s,catalog),'2026-11-26');};
describe('Modelo 02 · contrato editorial regional',()=>{
 it.each(REGIONS)('reconcilia todas as posições do original $label, exclusões e continuações',region=>{
  const report=reportFor(region.id),audit=diagnostic(report),reference=regionalReference(report.selection);
  expect(reference.slides).toHaveLength(region.referenceSlides);
  expect(audit.editorial?.filter(r=>r.action==='excluded-explicitly').map(r=>r.referenceNumber)).toEqual([8,9]);
  expect(audit.editorial?.filter(r=>r.action==='pending')).toEqual([]);
  expect(report.slides.map(s=>s.referenceNumber)).toEqual([...report.slides.map(s=>s.referenceNumber)].sort((a,b)=>a!-b!));
  expect(report.slides.findIndex(s=>s.id==='section-releases')).toBeGreaterThan(report.slides.findIndex(s=>s.id==='highlights-Luxo'));
  expect(report.slides.findIndex(s=>s.id==='section-maps')).toBeGreaterThan(report.slides.findIndex(s=>s.id==='ranking-meter'));
  expect(audit.institutionalApproval?.edition).toBe('3T2026');
 });
 it('não estende aprovação institucional a outras edições',()=>{
  expect(institutionalApproved(selection)).toBe(true);expect(institutionalApproved({...selection,quarter:4})).toBe(false);
 });
 it('mantém nove trimestres e os mesmos meses nos acumulados parciais',()=>{
  const report=reportFor(),slide=report.slides.find(s=>s.id==='releases-units-quarters')!,charts=slide.presentation!.charts!;
  expect(charts[0].table.rows.map(r=>r.label)).toEqual(['3T2024','4T2024','1T2025','2T2025','3T2025','4T2025','1T2026','2T2026','3T2026']);
  expect(charts[1].table.rows.map(r=>r.label)).toEqual(['Jan–Set/2025','Jan–Set/2026']);
  expect(charts[1].table.rows.map(r=>r.values[0])).toEqual([54,54]);
 });
 it('preserva área empilhada, categoria desconhecida e lacuna sem trocar por tabela ou zero',()=>{
  const sources=fixture();for(const source of sources.filter(s=>s.metric==='releases')){source.rows=source.rows.filter(r=>!String(r.period).startsWith('2026-08'));for(const row of source.rows)if(row.group==='Standard')row.group='Padrão novo';}
  const report=calculateReport(selection,citiesFor(selection,catalogFor()),[],sources,'2026-11-26'),slide=report.slides.find(s=>s.id==='releases-units-standards')!,page=physicalPages([slide])[0],chart=page.charts[0];
  expect(page.table).toBeNull();expect(chart.kind).toBe('stacked-area');expect(chart.table.columns).toContain('Padrão novo');
  expect(chart.table.rows.at(-1)?.values.every(v=>v===null)).toBe(true);
  expect(renderToStaticMarkup(<Chart chart={chart}/>)).toContain('Sem dado');
  expect(conferenceCsv(report)).toContain('Padrão novo');
 });
 it('recompõe cidades em blocos UF e separa os preços do Nordeste em duas páginas',()=>{
  const report=reportFor('nordeste');expect(physicalPages(report.slides).filter(p=>p.slide.id==='meter-states').map(p=>p.charts[0].table.rows.length)).toEqual([9]);expect(report.slides.find(s=>s.id==='meter-capitals')?.referenceNumber).toBe(40);expect(report.slides.find(s=>s.id==='meter-capitals')?.tables[0].rows.map(r=>r.label).sort()).toEqual(['Maceió/AL','Salvador/BA','Fortaleza/CE','São Luís/MA','João Pessoa/PB','Recife/PE','Teresina/PI','Natal/RN','Aracaju/SE'].sort());
  expect(physicalPages(reportFor().slides).filter(p=>p.slide.id==='scope')).toHaveLength(1);
  expect(reportFor('norte').slides.some(s=>s.id==='ranking-Luxo')).toBe(false);
 });
 it('exporta gráficos nativos com workbook e lacunas em branco no cache',async()=>{
  const report=reportFor(),chart=report.slides.find(s=>s.id==='releases-units-quarters')!.presentation!.charts![0];
  chart.table.rows[1].values[0]=null;chart.table.rows[2].values[0]=0;
  const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';addCharts(pptx.addSlide(),[chart]);
  const bytes=await pptx.write({outputType:'uint8array'}) as Uint8Array,zip=unzipSync(preserveChartBlanks(bytes)),xml=strFromU8(zip['ppt/charts/chart1.xml']);
  expect(xml).toContain('<c:dispBlanksAs val="gap"');expect(xml.match(/<c:val>([\s\S]*?)<\/c:val>/)?.[1]).not.toContain('<c:pt idx="1">');expect(xml).toContain('<c:pt idx="2"><c:v>0</c:v>');
  const embedded=Object.keys(zip).find(k=>k.startsWith('ppt/embeddings/')&&k.endsWith('.xlsx'))!;expect(embedded).toBeTruthy();const workbook=unzipSync(zip[embedded]);expect(strFromU8(workbook['xl/worksheets/sheet1.xml'])).toContain('<c r="B3"/>');
  expect(strFromU8(zip['ppt/slides/slide1.xml'])).toContain('drawingml/2006/chart');
 });
 it('grava todas as famílias de gráficos, incluindo preço combinado',async()=>{
  const report=reportFor(),pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';
  for(const page of physicalPages(report.slides).filter(p=>p.charts.length))addCharts(pptx.addSlide(),page.charts);
  const zip=unzipSync(await pptx.write({outputType:'uint8array'}) as Uint8Array);
  const charts=Object.keys(zip).filter(k=>/^ppt\/charts\/chart\d+\.xml$/.test(k));
  expect(charts.length).toBeGreaterThanOrEqual(17);expect(charts.some(k=>strFromU8(zip[k]).includes('<c:lineChart>'))).toBe(true);
 });
 it('preço das capitais não incorpora outra cidade da UF',()=>{
  const s={...selection,region:'nordeste'},catalog={...catalogFor('nordeste'),AL:['Maceió','Marechal Deodoro']},sources=fixture(s,catalog);
  for(const source of sources.filter(s=>s.city==='Marechal Deodoro'&&s.metric==='details'))for(const building of source.rows)for(const row of building.typologies_history as Record<string,unknown>[]){row.price_private_area=20000;row.price=Number(row.private_area)*20000;}
  const report=calculateReport(s,citiesFor(s,catalog),[],sources,'2026-11-26');
  expect(report.slides.find(s=>s.id==='meter-states')!.tables[0].rows.find(r=>r.label==='AL')!.values[0]).toBe(15000);
  expect(report.slides.find(s=>s.id==='meter-capitals')!.tables[0].rows.every(r=>r.values[0]===10000&&r.values[1]===10000)).toBe(true);
 });
 it('colore os mapas por preço histórico ponderado e preserva preço ausente',()=>{
  const report=reportFor();expect(report.slides.flatMap(s=>s.map?.points??[]).every(p=>p.meter===10000)).toBe(true);
  expect([5000,5001,8001,12001,16001].map(v=>mapPriceBand(v).color)).toEqual(['#249ce4','#60ad44','#f5b400','#9062ee','#ec6155']);
  expect(mapPriceBand(null).label).toBe('Sem preço válido');expect(mapPriceBand(0).label).toBe('Sem preço válido');
  expect(conferenceCsv(report)).toContain('preço histórico R$/m²');
 });
 it('conserva total e três comparativos por UF, inclusive na borda de cobertura de 2021',()=>{
  const report=reportFor(),table=report.slides.find(s=>s.id==='releases-states')!.tables[0];
  expect(table.columns.slice(-3)).toEqual(['Variação trimestre anterior (%)','Variação anual do trimestre (%)','Variação acumulado (%)']);
  expect(table.rows.at(-1)).toEqual({label:'Total',values:[18,18,18,18,18,54,54,0,0,0]});
  const s={...selection,year:2021,quarter:1},catalog=catalogFor(),early=calculateReport(s,citiesFor(s,catalog),[],fixture(s,catalog),'2026-11-26');
  const t=early.slides.find(s=>s.id==='releases-states')!.tables[0];expect(t.rows.every(r=>r.values.length===t.columns.length)).toBe(true);expect(t.formats).toHaveLength(t.columns.length);
 });
});
