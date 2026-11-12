// Contrato Edge + PostgreSQL local. O fornecedor de IA é simulado.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import { buildSync } from 'esbuild';
import assert from 'node:assert/strict';
const {PGlite}=await import(pathToFileURL(resolve('.local-inputs/pg-verify/node_modules/@electric-sql/pglite/dist/index.js')).href);
const db=new PGlite(),checks=[];
await db.exec('create role anon;create role authenticated;create role service_role;');
await db.exec(readFileSync('supabase/migrations/20260709100000_corretor_v3.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20260709110000_corretor_v3_ia.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20260711120000_ia_passes_visao_ata.sql','utf8'));
await db.exec("alter table studies_v3 add column generation text default 'v3';alter table studies_v3 add column relatorio jsonb;");
await db.exec(readFileSync('supabase/migrations/20261015193000_corretor_execution_ledger.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261016153609_corretor_recommendation_metrics.sql','utf8'));
const id='11111111-1111-4111-8111-111111111111',sha='a'.repeat(40),owner='b'.repeat(64);
await db.query("insert into studies_v3(id,nome) values($1,'Referência')",[id]);
await db.query("insert into study_versions(study_id,n,sha1,n_slides) values($1,1,$2,181)",[id,sha]);
function from(table){
 let method='select',payload,filters=[],columns='*';
 const execute=async()=>{
   try {
     const params=[],where=filters.length?' where '+filters.map(([k,v])=>{params.push(v);return `"${k}"=$${params.length}`;}).join(' and '):'';
     let sql;
     if(method==='select')sql=`select ${columns} from ${table}${where}`;
     if(method==='insert'||method==='upsert'){const keys=Object.keys(payload);params.length=0;params.push(...Object.values(payload));sql=`insert into ${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) ${method==='upsert'?'on conflict(execution_id) do nothing':''} returning *`;}
     if(method==='update'){const keys=Object.keys(payload),offset=params.length;params.push(...Object.values(payload));sql=`update ${table} set ${keys.map((k,i)=>`"${k}"=$${offset+i+1}`).join(',')}${where} returning *`;}
     return {data:(await db.query(sql,params)).rows,error:null};
   }catch(e){return {data:null,error:{code:e.code,message:e.message}};}
 };
 const chain={select(value='*'){columns=value;return chain;},insert(v){method='insert';payload=v;return chain;},upsert(v){method='upsert';payload=v;return chain;},update(v){method='update';payload=v;return chain;},eq(k,v){filters.push([k,v]);return chain;},async single(){const r=await execute();return {...r,data:r.data?.[0]??null};},then(a,b){return execute().then(a,b);}};
 return chain;
}
const client={from,async rpc(name,payload){try{const keys=Object.keys(payload),params=Object.values(payload);const row=(await db.query(`select ${name}(${keys.map((k,i)=>`${k}=>$${i+1}`).join(',')}) result`,params)).rows[0];return {data:row.result,error:null};}catch(e){return {data:null,error:{message:e.message}};}}};
let controller,consultive,paid=0,failProvider=false,truncated=false,empty=false;
const sandbox={Request,Response,TextEncoder,crypto,console,Set,Map,Date,JSON,Number,Array,Uint8Array,createClient:()=>client,Deno:{env:{get:k=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',OPENAI_API_KEY:'fixture-only'})[k]},serve:()=>{}},fetch:async(url,options)=>{
 if(url.includes('/functions/'))return consultive(new Request(url,options));
 assert.equal(url,'https://api.openai.com/v1/chat/completions');paid++;
 if(failProvider)throw Error('simulated-network-loss');
 const payload=JSON.parse(options.body);assert.equal(payload.model,'gpt-4o-mini');
 const memo=payload.max_tokens===1200;
 return Response.json({id:'fixture-'+paid,model:'gpt-4o-mini-2024-07-18',usage:{prompt_tokens:1000,completion_tokens:100,prompt_tokens_details:{cached_tokens:200}},choices:[{message:{content:empty?'':memo?'Slide 1: evidência local de mercado.':'## Recomendação\n\nResultado simulado com evidências.'},finish_reason:truncated&&memo?'length':'stop'}]});
}};
function bundle(file,serve){
 const source=readFileSync(file,'utf8').replace(/^import \{ createClient \} from .*$/m,'const createClient=globalThis.createClient;');
 const code=buildSync({stdin:{contents:source,resolveDir:resolve(file,'..'),loader:'ts'},bundle:true,format:'iife',platform:'neutral',target:'es2022',write:false}).outputFiles[0].text;
 vm.runInNewContext(code,{...sandbox,Deno:{...sandbox.Deno,serve}});
}
bundle('supabase/functions/analyze-consulting-suggestion/index.ts',fn=>{consultive=fn;});
bundle('supabase/functions/corretor-execution/index.ts',fn=>{controller=fn;});
async function call(body){const response=await controller(new Request('https://fixture.invalid/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner,...body})}));return {status:response.status,data:await response.json()};}
const slides=n=>Array.from({length:n},(_,i)=>({n:i+1,titulo:`Slide ${i+1}`,conteudo:'Evidência local de mercado. '.repeat(3)}));
const start=(attempt,n=1,budget=1)=>call({action:'start',studyId:id,version:1,documentSha1:sha,budgetUsd:budget,context:{purpose:'recommendation',attemptId:attempt,slides:slides(n)}});
const result=async run=>(await db.query('select * from corretor_recommendations where execution_id=$1',[run])).rows[0];
assert.equal((await start('bad-budget',1,.00001)).status,400);assert.equal((await start('bad-slides',182)).status,400);assert.equal(paid,0);checks.push('limite insuficiente e slide fora da versão recusados antes do provedor');
const direct=await consultive(new Request('https://fixture.invalid',{method:'POST',body:'{}'}));assert.equal(direct.status,403);assert.equal(paid,0);checks.push('chamada consultiva direta recusada sem cobrança');
const one=await start('single');assert.equal(one.status,200,JSON.stringify(one));assert.equal(paid,0);assert.equal((await result(one.data.id)).state,'prepared');checks.push('confirmação prepara resultado e orçamento, sem gerar');
const single=await call({action:'recommendation_step',executionId:one.data.id});assert.equal(single.status,200,JSON.stringify(single));assert.equal(single.data.done,true);assert.equal(single.data.result.state,'completed');assert.equal(paid,1);
const saved=await result(one.data.id);assert(saved.content.includes('Recomendação'));assert.equal(saved.provider_calls,1);assert.equal(Number(saved.spent_usd),.000195);assert.equal(Number(saved.cached_tokens),200);checks.push('resultado e tokens reais/cache contabilizados atomicamente');
assert.equal((await call({action:'recommendation_step',executionId:one.data.id})).data.done,true);assert.equal((await start('single')).data.id,one.data.id);assert.equal(paid,1);checks.push('reabrir, repetir etapa e confirmar mesmo lote não chamam IA novamente');
assert.equal((await call({action:'recommendation_step',executionId:one.data.id,owner:'c'.repeat(64)})).status,403);checks.push('outro navegador não assume contexto privado');
await assert.rejects(()=>db.query('select corretor_finish_batch($1,$2,$3,$4)',[one.data.id,(single.data.result.batch_hash??'missing'),'{}',0]));
const pass=(await db.query('select * from ia_passes where execution_id=$1',[one.data.id])).rows;assert.equal(pass.length,1);assert.equal(pass[0].tipo,'recomendacao');assert.equal(pass[0].model,'gpt-4o-mini-2024-07-18');assert.equal(pass[0].prompt_version,'brain-2026-09-15-v1');checks.push('um passe por lote com modelo, prompt, preço, duração e ID do provedor');
truncated=true;
const many=await start('many',181);assert.equal(many.status,200,JSON.stringify(many));
assert.equal((await call({action:'recommendation_step',executionId:many.data.id})).data.done,false);assert.equal(paid,2);
await call({action:'finish',executionId:many.data.id,state:'interrupted'});assert.equal((await result(many.data.id)).state,'interrupted');
assert.equal((await call({action:'recommendation_resume',executionId:many.data.id,budgetUsd:1})).status,200);
assert.equal((await call({action:'recommendation_step',executionId:many.data.id})).data.done,false);assert.equal(paid,3);
const compiled=await call({action:'recommendation_step',executionId:many.data.id});assert.equal(compiled.data.done,true,JSON.stringify(compiled));assert.equal(compiled.data.result.state,'partial');assert.equal(paid,4);assert.equal((await result(many.data.id)).provider_calls,3);checks.push('dois memos e compilação retomam sem repetir; limite do memo torna resultado parcial');
failProvider=true;const unknown=await start('unknown');assert.equal((await call({action:'recommendation_step',executionId:unknown.data.id})).status,409);assert.equal(paid,5);
const lost=await result(unknown.data.id);assert.equal(lost.state,'unknown');assert(Number(lost.reserved_usd)>0);assert.equal(Number(lost.spent_usd),0);
assert.equal((await call({action:'recommendation_resume',executionId:unknown.data.id,budgetUsd:1})).status,409);assert.equal((await call({action:'recommendation_step',executionId:unknown.data.id})).status,409);assert.equal(paid,5);checks.push('perda de retorno mantém reserva, informa desconhecido e bloqueia repetição');
failProvider=false;empty=true;const blank=await start('empty');assert.equal((await call({action:'recommendation_step',executionId:blank.data.id})).status,409);assert.equal(paid,6);assert.equal((await result(blank.data.id)).state,'failed');assert.equal((await result(blank.data.id)).provider_calls,1);checks.push('resposta sem texto conserva custo real e fica não concluída');
const untouched=(await db.query('select relatorio,status from studies_v3 where id=$1',[id])).rows[0];assert.equal(untouched.relatorio,null);assert.equal(untouched.status,'em_correcao');checks.push('recomendação não altera relatório nem encerra revisão');
await db.exec('grant usage on schema public to anon,authenticated;grant select,insert,update,delete on ia_passes to anon,authenticated;set role anon');
assert.equal((await db.query('select count(*) n from corretor_recommendations')).rows[0].n,4);
await assert.rejects(()=>db.query("update corretor_recommendations set content='x'"));await assert.rejects(()=>db.query('select * from corretor_executions'));
await assert.rejects(()=>db.query("insert into ia_passes(study_id,tipo,custo_usd) values($1,'recomendacao',1)",[id]));
await assert.rejects(()=>db.query("insert into ia_passes(study_id,tipo,custo_usd,execution_id,batch_hash) values($1,'texto',1,$2,'forjado')",[id,one.data.id]));
assert.equal((await db.query('update ia_passes set custo_usd=100 where execution_id=$1 returning id',[one.data.id])).rows.length,0);
assert.equal((await db.query('delete from ia_passes where execution_id=$1 returning id',[one.data.id])).rows.length,0);
const metrics=(await db.query('select corretor_ai_usage() result')).rows[0].result;assert.equal(metrics.groups[0].calls,5);assert.equal(metrics.recommendations.total,4);assert.equal(metrics.recommendations.unknown,1);assert.equal(Number(metrics.groups[0].cost_usd),.000975);assert.equal(Number(metrics.recommendations.spent_usd),.000975);checks.push('biblioteca e métricas públicas leem agregados, sem escrita consultiva/contexto privado');
await db.exec('reset role');assert.equal(Number((await db.query('select custo_total from studies_v3 where id=$1',[id])).rows[0].custo_total),.000975);checks.push('custo acumulado do estudo reconcilia com execuções e passes');
writeFileSync('.local-inputs/recommendation-edge-result.json',JSON.stringify({checks,providerCallsSimulated:paid,realCalls:0,metrics},null,2));console.log(JSON.stringify({passed:checks.length,checks}));await db.close();
