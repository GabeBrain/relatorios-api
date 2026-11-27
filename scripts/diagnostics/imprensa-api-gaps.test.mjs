import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {zipSync,strToU8} from 'fflate';
import {analyzeDiagnostic,readDiagnostic,registryAudit} from './imprensa-api-gaps.mjs';

const cadence={cities:{'RS|Estrela':{months:3,since:'2025-06'}}};
const sample=()=>({schema:'modelo-02-diagnostic-v1',selection:{region:'sul',year:2026,quarter:3},scope:{missingUfs:[]},sources:[{key:'RS/Estrela/Vertical/releases/Padrão',uf:'RS',city:'Estrela',metric:'releases',complete:true,httpStatus:200,missingRequiredMonths:['2025-03','2026-06'],observations:[{month:'2026-09',group:'Standard',missing:{vgv_release:1}}]}],slides:[{id:'releases-money-quarters',status:'available',sourceKeys:['RS/Estrela/Vertical/releases/Padrão'],tables:[{columns:['Unidades','VGV'],rows:[{label:'3T2026',values:[0,null]}]}]}]});
test('separa HTTP, início de monitoramento, competência ausente e campo monetário',()=>{
 const result=analyzeDiagnostic(sample(),cadence),source=result.sources[0];
 assert.equal(result.summary.collectionFailures,0);
 assert.deepEqual(source.beforeMonitoringStart,['2025-03']);
 assert.deepEqual(source.missingSinceMonitoringStart,['2026-06']);
 assert.deepEqual(source.fields,[{month:'2026-09',group:'Standard',field:'vgv_release',count:1}]);
 assert.deepEqual(result.slides[0].missingCells,[{table:0,row:'3T2026',column:'VGV'}]);
 assert.equal(result.slides[0].candidateSourceKeys.length,1);
});
test('campos não permitidos da entrada não são propagados e schema alheio é recusado',()=>{
 const input=sample();input.token='DO_NOT_EXPORT';input.sources[0].rows=[{name:'DO_NOT_EXPORT'}];
 assert.ok(!JSON.stringify(analyzeDiagnostic(input,cadence)).includes('DO_NOT_EXPORT'));
 assert.throws(()=>analyzeDiagnostic({...input,schema:'modelo-03-diagnostic-v1'},cadence),/inválido/);
});
test('registro de referência é separado de coleta e identifica apenas índices realmente ausentes',()=>{
 const result=registryAudit(cadence,{'2025-03':1,'2025-05':1,'2025-06':1},'2025-03','2025-06');
 assert.equal(result.regions.length,5);assert.equal(result.regions[0].registryCities,1);
 assert.equal(result.regions[0].startedInsideWindow.length,1);
 assert.deepEqual(result.missingInccMonths,['2025-04']);
});
test('lê JSON com BOM e a auditoria real incorporada ao formato PPTX',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'imprensa-gaps-'));
 try{
  const data=sample();data.note='A & B < C > D';const json=JSON.stringify(data),xml=json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const jsonPath=join(folder,'audit.json'),pptxPath=join(folder,'audit.pptx');
  await writeFile(jsonPath,'\uFEFF'+json);await writeFile(pptxPath,zipSync({'customXml/modelo02-audit.xml':strToU8(`<audit xmlns="urn:brain:modelo02:audit:v1">${xml}</audit>`)}));
  assert.deepEqual(await readDiagnostic(jsonPath),data);assert.deepEqual(await readDiagnostic(pptxPath),data);
 }finally{await rm(folder,{recursive:true,force:true});}
});
