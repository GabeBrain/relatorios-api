import { buildSpMunicipalPrices } from './municipal-prices';
import { describe,it,expect,vi } from 'vitest';
import { createSpGeneration,runSpGeneration,type SpGenerationServices,type SpGenerationSession } from './generation';
import { recordedInput } from './__tests__/recorded';
import { syntheticLaunchSeries,syntheticSalesSeries,syntheticStockSeries,syntheticVglInput } from './__tests__/launch-series';
import { syntheticGranularBuildings } from './__tests__/granular-buildings';
import { syntheticTypologyInput,syntheticPreviousTypology } from './__tests__/typology';
import { buildSpProjects } from './projects';
import { buildSpGranularDetailsAsync } from './granular-details';

function services() {
  const input=syntheticVglInput(recordedInput());
  return {
    fetchSpMunicipalPrices:vi.fn<SpGenerationServices['fetchSpMunicipalPrices']>(async report=>buildSpMunicipalPrices([],report)),
    fetchSpTemporalInput:vi.fn<SpGenerationServices['fetchSpTemporalInput']>(async(quarter,options)=>options?.groupBy==='Tipologia'?(quarter==='3T2025'?syntheticPreviousTypology(input):syntheticTypologyInput(input)):input),
    fetchSpProjects:vi.fn<SpGenerationServices['fetchSpProjects']>(async report=>buildSpProjects([{building_id:1,city:'São Paulo',state:'SP',building_type:'Vertical',release_date:'2026-07-01',standard:'Econômico'}],report)),
    fetchSpLaunchSeriesRows:vi.fn(async()=>syntheticLaunchSeries(input)),
    fetchSpSalesSeriesRows:vi.fn(async()=>syntheticSalesSeries(input)),
    fetchSpStockSeriesRows:vi.fn(async()=>syntheticStockSeries(input)),
    fetchSpBuildingRecords:vi.fn(async()=>syntheticGranularBuildings()),
    buildSpGranularDetailsAsync:vi.fn(buildSpGranularDetailsAsync),
  };
}
describe('Orquestração automática SP',()=>{
  it('preserva preços nativos quando a coleta detalhada falha',async()=>{
    const api=services();api.fetchSpBuildingRecords.mockRejectedValueOnce(new Error('offline'));
    const result=await runSpGeneration(createSpGeneration('3T2026'),{signal:new AbortController().signal,services:api,onUpdate:()=>{}});
    expect(result.state.report?.municipalPrices?.method).toBe('geobrain-reported-prices-v1');
    expect(result.state.report?.granularDetails?.status).toBe('blocked');
    expect(api.fetchSpMunicipalPrices.mock.invocationCallOrder[0]).toBeLessThan(api.fetchSpBuildingRecords.mock.invocationCallOrder[0]);
  });
  it('retoma falha de preço sem repetir históricos já coletados',async()=>{
    const api=services();
    api.fetchSpMunicipalPrices.mockImplementationOnce(async report=>buildSpMunicipalPrices([{metric:'medium-prices-meter',grouping:'overall',rows:[],issue:'Falha temporária'}],report));
    const options={signal:new AbortController().signal,services:api,onUpdate:()=>{}};
    const first=await runSpGeneration(createSpGeneration('3T2026'),options);
    expect(first.state.steps.find(step=>step.id==='details')?.status).toBe('failed');
    await runSpGeneration(first,{...options,retry:true});
    expect(api.fetchSpMunicipalPrices).toHaveBeenCalledTimes(2);expect(api.fetchSpBuildingRecords).toHaveBeenCalledOnce();
  });
  it('executa as fontes uma vez, mantém parcial e confere 85 slides',async()=>{
    const api=services(),updates:SpGenerationSession[]=[];
    const result=await runSpGeneration(createSpGeneration('3T2026'),{signal:new AbortController().signal,services:api,onUpdate:s=>updates.push(s)});
    expect(result.state.report?.status).toBe('partial');
    expect(result.state.steps.every(s=>!['waiting','running'].includes(s.status))).toBe(true);
    expect(result.state.steps.at(-1)?.work).toEqual({completed:85,total:85,unit:'slides'});
    expect(api.fetchSpBuildingRecords).toHaveBeenCalledOnce();expect(api.fetchSpTemporalInput).toHaveBeenCalledTimes(3);
    expect(updates.some(s=>s.state.steps.find(step=>step.id==='details')?.work?.unit==='empreendimentos')).toBe(true);
  });
  it('continua fontes independentes e na retomada repete só a falha e a montagem',async()=>{
    const api=services();api.fetchSpLaunchSeriesRows.mockRejectedValueOnce(new Error('provider-private'));
    const options={signal:new AbortController().signal,services:api,onUpdate:()=>{}};
    const first=await runSpGeneration(createSpGeneration('3T2026'),options);
    expect(first.state.steps.find(s=>s.id==='launches')?.status).toBe('failed');
    expect(first.state.report?.salesSeries?.status).toBe('ready');expect(api.fetchSpBuildingRecords).toHaveBeenCalledOnce();
    expect(JSON.stringify(first.state)).not.toContain('provider-private');
    const next=await runSpGeneration(first,{...options,retry:true});
    expect(next.state.steps.find(s=>s.id==='launches')?.status).toBe('succeeded');
    expect(api.fetchSpLaunchSeriesRows).toHaveBeenCalledTimes(2);expect(api.fetchSpSalesSeriesRows).toHaveBeenCalledOnce();expect(api.fetchSpBuildingRecords).toHaveBeenCalledOnce();
  });
  it('reprocessa detalhes dependentes da oferta recuperada sem repetir a coleta v2',async()=>{
    const api=services();api.fetchSpStockSeriesRows.mockRejectedValueOnce(new Error('offline'));
    const options={signal:new AbortController().signal,services:api,onUpdate:()=>{}};
    const first=await runSpGeneration(createSpGeneration('3T2026'),options);
    await runSpGeneration(first,{...options,retry:true});
    expect(api.fetchSpBuildingRecords).toHaveBeenCalledOnce();expect(api.buildSpGranularDetailsAsync).toHaveBeenCalledTimes(2);
  });
  it('cancela antes de iniciar a próxima etapa e preserva o relatório municipal',async()=>{
    const api=services(),controller=new AbortController();
    api.fetchSpProjects.mockImplementationOnce(async()=>{controller.abort();throw new DOMException('cancel','AbortError');});
    const result=await runSpGeneration(createSpGeneration('3T2026'),{signal:controller.signal,services:api,onUpdate:()=>{}});
    expect(result.state.phase).toBe('cancelled');expect(result.state.report?.monthly).toHaveLength(2);
    expect(api.fetchSpLaunchSeriesRows).not.toHaveBeenCalled();expect(api.fetchSpBuildingRecords).not.toHaveBeenCalled();
  });
  it('interrompe antes das fontes pesadas quando a consulta municipal falha',async()=>{
    const api=services();api.fetchSpTemporalInput.mockRejectedValueOnce(new Error('unavailable'));
    const result=await runSpGeneration(createSpGeneration('3T2026'),{signal:new AbortController().signal,services:api,onUpdate:()=>{}});
    expect(result.state.phase).toBe('failed');expect(api.fetchSpProjects).not.toHaveBeenCalled();expect(api.fetchSpBuildingRecords).not.toHaveBeenCalled();
  });
});
