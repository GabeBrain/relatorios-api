import {describe,it,expect} from 'vitest';
import proof from './__tests__/fixtures/sp-v2-capacity-87999.json';
import {buildSpMarketDetails} from './market-details';
import {buildSpGranularDetails,type SpObservation} from './granular-details';
import {buildSpTemporalPreview} from './temporal';
import {buildSpStockSeries} from './stock-series';
import {syntheticStockSeries} from './__tests__/launch-series';
import {syntheticGranularBuildings} from './__tests__/granular-buildings';
import {recordedInput} from './__tests__/recorded';
import {reviewSpSlides,spReviewSnapshot} from './review';
import type {SpPreview} from './model';

describe('SP — diagnostico do VGV sem reconstruir a capacidade informada',()=>{
  it('reproduz tres inconsistencias reais da v2 com IDs, valores e diferencas, preservando os demais dados',()=>{
    // Only capacity fields are real. Other measures and isolated subset denominator are synthetic.
    const rows:SpObservation[]=proof.rows.map(row=>({project:String(proof.building_id),typology:String(row.typology_id),month:'2026-06',standard:'Econômico',bedrooms:2,area:40,stock:row.typology_stock,sales:0,qty:row.qty,sold:row.sold,price:200000,meter:5000,release:'2026-05',stage:'Planta'}));
    const report:SpPreview={entity:'sp-institucional',quarter:'2T2026',status:'quarter-closed',source:'api',throughMonth:'2026-06',closingMonth:'2026-06',metrics:{projects:null,launches:0,sales:0,stock:335},issues:[],checks:[],ignoredHistoryRows:0};
    const before=structuredClone(rows),market=buildSpMarketDetails(rows,[{building_id:87999}],report,null);
    expect(market.vgv.ready).toBe(true);expect(market.vgv.total).toMatchObject({qty:336,stock:335,sold:1});expect(market.vgv.warnings).toHaveLength(3);
    for(const [i,delta] of [10,11,6].entries()){
      expect(market.vgv.warnings![i]).toContain(`Empreendimento 87999, tipologia ${proof.rows[i].typology_id}, competência 2026-06`);
      expect(market.vgv.warnings![i]).toContain(`sold original ${proof.rows[i].sold}`);
      expect(market.vgv.warnings![i]).toContain(`diferença ${delta}`);
    }
    expect(rows).toEqual(before);expect(market.status).toBe('ready');expect(market.total).toBe(335);expect(market.matrix.status).toBe('ready');
    expect(market.prices[1].ticket).toBe(200000);
  });
  it('inclui inconsistencias do fechamento no JSON e mantem disponibilidade independente',()=>{
    const report=buildSpTemporalPreview(recordedInput(),'3T2026');report.stockSeries=buildSpStockSeries(syntheticStockSeries(),report);
    const buildings=syntheticGranularBuildings();
    const rows=buildings[0].typologies_history as Record<string,unknown>[];
    rows.find(row=>row.period==='2026-08-01')!.sold=-9;
    const data=buildSpGranularDetails(buildings,report),preview={...report,granularDetails:data};
    expect(data.prices.overall.ticket).not.toBeNull();expect(data.area.status).toBe('ready');
    const slides=reviewSpSlides(preview),slide=slides.find(row=>row.number===78)!;
    expect(slide.state).toBe('available');expect(slide.reason).toContain('Vendido e VGV vendido calculados');
    expect(spReviewSnapshot(preview,slides).calculatedSalesAudit!.examples.join(' ')).toContain('sold original -9');
  });
  it('explicita estoque negativo sem descarta-lo nem converte-lo em zero',()=>{
    const report=buildSpTemporalPreview(recordedInput(),'3T2026');report.stockSeries=buildSpStockSeries(syntheticStockSeries(),report);
    const buildings=syntheticGranularBuildings(),row=(buildings[0].typologies_history as Record<string,unknown>[]).find(row=>row.period==='2026-08-01')!;
    row.typology_stock=-1;
    const data=buildSpGranularDetails(buildings,report);
    expect(data.prices.overall.ticket).toBeNull();expect(data.warnings!.join(' ')).toContain('estoque negativo informado -1');
    expect(data.area.status).toBe('blocked');expect(data.diagnostics!.find(row=>row.month==='2026-08')!.samples.join(' ')).toContain('valor -1');
    expect(row.typology_stock).toBe(-1);
  });
});
