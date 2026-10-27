// Read-only explanation of actual model decisions. No fitting, parameter changes or Geobrain writes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const folder='.local-inputs/estimativas-vendas/rio-branco-explicacao-20261027';
await mkdir(folder,{recursive:true});
await build({entryPoints:['src/features/estimativas-vendas/operational/workbench.ts'],bundle:true,platform:'node',format:'esm',outfile:`${folder}/engine.mjs`});
const {prepareReview}=await import(new URL(`../../${folder}/engine.mjs`,import.meta.url));
let buildings=[],requests=[];
if(process.argv.includes('--replay')) buildings=JSON.parse(await readFile(`${folder}/snapshot.json`,'utf8'));
else {
 const raw=await readFile('.secrets/geobrain.env','utf8');
 const env=Object.fromEntries(raw.split(/\r?\n/).flatMap(line=>{const m=/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);return m?[[m[1],m[2].trim().replace(/^(['"])(.*)\1$/,'$2')]]:[];}));
 let token=env.GEOBRAIN_TOKEN;
 const probe=t=>fetch('https://geobrain.com.br/public-api/monitored-cities?per_page=1&page=1',{headers:{Authorization:`Bearer ${t}`},signal:AbortSignal.timeout(30000)});
 if(!token||!(await probe(token)).ok){
  const r=await fetch('https://geobrain.com.br/public-api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({email:env.GEOBRAIN_EMAIL,password:env.GEOBRAIN_PASSWORD}),signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw new Error(`Login HTTP ${r.status}`);token=(await r.json()).token;if(!token)throw new Error('Login sem token');
 }
 for(const type of ['Horizontal','Vertical']) {
  let total=1;
  for(let page=1;page<=total;page++){
   const query=new URLSearchParams({uf:'AC',city:'Rio Branco',type,per_page:'100',page:String(page)});
   const r=await fetch(`https://app.geobrain.com.br/public-api/v2/building-with-history-internal?${query}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(60000)});
   requests.push({type,page,status:r.status});if(!r.ok)throw new Error(`History HTTP ${r.status}`);
   const body=await r.json();total=Number(body.meta?.last_page??1);if(!Array.isArray(body.data)||total>30)throw new Error('Invalid history response');
   buildings.push(...body.data.map(b=>({...b,sourceType:type})));
  }
 }
 await writeFile(`${folder}/snapshot.json`,JSON.stringify(buildings));
}
const cutoff='2026-09';
const result=await prepareReview(buildings.map(building=>({building,uf:'AC',city:'Rio Branco'})),cutoff,new AbortController().signal,()=>{});
const cases=result.map(r=>{
 const o=r.normalized.origin;
 return {id:r.id,name:r.name,type:r.building.sourceType,release:r.building.release_date,age:o?.age,pattern:o?.pattern,units:o?.units,stock:o?.stock,sold:o?.sold,
  percent:o?100*o.sold/o.units:null,typologies:new Set(r.building.typologies_history.filter(x=>x.period.slice(0,7)<=cutoff).map(x=>String(x.typology_id))).size,
  monthsReported:o?.history.map(x=>x.period),status:r.status,reasons:r.reasons,
  models:Object.fromEntries([...r.methods].map(([id,m])=>[id,{available:!!m.forecast,reason:m.reason,parameters:m.forecast?.parameters,
    predictions:m.forecast?[1,3,6,12,36].map(h=>{const p=m.forecast.points[h];return{monthsAhead:h,month:p.period,accumulated:p.predicted,stock:p.stock,net:p.predicted-o.sold};}):null,warnings:m.forecast?.warnings}]))};
});
const counts={};for(const r of result)counts[r.status]=(counts[r.status]??0)+1;
const report={source:'Geobrain API, read-only',cutoff,analyzedAt:new Date().toISOString(),requests,sha256:createHash('sha256').update(JSON.stringify(buildings)).digest('hex'),total:cases.length,counts,referenceCalculable:cases.filter(r=>r.models['finotti-reference'].available).length,cases};
await writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,cases:cases.map(({monthsReported,reasons,models,...r})=>({...r,reference:models['finotti-reference'].available,reason:models['finotti-reference'].reason,nextMonth:models['finotti-reference'].predictions?.[0],recent:models['stock-trend'].available,recentReason:models['stock-trend'].reason}))},null,2));
