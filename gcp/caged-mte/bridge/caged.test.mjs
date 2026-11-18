import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {createCagedHandler,parseCagedRequest,cagedSql,normalizeCaged,UFS,SECTORS} from './caged.mjs';
const version='a'.repeat(64),end='2026-05';
const fixture=()=>UFS.flatMap(uf=>SECTORS.map(sector=>({snapshot_version:version,published_through:'2026-09-01',coverage_start:'2020-01-01',loaded_at:'2026-11-17T12:00:00Z',period:end,uf,sector,balance:'0',months_observed:'1',months_required:'1'})));
test('contract rejects arbitrary SQL and table names',()=>{
 assert.equal(parseCagedRequest({version:'mte-caged-v1',end,sql:'SELECT 1'}),null);
 assert.equal(parseCagedRequest({version:'mte-caged-v1',end:'2026-13'}),null);
 assert.throws(()=>cagedSql('attacker; SELECT 1'));
 assert.ok(cagedSql('project-a.dataset.caged_mte_snapshots').includes('COUNT(DISTINCT d.month)'));
});
test('coverage is independent by period and never invents zero for a missing grid',()=>{
 assert.deepEqual(normalizeCaged(fixture(),end).completePeriods,[end]);
 const partial=fixture();partial.pop();assert.deepEqual(normalizeCaged(partial,end).completePeriods,[]);
 const months=fixture().map(r=>({...r,period:'2026',months_observed:3,months_required:5}));assert.deepEqual(normalizeCaged(months,end).completePeriods,[]);
 assert.throws(()=>normalizeCaged([...fixture(),fixture()[0]],end));
});
test('HTTP route reuses HMAC, rejects invalid signatures and caches valid aggregates',async()=>{
 const secret='synthetic-only',now=1794920000000;let calls=0;
 const verifySignature=({secret,timestamp,signature,body,now})=>{
  if(Math.abs(now-Number(timestamp))>300000)return {ok:false,reason:'expired'};
  const expected=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');
  return {ok:typeof signature==='string'&&signature.length===64&&timingSafeEqual(Buffer.from(expected),Buffer.from(signature)),reason:'invalid_signature'};
 };
 const handler=createCagedHandler({verifySignature,hmacSecret:secret,table:'project-a.dataset.caged_mte_snapshots',query:async()=>{calls++;return {rows:fixture()};},nowMs:()=>now});
 const server=createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const url=`http://127.0.0.1:${server.address().port}/v1/caged-mte`,body=JSON.stringify({end,version:'mte-caged-v1'}),signature=createHmac('sha256',secret).update(`${now}.${body}`).digest('hex');
  assert.equal((await fetch(url,{method:'POST',body})).status,401);
  for(let i=0;i<2;i++){const response=await fetch(url,{method:'POST',body,headers:{'x-quanti-timestamp':String(now),'x-quanti-signature':signature}});assert.equal(response.status,200);assert.equal((await response.json()).report.snapshotVersion,version);}
  assert.equal(calls,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
