/** Offline only. Uses ignored HTTP snapshots; never authenticates or contacts a server. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fetchPanoramaReportModel} from '../../src/features/panorama-secovi-fiergs/api';
import {buildFiergsAuditCsv} from '../../src/features/panorama-secovi-fiergs/lib/fiergs-audit';
import {useAuthStore} from '../../src/store/auth-store';
import type {PanoramaScope} from '../../src/features/panorama-secovi-fiergs/types';
import {quarterEndMonth,quarterIndex} from '../../src/features/panorama-secovi-fiergs/domain/quarters';
import {panoramaExportBlockReason} from '../../src/features/panorama-secovi-fiergs/export-store';

const root=resolve('.local-inputs/fiergs-incidente-20261027');
const output=resolve(root,'after-contracts');
await mkdir(output,{recursive:true});
globalThis.fetch=async(input,init)=>{
 const url=new URL(String(input));
 // A 2025 regression selects a historical close from the same frozen 2026 archive.
 // This is not a claim to reproduce the database as it existed in 2025.
 if(url.pathname.includes('temporal-analysis-city'))url.searchParams.set('end_period','2026-06-30');
 const key=createHash('sha256').update(`${init?.method??'GET'} ${url}`).digest('hex');
 const cached=JSON.parse(await readFile(resolve(root,'raw',key+'.json'),'utf8'));
 return new Response(JSON.stringify(cached.body),{status:cached.status,headers:{'Content-Type':'application/json'}});
};
useAuthStore.getState().setToken('offline-replay-not-a-credential','offline');
const cases=[
 {id:'porto-alegre',cities:['Porto Alegre'],startQuarter:'1T2021'},
 {id:'gramado-canela',cities:['Gramado','Canela'],startQuarter:'1T2021'},
 {id:'gramado',cities:['Gramado'],startQuarter:'1T2021'},
 {id:'canela',cities:['Canela'],startQuarter:'1T2021'},
 {id:'baseline-conjunto',cities:['Canoas','Esteio','São Leopoldo'],startQuarter:'1T2023'},
];
if(process.argv.includes('--verify-only')) {
 const summaries=JSON.parse(await readFile(resolve(output,'summary.json'),'utf8'));
 if(summaries.length!==10||summaries.some(r=>!r.homologable||r.failures.length||r.issues.length))throw Error('Incomplete regression');
 for(const r of summaries){const csv=await readFile(resolve(output,`${r.case}-${r.scope.endQuarter}-audit.csv`));
  if(createHash('sha256').update(csv).digest('hex')!==r.auditSha256)throw Error('CSV hash mismatch');
  const report=JSON.parse(await readFile(resolve(output,`${r.case}-${r.scope.endQuarter}-report.json`),'utf8'));
  const blocked=panoramaExportBlockReason(report);if(blocked)throw Error(`Export decision blocked ${r.case}: ${blocked}`);
  for(const series of [report.sales.units.series,report.stock.units.series,report.prices.ticket.series])
   if(series.some(item=>quarterIndex(item.quarter)>quarterIndex(r.scope.endQuarter)))throw Error('Future temporal series leaked into report');}
 const comparisons=[];
 for(const item of cases){
  const before=JSON.parse(await readFile(resolve(root,item.id+'-report.json'),'utf8'));
  const after=JSON.parse(await readFile(resolve(output,item.id+'-2T2026-report.json'),'utf8'));
  const previous=new Map<string,Record<string,unknown>>(before.cube.projects.map(p=>[p.key,p]));
  const changes={};
  for(const field of ['launchedUnits','finalUnits','soldUnits','averageTicket','averageArea','averagePricePerMeter','launchedVgvMillions','finalVgvMillions']){
   const different=after.cube.projects.filter(p=>{const old=previous.get(p.key)?.[field],now=p[field];return old!==now&&!(typeof old==='number'&&typeof now==='number'&&Math.abs(old-now)<1e-6);});
   changes[field]=different.map(p=>({id:p.buildingId,before:previous.get(p.key)![field],after:p[field]}));
   if(!['launchedUnits','launchedVgvMillions'].includes(field)&&different.length)throw Error(`Unexplained change ${item.id}/${field}`);
   if(field==='launchedVgvMillions'&&different.some(p=>!p.historyAudit.duplicates.length))throw Error('Launch VGV change without duplication lineage');
  }
  comparisons.push({case:item.id,changes});
 }
 await writeFile(resolve(output,'verified-comparison.json'),JSON.stringify({csvHashesVerified:10,comparisons},null,2));
 console.log('PASS: ten frozen regressions/CSV hashes/export decisions; baseline stock, sales, prices and final VGV preserved. Launch VGV changes have duplicate lineage.');
 process.exit(0);
}
const summaries=[];
for(const endQuarter of ['2T2026','4T2025'] as const)for(const item of cases){
 const scope={uf:'RS',entity:'fiergs-rs',engineVersion:'v4',cities:item.cities,startQuarter:item.startQuarter,endQuarter} as PanoramaScope;
 const report=await fetchPanoramaReportModel(scope);
 if(report.cube.projects.some(p=>p.historyAudit?.closingMonth && p.historyAudit.closingMonth>quarterEndMonth(endQuarter)))
   throw Error('Future closing snapshot leaked into regression');
 const prefix=`${item.id}-${endQuarter}`;
 const csv=buildFiergsAuditCsv(report);
 await writeFile(resolve(output,prefix+'-audit.csv'),csv);
 await writeFile(resolve(output,prefix+'-report.json'),JSON.stringify(report));
 const failures=report.reconciliation.rows.filter(r=>r.critical&&r.status!=='match');
 const sum=(key:'launchedUnits'|'finalUnits'|'soldUnits')=>report.cube.projects.reduce((s,p)=>s+(p[key]??0),0);
 const result={case:item.id,scope,mode:'offline-frozen-archive',homologable:report.reconciliation.homologable,
  projects:report.cube.projects.length,totals:{capacity:sum('launchedUnits'),stock:sum('finalUnits'),sales:sum('soldUnits')},
  failures,criticalChecks:report.reconciliation.rows.filter(r=>r.critical).length,
  unavailableIndependent:report.reconciliation.rows.filter(r=>r.checkKind==='independent_comparison'&&r.status==='unavailable').length,
  removed:report.cube.projects.reduce((s,p)=>s+(p.historyAudit?.duplicates.reduce((n,d)=>n+d.removed,0)??0),0),
  issues:report.cube.projects.filter(p=>p.historyAudit?.issues.length).map(p=>({id:p.buildingId,city:p.city,issues:p.historyAudit!.issues})),
  auditSha256:createHash('sha256').update(csv).digest('hex')};
 summaries.push(result);console.log(JSON.stringify(result));
}
await writeFile(resolve(output,'summary.json'),JSON.stringify(summaries,null,2));
if(summaries.some(r=>!r.homologable||r.failures.length))throw Error('Critical regression remains open');
