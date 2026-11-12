// Lote focal A. Dry-run por padrão; nenhuma chamada direta à OpenAI.
// O percurso completo B continua sendo verificado no app, sem confundir este ensaio com ele.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
const manifestPath=process.argv.find(a=>a.startsWith('--manifest='))?.slice(11);
if(!manifestPath)throw Error('Informe --manifest=arquivo-local.json. Sem --execute, somente confere o lote.');
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
const manifestSha256=createHash('sha256').update(readFileSync(manifestPath)).digest('hex');
const prepareUi=process.argv.includes('--prepare-ui');
if(!['A','B'].includes(manifest.lot)||!Array.isArray(manifest.tasks)||manifest.tasks.length>15||(!prepareUi&&!manifest.tasks.length)||prepareUi&&manifest.lot!=='B')throw Error('Lote inválido. B exige --prepare-ui.');
const source=readFileSync(resolve(manifest.sourcePptx));
const sha256=createHash('sha256').update(source).digest('hex'),sha1=createHash('sha1').update(source).digest('hex');
if(sha256!==manifest.sourceSha256)throw Error('Fonte alterada desde a preparação.');
const tasks=manifest.tasks.map(task=>{
 if(!/^[a-z0-9-]{1,60}$/.test(task.id))throw Error('Identificação de tarefa inválida.');
 if(!['analyze-text-batch','analyze-ata-image','analyze-table-image'].includes(task.functionName))throw Error('Tarefa inválida.');
 const payload={...task.payload,model:'gpt-6-luna'};
 if(task.image){const image=readFileSync(resolve(task.image));if(createHash('sha256').update(image).digest('hex')!==task.imageSha256)throw Error('Evidência de imagem alterada.');payload.base64=image.toString('base64');payload.mime='image/png';}
 return {...task,payload};
});
if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'dry-run',lot:manifest.lot,prepareUi,sourceSha256:sha256,tasks:tasks.map(t=>({id:t.id,functionName:t.functionName})),globalBudgetUsd:3,paidCalls:0}));process.exit(0);}
const url=process.env.SUPABASE_URL??'https://mxinpvcqzbfbzjodhgtz.supabase.co',key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(url!=='https://mxinpvcqzbfbzjodhgtz.supabase.co'||!key)throw Error('Acesso técnico ao backend correto indisponível. Não informe segredo no chat.');
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
async function request(path,body,extra={}){const res=await fetch(url+path,{method:body===undefined?'GET':'POST',headers:{...headers,...extra},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(140000)});const data=await res.json();if(!res.ok||data?.error)throw Error(`Operação recusada (${res.status}). Confira o ledger antes de repetir.`);return data;}
const statePath=resolve(dirname(manifestPath),`lote-${manifest.lot.toLowerCase()}-private-state.json`);
let state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):null;
if(state&&(state.sourceSha256!==sha256||state.manifestSha256!==manifestSha256))throw Error('Estado pertence a outra fonte ou lote.');
const save=()=>writeFileSync(statePath,JSON.stringify(state,null,2));
await request('/rest/v1/rpc/corretor_review_profile_schema',{});
if(!state){
 state={sourceSha256:sha256,manifestSha256,owner:randomBytes(32).toString('hex'),confirmed:[],status:'creating'};save();
 const [study]=await request('/rest/v1/studies_v3',{nome:`[VALIDAÇÃO TÉCNICA] ${manifest.city} — Luna ${manifest.lot}`,generation:'v3',cidade:manifest.city,uf:manifest.uf},{Prefer:'return=representation'});
 state.studyId=study.id;save();
 await request('/rest/v1/study_versions',{study_id:state.studyId,n:1,sha1,n_slides:manifest.slides,arquivo:basename(manifest.sourcePptx)});
 state.status='prepared';save();
}
if(state.status==='creating')throw Error('Registro incompleto: verificar antes de repetir a criação.');
if(prepareUi) {
 if(!state.bound) {
  await request('/rest/v1/corretor_review_validation_studies',{study_id:state.studyId,budget_id:'amanda-review-2026-10-21',owner_hash:createHash('sha256').update(state.owner).digest('hex')});
  state.bound=true;save();
 }
 console.log(JSON.stringify({lot:'B',paidCalls:0,route:`/corretor/estudos/${state.studyId}/revisao`,privateState:statePath,globalBudgetUsd:3,instruction:'Executar o percurso completo em contexto de navegador técnico isolado, usando o owner local deste estado. Nunca usar sessão pessoal nem expor segredo de backend.'}));
 process.exit(0);
}
const controller=body=>request('/functions/v1/corretor-execution',{owner:state.owner,...body});
if(!state.executionId){const run=await controller({action:'start',studyId:state.studyId,version:1,documentSha1:sha1,budgetUsd:3,validationBudgetId:'amanda-review-2026-10-21',context:{cidade:manifest.city,uf:manifest.uf,outras:[],fonte:null,reviewProfileId:'luna-high-review-2026-10-21'}});state.executionId=run.id;save();}
const out=resolve(dirname(manifestPath),'lote-a-responses');mkdirSync(out,{recursive:true});
for(const task of tasks){
 if(state.confirmed.includes(task.id))continue;
 // Uma tentativa: qualquer retorno desconhecido interrompe. O servidor contabiliza a reserva global.
 const result=await controller({action:'batch',executionId:state.executionId,functionName:task.functionName,payload:task.payload});
 if(result.profileId!=='luna-high-review-2026-10-21'||result.reasoningEffort!=='high')throw Error('Perfil efetivo diferente; pare e confira.');
 writeFileSync(resolve(out,task.id+'.json'),JSON.stringify(result,null,2));state.confirmed.push(task.id);save();
}
await controller({action:'finish',executionId:state.executionId,state:'interrupted'});
state.status='focal-finished-not-full-review';save();
console.log(JSON.stringify({lot:'A',confirmedTasks:state.confirmed.length,globalBudgetUsd:3,fullReview:false,ledger:'corretor_executions + ia_passes',output:out}));
