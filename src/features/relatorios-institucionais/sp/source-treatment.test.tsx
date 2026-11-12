import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildSpGranularDetails} from './granular-details';
import {buildSpTemporalPreview} from './temporal';
import {buildSpStockSeries} from './stock-series';
import {syntheticStockSeries} from './__tests__/launch-series';
import {syntheticGranularBuildings} from './__tests__/granular-buildings';
import {recordedInput} from './__tests__/recorded';
import {reviewSpSlides,spReviewSnapshot} from './review';
import {SpDetailSlide} from './SpDetailSlide';

function setup(){const report=buildSpTemporalPreview(recordedInput(),'3T2026');report.stockSeries=buildSpStockSeries(syntheticStockSeries(),report);return {report,buildings:syntheticGranularBuildings()};}
const histories=(building:Record<string,unknown>)=>building.typologies_history as Record<string,unknown>[];

describe('SP — tratamento explícito dos dados fornecidos, sem alterar a fonte',()=>{
  it('preserva estoque negativo reconciliado na abertura e libera área e histórico de preço positivo',()=>{
    const {report,buildings}=setup(),row=histories(buildings[0]).find(row=>row.period==='2026-06-01')!,delta=-1-Number(row.typology_stock);
    row.typology_stock=-1;
    report.stockSeries!.observations!.find(row=>row.month==='2026-06'&&row.group==='Alto')!.value+=delta;
    report.monthly![0].openingStock+=delta;
    const data=buildSpGranularDetails(buildings,report);
    expect(data.area.status).toBe('ready');expect(data.area.total!.openingStock).toBe(report.monthly![0].openingStock);
    expect(data.prices.series[53].find(row=>row.month==='2026-06')!.value).not.toBeNull();
    expect(data.warnings!.join(' ')).toContain('estoque negativo informado -1');expect(row.typology_stock).toBe(-1);
  });
  it('calcula a amostra observada, identifica a parcial e suprime variações de cobertura incompleta',()=>{
    const {report,buildings}=setup();buildings[0].typologies_history=histories(buildings[0]).filter(row=>row.period!=='2023-09-01');
    const data=buildSpGranularDetails(buildings,report),points=data.prices.series[53],index=points.findIndex(row=>row.month==='2023-09');
    const observed=buildings.flatMap(histories).filter(row=>row.period==='2023-09-01'&&Number(row.typology_stock)>0);
    const expected=observed.reduce((sum,row)=>sum+Number(row.typology_stock)*Number(row.price_private_area),0)/observed.reduce((sum,row)=>sum+Number(row.typology_stock),0);
    expect(points[index].value).toBeCloseTo(expected);expect(points[index].partial).toBe(true);
    expect(points[index].variation).toBeNull();expect(points[index+1].variation).toBeNull();
    const preview={...report,granularDetails:data},review=reviewSpSlides(preview).find(row=>row.number===53)!;
    expect(review.state).toBe('partial');expect(review.reason).toContain('Amostra');
    const svg=renderToStaticMarkup(<SpDetailSlide report={preview} slide={53}/>);
    expect(svg).toContain('Amostra observada com cobertura parcial');expect(svg).toContain('fill="#ffcf00"');
  });
  it('não transforma estoque ausente ou conflito em parcial numérica',()=>{
    for(const kind of ['null','conflict']){
      const {report,buildings}=setup(),rows=histories(buildings[0]),row=rows.find(row=>row.period==='2023-09-01')!;
      if(kind==='null')row.typology_stock=null;
      if(kind==='conflict')rows.push({...row,price:1});
      const point=buildSpGranularDetails(buildings,report).prices.series[53].find(row=>row.month==='2023-09')!;
      expect(point.value,kind).toBeNull();expect(point.partial).toBeUndefined();
    }
  });
  it.each([-24,24])('preserva a média histórica observada com diferença de estoque %s, sem comparar parciais',delta=>{
    const {report,buildings}=setup(),rows=histories(buildings[0]);
    const row=rows.find(row=>row.period==='2023-09-01')!;
    row.typology_stock=Number(row.typology_stock)+delta;
    const data=buildSpGranularDetails(buildings,report);
    for(const slide of [53,55,57]){
      const points=data.prices.series[slide],index=points.findIndex(point=>point.month==='2023-09');
      expect(points[index].value).not.toBeNull();expect(points[index].partial).toBe(true);
      expect(points[index].issue).toContain('Estoque em 2023-09');
      expect(points[index].variation).toBeNull();expect(points[index+1].variation).toBeNull();
    }
    expect(data.prices.series[53].filter(point=>point.value!==null)).toHaveLength(13);
  });
  it('a mesma divergência no fechamento continua bloqueando a média geral e os quadros',()=>{
    const {report,buildings}=setup(),row=histories(buildings[0]).find(row=>row.period==='2026-08-01')!;
    row.typology_stock=Number(row.typology_stock)+24;
    const data=buildSpGranularDetails(buildings,report);
    expect(data.prices.overall.meter).toBeNull();expect(data.market!.status).toBe('blocked');
  });
  it('deriva vendido somente de capacidade e oferta válidas, sem tocar vendas mensais ou sold original',()=>{
    const {report,buildings}=setup(),row=histories(buildings[0]).find(row=>row.period==='2026-08-01')!,flow=row.sold_in_period;
    row.sold=-9;
    const data=buildSpGranularDetails(buildings,report),total=data.market!.vgv.total!;
    expect(data.market!.vgv.ready).toBe(true);expect(total.qty).toBe(total.sold+total.stock);
    expect(total.offeredVgv!).toBeCloseTo(total.soldVgv!+total.stockVgv!,1);
    expect(row.sold).toBe(-9);expect(row.sold_in_period).toBe(flow);
    const snapshot=spReviewSnapshot({...report,granularDetails:data},reviewSpSlides({...report,granularDetails:data}));
    expect(snapshot.calculatedSalesAudit!.method).toBe('capacity-minus-offer-v1');expect(snapshot.calculatedSalesAudit!.examples.join(' ')).toContain('sold original -9');
    const original={qty:row.qty,price:row.price};
    for(const patch of [{qty:null},{qty:0}]){
      Object.assign(row,original,patch);expect(buildSpGranularDetails(buildings,report).market!.vgv.ready).toBe(false);
    }
  });
});
