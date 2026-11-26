import {describe,it,expect,vi} from 'vitest';
import {collect,sleep,type Envelope,type Request} from '../api';
import type {HttpResponse} from '@/lib/http-client';
import {fixture,selection} from './fixture';
import {createCalculator} from '../calculate';
import {DATA_DEFINITIONS} from '../blueprint';
import {auditSource} from '../diagnostic';
const response=(data:Envelope|null,status=200):HttpResponse<Envelope>=>({ok:status===200,status,data,text:null,contentType:'application/json',latencyMs:0,bytes:0,error:null,requestHeaders:{},requestQuery:{},requestBody:null,url:'',method:'GET'});
const catalog={PR:['Curitiba','Araucária']};
describe('Modelo 03 · coleta paginada e autorização',()=>{
 it.each([{city:'Blumenau',uf:'SC'},{city:'Curitiba',uf:'PR'},{city:'Natal',uf:'RN'}])('usa POST exigido pelo servidor e libera os quatro quadros de locação em $city',async scope=>{
  const s={...selection,...scope,position:3,includeRm:false,rmCities:[]},rental=fixture(s).find(source=>source.metric==='rentals')!;
  const calls:{method:string|undefined;query:unknown}[]=[];
  const sources=await collect(s,{[scope.uf]:[scope.city]},{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},wait:async()=>{},request:async options=>{
   if(!options.url.endsWith('rent-resale-property'))return response({data:[],meta:{current_page:1,last_page:1,total:0}});
   calls.push({method:options.method,query:options.query});if(options.method!=='POST')return response(null,405);
   return response({data:rental.rows,meta:{current_page:1,last_page:1,total:rental.rows.length}});
  }});
  expect(calls).toHaveLength(1);expect(calls[0]).toMatchObject({method:'POST',query:{cidade:scope.city,uf:scope.uf,tipo_negocio:'ALUGUEL',coletado_em_gt:'2026-06-30',coletado_em_lt:'2026-10-01'}});
  const source=sources.find(source=>source.metric==='rentals')!;expect(source.complete).toBe(true);expect(auditSource(source).requestMethod).toBe('POST');
  const c=createCalculator(s,sources);for(const d of DATA_DEFINITIONS.filter(d=>d.role?.startsWith('rental-'))){const slide=c.evaluate(d);expect(slide.status).toBe('available');expect(slide.sourceKeys).toContain(`${scope.uf}/${scope.city}/Vertical/rentals/Empreendimento`);}
 });
 it.each([{city:'Curitiba',uf:'PR',periodicity:'monthly'},{city:'Natal',uf:'RN',periodicity:'quarterly'},{city:'Teresina',uf:'PI',periodicity:'semiannual'}] as const)('sobrepõe respostas lentas em $city/$periodicity com intervalo global de 500ms e todas as fontes',async scope=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));
  try{
   let active=0,max=0;const starts:number[]=[],start=Date.now(),controller=new AbortController();
   const pending=collect({...selection,...scope,position:1,includeRm:false,rmCities:[]},{[scope.uf]:[scope.city]},{token:'synthetic',signal:controller.signal,onProgress:()=>{},request:async()=>{starts.push(Date.now());active++;max=Math.max(max,active);await sleep(1000,controller.signal);active--;return response({data:[],meta:{current_page:1,last_page:1,total:0}});}});
   await vi.runAllTimersAsync();const result=await pending;
   expect(max).toBe(2);expect(starts).toHaveLength(10);expect(starts.slice(1).every((t,i)=>t-starts[i]>=500)).toBe(true);
   expect(Date.now()-start).toBe(5500);expect(result.every(s=>s.complete)).toBe(true);
   expect(result.map(s=>`${s.metric}/${s.group}/${s.segment}`)).toEqual(['releases/Padrão/Vertical','releases/Tipologia/Vertical','sales/Padrão/Vertical','sales/Tipologia/Vertical','stock/Padrão/Vertical','stock/Tipologia/Vertical','details/Empreendimento/Vertical','details/Empreendimento/Horizontal','details/Empreendimento/Comercial','rentals/Empreendimento/Vertical']);
  }finally{vi.useRealTimers();}
 });
 it('cancela as duas requisições em voo sem despachar as fontes seguintes',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));
  try{
   const controller=new AbortController(),signals:AbortSignal[]=[];
   const pending=collect({...selection,includeRm:false,rmCities:[]},catalog,{token:'synthetic',signal:controller.signal,onProgress:()=>{},request:async o=>{signals.push(o.signal!);await sleep(10000,o.signal!);return response({data:[]});}}).catch(error=>error);
   await vi.advanceTimersByTimeAsync(750);expect(signals).toHaveLength(2);controller.abort();await vi.runAllTimersAsync();
   expect(await pending).toMatchObject({name:'AbortError'});expect(signals.every(s=>s.aborted)).toBe(true);expect(signals).toHaveLength(2);
  }finally{vi.useRealTimers();}
 });
 it('aplica Retry-After a ambas as filas e conserva a mesma página ao retomar',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));
  try{
   const calls:{at:number;page:unknown;group:unknown}[]=[],start=Date.now();
   const pending=collect({...selection,includeRm:false,rmCities:[]},catalog,{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},request:async o=>{calls.push({at:Date.now()-start,page:o.query?.page,group:o.query?.group_by});return calls.length===1?{...response(null,429),retryAfterMs:3000}:response({data:[],meta:{current_page:1,last_page:1,total:0}});}});
   await vi.runAllTimersAsync();const result=await pending;
   expect(calls.slice(1).every(c=>c.at>=3000)).toBe(true);expect(calls.filter(c=>c.group==='Padrão').every(c=>c.page===1)).toBe(true);expect(result[0].requests).toBe(2);expect(result.every(s=>s.complete)).toBe(true);
  }finally{vi.useRealTimers();}
 });
 it('consulta somente cidades selecionadas, sem duplicar principal, e confirma todas as páginas',async()=>{
  const input=fixture(),calls:string[]=[];const request:Request=async o=>{const q=o.query!,city=String(q.city??q.cidade),metric=o.url.endsWith('rent-resale-property')?'rentals':o.url.split('/').at(-1)==='building-with-history-internal'?'details':o.url.split('/').at(-1),segment=metric==='rentals'?'Vertical':String(q.type??(q['type[]'] as string[])[0]),group=String(q.group_by??'Empreendimento'),source=input.find(s=>s.city===city&&s.metric===metric&&s.segment===segment&&s.group===group)!;expect(o.includeAuth).toBe(false);expect(q.uf).toBe('PR');if(metric==='details')expect(o.method).toBe('POST');const page=Number(q.page),last=Math.ceil(source.rows.length/100);calls.push(`${city}/${metric}/${page}`);return response({data:source.rows.slice((page-1)*100,page*100),meta:{current_page:page,last_page:last,total:source.rows.length}});};
  const result=await collect(selection,catalog,{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},request,wait:async()=>{}});expect(result).toHaveLength(20);expect(result.every(s=>s.complete)).toBe(true);expect(new Set(result.map(s=>s.city))).toEqual(new Set(['Curitiba','Araucária']));expect(calls.some(c=>c.endsWith('/2'))).toBe(true);
 });
 it('bloqueia chamada pesada sem catálogo, token, RM válida ou período fechado',async()=>{let calls=0;const request:Request=async()=>{calls++;return response({data:[]});};for(const s of [selection,{...selection,position:4},{...selection,rmCities:['PR|Curitiba']}])await expect(collect(s,null,{token:'',signal:new AbortController().signal,onProgress:()=>{},request})).rejects.toThrow();expect(calls).toBe(0);});
 it('pausa 429 e retoma a mesma página sem avançar a fonte',async()=>{let count=0;const waits:number[]=[],progress:{waiting:boolean;completed:number}[]=[];const request:Request=async()=>{count++;return count===1?{...response(null,429),retryAfterMs:1234}:response({data:[],meta:{current_page:1,last_page:1,total:0}});};const result=await collect({...selection,includeRm:false,rmCities:[]},catalog,{token:'synthetic',signal:new AbortController().signal,onProgress:p=>progress.push(p),request,wait:async ms=>{waits.push(ms);}});expect(waits).toContain(1234);expect(progress.find(p=>p.waiting)?.completed).toBe(0);expect(result[0].requests).toBe(2);expect(result.every(s=>s.complete)).toBe(true);});
 it('interrompe 401 sem repetir credencial e permite cancelar na pausa',async()=>{let count=0;await expect(collect(selection,catalog,{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},wait:async()=>{},request:async()=>{count++;return response(null,401);}})).rejects.toThrow('não autorizado');expect(count).toBe(1);const controller=new AbortController();await expect(collect(selection,catalog,{token:'synthetic',signal:controller.signal,onProgress:()=>{},request:async()=>response(null,429),wait:async ms=>{if(ms>1000)controller.abort();}})).rejects.toMatchObject({name:'AbortError'});});
 it('rejeita próxima página fora do host sem buscar URL externa',async()=>{let count=0;const result=await collect({...selection,includeRm:false},catalog,{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},wait:async()=>{},request:async()=>{count++;return response({data:[{period:'2026-06-01'}],links:{next:'https://evil.invalid/?page=2'}});}});expect(count).toBe(10);expect(result.every(s=>!s.complete)).toBe(true);expect(result[0].failure).toContain('Próxima página');});
 it('detecta total divergente sem chamar transporte concluído de fonte completa',async()=>{const result=await collect({...selection,includeRm:false},catalog,{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},wait:async()=>{},request:async()=>response({data:[],meta:{current_page:1,last_page:1,total:1}})});expect(result.every(s=>!s.complete)).toBe(true);expect(result[0].failure).toContain('Quantidade recebida');});
 it('recusa metadados que anunciam próxima página depois da última sem continuar a coleta',async()=>{
  let requests=0;
  const result=await collect({...selection,includeRm:false},catalog,{token:'synthetic',signal:new AbortController().signal,onProgress:()=>{},wait:async()=>{},request:async options=>{requests++;return response({data:[{period:'2026-06-01'}],meta:{current_page:1,last_page:1,total:1},links:{next:`${options.url}?page=2`}});}});
  expect(requests).toBe(10);expect(result.every(source=>!source.complete)).toBe(true);expect(result[0].failure).toContain('contraditória');
 });
});
