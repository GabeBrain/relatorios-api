// Read-only explanation of actual model decisions. No fitting, parameter changes or Geobrain writes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const folder='.local-inputs/estimativas-vendas/maragogi-historico-20261028';
await mkdir(folder,{recursive:true});
await build({entryPoints:['src/features/estimativas-vendas/experience/domain.ts'],bundle:true,platform:'node',format:'esm',outfile:`${folder}/engine.mjs`});
const {observations}=await import(new URL(`../../${folder}/engine.mjs`,import.meta.url));
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
   const query=new URLSearchParams({uf:'AL',city:'Maragogi',type,per_page:'100',page:String(page)});
   const r=await fetch(`https://app.geobrain.com.br/public-api/v2/building-with-history-internal?${query}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(60000)});
   requests.push({type,page,status:r.status});if(!r.ok)throw new Error(`History HTTP ${r.status}`);
   const body=await r.json();total=Number(body.meta?.last_page??1);if(!Array.isArray(body.data)||total>30)throw new Error('Invalid history response');
   buildings.push(...body.data.map(b=>({...b,sourceType:type})));
  }
 }
 await writeFile(`${folder}/snapshot.json`,JSON.stringify(buildings));
}
const summary=buildings.map(b=>{ const rows=observations(b); return {id:String(b.building_id??b.id),name:b.name,type:b.sourceType,rawRows:b.typologies_history.length,months:rows.length,validMonths:rows.filter(r=>r.stock!==null).length,first:rows[0]?.month,last:rows.at(-1)?.month,duplicateMonths:rows.filter(r=>{const ts=b.typologies_history.filter(t=>t.period.slice(0,7)===r.month);return new Set(ts.map(t=>String(t.typology_id))).size!==ts.length;}).length,sample:rows.slice(-4)};});
await writeFile(`${folder}/history-summary${process.argv.includes('--replay')?'-replay':''}.json`,JSON.stringify({requests,total:buildings.length,summary},null,2)); console.log(JSON.stringify({requests,total:buildings.length,validMonths:summary.reduce((n,r)=>n+r.validMonths,0),target:summary.find(r=>r.id==='75803'),sha256:createHash('sha256').update(JSON.stringify(buildings)).digest('hex')},null,2));
