import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const manifest=JSON.parse(readFileSync('docs/features/corretor-vocacionais/calibracao/automacao/cases.json','utf8')).cases.find(c=>c.id==='cj');
const corpus=JSON.parse(readFileSync('src/features/corretor/lib/v3/__tests__/fixtures/review-v069-text.json','utf8')).find(c=>c.id==='cj');
const source=JSON.parse(readFileSync('src/features/corretor/lib/v3/__tests__/fixtures/cj-replay.json','utf8')).fonte;
const audit={study:{id:'fixture-cj',nome:manifest.studyName,cidade:'Campos do Jordão',uf:'SP',generation:'v3',status:'em_correcao',custo_total:0,created_at:'2026-10-13T00:00:00Z',relatorio:{tabelasNativas:39,tabelasExtraidas:41,tabelasVerificadas:23,imagensAnalisadas:51,geradoEm:'2026-10-13T00:00:00Z'}},findings:corpus.items.map(i=>({id:i.ruleId,study_id:'fixture-cj',rule_id:i.ruleId,status:i.status,origem:i.origem,resolvido_na_versao:i.resolvidoNaVersao,primeira_versao:i.primeiraVersao,verdict:i.verdict,verdict_revisado:i.verdictRevisado,payload:i.finding}))};
const prior={source:[{filename:'11 planilhas de referência',payload:source}]};
const versions=[{n:4,n_slides:153,sha1:'e6a5fa03d2a189c86a59d70d5eb515e0dd3cd36f'}];let rows=structuredClone(audit.findings);
const result={paidCalls:[],writes:[],errors:[]};const out=resolve('.local-inputs/closure-browser-'+Date.now());mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
const localUrl=process.env.CORRETOR_LOCAL_URL || 'http://127.0.0.1:5175/corretor';
if(!['localhost','127.0.0.1'].includes(new URL(localUrl).hostname))throw Error('Bancada aceita somente app local; APIs são fixtures.');
page.on('pageerror',e=>result.errors.push(e.message));
await page.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());if(!url.hostname.endsWith('.supabase.co'))return route.continue();
 const path=url.pathname;const body=req.postDataJSON();let data=[];
 if(path.includes('/functions/v1/')){result.paidCalls.push(path);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({findings:[],inputTokens:0,outputTokens:0,payload:{tables:[]}})});}
 if(req.method()==='OPTIONS')return route.fulfill({status:204});
 if(req.method()==='GET'){
  if(path.endsWith('/studies_v3'))data=[{...audit.study,study_versions:versions,findings_v3:rows.map(r=>({status:r.status})),study_sources_v3:[{study_id:audit.study.id}]}];
  else if(path.endsWith('/findings_v3'))data=rows;
  else if(path.endsWith('/study_sources_v3'))data=[{filename:prior.source[0].filename,payload:prior.source[0].payload}];
  else if(path.endsWith('/study_versions'))data=[...versions].sort((a,b)=>b.n-a.n);
  else if(path.endsWith('/vision_cache'))data=[]; // cache antigo/ausente, confirmação obrigatória
  if(req.headers().accept?.includes('vnd.pgrst.object'))data=data[0]??null;
 }else{
  result.writes.push({path,method:req.method()});
  if(path.endsWith('/study_versions')&&req.method()==='POST')versions.push(body);
  if(path.endsWith('/findings_v3')&&req.method()==='PATCH'){
   const ids=url.searchParams.get('rule_id');rows=rows.map(r=>(!ids||ids===`eq.${r.rule_id}`||ids.includes(r.rule_id))?{...r,...body}:r);
  }
 }
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data),headers:{'access-control-allow-origin':'*'}});
});
try{
await page.goto(localUrl,{waitUntil:'networkidle'});
await page.getByText(audit.study.nome,{exact:true}).click();await page.getByText('Carregando achados…',{exact:true}).waitFor({state:'hidden'});await page.waitForLoadState('networkidle');
const pptx=resolve(process.env.CORRETOR_TEST_INPUT_ROOT || '../../_UPLOADS_TESTE',manifest.pptx);
await page.locator('input[type=file][accept=".pptx"]').first().setInputFiles(pptx);
await page.getByRole('dialog',{name:'Confirmar processamento pago'}).waitFor({timeout:60000});
result.beforeCancelCalls=result.paidCalls.length;if(result.beforeCancelCalls)throw Error('IA antes de confirmação');
await page.screenshot({path:resolve(out,'budget.png'),fullPage:true});
await page.getByRole('button',{name:'Manter resultado gratuito'}).click();await page.waitForLoadState('networkidle');
result.afterCancelCalls=result.paidCalls.length;result.textAfterCancel=await page.locator('body').innerText();
if(result.afterCancelCalls)throw Error('Cancelar chamou IA');
if(!result.textAfterCancel.includes('Texto antigo não conferido nesta versão')||!result.textAfterCancel.includes('2 registros'))throw Error('Revisão textual não apresentada');
await page.screenshot({path:resolve(out,'review.png'),fullPage:true});
await page.locator('input[type=file][accept=".pptx"]').first().setInputFiles(pptx);
await page.getByRole('dialog',{name:'Confirmar processamento pago'}).waitFor({timeout:60000});
await page.getByRole('button',{name:'Confirmar e analisar'}).click();
await page.waitForTimeout(1000);if(!result.paidCalls.length)throw Error('Confirmar não iniciou fase paga mockada');
result.status='pass';
}catch(e){result.status='failed';result.failure=e.message;result.lastText=await page.locator('body').innerText();}
finally{writeFileSync(resolve(out,'result.json'),JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify({out,status:result.status,failure:result.failure,beforeCancelCalls:result.beforeCancelCalls,afterCancelCalls:result.afterCancelCalls,afterConfirmCalls:result.paidCalls.length,errors:result.errors}));
if(result.status!=='pass')process.exitCode=1;
