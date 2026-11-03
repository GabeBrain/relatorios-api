import { describe, expect, it, vi } from 'vitest';
import { buildSpProjects, fetchSpProjects, fetchSpBuildingRecords, SP_BUILDING_HISTORY_V2 } from './projects';
import { buildSpTemporalPreview } from './temporal';
import { syntheticWindow } from './__tests__/synthetic-window';
import type { HttpResponse, RequestOptions } from '@/lib/http-client';

const report = (month: '07' | '08' | '09' = '09') => buildSpTemporalPreview(syntheticWindow(month), '3T2026');
const building = (id: number, release_date = '2026-09-01') => ({ building_id: id, city: 'São Paulo', state: 'SP', building_type: 'Vertical', release_date, period: '2026-08-01', status: 'Esgotado', total_units: 100, typologies_history: [{ period: '2026-09-01' }, { period: '2026-09-01' }] });
const reply = (data: unknown[], page = 1, total = data.length, last = 1) => ({ ok: true, status: 200, data: { data, meta: { current_page: page, total, last_page: last } } }) as unknown as HttpResponse<Record<string, unknown>>;

describe('SP — coleta granular adaptada do Panorama', () => {
  it('coleta históricos pela v2 com POST vazio, filtros na URL, autenticação e proveniência',async()=>{
    const signal=new AbortController().signal;
    const request=vi.fn(async(options:RequestOptions)=>reply([building(Number(options.query?.page))],Number(options.query?.page),3,3));
    const rows=await fetchSpBuildingRecords(report(),{request,signal});
    expect(rows).toHaveLength(3);expect(request).toHaveBeenCalledTimes(3);
    for(const [options] of request.mock.calls){
      expect(options).toMatchObject({url:SP_BUILDING_HISTORY_V2,method:'POST',headers:{'Content-Type':'application/json'},includeAuth:true,query:{city:'São Paulo',type:'Vertical',per_page:100},signal,cache:'no-store'});
      expect(options.body).toBeUndefined();expect(options.query).not.toHaveProperty('status');expect(options.query).not.toHaveProperty('building_id');
    }
    expect(rows[0].__panoramaSource).toMatchObject({source:'building-with-history-internal-v2',page:1});
  });
  it('confere todas as53 páginas e5229IDs antes de processar a coleção v2',async()=>{
    let active=0,maximum=0;
    const request=vi.fn(async(options:RequestOptions)=>{
      const page=Number(options.query?.page);active++;maximum=Math.max(maximum,active);
      await new Promise(done=>setTimeout(done,0));active--;
      const count=page===53?29:100;
      return reply(Array.from({length:count},(_,i)=>building((page-1)*100+i+1)),page,5229,53);
    });
    const rows=await fetchSpBuildingRecords(report(),{request});
    expect(rows).toHaveLength(5229);expect(new Set(rows.map(row=>row.building_id)).size).toBe(5229);
    expect(request).toHaveBeenCalledTimes(53);expect(maximum).toBe(3);
  });
  it.each([401,403])('não faz fallback para a v1 se a v2 nega acesso HTTP%s',async(status)=>{
    const request=vi.fn(async()=>({ok:false,status,data:null}) as HttpResponse<Record<string,unknown>>);
    await expect(fetchSpBuildingRecords(report(),{request})).rejects.toThrow('API v2 não autorizou');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('mantém falha de conexão visível e não tenta outra fonte silenciosamente',async()=>{
    const request=vi.fn(async()=>({ok:false,status:null,data:null}) as HttpResponse<Record<string,unknown>>);
    await expect(fetchSpBuildingRecords(report(),{request,sleep:async()=>{}})).rejects.toThrow('permissão da rota no navegador');
    for(const [options] of request.mock.calls as unknown as [RequestOptions][])expect(options.url).toBe(SP_BUILDING_HISTORY_V2);
  });
  it('preserva Retry-After da v2 acima de3segundos e cancelamento não publica coleção parcial',async()=>{
    let attempts=0;
    const sleep=vi.fn(async(milliseconds:number)=>{void milliseconds;}),request=vi.fn(async()=>++attempts===1?({...reply([]),ok:false,status:429,retryAfterMs:8000}):reply([building(1)]));
    expect(await fetchSpBuildingRecords(report(),{request,sleep})).toHaveLength(1);
    expect(sleep.mock.calls[0][0]).toBe(8000);
    const controller=new AbortController(),cancelled=vi.fn(async()=>{controller.abort();return reply([building(1)],1,2,2);});
    await expect(fetchSpBuildingRecords(report(),{request:cancelled,signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
    expect(cancelled).toHaveBeenCalledTimes(1);
  });
  it('conta IDs distintos por lançamento, sem multiplicar tipologias/unidades nem limitar pela raiz', () => {
    const rows = [building(1, '2026-07-12'), building(2, '2026-08-31'), building(3), building(3), building(4, '2026-06-30'), building(5, '2026-10-01')];
    expect(buildSpProjects(rows, report())).toMatchObject({ status: 'ready', total: 3, distinct: 5, monthly: [{ month: '2026-07', value: 1 }, { month: '2026-08', value: 1 }, { month: '2026-09', value: 1 }] });
    expect(buildSpProjects(rows, report('08')).total).toBe(2);
    expect(buildSpProjects(rows, report('07')).total).toBe(1);
  });
  it('cobertura completa sem lançamentos no período pode resultar em zero', () => {
    expect(buildSpProjects([building(1, '2026-01-01')], report()).total).toBe(0);
  });
  it.each(['', '2026-02-30', '2026-13-01', 'inválida'])('não infere zero quando data é inválida: %s', date => {
    expect(() => buildSpProjects([building(1, date)], report())).toThrow(/data de lançamento/);
  });
  it('bloqueia conflito de ID e recorte inválido', () => {
    expect(() => buildSpProjects([building(1), building(1, '2026-08-01')], report())).toThrow(/conflitantes/);
    for (const patch of [{ city: 'Campinas' }, { state: 'RJ' }, { building_type: 'Horizontal' }]) expect(() => buildSpProjects([{ ...building(1), ...patch }], report())).toThrow(/fora/);
  });
  it('pagina o cadastro sem histórico nem filtro de status e mantém escopo, cancelamento e no-store', async () => {
    const signal = new AbortController().signal;
    const request = vi.fn(async (options: RequestOptions) => Number(options.query?.page) === 1 ? reply([building(1), building(2)], 1, 3, 2) : reply([building(3)], 2, 3, 2));
    const result = await fetchSpProjects(report(), { request, signal });
    expect(result).toMatchObject({ total: 3, distinct: 3, received: 3 });
    expect(request).toHaveBeenCalledTimes(2);
    for (const [options] of request.mock.calls) {
      expect(options).toMatchObject({ url: 'https://geobrain.com.br/public-api/building', method: 'GET', cache: 'no-store', signal, query: { city: 'São Paulo', uf: 'SP', type: 'Vertical', per_page: 100 } });
      expect(options.query).not.toHaveProperty('status');
    }
  });
  it('busca até três páginas em paralelo e reconcilia mesmo com respostas fora de ordem', async () => {
    let active = 0, maximum = 0;
    const request = vi.fn(async (options: RequestOptions) => {
      const page = Number(options.query?.page);
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, page === 2 ? 20 : 1));
      active--;
      return reply([building(page)], page, 8, 8);
    });
    expect((await fetchSpProjects(report(), { request })).total).toBe(8);
    expect(maximum).toBe(3);
    expect(request).toHaveBeenCalledTimes(8);
  });
  it.each(['missing', 'changed', 'repeated', 'empty'])('recusa cobertura incompleta ou instável: %s', mode => {
    const request = vi.fn(async (options: RequestOptions) => Number(options.query?.page) === 1 ? reply([building(1)], 1, 2, 2) : reply(mode === 'empty' || mode === 'missing' ? [] : [building(mode === 'repeated' ? 1 : 2)], 2, mode === 'changed' ? 3 : 2, 2));
    return expect(fetchSpProjects(report(), { request })).rejects.toThrow();
  });
  it('falha HTTP não vira zero e cancelamento impede novas páginas', async () => {
    await expect(fetchSpProjects(report(), { request: async () => reply([]) })).rejects.toThrow();
    const request = vi.fn(async () => ({ ok: false, status: 403, data: null }) as HttpResponse<Record<string, unknown>>);
    await expect(fetchSpProjects(report(), { request })).rejects.toThrow();
    const controller = new AbortController();
    const abortRequest = vi.fn(async () => { controller.abort(); return reply([building(1)], 1, 2, 2); });
    await expect(fetchSpProjects(report(), { request: abortRequest, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(abortRequest).toHaveBeenCalledTimes(1);
  });
});
