import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {remainingFixture} from './__tests__/remaining-fixture';
import {introFixture} from './__tests__/intro-fixture';
import {buildMaceioDiagnostic} from './diagnostic';
import {buildMaceioMarketSlide} from './market-slides-data';
import {buildOfferPriceSlide} from './offer-price-data';
import {loadVerifiedCagedReport} from './caged-snapshot';
import {buildCagedSlide} from './caged';
import MaceioGroupedChart from './MaceioGroupedChart';
import type {MaceioSelection} from './model';
import type {MarketRow} from './market';
const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:10};
const affected=[9,10,11,12,13,14,34,36,40,41,42,43,45,47,48,50,51,52,53,54,56,57,58,59,60,62,63,64,65,66,67,68,69,75,76,77];

it('percorre os 36 de outubro com CAGED setembro explícito, negativos e fotos incompletas',async()=>{
  const data=remainingFixture(selection);
  for(const city of ['Maceió','Marechal Deodoro']){
    const source=data.sources.find(source=>source.city===city&&source.metric==='details')!;
    source.rows[0].typologies_history=(source.rows[0].typologies_history as MarketRow[]).filter(row=>!['2026-06','2026-09','2026-10'].includes(String(row.period).slice(0,7)));
  }
  const horizontal=data.horizontal!.find(source=>source.city==='Marechal Deodoro'&&source.metric==='details')!;
  horizontal.rows[0].typologies_history=[];
  for(const source of data.sources.filter(source=>source.city==='Coqueiro Seco'&&source.metric==='sales'))source.rows.find(row=>String(row.period).startsWith(data.end))!.liquid_sales=-1000;
  for(const source of data.sources.filter(source=>source.city==='Maceió'&&source.metric==='releases'))source.rows.find(row=>String(row.period).startsWith(data.end))!.releases_in_period=8;
  const verified=await loadVerifiedCagedReport('2026-10',true);expect(verified?.report.end).toBe('2026-09');
  const intro={...introFixture(selection),slides:data,caged:{report:verified!.report,requestedEnd:verified!.requestedEnd,issue:null,delivery:{kind:'verified-snapshot' as const,verifiedAt:verified!.verifiedAt}}};
  const original=JSON.stringify(data);
  const diagnostic=buildMaceioDiagnostic(selection,{phase:'done',startedAt:1,finishedAt:'2026-11-23T12:40:22Z',blueprint:null,report:null,intro});
  for(const page of affected)expect(diagnostic.slides.find(slide=>slide.number===page)!.status,`slide ${page}: ${diagnostic.slides.find(slide=>slide.number===page)!.issue}`).toBe('available');
  expect(diagnostic.slides.filter(slide=>slide.status==='source-pending').map(slide=>[slide.number,slide.issue])).toEqual([]);expect(diagnostic.sources.caged).toMatchObject({referenceMonth:'2026-09',requestedMonth:'2026-10'});
  const caged=buildCagedSlide(9,selection,intro.caged);expect(caged.labels).toContain('set/26');expect(caged.labels).not.toContain('out/26');expect(caged.sourceNotice).toContain('setembro de 2026');
  expect(JSON.stringify(data)).toBe(original);
});
it('negativos são unidades assinadas com retângulos SVG de dimensões não negativas',()=>{
  const data=remainingFixture(selection);
  for(const source of data.sources.filter(source=>source.city==='Coqueiro Seco'&&source.metric==='sales'))source.rows.find(row=>String(row.period).startsWith(data.end))!.liquid_sales=-1000;
  for(const page of [34,36]){
    const model=buildMaceioMarketSlide(page,selection,data);expect(model.issue).toBeNull();
    const svg=renderToStaticMarkup(<MaceioGroupedChart model={model}/>);
    expect(svg).toContain('data-maceio-signed');expect(svg).not.toContain('%');expect(svg).not.toMatch(/(?:height|width)="-/);expect(svg).not.toContain('NaN');
  }
});
it('IVV mensal mantém meses válidos e deixa só a taxa sem balanço ausente',()=>{
  const data=remainingFixture(selection);
  data.sources.find(source=>source.city==='Maceió'&&source.metric==='stock'&&source.group==='Padrão')!.rows.at(-1)!.stock=1;
  const model=buildOfferPriceSlide(45,selection,data);expect(model.issue).toBeNull();expect(model.series[0].values.at(-1)).toBeNull();expect(model.series[0].values.at(-2)).not.toBeNull();expect(model.warnings.join(' ')).toContain('2026-10');
});
