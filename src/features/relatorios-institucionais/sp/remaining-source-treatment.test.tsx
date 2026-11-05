import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildSpGranularDetails} from './granular-details';
import {buildSpTemporalPreview} from './temporal';
import {buildSpStockSeries} from './stock-series';
import {syntheticStockSeries} from './__tests__/launch-series';
import {syntheticGranularBuildings} from './__tests__/granular-buildings';
import {recordedInput} from './__tests__/recorded';
import {reviewSpSlides,spReviewSnapshot} from './review';
import {SpMarketStateSlide} from './SpMarketStateSlide';

function setup(){const report=buildSpTemporalPreview(recordedInput(),'3T2026');report.stockSeries=buildSpStockSeries(syntheticStockSeries(),report);return {report,buildings:syntheticGranularBuildings()};}
const histories=(building:Record<string,unknown>)=>building.typologies_history as Record<string,unknown>[];

describe('SP — projeção de oferta comprovada e VGV monetário parcial',()=>{
  it('aplica projeção não negativa somente quando ela fecha exatamente com o município',()=>{
    const {report,buildings}=setup(),row=histories(buildings[0]).find(row=>row.period==='2026-06-01')!,old=Number(row.typology_stock);
    row.typology_stock=-1;
    report.stockSeries!.observations!.find(row=>row.month==='2026-06'&&row.group==='Alto')!.value-=old;
    report.monthly![0].openingStock-=old;
    const data=buildSpGranularDetails(buildings,report);
    expect(data.area.status).toBe('ready');expect(data.area.total!.openingStock).toBe(report.monthly![0].openingStock);
    expect(data.prices.series[53].find(row=>row.month==='2026-06')!.value).not.toBeNull();
    expect(data.warnings!.join(' ')).toContain('coincide exatamente com o municipal');expect(row.typology_stock).toBe(-1);
    report.stockSeries!.observations!.find(row=>row.month==='2026-06'&&row.group==='Alto')!.value++;
    report.monthly![0].openingStock++;
    const mismatch=buildSpGranularDetails(buildings,report);
    expect(mismatch.area.status).toBe('blocked');expect(mismatch.prices.series[53].find(row=>row.month==='2026-06')!.value).toBeNull();
  });
  it('mantém quantidades e VGV final quando falta preço apenas em tipologia esgotada',()=>{
    const {report,buildings}=setup(),before=buildSpGranularDetails(buildings,report);
    const candidate=buildings.filter(building=>Number(building.building_id)>=100).flatMap(building=>histories(building).filter(row=>row.period==='2026-08-01'&&Number(row.qty)>0).map(row=>({row,group:building.standard}))).find(item=>item.row.typology_stock===0)!;
    candidate.row.price=null;
    const data=buildSpGranularDetails(buildings,report),vgv=data.market!.vgv,original=before.market!.vgv;
    expect(vgv.ready).toBe(true);expect(vgv.partial).toBe(true);expect(vgv.priceMissingCount).toBe(1);
    expect(vgv.total!.qty).toBe(original.total!.qty);expect(vgv.total!.sold).toBe(original.total!.sold);expect(vgv.total!.stock).toBe(original.total!.stock);
    expect(vgv.total!.offeredVgv).toBeNull();expect(vgv.total!.soldVgv).toBeNull();expect(vgv.total!.stockVgv).toBe(original.total!.stockVgv);
    expect(vgv.rows.filter(row=>row.label!==candidate.group).every(row=>row.offeredVgv!==null)).toBe(true);
    const preview={...report,granularDetails:data},slides=reviewSpSlides(preview);
    expect(slides.find(row=>row.number===78)!.state).toBe('partial');
    expect(spReviewSnapshot(preview,slides).calculatedSalesAudit!.priceMissingCount).toBe(1);
    const svg=renderToStaticMarkup(<SpMarketStateSlide report={preview} slide={78}/>);
    expect(svg).not.toContain('Dados em conferência');expect(svg).toContain('preço incompleto');expect(candidate.row.price).toBeNull();
  });
  it('não soma apenas a parcela precificada como se fosse um VGV municipal completo',()=>{
    const {report,buildings}=setup();histories(buildings[0]).find(row=>row.period==='2026-08-01')!.price=null;
    const vgv=buildSpGranularDetails(buildings,report).market!.vgv;
    expect(vgv.ready).toBe(true);expect(vgv.partial).toBe(true);
    for(const field of ['offeredVgv','soldVgv','stockVgv'] as const)expect(vgv.total![field]).toBeNull();
    expect(vgv.rows.find(row=>row.label==='Alto')!.stockVgv).toBeNull();
    expect(vgv.rows.find(row=>row.label==='Econômico')!.stockVgv).not.toBeNull();
  });
});
