import {readFile} from 'node:fs/promises';
const [uf='PR',city='Curitiba',type='Horizontal']=process.argv.slice(2);
if(!['Horizontal','Vertical'].includes(type))throw new Error('Unsupported API type');
const {writeFile,mkdir}=await import('node:fs/promises');
const {createHash}=await import('node:crypto');
const {build}=await import('esbuild');
const path='.local-inputs/estimativas-vendas/expanded';await mkdir(path,{recursive:true});
await build({entryPoints:['scripts/diagnostics/estimativas-expanded-entry.ts'],bundle:true,platform:'node',format:'esm',outfile:`${path}/engine.mjs`});
const engine=await import(new URL(`../../${path}/engine.mjs`,import.meta.url));
await engine.prepareReferenceModels();
const key=`${uf}-${city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'')}-${type}`;
let buildings=[],pages=0;
if(process.argv.includes('--replay')){buildings=JSON.parse(await readFile(`${path}/${key}-snapshot.json`,'utf8'));pages=Math.ceil(buildings.length/100);}else{
const raw = await readFile(new URL('../../.secrets/geobrain.env', import.meta.url), 'utf8');
const env = Object.fromEntries(raw.split(/\r?\n/).flatMap(line => {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  return match ? [[match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2')]] : [];
}));
let token = env.GEOBRAIN_TOKEN;

async function probeCities(candidate) {
  return fetch('https://geobrain.com.br/public-api/monitored-cities?per_page=5&page=1', {
    headers: { Authorization: `Bearer ${candidate}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000),
  });
}

let cities = token ? await probeCities(token) : null;
if (!cities?.ok) {
  const login = await fetch('https://geobrain.com.br/public-api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: env.GEOBRAIN_EMAIL, password: env.GEOBRAIN_PASSWORD }), signal: AbortSignal.timeout(20_000),
  });
  if (!login.ok) throw new Error(`Login HTTP ${login.status}`);
  token = (await login.json()).token;
  if (!token) throw new Error('Login sem token');
  cities = await probeCities(token);
}
if(cities.ok)await cities.json();
if (!cities.ok) throw new Error(`Cidades monitoradas HTTP ${cities.status}`);

pages=1;
const fetched=new Map();const start=performance.now();
async function pageRead(page){
 const query=new URLSearchParams({uf,city,type,per_page:'100',page:String(page)});
 const r=await fetch(`https://app.geobrain.com.br/public-api/v2/building-with-history-internal?${query}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw new Error(`History ${r.status}`);
 const b=await r.json();if(page===1)pages=Number(b.meta?.last_page??1);if(pages>30)throw new Error('Page ceiling');
 fetched.set(page,b.data.map(x=>({...x,sourceType:type})));
}
await pageRead(1);let next=2;await Promise.all(Array.from({length:Math.min(8,pages-1)},async()=>{while(next<=pages)await pageRead(next++);}));
buildings=[...fetched].sort(([a],[b])=>a-b).flatMap(([,b])=>b);
console.log(JSON.stringify({scope:`${uf}/${city}/${type}`,pages,buildings:buildings.length,elapsedSeconds:(performance.now()-start)/1000}));
}
const snapshot=JSON.stringify(buildings),hash=createHash('sha256').update(snapshot).digest('hex');

await writeFile(`${path}/${key}-snapshot.json`,snapshot);
const scope=`${uf}/${city}/${type}`, cutoff='2025-09';
const split=engine.groupSplit(buildings);
const training=buildings.filter(b=>split.training.includes(String(b.building_id??b.id)));
const pairs=[];
for(const b of training)for(const n of ['2024-03','2024-09','2025-03']){
 const before=engine.normalizeOrigin(b,n).origin,after=engine.normalizeOrigin(b,engine.shiftMonth(n,6)).origin;
 if(before&&after&&after.units===before.units&&after.cutoff<=cutoff)pairs.push({id:before.id,segment:before.segment,cutoff:n,target:after.cutoff,age:before.age??0,before:before.sold,after:after.sold,units:before.units,provenance:'unknown'});
}
const artifacts=[];
for(const segment of [...new Set(pairs.map(p=>p.segment))])for(const fit of [engine.fitAbsorption,engine.fitCohort]){
 try{artifacts.push(fit(fit===engine.fitAbsorption?pairs.filter(p=>p.age>0&&p.before>0&&p.before<p.units&&p.after>p.before&&p.after<p.units):pairs,segment,cutoff,[...split.calibration,...split.test],scope));}catch{/* counted below */}
}
await writeFile(`${path}/${key}-artifacts.json`,JSON.stringify(artifacts,null,2));
const models=engine.MODELS.map(m=>m.id),test=buildings.filter(b=>split.test.includes(String(b.building_id??b.id)));
const trials=engine.retrospective(test,[cutoff],models,[1,3,6,12],'unknown','unknown',artifacts);
const calibrationTrials=engine.retrospective(buildings.filter(b=>split.calibration.includes(String(b.building_id??b.id))),['2024-03','2024-09'],['constant'],[1,3,6,12]);
const bandResults=[];
for(const segment of [...new Set(calibrationTrials.map(t=>t.segment))])for(const h of [1,3,6,12]){
 const c=engine.calibrate(calibrationTrials,'constant',segment,h,cutoff,split.training,split.test,20);
 if(!c)continue;
 const checks=trials.filter(t=>t.model==='constant'&&t.segment===segment&&t.horizon===h&&t.predicted!==null&&t.actual!==null).flatMap(t=>{const band=engine.predictionBands(t.predicted,t.units,c,cutoff,t.id,t.model,segment,h);return band?[{actual:t.actual,...band}]:[];});
 bandResults.push({segment,horizon:h,calibrationProjects:c.ids.length,test:engine.intervalMetrics(checks),promoted:false,reason:'Exploratory reported-stock interval; observed lineage and business tolerance pending.'});
}
const composition={originsWithStock:test.filter(b=>engine.normalizeOrigin(b,cutoff).origin).length,nonzeroStock:test.filter(b=>engine.normalizeOrigin(b,cutoff).origin?.stock>0).length,withAge:test.filter(b=>engine.normalizeOrigin(b,cutoff).origin?.age).length};
const activeIds=new Set(test.filter(b=>engine.normalizeOrigin(b,cutoff).origin?.stock>0).map(b=>String(b.building_id??b.id)));
const report={activeTest:Object.fromEntries(models.map(m=>[m,engine.metrics(trials.filter(t=>t.model===m&&activeIds.has(t.id)))])),composition,bandResults,paired:Object.fromEntries(models.map(m=>[m,engine.paired(trials.filter(t=>t.model===m),trials.filter(t=>t.model==='constant'))])),scope,analyzedAt:new Date().toISOString(),snapshotReadMode:process.argv.includes('--replay')?'local-replay':'authenticated-api',hash,buildings:buildings.length,pages,provenance:'unknown',measurement:'unknown',split:{seed:split.seed,training:split.training.length,calibration:split.calibration.length,test:split.test.length},trainingPairs:pairs.length,artifacts:artifacts.map(a=>({model:a.model,segment:a.segment,projects:a.trainingIds.length,k:a.k,monthlyFraction:a.monthlyFraction})),latestEligibility:Object.fromEntries(models.map(m=>[m,buildings.filter(b=>{const o=engine.normalizeOrigin(b,'2026-09').origin;return o&&engine.forecast(o,m,24,artifacts.find(a=>a.model===m&&a.segment===o.segment)).forecast;}).length])),test:Object.fromEntries(models.map(m=>[m,engine.metrics(trials.filter(t=>t.model===m))])),bands:'Exploratory constant-model coverage evaluated; no interval promoted to UI',note:'Comparison with reported stock; no observed accuracy claim. Monthly models intentionally unavailable without cadence confirmation.'};
await writeFile(`${path}/${key}-report.json`,JSON.stringify(report,null,2));await writeFile(`${path}/${key}-trials.json`,JSON.stringify(trials));console.log(JSON.stringify(report,null,2));
