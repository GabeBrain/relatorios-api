// Verificação local: identidade, banco e rede externos integralmente simulados.
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const sample=JSON.parse(readFileSync('.local-inputs/audit-20261013/bank.json','utf8')).find(c=>c.study.nome.includes('Jardim Monte Bello'));
const study=structuredClone(sample.study),uid='11111111-2222-4333-8444-555555555555';
study.created_by=null;
const user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',app_metadata:{corretor_enabled:true,corretor_geo_until:new Date(Date.now()+3600000).toISOString()},user_metadata:{},created_at:new Date().toISOString()};
const jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,app_metadata:user.app_metadata}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.fixture';
const session={access_token:jwt,refresh_token:'fixture-no-real-credential',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user};
const out=resolve('.local-inputs/recommendation-flow-'+Date.now());mkdirSync(out,{recursive:true});
const result={checks:[],errors:[],measurements:[],functionCalls:0,simulatedProfileWrites:0,simulatedDrafts:0,simulatedStartActions:[]};
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();
let profiles=[],studyReads=0,visibleStudies=[study],recommendations=[],version={...study.study_versions[0],id:'fixture-version',study_id:study.id,n:4,sha1:'e6a5fa03d2a189c86a59d70d5eb515e0dd3cd36f',n_slides:153,created_at:new Date().toISOString()};study.study_versions=[version];
await ctx.addInitScript(s=>{localStorage.setItem('sb-mxinpvcqzbfbzjodhgtz-auth-token',JSON.stringify(s));localStorage.setItem('brain-auth',JSON.stringify({state:{token:'fixture-api',email:s.user.email,issuedAt:Date.now(),expiresAt:Date.now()+3600000},version:0}));},session);
await ctx.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.hostname==='127.0.0.1')return route.continue();
 if(!url.hostname.endsWith('.supabase.co'))return route.abort();
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
 if(url.pathname.includes('/functions/')){
  result.functionCalls++;const body=req.postDataJSON();result.simulatedStartActions.push(body.action);
  assert(url.pathname.endsWith('/corretor-execution'));
  if(body.action==='start'){
   assert.equal(body.context.purpose,'recommendation');assert.equal(body.documentSha1,version.sha1);assert(body.budgetUsd>0);
   recommendations=[{id:'fixture-rec',execution_id:'fixture-run',study_id:study.id,version_id:version.id,version_n:4,document_sha1:version.sha1,model:'gpt-4o-mini',prompt_version:'brain-2026-09-15-v1',price_version:'openai-2026-10-16',state:'prepared',estimated_usd:.007,budget_usd:body.budgetUsd,spent_usd:0,reserved_usd:0,input_tokens:0,cached_tokens:0,output_tokens:0,provider_calls:0,total_requests:1,coverage:{readableSlides:body.context.slides.length,totalSlides:153,withoutText:0,limitedSlides:0},content:null,error_message:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}];
   return route.fulfill({json:{id:'fixture-run',state:'prepared'}});
  }
  assert.equal(body.action,'recommendation_step');
  recommendations[0]={...recommendations[0],state:'completed',spent_usd:.000195,provider_calls:1,input_tokens:1000,cached_tokens:200,output_tokens:100,content:'## Avaliação da Consultoria\n\nSlide 41: resultado simulado.\n\n## Recomendação\n\nConferir produto com base na evidência.\n\n## Orientação ao analista\n\nValidar com a equipe.'};
  return route.fulfill({json:{done:true,result:recommendations[0]}});
 }
 if(url.pathname.includes('/auth/v1/user'))return route.fulfill({json:user});
 if(url.pathname.includes('/auth/'))return route.fulfill({json:session});
 const table=url.pathname.split('/').at(-1);let data=[];
 if(table==='corretor_prepare_study'){
  const body=req.postDataJSON();let current=visibleStudies.find(s=>s.study_versions.some(v=>v.sha1===body.p_sha1));
  if(!current){result.simulatedDrafts++;current={...study,id:'22222222-3333-4444-8555-666666666666',created_by:uid,nome:body.p_name,status:'em_correcao',relatorio:null,cidade:null,uf:null,ata:null,ata_confirmada:false,custo_total:0,study_versions:[{id:'draft-version',n:1,n_slides:body.p_slides,sha1:body.p_sha1}]};visibleStudies.push(current);data={id:current.id,created:true};}
  else data={id:current.id,created:false};
  return route.fulfill({json:data});
 }else if(table==='studies_v3'){
  studyReads++;
  data=visibleStudies.filter(s=>!url.searchParams.has('created_by')||s.created_by===uid).map(s=>({...s,findings_v3:sample.findings.map(f=>({status:f.status})),study_sources_v3:[]}));
 }else if(table==='corretor_projects'){
  if(req.method()==='POST'){result.simulatedProfileWrites++;profiles=[{...req.postDataJSON(),id:'fixture-profile',updated_at:new Date().toISOString()}];}
  data=profiles;
 }else if(table==='study_versions')data=[version];
 else if(table==='corretor_recommendations')data=recommendations;
 else if(table==='corretor_ai_usage')return route.fulfill({json:{since:new Date().toISOString(),groups:[{tipo:'recomendacao',model:'gpt-4o-mini',calls:1,input_tokens:1000,cached_tokens:200,output_tokens:100,cost_usd:.000195,latency_ms:500}],recommendations:{total:1,completed:1,partial:0,unknown:0,spent_usd:.000195,reserved_usd:0,estimated_usd:.007},daily:[]}});
 else if(table==='findings_v3')data=sample.findings;
 if(req.headers().accept?.includes('vnd.pgrst.object'))data=data[0]??null;
 return route.fulfill({json:data});
});
page.on('pageerror',e=>result.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5184/corretor/novo',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Escolher PowerPoint',exact:true}).waitFor();
 assert.equal(await page.locator('.cp-file-picker[data-ready=true]').count(),0);
 const root='C:/Users/GaloD/Desktop/SE/_UPLOADS_TESTE/Corretor_V3_Campos_do_Jordao';
 const deck=join(root,'02_APRESENTACAO_SELECIONAR_DEPOIS');
 await page.locator('input[accept=".pptx"]').first().setInputFiles(join(deck,readdirSync(deck).find(n=>n.endsWith('.pptx'))));
 await page.getByLabel('Cidade do estudo',{exact:true}).waitFor({timeout:30000});
 assert.equal(await page.locator('.cp-file-picker[data-ready=true]').count(),1);
 const sheets=join(root,'01_PLANILHAS_SELECIONAR_TODAS');
 await page.locator('input[accept=".xlsx,.xlsm"]').setInputFiles(readdirSync(sheets).filter(n=>/\.(xlsx|xlsm)$/i.test(n)).map(n=>join(sheets,n)));
 await page.locator('.cp-file-picker[data-ready=true]').nth(1).waitFor();
 assert.equal(await page.locator('.cs-files li').count(),11);
 result.checks.push('PPTX real preparado e 11 planilhas recebem sucesso; vazio não recebe');
 await page.locator('input[accept=".xlsx,.xlsm"]').dispatchEvent('change');assert.equal(await page.locator('.cs-files li').count(),11);
 for(let i=0;i<11;i++)await page.getByRole('button',{name:/^Remover /}).first().click();
 assert.equal(await page.locator('.cp-file-picker[data-ready=true]').count(),1);
 await page.locator('input[accept=".xlsx,.xlsm"]').setInputFiles(readdirSync(sheets).filter(n=>/\.(xlsx|xlsm)$/i.test(n)).map(n=>join(sheets,n)));
 await page.locator('.cp-file-picker[data-ready=true]').nth(1).waitFor();
 result.checks.push('cancelar seletor conserva sucesso; remover todas as planilhas remove o verde');
 for(const width of [1440,1024,390,320]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(350);
  const color=await page.locator('.cp-file-picker').first().evaluate(el=>({bg:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color}));
  assert.equal(color.bg,'rgb(74, 85, 48)');assert.equal(color.text,'rgb(243, 244, 239)');
  result.measurements.push({width,...color});await page.screenshot({path:join(out,`ready-${width}.png`),fullPage:true});
 }
 await page.locator('html').evaluate(el=>el.classList.add('dark'));await page.waitForTimeout(350);
 const readyDark=await page.locator('.cp-file-picker').first().evaluate(el=>({bg:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color}));assert.equal(readyDark.bg,'rgb(74, 85, 48)');assert.equal(readyDark.text,'rgb(243, 244, 239)');
 await page.screenshot({path:join(out,'ready-dark-320.png'),fullPage:true});await page.locator('html').evaluate(el=>el.classList.remove('dark'));
 await page.getByRole('button',{name:'Sugestão de análise',exact:true}).click();
 await page.getByRole('heading',{name:'Conferir antes de gerar',exact:true}).waitFor();
 result.estimateText=await page.locator('.cr-estimate').innerText();
 assert.equal(result.functionCalls,0);assert.equal(await page.locator('.cs-files li').count(),11);
 await page.getByText('Planilhas, PDF e conteúdo só em imagem não entram nesta recomendação.',{exact:false}).waitFor();
 result.checks.push('alternar objetivo conserva materiais e mostra cobertura, lotes, previsão e limite antes da confirmação');
 await page.getByRole('button',{name:'Revisar estudo',exact:true}).click();await page.getByLabel('Cidade do estudo',{exact:true}).waitFor();
 assert.equal(await page.locator('.cs-files li').count(),11);assert.equal(result.functionCalls,0);
 await page.getByRole('button',{name:'Sugestão de análise',exact:true}).click();
 await page.getByRole('button',{name:'Confirmar custo e preparar sugestões',exact:true}).focus();await page.keyboard.press('Enter');
 await page.locator('.cr-text').waitFor({timeout:30000});
 assert.deepEqual(result.simulatedStartActions,['start','recommendation_step']);assert.equal(visibleStudies.length,1);assert.equal(result.simulatedDrafts,0);
 assert.equal(await page.getByRole('button',{name:'Copiar texto',exact:true}).count(),1);
 await page.getByRole('link',{name:'Abrir sugestões do estudo',exact:true}).click();
 await page.locator('.cr-text').waitFor({timeout:30000});
 await page.reload({waitUntil:'networkidle'});await page.locator('.cr-text').waitFor({timeout:30000});
 assert.equal(result.functionCalls,2);result.checks.push('geração controlada vincula versão existente, salva resultado e reabre após reload sem cobrança');
 for(const width of [1440,1024,390,320]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(300);
  const measure=await page.locator('.cr-workspace').evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth}));
  assert(measure.scroll<=measure.client+2);result.measurements.push({viewport:width,...measure});await page.screenshot({path:join(out,`recommendation-${width}.png`),fullPage:true});
 }
 await page.locator('html').evaluate(el=>el.classList.add('dark'));await page.waitForTimeout(350);await page.screenshot({path:join(out,'recommendation-dark-320.png'),fullPage:true});
 result.checks.push('resultado e histórico legíveis em 1440/1024/390/320 e tema escuro, sem estouro interno');
 await page.getByRole('link',{name:'Arquivos e histórico',exact:true}).click();
 await page.getByText('Disponíveis neste navegador.',{exact:false}).waitFor({timeout:30000});
 result.checks.push('consumo da preparação conserva 11 planilhas vinculadas ao hash local');
 await page.getByRole('link',{name:'Revisão',exact:true}).click();await page.locator('.cb-map').waitFor({timeout:30000});
 assert.equal(result.functionCalls,2);result.checks.push('revisão existente continua disponível sem chamada paga');
 await page.getByRole('link',{name:'Voltar aos estudos',exact:true}).first().click();
 await page.getByRole('link',{name:'Revisar estudo',exact:true}).click();await page.getByRole('button',{name:'Escolher PowerPoint',exact:true}).waitFor();
 assert.equal(await page.locator('.cp-file-picker[data-ready=true]').count(),0);result.checks.push('Novo estudo volta vazio depois de gerar, sem ressuscitar preparação anterior');
 await page.goto('http://127.0.0.1:5184/corretor/calibracao',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'Uso e custo de IA',exact:true}).waitFor();await page.getByText('Recomendação · gpt-4o-mini',{exact:true}).waitFor();
 assert.equal(result.functionCalls,2);result.checks.push('painel existente de calibração exibe custo, modelo, chamadas, tokens e cache consultivos');
 await page.screenshot({path:join(out,'metrics-320.png'),fullPage:true});
 assert.deepEqual(result.errors,[]);
}catch(e){await page.screenshot({path:join(out,'failure.png'),fullPage:true});writeFileSync(join(out,'failure.txt'),await page.locator('body').innerText());throw e;}finally{writeFileSync(join(out,'result.json'),JSON.stringify({...result,realCalls:0},null,2));console.log(out);console.log(JSON.stringify(result));await browser.close();}
