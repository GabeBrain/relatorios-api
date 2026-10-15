// Contrato Edge + PostgreSQL local. O fornecedor de IA é simulado.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const {PGlite}=await import(pathToFileURL(resolve('.local-inputs/pg-verify/node_modules/@electric-sql/pglite/dist/index.js')).href);
const db=new PGlite(),checks=[];
await db.exec('create role anon;create role authenticated;create role service_role;');
await db.exec(readFileSync('supabase/migrations/20260709100000_corretor_v3.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20260709110000_corretor_v3_ia.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20260711120000_ia_passes_visao_ata.sql','utf8'));
await db.exec("alter table studies_v3 add column generation text default 'v3';alter table studies_v3 add column relatorio jsonb;");
await db.exec(readFileSync('supabase/migrations/20261015193000_corretor_execution_ledger.sql','utf8'));
const id='11111111-1111-4111-8111-111111111111',sha='a'.repeat(40),owner='b'.repeat(64);
await db.query("insert into studies_v3(id,nome) values($1,'Referência')",[id]);
await db.query("insert into study_versions(study_id,n,sha1,n_slides) values($1,1,$2,3)",[id,sha]);
function from(table){
 let method='select',payload,filters=[],columns='*';
 const execute=async()=>{
   try {
     const params=[],where=filters.length?' where '+filters.map(([k,v])=>{params.push(v);return `"${k}"=$${params.length}`;}).join(' and '):'';
     let sql;
     if(method==='select')sql=`select ${columns} from ${table}${where}`;
     if(method==='insert'){const keys=Object.keys(payload);params.length=0;params.push(...Object.values(payload));sql=`insert into ${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`;}
     if(method==='update'){const keys=Object.keys(payload),offset=params.length;params.push(...Object.values(payload));sql=`update ${table} set ${keys.map((k,i)=>`"${k}"=$${offset+i+1}`).join(',')}${where} returning *`;}
     return {data:(await db.query(sql,params)).rows,error:null};
   }catch(e){return {data:null,error:{code:e.code,message:e.message}};}
 };
 const chain={select(value='*'){columns=value;return chain;},insert(v){method='insert';payload=v;return chain;},update(v){method='update';payload=v;return chain;},eq(k,v){filters.push([k,v]);return chain;},async single(){const r=await execute();return {...r,data:r.data?.[0]??null};},then(a,b){return execute().then(a,b);}};
 return chain;
}
const client={from,async rpc(name,payload){try{const keys=Object.keys(payload),params=Object.values(payload);const row=(await db.query(`select ${name}(${keys.map((k,i)=>`${k}=>$${i+1}`).join(',')}) result`,params)).rows[0];return {data:row.result,error:null};}catch(e){return {data:null,error:{message:e.message}};}}};
let handler,paid=0,failProvider=false;
const sandbox={Request,Response,TextEncoder,crypto,console,Set,Map,Date,JSON,Number,Array,Uint8Array,createClient:()=>client,Deno:{env:{get:k=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',OPENAI_API_KEY:'fixture-only'})[k]},serve:fn=>{handler=fn;}},fetch:async()=>{paid++;if(failProvider)throw Error('network-lost');return Response.json({findings:[],inputTokens:10,outputTokens:5});}};
let source=readFileSync('supabase/functions/corretor-execution/index.ts','utf8').replace(/^import.*$/gm,'');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,sandbox);
async function call(body){const response=await handler(new Request('https://fixture.invalid/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner,...body})}));return {status:response.status,data:await response.json()};}
const start=()=>call({action:'start',studyId:id,version:1,documentSha1:sha,budgetUsd:1,context:{cidade:'Campos do Jordão',uf:'SP'}});
const run=await start();assert.equal(run.status,200);assert.equal(paid,0);checks.push('confirmar lote não chama fornecedor');
const body={action:'batch',executionId:run.data.id,functionName:'analyze-text-batch',payload:{city:'Campos do Jordão',model:'gpt-4o',slides:[{n:1,texto:'Texto de teste'}]}};
assert.equal((await call(body)).status,200);assert.equal(paid,1);
const replay=await call(body);assert.equal(replay.data.replayed,true);assert.equal(paid,1);checks.push('resposta persistida reapresentada sem nova chamada');
assert.equal((await call({...body,owner:'c'.repeat(64)})).status,403);checks.push('outro navegador não recupera payload privado');
assert.equal((await call({...body,functionName:'analyze-slide'})).status,400);checks.push('função fora do lote recusada');
failProvider=true;const unknown=await call({...body,payload:{...body.payload,slides:[{n:2,texto:'Outro lote'}]}});assert.equal(unknown.status,409);
assert.equal((await call({...body,payload:{...body.payload,slides:[{n:2,texto:'Outro lote'}]}})).status,409);assert.equal(paid,2);checks.push('falha após envio não repete fornecedor');
assert.equal((await start()).status,409);checks.push('retomada bloqueada enquanto existe reserva sem retorno');
const state=await call({action:'status',executionId:run.data.id});assert(state.data.spentUsd>0);assert(state.data.reservedUsd>0);checks.push('estado retorna gasto e reserva separadamente');
assert.equal((await call({action:'finish',executionId:run.data.id,state:'completed'})).status,409);checks.push('retorno desconhecido impede conclusão');
for(const name of ['analyze-text-batch','analyze-table-image','analyze-ata-image']){
 let direct;
 const code=readFileSync(`supabase/functions/${name}/index.ts`,'utf8').replace(/^import.*$/gm,'');
 const directSandbox={...sandbox,Deno:{...sandbox.Deno,serve:fn=>{direct=fn;}}};
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,directSandbox);
 const response=await direct(new Request('https://fixture.invalid',{method:'POST',body:'{}'}));assert.equal(response.status,403);
}
checks.push('três funções pagas recusam chamada direta do navegador');
writeFileSync('.local-inputs/continuous-edge-result.json',JSON.stringify({checks,providerCallsSimulated:paid,realCalls:0},null,2));console.log(JSON.stringify({passed:checks.length,checks}));await db.close();
