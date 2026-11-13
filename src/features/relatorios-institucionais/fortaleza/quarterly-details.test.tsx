import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FORTALEZA_CITIES } from './model';
import { monthlyMarketFixture,monthlyMarketSelection } from './__tests__/monthly-market-fixture';
import { quarterlyPriceFixture } from './__tests__/quarterly-price-fixture';
import { buildQuarterlyDetailTable } from './quarterly-details';
import { buildQuarterlyPrice,buildQuarterlyIvv } from './quarterly-analysis';
import { normalizePriceFrames } from './monthly-prices';
import { buildFortalezaDiagnostic } from './diagnostic';
import { prepareFortalezaBlueprint } from './model';
import { createFortalezaEditorial } from './monthly-closing';
import FortalezaReportSlide from './FortalezaReportSlide';
import { FortalezaGenerationPanel } from './FortalezaGenerationPanel';
const selection={...monthlyMarketSelection,periodicity:'quarterly' as const,position:2},cities=[...FORTALEZA_CITIES];
describe('Fortaleza trimestral — preços, fechamento e tabelas 41–89',()=>{
  it('bloqueia preço quando uma tipologia desaparece, mesmo havendo outra observação no mesmo mês',()=>{
    const prices=quarterlyPriceFixture(selection),source=prices.sources[0],record=source.records[0],history=record.typologies_history as Record<string,unknown>[];
    record.typologies_history=[...history,...history.slice(0,-1).map(row=>({...row,typology_id:999,price_private_area:9000}))];
    source.frames=normalizePriceFrames(source,prices.months);
    expect(source.frames[prices.months.at(-1)!].productIssues.vertical?.join(' ')).toContain('incompleta por tipologia');
    expect(buildQuarterlyPrice(42,prices,selection,cities).status).toBe('blocked');
  });
  it('não exige uma tipologia antes de sua primeira observação e aceita estoque zero explícito',()=>{
    const prices=quarterlyPriceFixture(selection),source=prices.sources[0],record=source.records[0],history=record.typologies_history as Record<string,unknown>[];
    record.typologies_history=[...history,...history.slice(-3).map(row=>({...row,typology_id:999,typology_stock:0}))];
    source.frames=normalizePriceFrames(source,prices.months);
    expect(buildQuarterlyPrice(42,prices,selection,cities).status).toBe('ready');
  });
  it('não substitui preço por m² explícito inválido pelo quociente de preço e área',()=>{
    const prices=quarterlyPriceFixture(selection),source=prices.sources.find(source=>source.city==='Fortaleza'&&source.segment==='Horizontal')!;
    (source.records[0].typologies_history as Record<string,unknown>[]).at(-1)!.price_private_area=0;
    source.frames=normalizePriceFrames(source,prices.months);
    const table=buildQuarterlyDetailTable(68,prices,selection,cities);
    expect(table.rows.find(row=>row.label==='Casas em Condomínio')!.values[2]).toBeNull();
    expect(table.warnings.join(' ')).toContain('ausentes');
  });
  it('diagnóstico identifica escopos, fotografias incompletas e fonte do INCC sem históricos individuais',async()=>{
    const prices=quarterlyPriceFixture(selection),source=prices.sources[0];
    (source.records[0].typologies_history as Record<string,unknown>[]).at(-1)!.price_private_area=null;
    (source.records[0].typologies_history as Record<string,unknown>[]).at(-1)!.price=null;
    source.frames=normalizePriceFrames(source,prices.months);
    const blueprint=await prepareFortalezaBlueprint(selection,cities,{yieldControl:async()=>{}});
    const generation={phase:'done' as const,startedAt:0,key:'test',message:'',steps:[],hasFailedCities:false,blueprint,report:null,intro:null,monthlyLaunches:{sources:[],issues:[],prices,market:monthlyMarketFixture(selection)}};
    const diagnostic=buildFortalezaDiagnostic(selection,generation);
    expect(diagnostic.slides[2].scope).toEqual(['Fortaleza']);expect(diagnostic.slides[4].scope).toEqual(cities.slice(1));
    expect(diagnostic.sources.detailed[0].frames.at(-1)!.missingPrices).toBe(1);
    expect(diagnostic.sources.monetaryIndex.series).toBe('INCC-DI');
    expect(JSON.stringify(diagnostic)).not.toContain('typologies_history');
    const panel=renderToStaticMarkup(<FortalezaGenerationPanel state={generation}/>);
    expect(panel).toContain('trimestral até o slide 89');expect(panel).not.toContain('mensal até o slide 60');
  });
  it('preços são nove fotografias, comparadas ao trimestre anterior e mesmo trimestre do ano anterior',()=>{
    const data=buildQuarterlyPrice(42,quarterlyPriceFixture(selection),selection,cities);
    expect(data.status).toBe('ready');expect(data.series[0].points).toHaveLength(9);expect(data.series[0].points.at(-1)!.value).toBe(3260);
    expect(data.changes[0].month).toBeCloseTo((3260/3230-1)*100);expect(data.changes[0].year).toBeCloseTo((3260/3140-1)*100);
  });
  it('54/72 preservam os 25 IVVs mensais do original trimestral e a média dessas taxas',()=>{
    const data=buildQuarterlyIvv(monthlyMarketFixture(selection),selection,cities);
    expect(data.status).toBe('ready');expect(data.series[0].points).toHaveLength(25);
    expect(data.series[0].points[0].month).toBe('2024-06');
    expect(data.series[0].points.at(-1)!.value).toBeCloseTo(12/176*100);expect(data.average).toBeCloseTo(12/176*100);
  });
  it('oferta lançada soma qty das tipologias de empreendimentos ativos, sem multiplicar por meses',()=>{
    const prices=quarterlyPriceFixture(selection);
    const all=buildQuarterlyDetailTable(59,prices,selection,cities),excluded=buildQuarterlyDetailTable(60,prices,selection,cities),rm=buildQuarterlyDetailTable(74,prices,selection,cities);
    expect(all.rows.at(-1)!.values).toEqual([500,100,5,100,1]);expect(excluded.rows.at(-1)!.values).toEqual([400,100,4,100,1]);
    expect(rm.rows.at(-1)!.values).toEqual([2000,100,70,100,3.5000000000000004]);
  });
  it('idades e participações fecham por linha e usam lançamento histórico, não stage atual',()=>{
    const prices=quarterlyPriceFixture(selection),count=buildQuarterlyDetailTable(61,prices,selection,cities),share=buildQuarterlyDetailTable(62,prices,selection,cities);
    expect(count.rows.at(-1)!.values).toEqual([0,0,500,500,0,0,5,5]);expect(share.rows.at(-1)!.values).toEqual([0,0,100,100,0,0,100,100]);
    const source=prices.sources[0];source.records[0].release_date='2026-01-01';source.frames=normalizePriceFrames(source,prices.months);
    expect(buildQuarterlyDetailTable(61,prices,selection,cities).rows.at(-1)!.values.slice(0,4)).toEqual([100,0,400,500]);
  });
  it('tabelas horizontais mantêm casas e loteamentos e ponderam preço/área por estoque',()=>{
    const prices=quarterlyPriceFixture(selection),count=buildQuarterlyDetailTable(66,prices,selection,cities),price=buildQuarterlyDetailTable(68,prices,selection,cities);
    expect(count.rows.at(-1)!.values).toEqual([3,100,300,100,3,100,99,1]);
    expect(price.rows.find(row=>row.label==='Média Loteamento')!.values).toEqual([154300,55,2760]);
  });
  it('bloqueia fotografia faltante, qty ausente, dormitórios ausentes e estoque acima da capacidade',()=>{
    for(const mutate of [(row:Record<string,unknown>)=>{row.qty=null;},(row:Record<string,unknown>)=>{row.number_bedroom=null;},(row:Record<string,unknown>)=>{row.typology_stock=101;}]){
      const prices=quarterlyPriceFixture(selection),source=prices.sources[0],rows=source.records[0].typologies_history as Record<string,unknown>[];mutate(rows.at(-1)!);source.frames=normalizePriceFrames(source,prices.months);
      expect(buildQuarterlyDetailTable(59,prices,selection,cities).status).toBe('blocked');
    }
    const prices=quarterlyPriceFixture(selection),source=prices.sources[0];(source.records[0].typologies_history as unknown[]).pop();source.frames=normalizePriceFrames(source,prices.months);
    expect(buildQuarterlyDetailTable(59,prices,selection,cities).status).toBe('blocked');
  });
  it('localização só utiliza coordenadas reais disponíveis e diagnóstico não exporta pontos individuais',async()=>{
    const prices=quarterlyPriceFixture(selection),location=buildQuarterlyDetailTable(49,prices,selection,cities);
    expect(location.points).toHaveLength(5);expect(location.points![0].latitude).toBe(-3.6);
    const blueprint=await prepareFortalezaBlueprint(selection,cities,{yieldControl:async()=>{}});
    const diagnostic=buildFortalezaDiagnostic(selection,{phase:'done',startedAt:0,blueprint,report:null,intro:null,monthlyLaunches:{sources:[],issues:[],prices,market:monthlyMarketFixture(selection)}});
    expect(diagnostic.slides).toHaveLength(89);expect(diagnostic.summary['not-implemented']).toBe(0);
    expect(JSON.stringify(diagnostic)).not.toContain('longitude');expect(JSON.stringify(diagnostic)).not.toContain('Fortaleza-Vertical-0');
  });
  it('renderiza todas as posições 41–89 com dados sintéticos completos e mantém os números originais',()=>{
    const monthlyLaunches={sources:[],issues:[],market:monthlyMarketFixture(selection),prices:quarterlyPriceFixture(selection)};
    for(let page=41;page<=89;page++){
      const svg=renderToStaticMarkup(<FortalezaReportSlide page={page} selection={selection} cities={cities} data={null} monthlyLaunches={monthlyLaunches} editorial={createFortalezaEditorial()}/>);
      expect(svg).toContain(`Fortaleza · slide ${page}`);expect(svg).not.toContain('Aguardando conferência');expect(svg).not.toContain('NaN');
    }
  });
  it.each([59,62,67,68,73,75,82,83])('cabeçalho %i preserva título e recorte sem nota histórica fixa de junho',page=>{
    const svg=renderToStaticMarkup(<FortalezaReportSlide page={page} selection={{...selection,position:3}} cities={cities} data={null} monthlyLaunches={null} editorial={createFortalezaEditorial()}/>);
    expect(svg).toContain('data-quarterly-detail-heading');expect(svg).toContain('3º trimestre de 2026');expect(svg).not.toContain('*Até junho');
  });
});
