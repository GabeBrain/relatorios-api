// A1: snapshots reais, todos os serviços externos interceptados; zero IA/banco real.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const bank = JSON.parse(readFileSync('.local-inputs/audit-20261013/bank.json', 'utf8'));
const real = bank.filter(c => /Jardim Monte Bello|Castro Alves|Sebastiao|Salvador/.test(c.study.nome));
const cj = real.find(c => c.study.nome.includes('Jardim Monte Bello'));
const rol = real.find(c => c.study.nome.includes('Castro Alves'));
const extra = Array.from({length:22}, (_, i) => ({...cj, study:{...cj.study,id:`fixture-page-${i}`,nome:`Estudo sintético de paginação ${i + 1}`}}));
const cases = [...real,...extra], host = 'mxinpvcqzbfbzjodhgtz.supabase.co';
const out = resolve('.local-inputs/a1-browser-'+Date.now()); mkdirSync(out,{recursive:true});
const writes=[], paid=[], errors=[], measurements=[], checks=[];
let failStudies=false, failFindings=false;
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const before=hash(real.map(c=>c.findings));
const browser=await chromium.launch(), ctx=await browser.newContext();
await ctx.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
 if(url.hostname!==host)return route.abort();
 const path=url.pathname;
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 if(path.includes('/functions/')){paid.push(path);return route.abort();}
 if(!['GET','HEAD'].includes(req.method())){writes.push({path,method:req.method()});return route.fulfill({status:403,json:{message:'A1 fixture read-only'}});}
 let data=[];
 const id=(url.searchParams.get('study_id')??'').replace(/^eq\./,'');
 if(path.endsWith('/studies_v3')){
  if(failStudies)return route.fulfill({status:500,json:{message:'fixture error'}});
  data=cases.map(c=>({...c.study,findings_v3:c.findings.map(f=>({status:f.status})),study_sources_v3:[]}));
 } else if(path.endsWith('/findings_v3')) {
  if(failFindings)return route.fulfill({status:500,json:{message:'fixture error'}});
  data=cases.find(c=>c.study.id===id)?.findings??[];
 } else if(path.endsWith('/study_versions'))data=cases.find(c=>c.study.id===id)?.study.study_versions??[];
 else if(path.endsWith('/corretor_projects'))return route.fulfill({status:401,json:{message:'fixture no identity'}});
 return route.fulfill({status:200,json:data});
});
const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5176/corretor?filter=all',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:/^Estudos/}).waitFor();
 for(const width of [1440,1024,390,320]){
  await page.setViewportSize({width,height:1000});
  measurements.push({screen:'portfolio',width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  await page.screenshot({path:resolve(out,`portfolio-${width}.png`),fullPage:true});
 }
 if(/Cliente a completar|Cidade a confirmar|A definir|A confirmar/.test(await page.locator('.corretor-projects').innerText()))throw Error('Placeholder de cadastro legado');
 await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.reload({waitUntil:'networkidle'});
 if(new URL(page.url()).searchParams.get('page')!=='2')throw Error('Página não restaurada');checks.push('pagination reload');
 await page.getByLabel('Buscar estudos').fill('Monte Bello');
 await page.getByRole('link',{name:/Abrir estudo .*Monte Bello/}).click();
 await page.getByRole('heading',{name:'Continue a revisão'}).waitFor();
 if(!page.url().includes('/resumo'))throw Error('Carteira pulou resumo');
 await page.getByText('Sem cadastro prévio',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Completar cadastro',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 if(!await page.getByRole('button',{name:'Completar cadastro',exact:true}).evaluate(el=>el===document.activeElement))throw Error('Foco não retornou');
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});measurements.push({screen:'summary',width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  await page.screenshot({path:resolve(out,`summary-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('navigation',{name:'Áreas do estudo'}).getByRole('link',{name:'Revisão',exact:true}).click();
 await page.getByRole('button',{name:'Voltar aos estudos da revisão',exact:true}).waitFor();
 await page.screenshot({path:resolve(out,'review.png'),fullPage:true});
 await page.getByRole('button',{name:'Voltar aos estudos da revisão',exact:true}).click();
 await page.getByLabel('Buscar estudos').waitFor();
 if(await page.getByLabel('Buscar estudos').inputValue()!=='Monte Bello')throw Error('Busca perdida ao retornar');
 await page.waitForTimeout(300);if(page.url().includes('/revisao'))throw Error('Reabriu estudo após voltar');checks.push('summary review return preserves search');
 await page.goBack({waitUntil:'networkidle'});await page.getByRole('button',{name:'Voltar aos estudos da revisão',exact:true}).waitFor();
 await page.goForward({waitUntil:'networkidle'});await page.getByLabel('Buscar estudos').waitFor();checks.push('browser back forward');
 await page.getByLabel('Buscar estudos').fill('Castro Alves');await page.getByRole('link',{name:/Abrir estudo .*Castro Alves/}).click();await page.getByRole('heading',{name:'Continue a revisão'}).waitFor();
 if(!page.url().includes(rol.study.id))throw Error('Estudo A contaminou B');checks.push('study A to B');
 await page.getByRole('navigation',{name:'Áreas do estudo'}).getByRole('link',{name:'Materiais',exact:true}).click();await page.reload({waitUntil:'networkidle'});await page.getByRole('heading',{name:'Originais por versão'}).waitFor();
 await page.getByRole('navigation',{name:'Áreas do estudo'}).getByRole('link',{name:'Histórico',exact:true}).click();await page.getByRole('heading',{name:'Versões registradas'}).waitFor();checks.push('materials history reload');
 await page.goto(`http://127.0.0.1:5176/corretor?study=${cj.study.id}`,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Voltar aos estudos da revisão',exact:true}).waitFor();
 await page.getByRole('link',{name:'Voltar aos estudos',exact:true}).first().click();await page.getByLabel('Buscar estudos').waitFor();checks.push('legacy direct URL return');
 await page.goto(`http://127.0.0.1:5176/corretor/projetos/${cj.study.id}?tab=history`,{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Versões registradas'}).waitFor();checks.push('legacy history URL');
 await page.goto('http://127.0.0.1:5176/corretor/estudos/missing/resumo',{waitUntil:'networkidle'});await page.getByText('Estudo não encontrado.',{exact:false}).waitFor();checks.push('missing study');
 failFindings=true;await page.goto(`http://127.0.0.1:5176/corretor/estudos/${cj.study.id}/resumo`,{waitUntil:'networkidle'});await page.getByRole('alert').filter({hasText:'apontamentos'}).waitFor();failFindings=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.getByRole('heading',{name:'O que precisa de atenção'}).waitFor();checks.push('findings error not zero');
 await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:resolve(out,'summary-dark.png'),fullPage:true});
 failStudies=true;await page.goto('http://127.0.0.1:5176/corretor',{waitUntil:'networkidle'});await page.getByRole('alert').filter({hasText:'estudos'}).waitFor();failStudies=false;checks.push('portfolio error');
 await page.goto('http://127.0.0.1:5176/corretor?q=inexistente-fixture',{waitUntil:'networkidle'});await page.getByText('Nenhum estudo corresponde aos filtros.').waitFor();checks.push('empty search');
 await page.getByRole('link',{name:'Novo estudo',exact:true}).click();await page.getByRole('link',{name:'Voltar aos estudos',exact:true}).click();await page.getByLabel('Buscar estudos').waitFor();if(await page.getByLabel('Buscar estudos').inputValue()!=='inexistente-fixture')throw Error('Novo estudo perdeu contexto');checks.push('new study return');
 if(paid.length||errors.length||measurements.some(m=>m.overflow))throw Error(JSON.stringify({paid,errors,measurements}));
 const after=hash(real.map(c=>c.findings));if(before!==after)throw Error('Snapshot alterado');
 writeFileSync(resolve(out,'result.json'),JSON.stringify({scope:'snapshots reais Rolândia/CJ/SJC VAP/v2/Salvador +22 estudos sintéticos; API inteiramente simulada',checks,measurements,writesBlocked:writes,paid,errors,findingsBefore:before,findingsAfter:after},null,2));
 console.log(out);
}catch(error){writeFileSync(resolve(out,'failure.json'),JSON.stringify({error:String(error),url:page.url(),errors,writes,paid,text:await page.locator('body').innerText()},null,2));await page.screenshot({path:resolve(out,'failure.png'),fullPage:true});throw error;}
finally{await browser.close();}
