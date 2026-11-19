import { describe, expect, it, vi } from 'vitest';
import { createMaceioRequestLane } from './request-lane';
import { response } from './__tests__/market-fixture';

describe('Maceió · ritmo compartilhado',()=>{
  it('serializa páginas/coletores e mantém todas as chamadas, inclusive repetidas',async()=>{
    let clock=0,active=0,peak=0;
    const times:number[]=[],sleep=vi.fn(async(ms:number)=>{clock+=ms;});
    const request=vi.fn(async()=>{active++;peak=Math.max(peak,active);times.push(clock);await Promise.resolve();active--;return response({data:[]});});
    const lane=createMaceioRequestLane({request,now:()=>clock,sleep});
    await Promise.all([1,2,3,4].map(()=>lane.request({url:'synthetic'})));
    expect(request).toHaveBeenCalledTimes(4);expect(peak).toBe(1);expect(times).toEqual([0,2000,4000,6000]);
  });
  it.each([undefined,90_000])('espera Retry-After ou 60s e retoma sem rajada (%s)',async(retryAfterMs)=>{
    let clock=0;const waits:number[]=[];
    const request=vi.fn().mockResolvedValueOnce({...response({},429),retryAfterMs}).mockResolvedValue(response({data:[]}));
    const lane=createMaceioRequestLane({request,now:()=>clock,sleep:async ms=>{waits.push(ms);clock+=ms;}});
    await Promise.all([lane.request({url:'a'}),lane.request({url:'b'})]);
    expect(waits).toEqual([retryAfterMs??60_000,2000]);expect(request).toHaveBeenCalledTimes(3);
  });
  it('429 persistente interrompe a fila sem enviar as próximas consultas',async()=>{
    const request=vi.fn(async()=>response({},429));let clock=0;
    const lane=createMaceioRequestLane({request,now:()=>clock,sleep:async ms=>{clock+=ms;}});
    const results=await Promise.allSettled([lane.request({url:'a'}),lane.request({url:'b'}),lane.request({url:'c'})]);
    expect(results.every(result=>result.status==='rejected')).toBe(true);expect(request).toHaveBeenCalledTimes(2);
    expect(()=>lane.assertAvailable()).toThrow();
  });
  it('cancelamento durante a pausa não dispara outra requisição',async()=>{
    const controller=new AbortController(),request=vi.fn(async()=>response({},429));
    const lane=createMaceioRequestLane({request,sleep:async()=>{controller.abort();}});
    await expect(lane.request({url:'a',signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
    expect(request).toHaveBeenCalledTimes(1);
  });
});
