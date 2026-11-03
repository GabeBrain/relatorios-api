import { describe,it,expect } from 'vitest';
import { spHistoricalPattern,spHistoricalStage } from './history-fields';
import { syntheticGranularBuildings } from './__tests__/granular-buildings';
import { recordedInput } from './__tests__/recorded';
import { syntheticStockSeries } from './__tests__/launch-series';
import { buildSpTemporalPreview } from './temporal';
import { buildSpStockSeries } from './stock-series';
import { buildSpGranularDetails } from './granular-details';
import { buildSpSalesNeighborhoods } from './sales-neighborhoods';
import { reviewSpSlides,spReviewSnapshot } from './review';

const histories=(building:Record<string,unknown>)=>building.typologies_history as Record<string,unknown>[];
function fixture(){const report=buildSpTemporalPreview(recordedInput(),'3T2026');report.stockSeries=buildSpStockSeries(syntheticStockSeries(),report);return {report,buildings:syntheticGranularBuildings()};}

describe('SP — campos da mesma fotografia, sem sobrescrever com cadastro atual',()=>{
  it('prefere padrão mensal ao cadastro, mantém recortes reconciliados e lê estágio construtivo',()=>{
    const {report,buildings}=fixture(),original=buildSpGranularDetails(buildings,report),ranking=buildSpSalesNeighborhoods(buildings,report);
    for(const building of buildings){for(const row of histories(building)){row.pattern=building.standard;row.estagio_empreendimento='Pronto';row.building_status='Ativo';}building.standard='Alto';}
    const changed=buildSpGranularDetails(buildings,report);
    expect(changed.prices).toEqual(original.prices);expect(changed.area).toEqual(original.area);
    expect(changed.warnings).toEqual([]);expect(changed.market!.classificationIssues?.mcmv).toBeUndefined();
    expect(changed.market!.stages.final.ready).toBe(true);expect(changed.market!.stages.launched.ready).toBe(true);
    expect(buildSpSalesNeighborhoods(buildings,report)).toEqual(ranking);
    const review=reviewSpSlides({...report,granularDetails:changed});
    for(const number of [55,57,61,62,63,64,69,76,77,78])expect(review.find(row=>row.number===number)!.state,`slide ${number}`).toBe('available');
  });
  it('aceita cadastro legado apenas na ausência do padrão mensal e não oculta padrão explícito desconhecido',()=>{
    for(const raw of [undefined,null,'','  '])expect(spHistoricalPattern({pattern:raw},{standard:'Econômico'})).toBe('Econômico');
    for(const raw of ['Desconhecido','Futuro',5,{}])expect(spHistoricalPattern({pattern:raw},{standard:'Econômico'})).toBeNull();
    expect(spHistoricalPattern({pattern:' Luxo '},{standard:null})).toBe('Luxo');
    const {report,buildings}=fixture();histories(buildings[0]).find(row=>row.period==='2026-08-01')!.pattern='Desconhecido';
    const changed=buildSpGranularDetails(buildings,report);
    expect(changed.prices.overall.meter).toBeNull();expect(changed.prices.overall.issues[0]).toContain('Empreendimento 1, competência 2026-08');
  });
  it('não presume estágio a partir de Ativo/Esgotado nem troca um estágio explícito inválido pelo legado',()=>{
    expect(spHistoricalStage({estagio_empreendimento:'Construção',building_status:'Ativo'})).toBe('Construção');
    expect(spHistoricalStage({building_status:'Pronto'})).toBe('Pronto');
    const {report,buildings}=fixture();const row=histories(buildings[0]).find(row=>row.period==='2026-08-01')!;
    row.estagio_empreendimento='Indefinido';row.building_status='Planta';
    let changed=buildSpGranularDetails(buildings,report);
    expect(changed.market!.stages.final.ready).toBe(false);
    expect(changed.market!.stages.final.issues[0]).toContain('Empreendimento 1, tipologia 101, competência 2026-08');
    delete row.estagio_empreendimento;row.building_status='Esgotado';
    changed=buildSpGranularDetails(buildings,report);
    expect(changed.market!.stages.final.ready).toBe(false);expect(changed.market!.stages.final.issues[0]).toContain('Ativo/Esgotado não representam');
  });
  it('identifica estoque nulo e não reconstrói o valor por qty menos sold',()=>{
    const {report,buildings}=fixture(),row=histories(buildings[0]).find(row=>row.period==='2026-08-01')!;
    row.typology_stock=null;
    const changed=buildSpGranularDetails(buildings,report);
    expect(changed.area.status).toBe('blocked');expect(changed.area.issues[0]).toContain('Empreendimento 1, tipologia 101, competência 2026-08');
    expect(changed.area.issues[0]).toContain('typology_stock');expect(changed.prices.overall.meter).toBeNull();
    const snapshot=spReviewSnapshot({...report,granularDetails:changed},reviewSpSlides({...report,granularDetails:changed}));
    expect(snapshot.sourceDiagnostics.find(row=>row.month==='2026-08')!.samples[0]).toContain('tipologia 101');
  });
  it('leva empreendimento e competência da primeira lacuna histórica ao checklist parcial',()=>{
    const {report,buildings}=fixture();buildings[0].typologies_history=histories(buildings[0]).filter(row=>row.period!=='2023-09-01');
    const changed=buildSpGranularDetails(buildings,report),slide=reviewSpSlides({...report,granularDetails:changed}).find(row=>row.number===53)!;
    expect(slide.state).toBe('partial');expect(slide.reason).toContain('Empreendimento 1');expect(slide.reason).toContain('2023-09');
    expect(changed.prices.overall.meter).not.toBeNull();
  });
  it('localiza a tipologia sem preço usado na média, preservando medição independente válida',()=>{
    const {report,buildings}=fixture(),row=histories(buildings[0]).find(row=>row.period==='2026-08-01')!;
    row.price=null;
    const changed=buildSpGranularDetails(buildings,report);
    expect(changed.prices.overall.ticket).toBeNull();expect(changed.prices.overall.meter).not.toBeNull();
    expect(changed.prices.overall.issues[0]).toContain('Empreendimento 1, tipologia 101, competência 2026-08');
  });
  it('limita exemplos por competência sem esconder a quantidade de falhas nem copiar históricos brutos',()=>{
    const {report,buildings}=fixture();
    for(const building of buildings)for(const row of histories(building))if(row.period==='2026-08-01')row.typology_stock=null;
    const changed=buildSpGranularDetails(buildings,report),diagnostic=changed.diagnostics!.find(row=>row.month==='2026-08')!;
    expect(diagnostic.issueCount).toBeGreaterThan(5);expect(diagnostic.samples).toHaveLength(5);
    const json=JSON.stringify(spReviewSnapshot({...report,granularDetails:changed},reviewSpSlides({...report,granularDetails:changed})));
    expect(json).not.toMatch(/typologies_history|latitude|longitude|Empreendimento simulado/);
  });
});
