import XLSX from 'xlsx';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder='.local-inputs/estimativas-vendas/edgar-drive-20261022';
const raw=await readFile('.secrets/geobrain.env','utf8');
const env=Object.fromEntries(raw.split(/\r?\n/).flatMap(line=>{const m=/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);return m?[[m[1],m[2].trim().replace(/^(['"])(.*)\1$/,'$2')]]:[];}));
let token=env.GEOBRAIN_TOKEN;
const probe=()=>fetch('https://geobrain.com.br/public-api/monitored-cities?per_page=1&page=1',{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(30000)});
if(!token||!(await probe()).ok){
 const r=await fetch('https://geobrain.com.br/public-api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({email:env.GEOBRAIN_EMAIL,password:env.GEOBRAIN_PASSWORD}),signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error(`Login HTTP ${r.status}`);token=(await r.json()).token;if(!token)throw new Error('Login sem token');
}
let pages=1,done=0;const blocks=new Map(),start=performance.now();
async function read(page){
 const query=new URLSearchParams({uf:'MT',city:'Cuiabá',type:'Vertical',per_page:'100',page:String(page)});
 const r=await fetch(`https://app.geobrain.com.br/public-api/v2/building-with-history-internal?${query}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw new Error(`History HTTP ${r.status}`);const body=await r.json();
 if(page===1)pages=Number(body.meta.last_page);
 if(pages<1||pages>30||!Array.isArray(body.data))throw new Error('Invalid page contract');
 blocks.set(page,body.data);done++;
}
await read(1);let next=2;await Promise.all(Array.from({length:Math.min(8,pages-1)},async()=>{while(next<=pages)await read(next++);}));
const buildings=[...blocks].sort(([a],[b])=>a-b).flatMap(([,b])=>b),snapshot=JSON.stringify(buildings);
await writeFile(`${folder}/api-cuiaba-vertical.json`,snapshot);
const workbook=XLSX.readFile(`${folder}/cuiaba.xlsx`),rows=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
const source=new Map(rows.map(r=>{const [m,y]=String(r['Mês de referência']).split('/');return [`${r['ID Empreendimento']}|${r['ID Tipologia']}|${y}-${m}`,r];}));
let common=0;const projects=new Set(),equal={qty:0,stock:0,net:0},different={qty:0,stock:0,net:0},samples=[];
const apiKeys=new Set();
for(const b of buildings)for(const r of b.typologies_history??[]){
 const id=b.building_id??b.id,key=`${id}|${r.typology_id}|${String(r.period).slice(0,7)}`;apiKeys.add(key);const e=source.get(key);if(!e)continue;
 common++;projects.add(id);
 for(const [name,a,s] of [['qty','qty','Qtd Lançada'],['stock','typology_stock','Estoque Final'],['net','sold_in_period','Venda Líquida']]){
  const left=r[a]===null||r[a]===undefined?null:Number(r[a]),right=e[s]===null||e[s]===undefined?null:Number(e[s]);
  if(left===right)equal[name]++;else{different[name]++;if(samples.length<8)samples.push({key,field:name,api:left,excel:right});}
 }
}
const result={scope:'MT/Cuiabá/Vertical',readAt:new Date().toISOString(),pages,completed:done,apiBuildings:buildings.length,apiKeys:apiKeys.size,excelKeys:source.size,commonKeys:common,commonProjects:projects.size,equal,different,samples,excelOnlyKeys:[...source.keys()].filter(k=>!apiKeys.has(k)).length,apiOnlyKeys:[...apiKeys].filter(k=>!source.has(k)).length,elapsedSeconds:(performance.now()-start)/1000,snapshotSha256:createHash('sha256').update(snapshot).digest('hex'),note:'Common-key parity only, not scope or predictive-accuracy equivalence. Prices not used.'};
await writeFile(`${folder}/api-parity.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
