import type {Progress} from './types';
export function runWorker<T>(message:unknown,signal:AbortSignal,onProgress?:(p:Progress)=>void):Promise<T>{
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException('Cancelado.','AbortError'));return;}
  const worker=new Worker(new URL('./report.worker.ts',import.meta.url),{type:'module'});
  const cleanup=()=>{worker.terminate();signal.removeEventListener('abort',abort);};
  const abort=()=>{cleanup();reject(new DOMException('Cancelado.','AbortError'));};signal.addEventListener('abort',abort,{once:true});
  worker.onmessage=(event:MessageEvent<{type:string;progress?:Progress;message?:string;report?:unknown;text?:string}>)=>{const d=event.data;if(d.type==='progress'&&d.progress){onProgress?.(d.progress);return;}cleanup();if(d.type==='error')reject(new Error(d.message));else resolve((d.type==='ready'?d.report:d.text) as T);};
  worker.onerror=()=>{cleanup();reject(new Error('Não foi possível processar o relatório. Tente novamente.'));};
  try{worker.postMessage(message);}catch(error){cleanup();reject(error);}
 });
}
