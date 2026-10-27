import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const raw=await readFile('.secrets/geobrain.env','utf8');
const env=Object.fromEntries(raw.split(/\r?\n/).flatMap(line=>{const m=/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);return m?[[m[1],m[2].trim().replace(/^(['"])(.*)\1$/,'$2')]]:[];}));
let token=env.GEOBRAIN_TOKEN;
if(!token||!(await fetch('https://geobrain.com.br/public-api/monitored-cities?per_page=1&page=1',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)})).ok){
 const r=await fetch('https://geobrain.com.br/public-api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({email:env.GEOBRAIN_EMAIL,password:env.GEOBRAIN_PASSWORD}),signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error(`Login HTTP ${r.status}`);token=(await r.json()).token;if(!token)throw new Error('Login sem token');
}
const out='.local-inputs/estimativas-vendas/operacional-ui-20261027/live';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const network=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.url().includes('building-with-history-internal')){const u=new URL(r.url());network.push({type:u.searchParams.get('type'),page:u.searchParams.get('page'),status:r.status()});}});
 await page.addInitScript(({token})=>{const now=Date.now();localStorage.setItem('brain-auth',JSON.stringify({state:{token,email:'',issuedAt:now,expiresAt:now+3600000},version:0}));},{token});
 await page.goto('http://127.0.0.1:8083/rebrain/estimativas-vendas');
 await page.getByRole('combobox').first().click();await page.getByRole('option',{name:'SP',exact:true}).click();
 await page.getByRole('combobox').nth(1).click();await page.getByPlaceholder(/Buscar munic/).fill('Campinas');await page.getByText('Campinas',{exact:true}).last().click();
 await page.getByRole('button',{name:'Adicionar cidade',exact:true}).click();const start=performance.now();await page.getByRole('button',{name:'Preparar análise',exact:true}).click();
 await page.getByRole('heading',{name:/empreendimentos no recorte/}).waitFor({timeout:180000});
 const summary=await page.getByRole('heading',{name:/empreendimentos no recorte/}).textContent();const count=network.length;await page.getByRole('button',{name:'Explorar',exact:true}).first().click();
 await page.getByRole('dialog').getByRole('img',{name:/Vendas acumuladas/}).waitFor();await page.screenshot({path:`${out}/detail.png`});
 const result={transport:'API real autenticada, sem interceptação',city:'Campinas/SP',elapsedSeconds:(performance.now()-start)/1000,network,errors,requestsDuringDetail:network.length-count,summary};
 await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(errors.length||network.some(x=>x.status!==200))process.exitCode=1;
}finally{await browser.close();}
