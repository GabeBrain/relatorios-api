import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSpGranularDetails } from './granular-details';
import { buildSpTemporalPreview } from './temporal';
import { buildSpStockSeries } from './stock-series';
import { syntheticStockSeries } from './__tests__/launch-series';
import { syntheticGranularBuildings } from './__tests__/granular-buildings';
import { recordedInput } from './__tests__/recorded';
import { reviewSpSlides } from './review';
import { SpMarketStateSlide } from './SpMarketStateSlide';
import { SpStockMapSlide } from './SpStockMapSlide';
import { SpDetailSlide } from './SpDetailSlide';

function fixture(swap?:[string,string]){
  const report=buildSpTemporalPreview(recordedInput(),'3T2026');
  report.stockSeries=buildSpStockSeries(syntheticStockSeries(),report);
  const buildings=syntheticGranularBuildings();
  if(swap)for(const building of buildings){if(building.standard===swap[0])building.standard=swap[1];else if(building.standard===swap[1])building.standard=swap[0];}
  const granularDetails=buildSpGranularDetails(buildings,report);
  return {report:{...report,granularDetails},buildings};
}
const history=(building:Record<string,unknown>)=>building.typologies_history as Record<string,unknown>[];
const state=(report:ReturnType<typeof fixture>['report'],slide:number)=>reviewSpSlides(report,'synthetic-map-key').find(row=>row.number===slide)!;
const svgText=(html:string)=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');

describe('SP — guardas limitadas às dimensões usadas por cada slide',()=>{
  it('mantém preços gerais, dormitórios, áreas e mapas sem padrão com total e cobertura iguais',()=>{
    const original=fixture().report,{report}=fixture(['Alto','Luxo']),data=report.granularDetails;
    expect(data.prices.overall).toEqual(original.granularDetails.prices.overall);
    for(const slide of [53,54,55,56,57,58,59])expect(data.prices.series[slide]).toEqual(original.granularDetails.prices.series[slide]);
    expect(data.area).toEqual(original.granularDetails.area);
    expect(data.warnings!.length).toBeGreaterThan(0);
    for(const slide of [51,53,54,55,56,57,58,59,63,64,66,67,68,72,73,74,75,76,77,79,80]){
      expect(state(report,slide).state,`slide ${slide}`).toBe('available');
      expect(state(report,slide).reason).toContain('ressalvas');
    }
    expect(state(report,1).reason).not.toContain('ressalvas');
    expect(state(original,53).reason).not.toContain('ressalvas');
  });
  it('retém apenas padrões divergentes nas médias e protege tabelas/mapas por padrão',()=>{
    const {report}=fixture(['Alto','Luxo']),prices=report.granularDetails.prices;
    for(const group of ['Alto','Luxo'])expect(prices.standards.find(row=>row.group===group)!.meter).toBeNull();
    for(const group of ['Compacto','Econômico','Standard','Médio','Médio-Alto'])expect(prices.standards.find(row=>row.group===group)!.meter).not.toBeNull();
    for(const slide of [61,62])expect(state(report,slide).state).toBe('partial');
    for(const slide of [69,70,71,78])expect(state(report,slide).state).toBe('blocked');
    for(const slide of [69,78])expect(svgText(renderToStaticMarkup(<SpMarketStateSlide report={report} slide={slide}/>))).toContain('Classificação ainda não reconciliada');
    expect(renderToStaticMarkup(<SpStockMapSlide report={report} slide={70} token=""/>)).toContain('Classificação por padrão em conferência');
    expect(renderToStaticMarkup(<SpMarketStateSlide report={report} slide={66}/>)).not.toContain('Dados em conferência');
  });
  it('isola MCMV e segmentos quando Econômico troca com outro segmento',()=>{
    const {report}=fixture(['Econômico','Compacto']),data=report.granularDetails;
    for(const slide of [53,54,56,58,59])expect(state(report,slide).state).toBe('available');
    for(const slide of [55,57])expect(state(report,slide).state).toBe('blocked');
    expect(data.area.status).toBe('blocked');expect(state(report,77).state).toBe('blocked');
    expect(state(report,76).state).toBe('available');
    for(const slide of [63,64])expect(state(report,slide).state).toBe('partial');
    for(const row of data.market!.prices){expect(row.ticket).not.toBeNull();expect(row.mcmv.ticket).toBeNull();expect(row.map.ticket).toBeNull();}
    expect(svgText(renderToStaticMarkup(<SpMarketStateSlide report={report} slide={77}/>))).toContain('Classificação ainda não reconciliada');
  });
  it('não deixa discrepância de venda fora do MCMV bloquear IVV por área',()=>{
    const {report,buildings}=fixture();
    const a=buildings.find(row=>row.standard==='Alto')!,b=buildings.find(row=>row.standard==='Luxo')!;
    history(a).find(row=>row.period==='2026-07-01')!.sold_in_period=Number(history(a).find(row=>row.period==='2026-07-01')!.sold_in_period)+2;
    history(b).find(row=>row.period==='2026-07-01')!.sold_in_period=Number(history(b).find(row=>row.period==='2026-07-01')!.sold_in_period)-2;
    const changed=buildSpGranularDetails(buildings,report);
    expect(changed.area.status).toBe('ready');expect(changed.area.total).toEqual(report.granularDetails.area.total);
    expect(changed.warnings!.some(row=>row.startsWith('Vendas do período'))).toBe(true);
  });
  it('não libera estoques nem médias quando o próprio total diverge ou a fotografia é incompleta',()=>{
    for(const kind of ['total','missing']){
      const {report,buildings}=fixture(['Alto','Luxo']),rows=history(buildings[0]);
      const index=rows.findIndex(row=>row.period==='2026-08-01');
      if(kind==='total')rows[index].typology_stock=Number(rows[index].typology_stock)+1;else rows[index].typology_stock=null;
      const data=buildSpGranularDetails(buildings,report);
      expect(data.prices.overall.meter).toBeNull();expect(data.market!.status).toBe('blocked');expect(data.area.status).toBe('blocked');
      expect(data.prices.series[53].at(-1)!.value).toBeNull();expect(data.prices.series[53][0].value).not.toBeNull();
    }
  });
  it('não exige classificação do estoque intermediário que a tabela de área não apresenta',()=>{
    const {report,buildings}=fixture();
    const a=history(buildings.find(row=>row.standard==='Econômico')!).find(row=>row.period==='2026-07-01')!;
    const b=history(buildings.find(row=>row.standard==='Compacto')!).find(row=>row.period==='2026-07-01')!;
    a.typology_stock=Number(a.typology_stock)-1;b.typology_stock=Number(b.typology_stock)+1;
    const changed=buildSpGranularDetails(buildings,report);
    expect(changed.area).toEqual(report.granularDetails.area);
    expect(changed.warnings!.some(row=>row.startsWith('2026-07:'))).toBe(true);
  });
  it('preserva a média geral no gráfico mesmo quando todos os padrões têm classificação divergente',()=>{
    const {report}=fixture(),data=report.granularDetails;
    for(const row of data.prices.standards){row.ticket=null;row.meter=null;}
    for(const slide of [61,62]){
      expect(state(report,slide).state).toBe('partial');
      expect(renderToStaticMarkup(<SpDetailSlide report={report} slide={slide}/>)).not.toContain('Áreas e preços em conferência');
    }
  });
});
