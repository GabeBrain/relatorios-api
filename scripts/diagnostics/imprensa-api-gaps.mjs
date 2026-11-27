/** Read-only audit of exported Imprensa JSON/PPTX; never calls the API. */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {unzipSync,strFromU8} from 'fflate';

const root=new URL('../../',import.meta.url);
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const regions={sul:['PR','SC','RS'],sudeste:['ES','MG','RJ','SP'],nordeste:['AL','BA','CE','MA','PB','PE','PI','RN','SE'],norte:['AC','AP','AM','PA','RO','RR','TO'],'centro-oeste':['DF','GO','MT','MS']};
const loadJson=async path=>JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
export async function readDiagnostic(path){
 if(!path.toLowerCase().endsWith('.pptx'))return loadJson(path);
 const files=unzipSync(await readFile(path)),part=files['customXml/modelo02-audit.xml'];
 if(!part)throw new Error('PPTX sem auditoria Imprensa incorporada. Use o diagnóstico JSON.');
 const match=strFromU8(part).match(/<audit\b[^>]*>([\s\S]*?)<\/audit>/);
 if(!match)throw new Error('Auditoria XML inválida.');
 return JSON.parse(match[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
}
export function analyzeDiagnostic(audit,cadence){
 if(audit.schema!=='modelo-02-diagnostic-v1'||!regions[audit.selection?.region])throw new Error('Diagnóstico Imprensa/região inválido.');
 const entries=new Map(Object.entries(cadence.cities).map(([key,value])=>[norm(key),value]));
 const sources=(audit.sources??[]).map(source=>{
  const registry=entries.get(norm(`${source.uf}|${source.city}`));
  const missing=source.missingRequiredMonths??[];
  const beforeMonitoringStart=registry?missing.filter(month=>month<registry.since):[];
  const fields=(source.observations??[]).flatMap(row=>Object.entries(row.missing??{}).filter(([,count])=>count>0).map(([field,count])=>({month:row.month,group:row.group,field,count})));
  return {key:source.key,city:source.city,uf:source.uf,metric:source.metric,group:source.group,complete:source.complete,httpStatus:source.httpStatus,empty:source.empty,records:source.records,requests:source.requests,
   survey:source.survey,registry:registry??null,missingRequiredMonths:missing,beforeMonitoringStart,
   missingSinceMonitoringStart:missing.filter(month=>!beforeMonitoringStart.includes(month)),fields,
   priceFieldCoverage:(source.priceFieldCoverage??[]).filter(row=>row.missingPrice||row.missingPrivateArea||row.missingMeterAfterDerivation),
   evidence:[...(!source.complete?['collection-incomplete']:[]),...(source.empty?['collection-empty']:[]),...(beforeMonitoringStart.length?['required-before-monitoring-start']:[]),...(missing.some(m=>!beforeMonitoringStart.includes(m))?['required-observation-missing']:[]),...(fields.length?['numeric-field-missing']:[])]};
 });
 const slides=(audit.slides??[]).map(slide=>({id:slide.id,status:slide.status,coverage:slide.coverage??null,
  missingCells:(slide.tables??[]).flatMap((table,tableIndex)=>table.rows.flatMap(row=>row.values.flatMap((value,index)=>value===null?[{table:tableIndex,row:row.label,column:table.columns[index]}]:[]))),
  candidateSourceKeys:(slide.sourceKeys??[]).filter(key=>sources.some(source=>source.key===key&&source.evidence.length))})).filter(slide=>slide.missingCells.length||slide.status==='waiting-source');
 return {schema:'imprensa-api-gaps-v1',region:audit.selection.region,selection:audit.selection,generatedAt:audit.generatedAt,
  summary:{sources:sources.length,collectionFailures:sources.filter(s=>!s.complete).length,sourcesMissingObservations:sources.filter(s=>s.missingRequiredMonths.length).length,sourcesMissingNumericFields:sources.filter(s=>s.fields.length).length,slidesWithMissingCells:slides.filter(s=>s.missingCells.length).length},
  missingUfs:audit.scope?.missingUfs??[],sources,slides,
  limits:['Arquivo exportado: não é uma nova consulta autenticada.','sourceKeys são candidatos por slide, não prova da causa de cada célula.','missingRequiredMonths é cobertura observada; não prova falha HTTP nem ausência real de mercado.','Meses anteriores a since exigem decisão de cobertura; não são convertidos em zero.','Fotografias detalhadas: meses e campos agregados não provam completude por empreendimento.','Sem oferta e denominador zero também podem produzir células nulas legítimas.']};
}
export function registryAudit(cadence,indices,start='2024-07',end='2026-09'){
 return {schema:'imprensa-registry-risk-v1',window:{start,end},source:cadence.source,retrievedAt:cadence.retrievedAt,
  regions:Object.entries(regions).map(([region,ufs])=>{const cities=Object.entries(cadence.cities).filter(([key])=>ufs.includes(key.split('|')[0]));return {region,registryCities:cities.length,monthly:cities.filter(([,v])=>v.months===1).length,quarterly:cities.filter(([,v])=>v.months===3).length,startedInsideWindow:cities.filter(([,v])=>v.since>start&&v.since<=end).map(([key,v])=>({city:key,...v}))};}),
  missingInccMonths:Array.from({length:Math.max(0,(Number(end.slice(0,4))-Number(start.slice(0,4)))*12+Number(end.slice(5))-Number(start.slice(5))+1)},(_,i)=>new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5))-1+i,1)).toISOString().slice(0,7)).filter(month=>!indices[month]),
  limits:['Inventário de referência: não é catálogo autorizado do token nem resposta atual da API.','Início de monitoramento não comprova falta de histórico retroativo.','INCC verificado apenas quanto à presença local dos índices.']};
}
async function main(){
 const args=process.argv.slice(2),cadence=await loadJson(new URL('src/features/relatorios-institucionais/modelo-03/survey-cadence.json',root));
 if(!args.length||args.includes('--help')){console.log('node scripts/diagnostics/imprensa-api-gaps.mjs --registry | <diagnostico.json|relatorio.pptx> [...]');return;}
 if(args[0]==='--registry'){
  const incc=await loadJson(new URL('src/features/relatorios-institucionais/fortaleza/incc-di.json',root));
  console.log(JSON.stringify(registryAudit(cadence,incc.indices),null,2));return;
 }
 const results=[];for(const path of args)results.push(analyzeDiagnostic(await readDiagnostic(path),cadence));
 console.log(JSON.stringify(results,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
