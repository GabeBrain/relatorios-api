import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {remainingFixture} from './__tests__/remaining-fixture';
import {introFixture} from './__tests__/intro-fixture';
import {cagedFixture} from './__tests__/caged-fixture';
import {buildOfferPriceSlide,type OfferPriceSlide} from './offer-price-data';
import {buildRemainingSlide} from './remaining-data';
import {buildMaceioMarketSlide} from './market-slides-data';
import {buildMaceioPattern,buildMaceioLaunchSeries} from './intro-data';
import {parseCagedReport} from './caged';
import {loadVerifiedCagedReport} from './caged-snapshot';
import {buildMaceioDataIssuesReview} from './data-issues-review';
import MaceioOfferPriceChart from './MaceioOfferPriceChart';
import MaceioReportSlide from './MaceioReportSlide';
import {maceioSlideTitle,type MaceioSelection} from './model';
import type {MarketRow} from './market';
const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
const xml=(markup:string)=>new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,'image/svg+xml');

describe('varredura mensal e trimestral: semântica e preservação dos dados',()=>{
 for(const periodicity of ['monthly','quarterly'] as const){
  const selected={...selection,periodicity,position:periodicity==='monthly'?5:3};
  it(`IVV por área usa contagens e percentuais nas colunas corretas / ${periodicity}`,()=>{
   const data=remainingFixture(selected),model=buildOfferPriceSlide(periodicity==='monthly'?47:46,selected,data);
   const markup=renderToStaticMarkup(<MaceioOfferPriceChart model={model}/>);
   expect(model.issue).toBeNull();expect(markup).toContain('>Área útil<');expect(markup).not.toContain('>Mês<');
   expect(markup).toContain('>1.000<');expect(markup).not.toContain('>1.000%<');expect(markup).toContain('>100%<');
   const calendar=renderToStaticMarkup(<MaceioOfferPriceChart model={buildOfferPriceSlide(periodicity==='monthly'?46:45,selected,data)}/>);
   expect(calendar).toContain('>Mês<');
  });
  it(`registros sem contribuição não invalidam estoque, capacidade ou preço / ${periodicity}`,()=>{
   const data=remainingFixture(selected),before=structuredClone(data),source=data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!;
   const building=source.rows[0],current=(building.typologies_history as MarketRow[]).at(-1)!;
   (building.typologies_history as MarketRow[]).push({...current,typology_id:'zero',typology_stock:0,qty:0,price:0,private_area:0,number_bedroom:0,pattern:'',standard_family:'',estagio_empreendimento:''});
   for(const page of periodicity==='monthly'?[62,63,64,65,66,67,68,69]:[61,62,64,66,67,68,69,70])expect(buildRemainingSlide(page,selected,data,'stock-weighted'),`slide ${page}`).toEqual(buildRemainingSlide(page,selected,before,'stock-weighted'));
  });
  it(`padrão histórico prevalece sobre padrão/família atuais / ${periodicity}`,()=>{
   const data=remainingFixture(selected),building=data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!.rows[0];
   building.standard='Econômico';building.standard_family='MCMV';
   for(const row of building.typologies_history as MarketRow[])row.pattern='Alto';
   const model=buildOfferPriceSlide(periodicity==='monthly'?57:56,selected,data,'stock-weighted');
   expect(model.issue).toBeNull();expect(model.series[0].values[model.groups.indexOf('Alto')]).toBeGreaterThan(0);
   const stage=buildRemainingSlide(periodicity==='monthly'?68:69,selected,data);
   expect(stage.issue).toBeNull();expect(stage.stages[0].values[3]).toEqual([100,0,0]);
  });
  it(`estoque adotado tolera a grafia autorizada do município / ${periodicity}`,()=>{
   const data=remainingFixture(selected);
   for(const source of data.sources.filter(source=>source.city==='Marechal Deodoro')){source.city='MARECHAL DEODORO';for(const row of source.rows)row.city='MARECHAL DEODORO';}
   for(const page of periodicity==='monthly'?[40,42,43]:[40,41,42]){const model=page===40?buildMaceioMarketSlide(page,selected,data):buildOfferPriceSlide(page,selected,data);expect(model.issue).toBeNull();}
  });
  it(`quatro ou mais quartos preservam todas as unidades e pesos / ${periodicity}`,()=>{
   const data=remainingFixture(selected);
   for(const source of data.sources){
    if(source.metric==='details'){for(const building of source.rows)for(const row of building.typologies_history as MarketRow[])if(row.number_bedroom===1)row.number_bedroom=5;}
    else if(source.group==='Tipologia'){for(const row of source.rows)if(String(row.group).startsWith('1 '))row.group='5 dormitórios';}
   }
   const shares=buildOfferPriceSlide(periodicity==='monthly'?42:41,selected,data);expect(shares.issue).toBeNull();expect(shares.series[1].values[3]).toBe(50);
   const price=buildOfferPriceSlide(periodicity==='monthly'?60:59,selected,data,'stock-weighted');expect(price.issue).toBeNull();expect(price.series[0].values[3]).toBeCloseTo((Number((data.sources.find(source=>source.metric==='details')!.rows[0].typologies_history as MarketRow[]).at(-1)!.price)/30+4*Number((data.sources.find(source=>source.metric==='details')!.rows[3].typologies_history as MarketRow[]).at(-1)!.price)/90)/5);
   expect(buildMaceioMarketSlide(34,selected,data).issue).toBeNull();
   const empty=buildOfferPriceSlide(periodicity==='monthly'?51:50,selected,data,'stock-weighted');expect(empty.issue).toBeNull();expect(empty.emptyOffer).toBe(true);expect(empty.series[0].values.every(value=>value===null)).toBe(true);
  });
  it(`Super Luxo permanece como categoria declarada / ${periodicity}`,()=>{
   const data=remainingFixture(selected);data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!.rows[0].standard='Super Luxo';
   const model=buildOfferPriceSlide(periodicity==='monthly'?57:56,selected,data,'stock-weighted');expect(model.issue).toBeNull();expect(model.series[0].values[model.groups.indexOf('Super Luxo')]).toBeGreaterThan(0);
   const remaining=buildRemainingSlide(periodicity==='monthly'?63:62,selected,data);expect(remaining.issue).toBeNull();const table=remaining.tables[0];expect(table.rows.find(row=>row.label==='Super Luxo')?.values[0]).toBe('—');
  });
  for(const fault of ['date','id','history','typology','period','duplicate-photo','duplicate-project'] as const)it(`isola cadastro ${fault} em todos os blocos sem bloquear outros empreendimentos / ${periodicity}`,()=>{
   const data=remainingFixture(selected),source=data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!,building=source.rows[0],history=building.typologies_history as MarketRow[];
   if(fault==='date')building.release_date=null;if(fault==='id')delete building.building_id;if(fault==='history')building.typologies_history=null;
   if(fault==='typology')delete history.at(-1)!.typology_id;if(fault==='period')history.at(-1)!.period='invalid';if(fault==='duplicate-photo')history.push({...history.at(-1)!});if(fault==='duplicate-project')source.rows.push(structuredClone(building));
   const table=buildRemainingSlide(periodicity==='monthly'?62:61,selected,data);expect(table.issue).toBeNull();expect(table.tables[0].rows.at(-1)!.values[0]).toBe(900);
   const price=buildOfferPriceSlide(periodicity==='monthly'?57:56,selected,data,'stock-weighted');expect(price.issue).toBeNull();expect(price.warnings.join(' ')).toContain('Base parcial:');
   const ranking=buildMaceioMarketSlide(36,selected,data);expect(ranking.issue).toBeNull();expect(ranking.warnings?.join(' ')).toContain('Base parcial:');
  });
  it(`renderiza todas as ${periodicity==='monthly'?82:87} posições sem erro de geometria / ${periodicity}`,async()=>{
   const data=remainingFixture(selected),verified=await loadVerifiedCagedReport(data.end),intro={...introFixture(selected),slides:data,caged:{report:verified!.report,issue:null}};
   for(let page=1;page<=(periodicity==='monthly'?82:87);page++){
    const markup=renderToStaticMarkup(<MaceioReportSlide page={page} selection={selected} data={intro} monetaryPolicy="INCC-DI" pricePolicy="stock-weighted"/>);
    expect(markup,`slide ${page}`).not.toMatch(/NaN|Infinity|(?:width|height)="-/);
    expect(markup,`slide ${page}`).not.toContain('data-maceio-pending');
    if(page===(periodicity==='monthly'?45:44))expect(markup).toContain('ÍNDICE DE VELOCIDADE DE VENDAS');
    if(page===(periodicity==='monthly'?54:53))expect(markup).toContain('4 ou + dorms');
    if(page===(periodicity==='monthly'?73:74)){
      const surface=xml(markup).querySelector('[data-maceio-remaining-surface]')!;expect(surface.firstElementChild!.tagName).toBe('rect');
      expect(surface.firstElementChild!.getAttribute('y')).toBe('160');expect(surface.firstElementChild!.getAttribute('height')).toBe('470');
    }
    if(page===(periodicity==='monthly'?67:68)){expect(markup).toContain('>LANÇADA<');expect(markup).toContain('>FINAL<');}
   }
  });
 }
 it('linhas de IVV e variação de preços não atravessam meses sem dado',()=>{
  const model:OfferPriceSlide={...buildOfferPriceSlide(45,selection,remainingFixture(selection)),groups:['a','b','c','d','e','f'],series:[{label:'IVV',values:[1,null,2,3,null,4]}]};
  let chart=xml(renderToStaticMarkup(<MaceioOfferPriceChart model={model}/>));
  expect([...chart.querySelectorAll('polyline')].map(line=>line.getAttribute('points')!.split(' ').length)).toEqual([1,2,1]);
  chart=xml(renderToStaticMarkup(<MaceioOfferPriceChart model={{...model,price:true,series:[{label:'Preço',values:[1,2,null,8,16]}],groups:['a','b','c','d','e']}}/>));
  expect(chart.querySelectorAll('[data-maceio-price-variation] polyline')).toHaveLength(2);
 });
 it('cadastro municipal duplicado não duplica empreendimentos no gráfico de padrões',()=>{
  const data=introFixture(selection);data.cities.push(structuredClone(data.cities[0]));expect(buildMaceioPattern(selection,data).issue).toBeTruthy();
 });
 it('fluxos individualmente seguros não podem produzir acumulados fora da precisão',()=>{
  const data=introFixture(selection);for(const row of data.cities[0].units)row.releases_in_period=2**52;
  expect(buildMaceioLaunchSeries(20,selection,data).issue).toContain('acumulada');
 });
 it('CAGED rejeita competências completas fora da cobertura declarada',()=>{
  expect(()=>parseCagedReport(cagedFixture('2026-10'),'2026-10')).toThrow(/cobertura/);
  expect(()=>parseCagedReport(cagedFixture('2026-05','2020-06'),'2026-05')).toThrow(/cobertura/);
 });
 it('CSV identifica falhas de ID e competência, sem expor campos arbitrários',()=>{
  const data=remainingFixture(selection),building=data.sources.find(source=>source.metric==='details')!.rows[0];delete building.building_id;building.token='secret';
  const row=(building.typologies_history as MarketRow[]).at(-1)!;delete row.typology_id;row.period='invalid';
  const csv=buildMaceioDataIssuesReview(selection,data).csv;expect(csv).toContain('Identificador do empreendimento');expect(csv).toContain('Identificador de tipologia');expect(csv).toContain('Competência histórica');expect(csv).not.toContain('secret');
 });
 it('títulos e logs usam a competência selecionada, preservando a referência original',()=>{
  expect(maceioSlideTitle(36,{...selection,position:10})).toContain('outubro de 2026');
  expect(maceioSlideTitle(36,{...selection,periodicity:'quarterly',position:3})).toContain('3T2026');
  expect(maceioSlideTitle(47,{...selection,position:9})).toContain('setembro de 2026');
 });
});
