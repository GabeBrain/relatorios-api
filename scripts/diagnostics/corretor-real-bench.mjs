import {chromium} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {PDFDocument} from 'pdf-lib';
const wrong=await PDFDocument.create();wrong.addPage();writeFileSync('.local-inputs/preview-wrong-count.pdf',await wrong.save());
const bank=JSON.parse(readFileSync('.local-inputs/audit-20261013/bank.json','utf8'));
const selected=bank.find(c=>c.study.nome.includes('Jardim Monte Bello'));
const host='mxinpvcqzbfbzjodhgtz.supabase.co',out=resolve('.local-inputs/real-bench-'+Date.now());mkdirSync(out,{recursive:true});
const writes=[],paid=[],errors=[],checks=[];
const browser=await chromium.launch(),ctx=await browser.newContext();
await ctx.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();if(url.hostname!==host)return route.abort();
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 if(url.pathname.includes('/functions/')){paid.push(url.pathname);return route.abort();}
 if(req.method()!=='GET'){writes.push(url.pathname);return route.fulfill({status:403,json:{message:'read only'}});}
 let data=[];const path=url.pathname;
 if(path.endsWith('/studies_v3'))data=[{...selected.study,findings_v3:selected.findings.map(f=>({status:f.status})),study_sources_v3:[]}];
 else if(path.endsWith('/findings_v3'))data=selected.findings;
 else if(path.endsWith('/study_versions'))data=selected.study.study_versions;
 else if(path.endsWith('/corretor_projects'))return route.fulfill({status:401,json:{message:'No identity'}});
 return route.fulfill({status:200,json:data});
});
const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(20000);
try{
 await page.goto(`http://127.0.0.1:5176/corretor/estudos/${selected.study.id}/revisao?slide=23`,{waitUntil:'domcontentloaded'});
 await page.locator('.cb').waitFor();
 console.log('Bancada aberta');
 await page.locator('.cb input[type=file]').setInputFiles(resolve('.local-inputs/preview-wrong-count.pdf'));
 await page.getByRole('alert').filter({hasText:'mas o estudo tem 153 slides'}).waitFor();checks.push('wrong page count blocked');
 await page.locator('.cb input[type=file]').setInputFiles(resolve('.local-inputs/cj-real-preview/Campos-do-Jordao-previa.pdf'));
 console.log('PDF real anexado');
 await page.getByText('Prévia PDF fornecida · página 23 de 153',{exact:true}).waitFor({timeout:60000});
 await page.waitForFunction(()=>{const c=document.querySelector('.cb canvas');return c?.width>1000&&c.height>500;});
 const pixels=await page.locator('.cb canvas').evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<p.length;i+=400)if(p[i]<220&&p[i+3]>0)count++;return count;});if(pixels<10)throw Error('Canvas vazio');checks.push('real PDF slide 23 rendered');
 await page.locator('.cb').screenshot({path:resolve(out,'bench-slide-23.png')});
 await page.getByText('Mapa de slides · localizar apontamentos',{exact:true}).click();await page.getByRole('button',{name:/^Slide 68(?:,|$)/}).click();await page.getByText('Prévia PDF fornecida · página 68 de 153',{exact:true}).waitFor();await page.locator('.cb').screenshot({path:resolve(out,'bench-slide-68.png')});checks.push('map navigation slide 68');
 await page.getByRole('button',{name:'Zoom 100%',exact:true}).click();await page.getByRole('button',{name:'Zoom 140%',exact:true}).waitFor();checks.push('zoom');
 await page.getByRole('button',{name:/^Slide 153(?:,|$)/}).click();await page.getByText('Prévia PDF fornecida · página 153 de 153',{exact:true}).waitFor();checks.push('last slide');
 for(const width of [390,320]){await page.setViewportSize({width,height:1000});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');await page.screenshot({path:resolve(out,`bench-${width}.png`),fullPage:true});}checks.push('mobile reflow');
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:/^Slide 23,/}).click();await page.getByText('Prévia PDF fornecida · página 23 de 153',{exact:true}).waitFor();
 // Decisão não deve ocorrer antes do login nem ao cancelar.
 const decision=page.locator('.cb-findings').getByRole('button',{name:'Não é erro (FP)',exact:true}).first();
 await decision.click();await page.getByRole('dialog',{name:'Entrar com Geobrain'}).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();if(writes.length)throw Error('Decisão gravada ao cancelar login');checks.push('decision login cancellation');
 if(paid.length||errors.length||writes.length)throw Error(JSON.stringify({paid,errors,writes}));
 writeFileSync(resolve(out,'result.json'),JSON.stringify({scope:'PPTX real exportado localmente pelo PowerPoint, PDF153 páginas; achados snapshot, servidor inteiramente simulado',checks,pixels,writes,paid,errors},null,2));console.log(out);
}catch(error){writeFileSync(resolve(out,'failure.json'),JSON.stringify({error:String(error),errors,writes,paid,text:await page.locator('body').innerText()},null,2));await page.screenshot({path:resolve(out,'failure.png'),fullPage:true});throw error;}
finally{await browser.close();}
