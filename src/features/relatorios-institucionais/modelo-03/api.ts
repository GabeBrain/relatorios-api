import {httpRequest,type HttpResponse,type RequestOptions} from '@/lib/http-client';
import {norm,period,periodIssue,scopeIssue,selectedCities,location,type Selection} from './model';
import {sourceKey,type Progress,type Row,type Source} from './types';
export interface Envelope {data?:Row[];meta?:{current_page?:number;last_page?:number;total?:number};links?:{next?:string|null}}
class SourceError extends Error {}
export type Request=(o:RequestOptions)=>Promise<HttpResponse<Envelope>>;
export function sleep(ms:number,signal:AbortSignal){return new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(t);reject(new DOMException('Consulta cancelada.','AbortError'));};if(signal.aborted){reject(new DOMException('Consulta cancelada.','AbortError'));return;}const t=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});});}
export const check=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Operação cancelada.','AbortError');};
export async function collect(s:Selection,catalog:Record<string,string[]>|null,options:{token:string;signal:AbortSignal;onProgress:(p:Progress)=>void;request?:Request;wait?:typeof sleep}):Promise<Source[]> {
 const controller=new AbortController(),signal=controller.signal,abort=()=>controller.abort();
 let cooling=0;
 const onProgress=(p:Progress)=>options.onProgress(cooling&&p.stage==='sources'?{...p,waiting:true,message:'Aguardando resposta da API · limite de requisições; retomada automática'}:p);
 if(options.signal.aborted)controller.abort();else options.signal.addEventListener('abort',abort,{once:true});
 const issue=scopeIssue(s,catalog)??periodIssue(s);if(issue||!options.token){options.signal.removeEventListener('abort',abort);throw new SourceError(issue??'Faça login no Geobrain.');}
 const request=options.request??(o=>httpRequest<Envelope>(o)),wait=options.wait??sleep,p=period(s),sources:Source[]=[];
 const tasks=selectedCities(s).flatMap(value=>{const {city,uf}=location(value,s.uf);return [...(['releases','sales','stock'] as const).flatMap(metric=>(['Padrão','Tipologia'] as const).map(group=>({city,uf,metric,group,segment:'Vertical' as const}))),...(['Vertical','Horizontal','Comercial'] as const).map(segment=>({city,uf,metric:'details' as const,group:'Empreendimento' as const,segment}))];});
 onProgress({stage:'scope',completed:1,total:1,message:'Municípios e competência confirmados',waiting:false});
 let lastStart=0,completed=0,nextTask=0;
 let gate=Promise.resolve(),pause=Promise.resolve();
 // Share both request starts and 429 cooldown across workers; no burst per city.
 const slot=()=>{
  const next=gate.then(async()=>{check(signal);await pause;check(signal);await wait(Math.max(0,500-(Date.now()-lastStart)),signal);await pause;check(signal);lastStart=Date.now();});
  gate=next.catch(()=>{});return next;
 };
 const pageProgress=new Map<number,number>();
 const count=()=>completed+[...pageProgress.values()].reduce((a,b)=>a+b,0);
 const runTask=async(task:typeof tasks[number],index:number)=>{
  check(signal);const endpoint=task.metric==='details'?'https://app.geobrain.com.br/public-api/v2/building-with-history-internal':`https://geobrain.com.br/public-api/temporal-analysis-city/${task.metric}`;
  const source:Source={...task,endpoint,rows:[],complete:false,requests:0,httpStatus:null,failure:null,finishedAt:''};
  try{
   let expected:number|undefined,last:number|undefined;
   for(let page=1;page<=500;page++){
    let response:HttpResponse<Envelope>,attempt=0;
    while(true){
     check(signal);await slot();
     onProgress({stage:'sources',completed:count(),total:tasks.length,message:`${task.city} · ${task.segment} · ${task.metric==='details'?'histórico detalhado':task.metric} · página ${page}`,waiting:false});source.requests++;
     response=await request({url:endpoint,method:task.metric==='details'?'POST':'GET',query:{city:task.city,uf:task.uf,...task.metric==='details'?{type:task.segment}:{'type[]':[task.segment],group_by:task.group,start_period:`${Math.max(2021,s.year-5)}-01-01`,end_period:`${p.end}-01`},page,per_page:100},headers:{Authorization:`Bearer ${options.token}`},includeAuth:false,signal,timeoutMs:60000,cache:'no-store'});check(signal);source.httpStatus=response.status;
     if(response.status===401||response.status===403){controller.abort();throw new SourceError('Acesso ao Geobrain não autorizado. Refaça o login e confira as permissões.');}
     if(response.status===429){onProgress({stage:'sources',completed:count(),total:tasks.length,message:'Aguardando resposta da API · limite de requisições; retomada automática',waiting:true});cooling++;pause=Promise.all([pause,wait(Math.max(1000,response.retryAfterMs??60000),signal).finally(()=>{cooling--;})]).then(()=>{});await pause;continue;}
     if(response.ok)break;
     if(++attempt<3&&(response.status===null||response.status===408||Number(response.status)>=500)){await wait(attempt*1500,signal);continue;}
     throw new SourceError('Não foi possível concluir esta fonte do Geobrain.');
    }
    const data=response.data;if(!data||!Array.isArray(data.data))throw new SourceError('Resposta sem a lista de registros esperada.');
    if(data.meta?.total!==undefined){if(!Number.isSafeInteger(data.meta.total)||data.meta.total<0||expected!==undefined&&expected!==data.meta.total)throw new SourceError('Paginação com total inconsistente.');expected=data.meta.total;}
    if(data.meta?.current_page!==undefined&&data.meta.current_page!==page)throw new SourceError('A API repetiu ou pulou uma página.');
    if(data.meta?.last_page!==undefined){if(!Number.isSafeInteger(data.meta.last_page)||data.meta.last_page<1||last!==undefined&&last!==data.meta.last_page)throw new SourceError('Última página inconsistente.');last=data.meta.last_page;}
    if(last!==undefined&&page>last)throw new SourceError('Página recebida após a última página informada.');
    for(const row of data.data){if(!row||typeof row!=='object'||Array.isArray(row)||row.city!=null&&norm(row.city)!==norm(task.city)||row.state!=null&&norm(row.state)!==norm(task.uf)||row.building_type!=null&&norm(row.building_type)!==norm(task.segment))throw new SourceError('A API retornou um registro fora do recorte solicitado.');}
    source.rows.push(...data.data);
    if(last){pageProgress.set(index,page/last);onProgress({stage:'sources',completed:count(),total:tasks.length,message:`${task.city} · ${task.segment} · página ${page} de ${last}`,waiting:false});}
    const next=data.links?.next;if(next){const url=new URL(next,endpoint);if(url.origin!==new URL(endpoint).origin||url.pathname!==new URL(endpoint).pathname||Number(url.searchParams.get('page'))!==page+1)throw new SourceError('Próxima página fora do endpoint ou sequência esperada.');}
    if(next&&last!==undefined&&page>=last)throw new SourceError('Paginação contraditória: há próxima página após o término informado.');
    const more=next!=null&&next!==''||last!==undefined&&page<last;
    if(more&&!data.data.length)throw new SourceError('Página vazia antes da conclusão da fonte.');
    if(!more){if(expected!==undefined&&expected!==source.rows.length)throw new SourceError('Quantidade recebida difere do total informado.');if(last===undefined&&next===undefined&&data.data.length>=100)throw new SourceError('Falta metadado para confirmar paginação completa.');source.complete=true;break;}
   }
   if(!source.complete)throw new SourceError('A fonte excedeu o limite de páginas.');
  }catch(error){if(source.httpStatus===401||source.httpStatus===403)throw error;check(signal);source.failure=error instanceof SourceError?error.message:'Não foi possível concluir esta fonte do Geobrain.';}
  source.finishedAt=new Date().toISOString();sources[index]=source;completed++;pageProgress.delete(index);onProgress({stage:'sources',completed:count(),total:tasks.length,message:source.complete?`${sourceKey(source)} concluída`:'Fonte pendente registrada; continuando as demais',waiting:false});
 };
 const worker=async()=>{while(nextTask<tasks.length){check(signal);const index=nextTask++;await runTask(tasks[index],index);}};
 const workers=[worker(),worker()];
 try{await Promise.all(workers);return sources;}
 catch(error){controller.abort();await Promise.allSettled(workers);throw error;}
 finally{options.signal.removeEventListener('abort',abort);}
}
