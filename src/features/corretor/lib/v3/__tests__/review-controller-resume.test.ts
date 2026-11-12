// Executa o controlador real com banco/fetch simulados; nunca usa rede ou provedor.
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {expect,it,vi} from 'vitest';
import * as reviewer from '../../../../../../supabase/functions/_shared/reviewer';

const source=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../../../../../../supabase/functions/corretor-execution/index.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const profile=reviewer.reviewProfile();
const baseContext={cidade:'Rolândia',uf:'PR',outras:[],fonte:null};
const run={id:'run',owner_hash:'checked-by-query',study_id:'study',version_n:1,document_sha1:'a'.repeat(40),purpose:'review',
 state:'interrupted',spent_usd:.036,reserved_usd:.228,created_at:'2026-10-22T03:26:00Z',
 confirmed_context:{...baseContext,reviewProfile:profile}};

async function harness(replies:unknown[],rpcReplies:unknown[]=[]){
 const writes:unknown[]=[],queries:string[]=[];
 const db={from:vi.fn((table:string)=>{
  queries.push(table);const answer=replies.shift();
  const chain:Record<string,unknown>={then:(resolve:(v:unknown)=>unknown)=>Promise.resolve(answer).then(resolve)};
  for(const method of ['select','eq','in','order','limit','single','maybeSingle','is'])chain[method]=vi.fn(()=>chain);
  for(const method of ['insert','update'])chain[method]=vi.fn((value:unknown)=>{writes.push({table,method,value});return chain;});
  return chain;
 }),rpc:vi.fn((..._args:unknown[])=>Promise.resolve(rpcReplies.shift()))};
 const fetcher=vi.fn<(...args:unknown[])=>Promise<Response>>(),secret='f'.repeat(64);
 const ownerHash=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(secret))).toString('hex');
 // O mock retorna o owner esperado pelo controlador, sem ler credencial real.
 for(let i=0;i<replies.length;i++){
  const r=replies[i] as {data?:Record<string,unknown>};if(r?.data?.owner_hash)r.data.owner_hash=ownerHash;
 }
 let handler!:(r:Request)=>Promise<Response>;
 const values:Record<string,string>={SUPABASE_URL:'https://backend.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake-service',ALLOWED_ORIGINS:''};
 const deno={env:{get:(key:string)=>values[key]},serve:(h:typeof handler)=>{handler=h;}};
 const require=(name:string)=>name.includes('esm.sh')?{createClient:()=>db}:name.endsWith('/reviewer.ts')?reviewer:{};
 new Function('require','exports','Deno','fetch','crypto','AbortSignal',compiled)(require,{},deno,fetcher,webcrypto,{timeout:()=>new AbortController().signal});
 return {writes,queries,db,fetcher,call:(body:object)=>handler(new Request('https://backend.invalid/functions/v1/corretor-execution',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner:secret,...body})}))};
}

it('start real permite continuar novos lotes com um unknown, preservando a reserva',async()=>{
 const prior=structuredClone(run);
 const h=await harness([
  {data:{sha1:run.document_sha1,n_slides:78},error:null},
  {data:prior,error:null}, // resumeExecutionId
  {error:{code:'23505'}}, // a execução já existe
  {data:structuredClone(run),error:null},
  {count:0,error:null}, // nenhuma chamada running
  {count:1,error:null}, // reserva pertence ao unknown preservado
  {error:null}, // reabre a mesma execução
 ]);
 const response=await h.call({action:'start',studyId:'study',version:1,documentSha1:run.document_sha1,budgetUsd:1.01,context:baseContext,resumeExecutionId:'run'});
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({id:'run',reservedUsd:.228});
 expect(h.fetcher).not.toHaveBeenCalled();
 expect((h.writes as {method?:string}[]).filter(w=>w.method==='update')).toEqual([{table:'corretor_executions',method:'update',value:expect.objectContaining({state:'prepared',budget_usd:1.01})}]);
 expect(JSON.stringify(h.writes)).not.toContain('reserved_usd');
});

it('review_status real libera as outras etapas e identifica só o retorno desconhecido',async()=>{
 const h=await harness([{data:{id:'run',state:'interrupted',reserved_usd:.228},error:null},
  {count:37,error:null},{count:1,error:null},{count:1,error:null}]);
 const response=await h.call({action:'review_status',studyId:'study',version:1,documentSha1:run.document_sha1});
 expect(response.status).toBe(200);
 expect(await response.json()).toMatchObject({id:'run',completedBatches:37,unknownBatches:1,runningBatches:0,canResume:true});
 expect(h.fetcher).not.toHaveBeenCalled();expect(h.writes).toEqual([]);
});

it('lote completed é reapresentado sem folha, finish ou nova reserva',async()=>{
 const h=await harness([{data:structuredClone(run),error:null}],
  [{data:{cached:true,response:{tables:[],inputTokens:100,outputTokens:10}},error:null}]);
 const response=await h.call({action:'batch',executionId:'run',functionName:'analyze-table-image',payload:{model:'gpt-6-luna',base64:'completed-fixture'}});
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({replayed:true,tables:[]});
 expect(h.db.rpc).toHaveBeenCalledOnce();expect(h.fetcher).not.toHaveBeenCalled();expect(h.writes).toEqual([]);
});

it('lote unknown não chama folha/provedor, não libera reserva e não impede outro hash',async()=>{
 const h=await harness([{data:structuredClone(run),error:null},{data:{state:'unknown'},error:null}],
  [{error:{message:'Lote em andamento ou com retorno desconhecido. Não repetir cobrança'}}]);
 const response=await h.call({action:'batch',executionId:'run',functionName:'analyze-table-image',payload:{model:'gpt-6-luna',base64:'fixture'}});
 expect(response.status).toBe(409);expect(await response.json()).toMatchObject({errorCode:'REVIEW_BATCH_UNCONFIRMED'});
 expect(h.fetcher).not.toHaveBeenCalled();expect(h.writes).toEqual([]);
 expect(h.db.rpc).toHaveBeenCalledOnce();
});

it('novo lote confirma retorno uma vez, sem atualizar o lote desconhecido',async()=>{
 const h=await harness([{data:{...structuredClone(run),state:'prepared'},error:null}],
  [{data:{cached:false},error:null},{error:null}]);
 h.fetcher.mockResolvedValue(new Response(JSON.stringify({tables:[],inputTokens:100,outputTokens:10,cachedTokens:0,
  requestedModel:'gpt-6-luna',model:'gpt-6-luna',profileId:profile.id,configVersion:profile.configVersion,
  reasoningEffort:profile.reasoningEffort,promptVersion:profile.promptVersion,priceVersion:profile.priceVersion,serviceTier:'default'}),{status:200}));
 const response=await h.call({action:'batch',executionId:'run',functionName:'analyze-table-image',payload:{model:'gpt-6-luna',base64:'other-fixture'}});
 expect(response.status).toBe(200);expect(h.fetcher).toHaveBeenCalledOnce();
 expect(h.fetcher.mock.calls[0][0]).toBe('https://backend.invalid/functions/v1/analyze-table-image');
 expect(h.db.rpc.mock.calls.map(call=>call[0])).toEqual(['corretor_claim_batch','corretor_finish_batch']);
 expect(h.writes).toEqual([]);
});
