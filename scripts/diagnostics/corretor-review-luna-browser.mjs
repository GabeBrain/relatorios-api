// Serviços interceptados. Materiais reais locais; nenhuma IA ou escrita remota.
import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const bank=JSON.parse(readFileSync('.local-inputs/audit-20261013/bank.json','utf8'));
const cj=structuredClone(bank.find(c=>c.study.nome.includes('Jardim Monte Bello')));
const rol=bank.find(c=>c.study.nome.includes('Castro Alves'));
const long=bank.find(c=>c.study.nome.includes('Natalia Paranhos'));
const before=createHash('sha256').update(JSON.stringify(cj.findings)).digest('hex');
// Inglês legado explicitamente injetado para testar apresentação, sem mudar o corpus.
const english={...structuredClone(cj.findings.find(f=>f.tipo==='SPELLING')),rule_id:'fixture-english-66',slide_ref:'s66',titulo:"Misspelling of 'Observatório'.",detalhe:"Misspelling of 'Observatório'.",status:'pendente',resolvido_na_versao:null};
english.payload={...english.payload,id:english.rule_id,type:'SPELLING',slideRef:'s66',title:english.titulo,detail:english.detalhe,viz:{kind:'text',evidence:'OBSERTÓRIO DO TURISMO 2023'}};
const result={checks:[],errors:[],externalWrites:0,paidCalls:[],measurements:[]};
const out=resolve('.local-inputs/review-luna-browser-'+Date.now());mkdirSync(out,{recursive:true});
const root='C:/Users/GaloD/Desktop/SE/_UPLOADS_TESTE/Corretor_V3_Campos_do_Jordao';
const pptx=join(root,'02_APRESENTACAO_SELECIONAR_DEPOIS',readdirSync(join(root,'02_APRESENTACAO_SELECIONAR_DEPOIS')).find(n=>n.endsWith('.pptx')));
const excels=readdirSync(join(root,'01_PLANILHAS_SELECIONAR_TODAS')).filter(n=>/\.(xlsx|xlsm)$/i.test(n)).map(n=>join(root,'01_PLANILHAS_SELECIONAR_TODAS',n));
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();
let cases=[], rows=[...cj.findings,english], created=0, batchCalls=0;
await ctx.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
 if(!url.hostname.endsWith('.supabase.co'))return route.abort();
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 const path=url.pathname; let data=[];
 if(path.includes('/functions/')){
   const body=req.postDataJSON();result.paidCalls.push({path,action:body?.action,model:body?.payload?.model,profileId:body?.context?.reviewProfileId});
   if(path.endsWith('/corretor-execution')){
     if(body.action==='start')data={id:'fixture-execution',state:'prepared',reviewProfileId:'luna-high-review-2026-10-21'};
     else if(body.action==='batch'){batchCalls++; data=body.functionName==='analyze-text-batch'?{findings:[],inputTokens:0,outputTokens:0}:body.functionName==='analyze-ata-image'?{ata:null,inputTokens:0,outputTokens:0}:{tables:[],locais_visiveis:[],unidades:[],tem_fonte:false,inputTokens:0,outputTokens:0};}
     else data={ok:true};
     return route.fulfill({json:data});
   }
   return route.abort();
 }
 if(!['GET','HEAD'].includes(req.method())){
   if(path.endsWith('/rpc/corretor_prepare_study')){
     await new Promise(r=>setTimeout(r,1500)); const body=req.postDataJSON(); created++;
     const study={...cj.study,id:'11111111-1111-4111-8111-111111111111',nome:body.p_name,relatorio:null,ata:null,ata_confirmada:false,study_versions:[{id:'22222222-2222-4222-8222-222222222222',n:1,n_slides:body.p_slides,sha1:body.p_sha1}]};
     cases.push({study,findings:[]});data={id:study.id,created:true};
   } else if(path.endsWith('/studies_v3')&&req.method()==='PATCH') {const body=req.postDataJSON(),id=url.searchParams.get('id')?.replace('eq.','');cases.forEach(c=>{if(c.study.id===id)Object.assign(c.study,body);});}
   return route.fulfill({json:data});
 }
 const id=(url.searchParams.get('study_id')??'').replace(/^eq\./,'');
 if(path.endsWith('/studies_v3')) data=cases.map(c=>({...c.study,findings_v3:c.findings.map(f=>({status:f.status})),study_sources_v3:[]}));
 else if(path.endsWith('/findings_v3'))data=id===cj.study.id?rows:cases.find(c=>c.study.id===id)?.findings??[];
 else if(path.endsWith('/study_versions'))data=cases.find(c=>c.study.id===id)?.study.study_versions??[];
 if(req.headers().accept?.includes('vnd.pgrst.object'))data=data[0]??null;
 return route.fulfill({json:data});
});
page.on('pageerror',e=>result.errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5186/corretor/novo',{waitUntil:'networkidle'});
 await page.locator('input[accept=".xlsx,.xlsm"]').setInputFiles(excels);
 await page.locator('input[accept=".pptx"]').setInputFiles(pptx);
 await page.getByLabel('Cidade do estudo',{exact:true}).waitFor({timeout:120000});
 await page.evaluate(()=>{window.transition={started:false,regressions:0};new MutationObserver(()=>{const t=document.body.innerText;if(t.includes('Avalia\u00e7\u00e3o em andamento'))window.transition.started=true;if(window.transition.started&&[...document.querySelectorAll('h1')].some(el=>/Preparar estudo|Continuar avalia/.test(el.textContent)))window.transition.regressions++;}).observe(document.body,{subtree:true,childList:true});});
 await page.getByRole('button',{name:'Iniciar avalia\u00e7\u00e3o',exact:true}).click();
 await page.getByText('Preparando a avalia\u00e7\u00e3o\u2026',{exact:true}).waitFor();
 assert.equal(await page.locator('input[accept=".pptx"]').count(),0);
 result.checks.push('registro atrasado permanece em andamento, sem retornar ao envio');
 await page.waitForURL('**/revisao',{timeout:120000});
 await page.getByRole('region',{name:'Mapa de slides',exact:true}).waitFor({timeout:30000});
 const transition=await page.evaluate(()=>window.transition);
 assert.equal(transition.regressions,0);assert.equal(created,1);assert(batchCalls>0);
 result.checks.push('PPTX e 11 Excel reais atravessam pipeline simulado e chegam ao resultado sem remontar envio');
 assert(result.paidCalls.filter(c=>c.action==='batch').every(c=>c.model==='gpt-6-luna'));
 assert(result.paidCalls.find(c=>c.action==='start').profileId==='luna-high-review-2026-10-21');
 result.checks.push('perfil Luna novo e modelos dos tres passes enviados pelo controlador simulado');
 await page.getByRole('link',{name:/Voltar aos estudos/}).first().click();
 await page.getByRole('heading',{name:'Assistente de Projetos',exact:true}).waitFor();
 await page.getByRole('link',{name:/^Abrir estudo /}).first().click();
 await page.getByRole('region',{name:'Mapa de slides',exact:true}).waitFor();
 await page.screenshot({path:join(out,'review.png'),fullPage:true});
 result.checks.push('sair para carteira e reabrir resultado sem nova execucao');
 assert.equal(result.errors.length,0);result.status='pass';
} catch(e){result.status='failed';result.failure=e.stack;result.lastText=await page.locator('body').innerText();}
finally{writeFileSync(join(out,'result.json'),JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify({out,status:result.status,failure:result.failure,checks:result.checks,errors:result.errors}));if(result.status!=='pass')process.exitCode=1;
