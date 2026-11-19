import { httpRequest } from '@/lib/http-client';
import type { MaceioEnvelope, MaceioRequest } from './api';
import { MaceioSourceError } from './source-contract';

const pause = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if(signal?.aborted)return reject(new DOMException('Consulta cancelada.','AbortError'));
  const abort=()=>{clearTimeout(timer);reject(new DOMException('Consulta cancelada.','AbortError'));};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
  signal?.addEventListener('abort',abort,{once:true});
});

/** One lane for all GeoBrain collectors, including their retries and pages.
 * No data caching or skipped queries. Conservative pacing, not a provider quota. */
export function createMaceioRequestLane(options:{request?:MaceioRequest;now?:()=>number;sleep?:typeof pause;onProgress?:(message:string)=>void}={}) {
  const request=options.request??(args=>httpRequest<MaceioEnvelope>(args)),now=options.now??Date.now,sleep=options.sleep??pause;
  let queue:Promise<unknown>=Promise.resolve(),next=0,limited=false,blockedUntil=0;
  const run:MaceioRequest=args=>{
    const job=queue.then(async()=>{
      if(args.signal?.aborted)throw new DOMException('Consulta cancelada.','AbortError');
      if(limited)throw new MaceioSourceError('HTTP',429);
      const delay=Math.max(0,next-now(),blockedUntil-now());
      if(delay){options.onProgress?.('Aguardando o intervalo entre consultas da fonte');await sleep(delay,args.signal);}
      if(args.signal?.aborted)throw new DOMException('Consulta cancelada.','AbortError');
      let response=await request(args);next=now()+2000;
      if(response.status===429){
        const delay=Number.isFinite(response.retryAfterMs)&&response.retryAfterMs!>=0?Math.max(2000,response.retryAfterMs!):60_000;
        blockedUntil=now()+delay;
        options.onProgress?.('A API pediu uma pausa. Aguardando para retomar a consulta');
        await sleep(delay,args.signal);
        if(args.signal?.aborted)throw new DOMException('Consulta cancelada.','AbortError');
        response=await request(args);next=now()+2000;
        if(response.status===429){limited=true;throw new MaceioSourceError('HTTP',429);}
      }
      return response;
    });
    queue=job.catch(()=>undefined);return job;
  };
  return {request:run,assertAvailable(){if(limited)throw new MaceioSourceError('HTTP',429);}};
}
