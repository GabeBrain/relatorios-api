import {httpRequest} from '@/lib/http-client';
import {sleep,check,type Request} from '../modelo-03/api';
import {norm,citiesFor,historyStart,period,periodIssue,scopeIssue,type Selection} from './model';
import {sourceKey} from '../modelo-03/types';
import type {Source,Progress} from './types';
/** Regional plan: four municipal series + vertical history, no unrelated segments or rentals. */
export async function collect(s:Selection,catalog:Record<string,string[]>|null,options:{token:string;signal:AbortSignal;onProgress:(p:Progress)=>void;request?:Request;wait?:typeof sleep}):Promise<Source[]> {
 const issue=periodIssue(s)??scopeIssue(s,catalog);if(issue||!options.token)throw new Error(issue??'Faça login no Geobrain.');
 const controller=new AbortController(),signal=controller.signal,abort=()=>controller.abort();options.signal.addEventListener('abort',abort,{once:true});if(options.signal.aborted)abort();
 const wait=options.wait??sleep,request=options.request??httpRequest,p=period(s);
 const tasks=citiesFor(s,catalog).flatMap(c=>[...(['releases','sales','stock'] as const).map(metric=>({...c,metric,group:'Padrão' as const})),{...c,metric:'stock' as const,group:'Tipologia' as const},{...c,metric:'details' as const,group:'Empreendimento' as const}]);
 const sources:Source[]=[];let next=0,complete=0,lastStart=0,cooling=0,gate=Promise.resolve(),pause=Promise.resolve();const fractions=new Map<number,number>();
 const update=(message:string)=>options.onProgress({stage:'sources',completed:complete+[...fractions.values()].reduce((a,b)=>a+b,0),total:tasks.length,message:cooling?'Aguardando resposta da API · retomada automática':message,waiting:cooling>0});
 const slot=()=>{const turn=gate.then(async()=>{check(signal);await pause;await wait(Math.max(0,500-(Date.now()-lastStart)),signal);await pause;check(signal);lastStart=Date.now();});gate=turn.catch(()=>{});return turn;};
 async function run(index:number){
  const task=tasks[index],details=task.metric==='details',endpoint=details?'https://app.geobrain.com.br/public-api/v2/building-with-history-internal':`https://geobrain.com.br/public-api/temporal-analysis-city/${task.metric}`;
  const source:Source={...task,segment:'Vertical',rows:[],complete:false,requests:0,httpStatus:null,failure:null,finishedAt:'',endpoint};sources[index]=source;
  try {
   let last:number|undefined,total:number|undefined;
   for(let page=1;page<=500;page++){
    let attempt=0,response;
    while(true){
     await slot();source.requests++;update(`${task.city} / ${task.uf} · ${details?'histórico':task.metric} · ${task.group} · página ${page}`);
     response=await request({url:endpoint,method:details?'POST':'GET',query:{city:task.city,uf:task.uf,...details?{type:'Vertical'}:{'type[]':['Vertical'],group_by:task.group,start_period:`${historyStart(s)}-01`,end_period:`${p.end}-01`},page,per_page:100},headers:{Authorization:`Bearer ${options.token}`},includeAuth:false,signal,timeoutMs:60000,cache:'no-store'});check(signal);source.httpStatus=response.status;
     if(response.status===401||response.status===403)throw new Error('Acesso não autorizado. Refaça o login no Geobrain.');
     if(response.status===429){cooling++;update('');pause=Promise.all([pause,wait(Math.max(1000,response.retryAfterMs??60000),signal).finally(()=>{cooling--;})]).then(()=>{});await pause;continue;}
     if(response.ok)break;
     if(++attempt<3&&(response.status===null||response.status===408||Number(response.status)>=500)){await wait(attempt*1500,signal);continue;}
     throw new Error(`Fonte não concluída${response.status===null?'':` (HTTP ${response.status})`}.`);
    }
    const data=response.data as {data?:Record<string,unknown>[];meta?:{current_page?:number;last_page?:number;total?:number};links?:{next?:string|null}}|null;
    if(!data||!Array.isArray(data.data))throw new Error('Resposta sem lista de registros.');
    if(data.meta?.current_page!==undefined&&data.meta.current_page!==page)throw new Error('Página repetida ou fora de sequência.');
    if(data.meta?.last_page!==undefined){const n=data.meta.last_page;if(!Number.isSafeInteger(n)||n<page||last!==undefined&&n!==last)throw new Error('Última página inconsistente.');last=n;}
    if(data.meta?.total!==undefined){const n=data.meta.total;if(!Number.isSafeInteger(n)||n<0||total!==undefined&&n!==total)throw new Error('Total de paginação inconsistente.');total=n;}
    for(const row of data.data)if(!row||typeof row!=='object'||Array.isArray(row)||row.city!=null&&norm(row.city)!==norm(task.city)||row.state!=null&&norm(row.state)!==norm(task.uf)||row.building_type!=null&&norm(row.building_type)!=='vertical')throw new Error('Registro fora do município ou segmento solicitado.');
    source.rows.push(...data.data);
    if(last){fractions.set(index,page/last);update(`${task.city} · página ${page} de ${last}`);}
    const nextUrl=data.links?.next;
    if(nextUrl){const u=new URL(nextUrl,endpoint);if(u.origin!==new URL(endpoint).origin||u.pathname!==new URL(endpoint).pathname||Number(u.searchParams.get('page'))!==page+1||last!==undefined&&page>=last)throw new Error('Próxima página inválida ou contraditória.');}
    const more=!!nextUrl||last!==undefined&&page<last;
    if(more&&!data.data.length)throw new Error('Página vazia antes do fim.');
    if(!more){if(total!==undefined&&total!==source.rows.length||last===undefined&&nextUrl===undefined&&data.data.length>=100)throw new Error('Paginação incompleta.');source.complete=true;break;}
   }
   if(!source.complete)throw new Error('Limite de páginas excedido.');
  }catch(error){check(signal);if(source.httpStatus===401||source.httpStatus===403){controller.abort();throw error;}source.failure=error instanceof Error&&/^(Fonte|Resposta|Página|Total|Última|Registro|Próxima|Paginação|Limite)/.test(error.message)?error.message:'Falha ao consultar a fonte.';}
  source.finishedAt=new Date().toISOString();complete++;fractions.delete(index);update(`${sourceKey(source)} · ${source.complete?'concluída':'pendência registrada'}`);
 }
 const worker=async()=>{while(next<tasks.length){check(signal);await run(next++);}};const workers=[worker(),worker()];
 try{await Promise.all(workers);return sources;}catch(error){controller.abort();await Promise.allSettled(workers);throw error;}finally{options.signal.removeEventListener('abort',abort);}
}
