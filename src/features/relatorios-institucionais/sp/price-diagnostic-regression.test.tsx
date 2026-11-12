import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import diagnostic from './__tests__/price-diagnostic-2026-11-12.json';
import { recordedInput } from './__tests__/recorded';
import { syntheticGranularBuildings } from './__tests__/granular-buildings';
import { buildSpTemporalPreview } from './temporal';
import { buildSpGranularDetails, type SpGranularDetails } from './granular-details';
import { spDisplayMarket, spDisplayPrices, type SpMunicipalPrices } from './municipal-prices';
import { reviewSpSlides, spReviewSnapshot } from './review';
import { SpDetailSlide } from './SpDetailSlide';
import { SpMarketStateSlide } from './SpMarketStateSlide';

// Only exported aggregate price data is replayed. Synthetic ancillary sections
// keep this test independent of raw projects and the live GeoBrain service.
function replay() {
  const report=buildSpTemporalPreview(recordedInput(),'3T2026');
  const granular=buildSpGranularDetails(syntheticGranularBuildings(),report);
  report.quarter='2T2026';report.throughMonth='2026-06';
  report.metrics=diagnostic.metrics;
  report.municipalPrices=structuredClone(diagnostic.municipalPrices) as SpMunicipalPrices;
  report.granularDetails={...granular,prices:structuredClone(diagnostic.granularPrices) as SpGranularDetails['prices'],market:{...granular.market!,prices:structuredClone(diagnostic.bedroomPrices)}};
  return report;
}
describe('SP diagnóstico real de preços 2T2026, 12/11',()=>{
  it('recupera a série geral calculada sem inventar total municipal nem preencher oito lacunas',()=>{
    const report=replay(),prices=spDisplayPrices(report)!;
    expect(prices.seriesMethods[53]).toBe('granular-stock-weighted');
    expect(prices.series[53].filter(row=>row.value===null)).toHaveLength(8);
    expect(prices.series[53].at(-1)!.value).toBe(12369.940178035058);
    expect(prices.series[53].find(row=>row.month==='2025-06')!.variation).toBeNull();
    expect(report.municipalPrices!.series[53].every(row=>row.value===null)).toBe(true);
    const review=reviewSpSlides(report).find(row=>row.number===53)!;
    expect(review.state).toBe('partial');expect(review.reason).toContain('Série calculada');
  });
  it('restaura a linha geral conferida e mantém as sete barras municipais',()=>{
    const report=replay(),prices=spDisplayPrices(report)!;
    expect(prices.overallMethods).toEqual({ticket:'granular-stock-weighted',meter:'granular-stock-weighted'});
    expect(prices.overall.meter).toBe(12369.940178035058);
    expect(prices.standards.find(row=>row.group==='Compacto')!.meter).toBe(19598.21198179311);
    for(const slide of [61,62]){
      const review=reviewSpSlides(report).find(row=>row.number===slide)!;
      expect(review.state).toBe('available');expect(review.reason).toContain('Métodos distintos');
      const svg=renderToStaticMarkup(<SpDetailSlide report={report} slide={slide}/>);
      expect(svg).toContain('média geral calculada');expect(svg).toContain('Barras: preços informados');
    }
  });
  it('não apaga os recortes reais MCMV/MAP nem mistura médias municipais no card',()=>{
    const report=replay(),market=spDisplayMarket(report)!;
    expect(market.prices).toEqual(diagnostic.bedroomPrices);
    expect(market.prices[0].mcmv.meter).toBe(9664.465790929755);
    expect(market.prices[0].map.meter).toBe(17161.922730972543);
    for(const slide of [63,64]){
      expect(reviewSpSlides(report).find(row=>row.number===slide)!.state).toBe('available');
      const svg=renderToStaticMarkup(<SpMarketStateSlide report={report} slide={slide}/>);
      expect(svg).toContain('Médias ponderadas');expect(svg).not.toContain('detalhamento municipal ainda não informado');
    }
    const audit=spReviewSnapshot(report,reviewSpSlides(report)).numericAudit;
    expect(audit.details.prices!.seriesMethods[53]).toBe('granular-stock-weighted');
    expect(audit.details.priceSource!.closing.find(row=>row.grouping==='overall')!.meter).toBeNull();
  });
  it('mantém o 56 disponível e as lacunas legítimas de 55/57',()=>{
    const reviews=reviewSpSlides(replay());
    expect(reviews.find(row=>row.number===56)!.state).toBe('available');
    for(const slide of [55,57]){
      const review=reviews.find(row=>row.number===slide)!;
      expect(review.state).toBe('partial');expect(review.reason).toContain('8 fotografia(s)');
    }
  });
  it('não usa cálculo granular bloqueado ou parcial para completar a média geral',()=>{
    const report=replay();report.granularDetails!.prices.overall.partial=true;
    expect(spDisplayPrices(report)!.overall.meter).toBeNull();
    report.granularDetails!.status='blocked';
    expect(spDisplayPrices(report)!.series[53].every(row=>row.value===null)).toBe(true);
    expect(reviewSpSlides(report).find(row=>row.number===53)!.state).toBe('blocked');
  });
});
