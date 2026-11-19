import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMaceioRequestLane } from './request-lane';
import { response } from './__tests__/market-fixture';

afterEach(()=>vi.useRealTimers());
describe('Maceio request pacing',()=>{
  it('spaces starts by 500ms without dropping repeated calls',async()=>{
    vi.useFakeTimers();const starts:number[]=[];const base=Date.now();
    const request=vi.fn(async()=>{starts.push(Date.now()-base);return response({data:[]});});
    const lane=createMaceioRequestLane({request});
    const all=Promise.all([1,2,3,4].map(()=>lane.request({url:'synthetic'})));
    await vi.advanceTimersByTimeAsync(2000);await all;
    expect(starts).toEqual([0,500,1000,1500]);expect(request).toHaveBeenCalledTimes(4);
  });
  it('overlaps slow responses with at most two active requests',async()=>{
    vi.useFakeTimers();const base=Date.now(),starts:number[]=[];let active=0,peak=0;
    const request=vi.fn(async()=>{starts.push(Date.now()-base);peak=Math.max(peak,++active);await new Promise(resolve=>setTimeout(resolve,5000));active--;return response({data:[]});});
    const lane=createMaceioRequestLane({request});const all=Promise.all([1,2,3,4].map(()=>lane.request({url:'slow'})));
    await vi.advanceTimersByTimeAsync(11000);await all;
    expect(peak).toBe(2);expect(starts).toEqual([0,500,5000,5500]);
  });
  it.each([undefined,90_000])('waits for Retry-After or 60s before recovering (%s)',async retryAfterMs=>{
    vi.useFakeTimers();const base=Date.now(),starts:number[]=[],waiting=vi.fn();
    const request=vi.fn(async()=>{starts.push(Date.now()-base);return starts.length===1?{...response({},429),retryAfterMs}:response({data:[]});});
    const lane=createMaceioRequestLane({request,onWaiting:waiting});const result=lane.request({url:'limited'});
    await vi.advanceTimersByTimeAsync(retryAfterMs??60_000);expect((await result).ok).toBe(true);
    expect(starts).toEqual([0,retryAfterMs??60_000]);expect(waiting.mock.calls.map(call=>call[0])).toEqual([true,false]);
  });
  it('keeps pausing on repeated 429 until recovery',async()=>{
    vi.useFakeTimers();const starts:number[]=[],base=Date.now();
    const request=vi.fn(async()=>{starts.push(Date.now()-base);return response({},starts.length<=3?429:200);});
    const lane=createMaceioRequestLane({request});const result=lane.request({url:'limited'});
    await vi.advanceTimersByTimeAsync(180000);expect((await result).ok).toBe(true);
    expect(starts).toEqual([0,60000,120000,180000]);
  });
  it('pauses every queued caller, even when another response succeeds during cooldown',async()=>{
    vi.useFakeTimers();const starts:number[]=[],base=Date.now();
    const request=vi.fn(async()=>{const index=starts.length;starts.push(Date.now()-base);await new Promise(resolve=>setTimeout(resolve,index===0?1000:2000));return response({},index===0?429:200);});
    const lane=createMaceioRequestLane({request});const all=Promise.all([1,2,3].map(()=>lane.request({url:'shared'})));
    await vi.advanceTimersByTimeAsync(70000);await all;
    expect(starts.slice(0,2)).toEqual([0,500]);expect(starts.slice(2).every(start=>start>=61000)).toBe(true);
  });
  it('cancels a cooldown without sending the retry',async()=>{
    vi.useFakeTimers();const controller=new AbortController(),request=vi.fn(async()=>response({},429));
    const lane=createMaceioRequestLane({request});const result=lane.request({url:'cancel',signal:controller.signal}).catch(error=>error);
    await vi.advanceTimersByTimeAsync(1);controller.abort();expect(await result).toMatchObject({name:'AbortError'});expect(request).toHaveBeenCalledTimes(1);
  });
});
