import { describe,expect,it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSpGranularDetails, buildSpGranularDetailsAsync, spAreaBand, SP_DETAIL_SLIDES } from './granular-details';
import { syntheticGranularBuildings } from './__tests__/granular-buildings';
import { recordedInput } from './__tests__/recorded';
import { syntheticStockSeries } from './__tests__/launch-series';
import { buildSpStockSeries } from './stock-series';
import { buildSpTemporalPreview } from './temporal';
import { SpDetailSlide } from './SpDetailSlide';
const baseline = () => { const report=buildSpTemporalPreview(recordedInput(),'3T2026'); report.stockSeries=buildSpStockSeries(syntheticStockSeries(),report); return report; };
const histories = (building:Record<string,unknown>) => building.typologies_history as Record<string,unknown>[];
describe('SP — áreas e preços nos dez originais51/53–59/61/62',()=>{
  it('reconcilia tabela por área e monta exatamente dez posições originais',()=>{
    const report=baseline(), details=buildSpGranularDetails(syntheticGranularBuildings(),report);
    expect(details.status).toBe('ready'); expect(details.area.status).toBe('ready');
    expect(details.area.total).toMatchObject({ openingStock:report.monthly![0].openingStock,stock:report.metrics.stock,launches:report.metrics.launches,sales:report.metrics.sales });
    expect(details.area.rows).toHaveLength(14); expect(details.prices.series[53]).toHaveLength(13);
    for(const slide of SP_DETAIL_SLIDES) { const html=renderToStaticMarkup(<SpDetailSlide report={{...report,granularDetails:details}} slide={slide}/>); expect(html).not.toContain('em conferência'); expect(html).not.toContain('Conteúdo pendente'); }
  });
  it('pondera por unidades em oferta e calcula geral direto das unidades, sem média de médias',()=>{
    const report=baseline(), buildings=syntheticGranularBuildings(), details=buildSpGranularDetails(buildings,report);
    const rows=buildings.flatMap(histories).filter(row=>row.period==='2026-08-01'&&Number(row.typology_stock)>0);
    const units=rows.reduce((sum,row)=>sum+Number(row.typology_stock),0);
    const ticket=rows.reduce((sum,row)=>sum+Number(row.price)*Number(row.typology_stock),0)/units;
    const meter=rows.reduce((sum,row)=>sum+Number(row.price_private_area)*Number(row.typology_stock),0)/units;
    expect(details.prices.overall.units).toBe(report.metrics.stock); expect(details.prices.overall.ticket).toBeCloseTo(ticket); expect(details.prices.overall.meter).toBeCloseTo(meter);
    expect(details.prices.overall.meter).not.toBeCloseTo(details.prices.standards.reduce((sum,row)=>sum+row.meter!,0)/7);
  });
  it('exclui somente Econômico dos recortes sem MCMV e compara agosto com agosto na variação anual',()=>{
    const details=buildSpGranularDetails(syntheticGranularBuildings(),baseline());
    expect(details.prices.series[55].at(-1)!.value).not.toBe(details.prices.series[54].at(-1)!.value);
    expect(details.prices.series[57].at(-1)!.value).not.toBe(details.prices.series[56].at(-1)!.value);
    const buildings=syntheticGranularBuildings(); for(const building of buildings) for(const row of histories(building)) if(row.period==='2025-08-01') row.price_private_area=1;
    const changed=buildSpGranularDetails(buildings,baseline());
    expect(changed.prices.annualChanges[53]).not.toBe(details.prices.annualChanges[53]);
    expect(changed.prices.series[53].find(row=>row.label==='3T2025')!.value).toBe(details.prices.series[53].find(row=>row.label==='3T2025')!.value);
  });
  it('usa faixas contínuas sem arredondar áreas nem supor MCMV por metragem',()=>{
    expect(spAreaBand(34.99,true)).toBe(0); expect(spAreaBand(34.99,false)).toBe(1); expect(spAreaBand(35,true)).toBe(2); expect(spAreaBand(39.99,false)).toBe(3); expect(spAreaBand(40,true)).toBe(4);
    expect(spAreaBand(44.99,false)).toBe(4); expect(spAreaBand(45,false)).toBe(5); expect(spAreaBand(150.9,false)).toBe(10); expect(spAreaBand(151,false)).toBe(11); expect(spAreaBand(250.99,false)).toBe(12); expect(spAreaBand(251,false)).toBe(13); expect(spAreaBand(0,true)).toBeNull();
  });
  it('deduplica identidades equivalentes e impede conflito no mês afetado',()=>{
    const report=baseline(), buildings=syntheticGranularBuildings(), row=histories(buildings[0]).find(row=>row.period==='2026-08-01')!;
    histories(buildings[0]).push({...row}); expect(buildSpGranularDetails([...buildings,buildings[0]],report).area.status).toBe('ready');
    histories(buildings[0]).push({...row,price:1}); const result=buildSpGranularDetails(buildings,report);
    expect(result.prices.overall.meter).toBeNull(); expect(result.prices.series[53][0].value).not.toBeNull();
  });
  it('falta de venda bloqueia só área, enquanto falta de preço não altera contagens por área',()=>{
    const buildings=syntheticGranularBuildings(); histories(buildings[0]).find(row=>row.period==='2026-07-01')!.sold_in_period=null;
    const result=buildSpGranularDetails(buildings,baseline()); expect(result.area.status).toBe('blocked'); expect(result.prices.overall.meter).not.toBeNull();
    const priced=syntheticGranularBuildings(); histories(priced[0]).find(row=>row.period==='2026-08-01')!.price=null;
    const changed=buildSpGranularDetails(priced,baseline()); expect(changed.area.status).toBe('ready'); expect(changed.prices.overall.ticket).toBeNull(); expect(changed.prices.overall.meter).not.toBeNull();
  });
  it('ausência de estoque/fotografia não vira zero nem inclui amostra parcial na média',()=>{
    const buildings=syntheticGranularBuildings(); histories(buildings[0]).find(row=>row.period==='2026-08-01')!.typology_stock=null;
    const result=buildSpGranularDetails(buildings,baseline()); expect(result.area.status).toBe('blocked'); expect(result.prices.overall.meter).toBeNull();
    const missing=syntheticGranularBuildings(); missing[0].typologies_history=histories(missing[0]).filter(row=>row.period!=='2024-09-01');
    const gap=buildSpGranularDetails(missing,baseline()); expect(gap.prices.series[53].find(row=>row.label==='3T2024')!.value).toBeNull(); expect(gap.prices.series[53].at(-1)!.value).not.toBeNull();
  });
  it('estoque zero comprovado não ganha peso por quantidade lançada nem exige preço',()=>{
    const buildings=syntheticGranularBuildings(); for(const building of buildings.filter(row=>Number(row.building_id)>=100)) for(const row of histories(building)) { row.price=null; row.price_private_area=null; }
    expect(buildSpGranularDetails(buildings,baseline()).prices.overall.meter).not.toBeNull();
  });
  it('rejeita fluxo por área divergente sem inventar lançamento pela diferença de estoques',()=>{
    const buildings=syntheticGranularBuildings(), launch=buildings.find(row=>Number(row.building_id)>=100)!; histories(launch).find(row=>row.period===launch.release_date)!.qty=1;
    const result=buildSpGranularDetails(buildings,baseline()); expect(result.area.status).toBe('blocked'); expect(result.prices.overall.meter).not.toBeNull();
  });
  it('processamento local permite cancelar antes de entregar resultado',async()=>{
    const controller=new AbortController();
    await expect(buildSpGranularDetailsAsync(syntheticGranularBuildings(),baseline(),{signal:controller.signal,onProgress:()=>controller.abort()})).rejects.toMatchObject({name:'AbortError'});
  });
});
