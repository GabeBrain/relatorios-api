import { httpRequest } from '@/lib/http-client';
import type { MaceioEnvelope, MaceioRequest } from './api';

const pause = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if(signal?.aborted)return reject(new DOMException('Consulta cancelada.','AbortError'));
  const abort=()=>{clearTimeout(timer);reject(new DOMException('Consulta cancelada.','AbortError'));};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
  signal?.addEventListener('abort',abort,{once:true});
});

/** One lane for all GeoBrain collectors, including their retries and pages.
 * No data caching or skipped queries. Conservative pacing, not a provider quota. */
export function createMaceioRequestLane(options:{request?:MaceioRequest;now?:()=>number;sleep?:typeof pause;onProgress?:(message:string)=>void;onWaiting?:(waiting:boolean)=>void}={}) {
  const request=options.request??(args=>httpRequest<MaceioEnvelope>(args)),now=options.now??Date.now,sleep=options.sleep??pause;
  let queue:Promise<unknown>=Promise.resolve(),next=0,blockedUntil=0,interval=500,waiting=false;
  const active=new Set<Promise<unknown>>();
  const run:MaceioRequest=async args=>{
    for(;;){
      const admission=queue.then(async()=>{
        for(;;){
          if(args.signal?.aborted)throw new DOMException('Consulta cancelada.','AbortError');
          if(active.size>=2){await Promise.race(active);continue;}
          const delay=Math.max(0,next-now(),blockedUntil-now());
          if(delay){await sleep(delay,args.signal);continue;}
          break;
        }
        if(waiting){waiting=false;options.onWaiting?.(false);}
        next=now()+interval;
        const pending=(async()=>{
          const response=await request(args);
          if(response.status===429){
            const delay=Number.isFinite(response.retryAfterMs)&&response.retryAfterMs!>=0?Math.max(1000,response.retryAfterMs!):60_000;
            blockedUntil=Math.max(blockedUntil,now()+delay);interval=Math.min(2000,interval*2);
            waiting=true;options.onWaiting?.(true);
            options.onProgress?.('Aguardando resposta da API — retomada automática após a pausa solicitada');
          }else if(response.ok){interval=Math.max(500,interval-100);options.onProgress?.('Recebendo dados da API');}
          return response;
        })();
        const settled=pending.then(()=>undefined,()=>undefined);active.add(settled);void settled.then(()=>active.delete(settled));
        return {pending};
      });
      queue=admission.then(()=>undefined,()=>undefined);
      const {pending}=await admission,response=await pending;
      if(response.status!==429)return response;
    }
  };
  return {request:run};
}
