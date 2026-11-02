import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { buildSpGranularDetails } from './granular-details';
import { syntheticGranularBuildings } from './__tests__/granular-buildings';
import { recordedInput } from './__tests__/recorded';
import { syntheticStockSeries, syntheticLaunchSeries, syntheticSalesSeries } from './__tests__/launch-series';
import { buildSpStockSeries } from './stock-series';
import { buildSpLaunchSeries, buildSpSalesSeries } from './launch-series';
import { buildSpTemporalPreview } from './temporal';
import { SP_MARKET_SLIDES } from './market-details';
import { spMapPlan } from './map-model';
import { SpReportPages } from './SpReportPages';
import { SP_ORIGINAL_SLIDES } from './original-slides';
import { SP_INSTITUTIONAL_ASSETS } from './institutional-assets';
import { SpStockMapSlide } from './SpStockMapSlide';

function baseline(buildings=syntheticGranularBuildings()) {
  const report=buildSpTemporalPreview(recordedInput(),'3T2026');
  report.stockSeries=buildSpStockSeries(syntheticStockSeries(),report);
  report.launchSeries=buildSpLaunchSeries(syntheticLaunchSeries(),report);
  report.salesSeries=buildSpSalesSeries(syntheticSalesSeries(),report);
  report.granularDetails=buildSpGranularDetails(buildings,report);
  return report;
}
const current=(building:Record<string,unknown>)=>(building.typologies_history as Record<string,unknown>[]).filter(row=>row.period==='2026-08-01');
afterEach(()=>{cleanup();vi.unstubAllEnvs();});

describe('SP — lote final de 28 posições originais',()=>{
  it('oculta tiles quebrados e encerra o carregamento preservando os pontos e o aviso',()=>{
    const {container}=render(<SpStockMapSlide report={baseline()} slide={67} token="synthetic-only"/>);
    expect(screen.getByText(/Carregando base cartográfica/)).toBeInTheDocument();
    const tiles=Array.from(container.querySelectorAll('image'));
    expect(tiles.length).toBeGreaterThan(0);
    for(const tile of tiles)fireEvent.error(tile);
    expect(screen.queryByText(/Carregando base cartográfica/)).not.toBeInTheDocument();
    expect(screen.getByText('Base cartográfica parcialmente indisponível.')).toBeInTheDocument();
    expect(tiles.every(tile=>(tile as SVGElement).style.visibility==='hidden')).toBe(true);
    expect(container.querySelectorAll('circle title').length).toBeGreaterThan(0);
  });
  it('renderiza os 28 originais sem conteúdo pendente ou conferência na amostra completa',()=>{
    vi.stubEnv('VITE_MAPBOX_ACCESS_TOKEN','');
    render(<SpReportPages report={baseline()}/>);
    const originals=[3,4,5,7,9,10,11,...SP_MARKET_SLIDES,82,83,84,85];
    expect(originals).toHaveLength(28);
    expect(Object.keys(SP_INSTITUTIONAL_ASSETS)).toHaveLength(8);
    for(const number of originals){
      fireEvent.click(screen.getByRole('button',{name:`${number}. ${SP_ORIGINAL_SLIDES[number-1].title}`}));
      expect(screen.getByRole('article')).not.toHaveTextContent(/Conteúdo pendente|Dados em conferência|Destaque em conferência|Localizações em conferência/);
      expect(screen.getByRole('article').querySelector('svg,img')).not.toBeNull();
    }
  });
  it('conserva os totais nas coortes, padrões, tipologias, matriz e capacidade',()=>{
    const report=baseline(),market=report.granularDetails!.market!;
    expect(market.status).toBe('ready');
    for(const rows of [market.cohorts,market.standards,market.bedrooms])expect(rows.reduce((sum,row)=>sum+row.units,0)).toBe(report.metrics.stock);
    expect(market.matrix.status).toBe('ready');
    expect(market.matrix.rows.reduce((sum,row)=>sum+row.total,0)).toBe(report.metrics.stock);
    expect(market.stages.final.ready).toBe(true);
    expect(market.stages.final.typologies.reduce((sum,row)=>sum+row.total,0)).toBe(report.metrics.stock);
    expect(market.stages.launched.typologies.reduce((sum,row)=>sum+row.total,0)).toBe(market.vgv.total!.qty);
    expect(market.vgv.ready).toBe(true);
    expect(market.vgv.total!.qty).toBe(market.vgv.total!.sold+market.vgv.total!.stock);
    expect(market.vgv.total!.offeredVgv!).toBeCloseTo(market.vgv.total!.soldVgv!+market.vgv.total!.stockVgv!,1);
  });
  it('calcula MAP e MCMV por unidades, sem média de médias',()=>{
    const buildings=syntheticGranularBuildings(),market=baseline(buildings).granularDetails!.market!;
    const rows=buildings.flatMap(building=>current(building).map(row=>({...row,standard:building.standard} as Record<string,unknown>))).filter(row=>Number(row.typology_stock)>0&&Number(row.number_bedroom)===1&&row.standard!=='Econômico');
    expect(rows.length).toBeGreaterThan(0);
    const units=rows.reduce((sum,row)=>sum+Number(row.typology_stock),0);
    expect(market.prices[0].map.ticket).toBeCloseTo(rows.reduce((sum,row)=>sum+Number(row.price)*Number(row.typology_stock),0)/units);
  });
  it('falta de estágio bloqueia somente estágio; capacidade incompatível bloqueia somente VGV',()=>{
    const buildings=syntheticGranularBuildings();
    current(buildings[0])[0].building_status=null;
    let market=baseline(buildings).granularDetails!.market!;
    expect(market.stages.final.ready).toBe(false);expect(market.vgv.ready).toBe(true);expect(market.matrix.status).toBe('ready');
    current(buildings[0])[0].sold=0;
    market=baseline(buildings).granularDetails!.market!;
    expect(market.vgv.ready).toBe(false);expect(market.cohorts.reduce((s,row)=>s+row.units,0)).toBe(market.total);
  });
  it('mapas preservam cobertura e não inventam coordenadas nem preços',()=>{
    const buildings=syntheticGranularBuildings();buildings[0].latitude=null;
    current(buildings.find(row=>row.building_id===2)!)[0].price_private_area=null;current(buildings.find(row=>row.building_id===2)!)[0].price=null;
    const market=baseline(buildings).granularDetails!.market!;
    expect(market.projects[0].latitude).toBeNull();
    for(const mode of ['stock','standard','meter','vgv'] as const){
      const wide=spMapPlan(market.projects,mode,false,''),close=spMapPlan(market.projects,mode,true,'');
      expect(wide.totalUnits).toBe(market.total);expect(wide.mappedUnits).toBeLessThan(market.total);
      expect(wide.all.length).toBe(market.projects.length-1);expect(wide.plan!.tiles.length).toBeLessThanOrEqual(20);
      expect(close.plan!.tiles).toHaveLength(15);expect(close.limits).toEqual(wide.limits);
      expect(close.plan!.zoom).toBeGreaterThan(wide.plan!.zoom);
      for(const point of wide.positioned)expect(Number.isFinite(point.left)&&Number.isFinite(point.top)).toBe(true);
      if(mode==='meter')expect(wide.missingValues).toBeGreaterThan(0);
    }
  });
  it('inclui studio e dormitórios desconhecidos nos totais em vez de descartar unidades',()=>{
    const buildings=syntheticGranularBuildings();current(buildings[0])[0].number_bedroom=0;current(buildings.find(row=>row.building_id===2)!)[0].number_bedroom=null;
    const market=baseline(buildings).granularDetails!.market!;
    expect(market.bedrooms.map(row=>row.label)).toContain('Studio / 0 dormitórios');
    expect(market.bedrooms.map(row=>row.label)).toContain('Não informado');
    expect(market.matrix.totals.reduce((a,b)=>a+b,0)).toBe(market.total);
    expect(market.prices.every(row=>row.ticket===null)).toBe(true);
  });
});
