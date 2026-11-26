import {describe,it,expect,vi} from 'vitest';
import type {HttpResponse} from '@/lib/http-client';
import type {Envelope} from '../../modelo-03/api';
import {collect} from '../api';
import {selection} from './fixture';
const response=(data:Envelope|null,status=200):HttpResponse<Envelope>=>({ok:status===200,status,data,text:null,contentType:'application/json',latencyMs:0,bytes:0,error:null,requestHeaders:{},requestQuery:{},requestBody:null,url:'',method:'GET'});
const empty=()=>response({data:[],meta:{current_page:1,last_page:1,total:0}});
describe('Modelo 02 · coleta regional',()=>{
 it('bloqueia chamadas pesadas sem catálogo ou período válido',async()=>{
  const request=vi.fn(async()=>empty()),options={token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},request};
  await expect(collect(selection,null,options)).rejects.toThrow(/catálogo/);await expect(collect({...selection,quarter:8},{PR:['Curitiba']},options)).rejects.toThrow(/inválida/);expect(request).not.toHaveBeenCalled();
 });
 it('consulta apenas cinco fontes verticais por cidade autorizada da região',async()=>{
  const calls:unknown[]=[],sources=await collect(selection,{PR:['Curitiba'],SP:['São Paulo']},{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},wait:async()=>{},request:async o=>{calls.push(o);return empty();}});
  expect(sources).toHaveLength(5);expect(sources.every(s=>s.city==='Curitiba'&&s.segment==='Vertical'&&s.complete)).toBe(true);expect(JSON.stringify(calls)).not.toMatch(/rent-resale|Horizontal|Comercial|São Paulo/);
  expect(calls[4]).toMatchObject({method:'POST',query:{city:'Curitiba',uf:'PR',type:'Vertical'}});
 });
 it('rejeita paginação contraditória e registros fora do escopo sem vazar corpo de erro',async()=>{
  const sources=await collect(selection,{PR:['Curitiba']},{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},wait:async()=>{},request:async()=>response({data:[{city:'São Paulo',state:'SP'}],meta:{current_page:1,last_page:1,total:1}})});
  expect(sources.every(s=>!s.complete&&s.failure?.startsWith('Registro fora'))).toBe(true);
  const pages=await collect(selection,{PR:['Curitiba']},{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},wait:async()=>{},request:async()=>response({data:[{city:'Curitiba',state:'PR'}],meta:{last_page:1},links:{next:'https://invalid.example/?page=2'}})});
  expect(pages.every(s=>!s.complete)).toBe(true);
 });
 it('respeita 500ms, pausa global de 429, retoma e permite cancelar',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-26T12:00:00Z'));
  try{const calls:number[]=[],states:boolean[]=[],controller=new AbortController();
   const pending=collect(selection,{PR:['Curitiba']},{token:'synthetic',signal:controller.signal,onProgress:p=>states.push(p.waiting),request:async()=>{calls.push(Date.now());return calls.length===1?{...response(null,429),retryAfterMs:3000}:empty();}});
   await vi.runAllTimersAsync();expect((await pending).every(s=>s.complete)).toBe(true);expect(calls[1]-calls[0]).toBeGreaterThanOrEqual(3000);expect(calls.slice(1).every((t,i)=>t-calls[i]>=500)).toBe(true);expect(states).toContain(true);
   const c=new AbortController();c.abort();await expect(collect(selection,{PR:['Curitiba']},{token:'synthetic',signal:c.signal,onProgress:()=>{},request:async()=>empty()})).rejects.toMatchObject({name:'AbortError'});
  }finally{vi.useRealTimers();}
 });
});
