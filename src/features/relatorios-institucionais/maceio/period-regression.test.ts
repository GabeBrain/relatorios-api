import{it,expect}from'vitest';
import{remainingFixture}from'./__tests__/remaining-fixture';
import{introFixture}from'./__tests__/intro-fixture';
import{buildMaceioDiagnostic}from'./diagnostic';
import{loadVerifiedCagedReport}from'./caged-snapshot';
import type{MaceioSelection}from'./model';
import type{MarketRow}from'./market';
import{createElement}from'react';
import{renderToStaticMarkup}from'react-dom/server';
import MaceioReportSlide from'./MaceioReportSlide';
const periods=[...Array.from({length:10},(_,i)=>({periodicity:'monthly' as const,year:2026,position:i+1})),...Array.from({length:3},(_,i)=>({periodicity:'quarterly' as const,year:2026,position:i+1})),{periodicity:'monthly' as const,year:2025,position:12},{periodicity:'quarterly' as const,year:2025,position:4}];
for(const period of periods)it(`gera período fechado ${period.periodicity} ${period.position}/${period.year} sem depender da edição de referência`,async()=>{
 const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',...period},data=remainingFixture(selection);
 const capital=data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!;
 capital.rows[0].typologies_history=(capital.rows[0].typologies_history as MarketRow[]).filter(row=>!String(row.period).startsWith(data.end));
 (capital.rows[1].typologies_history as MarketRow[]).at(-1)!.price=0;
 const caged=await loadVerifiedCagedReport(data.end,true);expect(caged).not.toBeNull();
 const intro={...introFixture(selection),slides:data,caged:{report:caged!.report,requestedEnd:caged!.requestedEnd,issue:null,delivery:{kind:'verified-snapshot' as const,verifiedAt:caged!.verifiedAt}}};
 const diagnostic=buildMaceioDiagnostic(selection,{phase:'done',startedAt:1,finishedAt:'2026-11-23T13:00:00Z',blueprint:null,report:null,intro});
 expect(diagnostic.slides.filter(slide=>slide.status==='source-pending').map(slide=>[slide.number,slide.issue])).toEqual([]);
 expect(diagnostic.partialSlides.length).toBeGreaterThan(0);
});
it('histórico anterior ao INCC disponível não vira zero nem gera geometria inválida',()=>{
 const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'quarterly',year:2021,position:1};
 const data=remainingFixture(selection),intro={...introFixture(selection),slides:data};
 const diagnostic=buildMaceioDiagnostic(selection,{phase:'done',startedAt:1,blueprint:null,report:null,intro});
 for(const page of[26,28,37]){
  const model=diagnostic.slides.find(slide=>slide.number===page)!;expect(model.issue).toBeNull();
  const svg=renderToStaticMarkup(createElement(MaceioReportSlide,{page,selection,data:intro,monetaryPolicy:'INCC-DI',pricePolicy:'stock-weighted'}));
  expect(svg).not.toContain('NaN');expect(svg).not.toMatch(/(?:height|width)="-/);
 }
});
