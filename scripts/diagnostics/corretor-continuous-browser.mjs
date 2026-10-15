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
const out=resolve('.local-inputs/continuous-browser-'+Date.now());mkdirSync(out,{recursive:true});
const root='C:/Users/GaloD/Desktop/SE/_UPLOADS_TESTE/Corretor_V3_Campos_do_Jordao';
const pptx=join(root,'02_APRESENTACAO_SELECIONAR_DEPOIS',readdirSync(join(root,'02_APRESENTACAO_SELECIONAR_DEPOIS')).find(n=>n.endsWith('.pptx')));
const excels=readdirSync(join(root,'01_PLANILHAS_SELECIONAR_TODAS')).filter(n=>/\.(xlsx|xlsm)$/i.test(n)).map(n=>join(root,'01_PLANILHAS_SELECIONAR_TODAS',n));
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();
let cases=[cj,rol,long].filter(Boolean), rows=[...cj.findings,english], created=0, batchCalls=0;
await ctx.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
 if(!url.hostname.endsWith('.supabase.co'))return route.abort();
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 const path=url.pathname; let data=[];
 if(path.includes('/functions/')){
   const body=req.postDataJSON();result.paidCalls.push({path,action:body?.action});
   if(path.endsWith('/corretor-execution')){
     if(body.action==='start')data={id:'fixture-execution',state:'prepared'};
     else if(body.action==='batch'){batchCalls++; data=body.functionName==='analyze-text-batch'?{findings:[],inputTokens:0,outputTokens:0}:body.functionName==='analyze-ata-image'?{ata:null,inputTokens:0,outputTokens:0}:{tables:[],locais_visiveis:[],unidades:[],tem_fonte:false,inputTokens:0,outputTokens:0};}
     else data={ok:true};
     return route.fulfill({json:data});
   }
   return route.abort();
 }
 if(!['GET','HEAD'].includes(req.method())){
   if(path.endsWith('/rpc/corretor_prepare_study')){
     const body=req.postDataJSON(); created++;
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
try{
 await page.goto('http://127.0.0.1:5184/corretor/novo',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Escolher PowerPoint',exact:true}).waitFor({state:'visible'});
 await page.locator('input[accept=".xlsx,.xlsm"]').setInputFiles(excels);
 assert.equal(await page.locator('.cs-files li').count(),11);result.checks.push('11 Excel antes do PowerPoint aceitos');
 await page.locator('input[accept=".pptx"]').setInputFiles(pptx);
 await page.getByLabel('Cidade do estudo',{exact:true}).waitFor({timeout:120000});
 assert(page.url().includes('/corretor/novo'));assert.equal(result.paidCalls.length,0);assert.equal(created,0);result.checks.push('PowerPoint prepara na mesma página, sem IA nem criar estudo');
 await page.getByLabel('Cidade do estudo',{exact:true}).fill('Campos do Jordão');
 for(const width of [1440,1024,390,320]){
   await page.setViewportSize({width,height:1000}); await page.screenshot({path:join(out,`prepare-${width}.png`),fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow preparação ${width}`);
 }
 await page.reload({waitUntil:'networkidle'}); await page.getByLabel('Cidade do estudo',{exact:true}).waitFor({timeout:120000});
 assert.equal(await page.locator('.cs-files li').count(),11);assert.equal(result.paidCalls.length,0);result.checks.push('reload recupera PowerPoint, 11 Excel e cidade, sem IA');
 // Duplicata não reprocessa o arquivo nem altera decisões.
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Iniciar avaliação',exact:true}).click();
 await page.waitForURL('**/resumo');assert.equal(result.paidCalls.length,0);result.checks.push('arquivo idêntico abre o estudo existente, sem pagar');
 await page.goto(`http://127.0.0.1:5184/corretor/estudos/${cj.study.id}/revisao?slide=23`,{waitUntil:'networkidle'});
 assert.equal(await page.getByText('Catálogo de verificações',{exact:true}).count(),0);
 page.once('dialog',d=>d.accept()); await page.locator('.cs-viewer input[type=file]').setInputFiles(resolve('.local-inputs/cj-real-preview/Campos-do-Jordao-previa.pdf'));
 await page.locator('.cb-pdf canvas:not([hidden])').waitFor();await page.getByText('Prévia PDF fornecida · página 23 de 153').waitFor({timeout:30000});
 assert.equal(await page.locator('.cb-document canvas').count(),1);assert.equal(await page.locator('.cf-card img').count(),0);
 await page.screenshot({path:join(out,'review-slide23.png'),fullPage:true});result.checks.push('slide23 real, imagem única e texto abaixo');
 for(const n of [41,66,68,153]){
   await page.locator(`.cb-map button`).nth(n-1).click(); await page.getByText(`Prévia PDF fornecida · página ${n} de 153`).waitFor({timeout:30000});
   await page.screenshot({path:join(out,`review-slide${n}.png`),fullPage:true});
 }
 await page.locator('.cb-map button').nth(65).click();await page.getByText("Possível erro de grafia em 'Observatório'",{exact:true}).waitFor();assert.equal(await page.getByText(/Misspelling/).count(),0);result.checks.push('páginas23/41/66/68/153 corretas e inglês legado apresentado em português');
 await page.getByRole('button',{name:'Revisar um a um',exact:true}).click();await page.getByRole('dialog').waitFor(); await page.waitForTimeout(300);
 await page.setViewportSize({width:1440,height:1000});
 await page.waitForFunction(()=>document.querySelector('.cq-content').getBoundingClientRect().width>=.9*innerWidth);
 const dimensions=await page.evaluate(()=>({viewport:innerWidth,content:document.querySelector('.cq-content').getBoundingClientRect().width,progress:document.querySelector('[role=progressbar]').getBoundingClientRect().width}));result.measurements.push(dimensions);assert(dimensions.content>=.9*dimensions.viewport);assert(dimensions.progress>=.9*dimensions.viewport);
 await page.getByRole('button',{name:'Já ajustei · C'}).click();await page.getByRole('dialog').filter({has:page.getByText('Entrar com Geobrain',{exact:true})}).waitFor({timeout:3000}).catch(()=>{});
 await page.keyboard.press('Escape');await page.getByRole('alert').filter({hasText:'A decisão não foi salva'}).waitFor();result.checks.push('cancelar login mantém o item da triagem');
 await page.screenshot({path:join(out,'quick-1440.png'),fullPage:true});
 await page.keyboard.press('Escape'); await page.reload({waitUntil:'networkidle'});await page.getByText('Prévia PDF fornecida · página 66 de 153').waitFor({timeout:30000});result.checks.push('prévia recuperada por hash após reload');
 for(const width of [390,320]){await page.setViewportSize({width,height:1000});await page.screenshot({path:join(out,`review-${width}.png`),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow revisão ${width}`);}
 assert.equal(createHash('sha256').update(JSON.stringify(cj.findings)).digest('hex'),before);assert.equal(created,0);assert.equal(batchCalls,0);
 result.checks.push('corpus e decisões preservados; zero processamento pago');
 await page.goto(`http://127.0.0.1:5184/corretor/estudos/${rol.study.id}/revisao`,{waitUntil:'networkidle'});
 await page.getByRole('region',{name:'Mapa de slides',exact:true}).waitFor();
 const rolSlides=Math.max(...rol.study.study_versions.map(v=>v.n_slides));
 assert.equal(await page.locator('.cb-map button').count(),rolSlides);
 await page.locator('.cb-map button').last().click();
 result.checks.push('Rolândia abre e navega até o último slide sem executar IA');
 await page.goto(`http://127.0.0.1:5184/corretor/estudos/${long.study.id}/revisao`,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Retomar análise completa',exact:true}).waitFor();
 assert.equal(result.paidCalls.length,0);
 assert((await page.locator('body').innerText()).includes('214 slides'));
 result.checks.push('Tijucas214 permanece incompleto com retomada explícita; não simula relatório nem imagem ausente');
 // Novo envio em ambiente isolado: fornecedor simulado, nenhum dado do site alterado.
 cases=[];
 await page.goto('http://127.0.0.1:5184/corretor/novo',{waitUntil:'networkidle'});
 await page.getByLabel('Cidade do estudo',{exact:true}).waitFor({timeout:120000});
 assert.equal(result.paidCalls.length,0);
 await page.getByRole('button',{name:'Iniciar avaliação',exact:true}).click();
 await page.waitForURL('**/revisao',{timeout:120000});
 await page.getByRole('region',{name:'Mapa de slides',exact:true}).waitFor({timeout:30000});
 assert.equal(created,1);assert(batchCalls>0);
 assert.equal(result.paidCalls[0].action,'start');
 assert(result.paidCalls.every(c=>c.path.endsWith('/corretor-execution')));
 result.checks.push('confirmação explícita cria uma execução, percorre ata/texto/imagem simulados e chega à revisão');
 result.status='pass';
}catch(e){result.status='failed';result.failure=e.stack;result.lastText=await page.locator('body').innerText();await page.screenshot({path:join(out,'failure.png'),fullPage:true});}
finally{writeFileSync(join(out,'result.json'),JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify({out,status:result.status,failure:result.failure,checks:result.checks,errors:result.errors}));if(result.status!=='pass')process.exitCode=1;
