import {chromium} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
const bank=JSON.parse(readFileSync('.local-inputs/audit-20261013/bank.json','utf8')),sample=bank.find(c=>c.study.nome.includes('Jardim Monte Bello'));
const manifest=JSON.parse(readFileSync('docs/features/corretor-vocacionais/calibracao/automacao/cases.json','utf8')),testCase=manifest.cases.find(c=>c.id==='cj');
const inputs=resolve('../..','_UPLOADS_TESTE'),sheets=testCase.excelFiles.map(f=>resolve(inputs,testCase.excel,f.name));
const uid='11111111-1111-4111-8111-111111111111',host='mxinpvcqzbfbzjodhgtz.supabase.co';
const user={id:uid,email:'fixture@example.invalid',is_anonymous:false,app_metadata:{corretor_enabled:true,corretor_geo_until:'2099-01-01T00:00:00Z'}};
const access=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'fixture'].join('.');
const session={access_token:access,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
const out=resolve('.local-inputs/materials-browser-'+Date.now());mkdirSync(out,{recursive:true});
const assets=[],sets=[],snapshots=[],uploads=new Map(),objects=new Map(),paid=[],errors=[];let source=null;
const browser=await chromium.launch(),ctx=await browser.newContext();
await ctx.addInitScript(({session,host})=>localStorage.setItem('sb-'+host.split('.')[0]+'-auth-token',JSON.stringify(session)),{session,host});
await ctx.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url()),path=url.pathname;if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();if(url.hostname!==host)return route.abort();
 const headers={'access-control-allow-origin':'*','access-control-expose-headers':'Location,Upload-Offset,Tus-Resumable','tus-resumable':'1.0.0'};
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 const json=data=>route.fulfill({status:200,headers,json:data});
 if(path.includes('/functions/v1/')){paid.push(path);return route.abort();}
 if(path.endsWith('/auth/v1/user'))return json(user);
 if(path.endsWith('/studies_v3')){
  if(url.searchParams.has('created_by'))return json([]);
  const row={...sample.study,findings_v3:sample.findings.map(f=>({status:f.status})),study_sources_v3:source?[{study_id:sample.study.id}]:[]};
  return json(req.headers().accept?.includes('object+json')?{relatorio:sample.study.relatorio}:[row]);
 }
 if(path.endsWith('/findings_v3'))return json(sample.findings);
 if(path.endsWith('/study_versions'))return json(sample.study.study_versions);
 if(path.endsWith('/study_sources_v3'))return json(source);
 if(path.endsWith('/corretor_material_assets')){
  if(req.method()==='GET')return json(assets);
  const row=req.postDataJSON(),bytes=objects.get(row.path);if(!bytes||bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Material mismatch');
  const saved={...row,id:randomUUID(),created_at:new Date().toISOString()};assets.push(saved);return json(saved);
 }
 if(path.endsWith('/corretor_source_sets'))return json(sets);
 if(path.endsWith('/activate_corretor_source_set')){const b=req.postDataJSON();if(b.p_files.some(id=>!assets.some(a=>a.id===id&&a.kind==='sheet')))throw Error('Source files missing');const s={id:randomUUID(),study_id:b.p_study,version_id:b.p_version,fingerprint:b.p_fingerprint,file_ids:b.p_files,payload:b.p_payload,created_at:new Date().toISOString()};sets.push(s);source={filename:b.p_name,payload:b.p_payload};return json(s.id);}
 if(path.endsWith('/corretor_analysis_snapshots')){snapshots.push(req.postDataJSON());return json(null);}
 if(path.endsWith('/storage/v1/upload/resumable')&&req.method()==='POST'){
  const meta=Object.fromEntries(req.headers()['upload-metadata'].split(',').map(s=>{const [key,value]=s.split(' ');return [key,Buffer.from(value,'base64').toString()];})),id=randomUUID();uploads.set(id,{meta,chunks:[],size:0});
  return route.fulfill({status:201,headers:{...headers,location:`https://${host}/storage/v1/upload/resumable/${id}`,'upload-offset':'0'}});
 }
 if(path.includes('/upload/resumable/')){const u=uploads.get(path.split('/').pop());if(req.method()==='PATCH'){const b=req.postDataBuffer();u.chunks.push(b);u.size+=b.length;objects.set(u.meta.objectName,Buffer.concat(u.chunks));}return route.fulfill({status:req.method()==='HEAD'?200:204,headers:{...headers,'upload-offset':String(u.size)}});}
 if(path.includes('/storage/v1/object/')&&req.method()==='HEAD')return route.fulfill({status:404,headers});
 if(path.includes('/storage/v1/object/')){const key=decodeURIComponent(path.split('corretor-materiais/')[1]??''),bytes=objects.get(key);return route.fulfill({status:bytes?200:404,headers,body:bytes??Buffer.from('')});}
 return json([]);
});
const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:5176/corretor/estudos/${sample.study.id}/materiais`,{waitUntil:'networkidle'});
 const area=page.getByRole('region',{name:'Materiais persistidos'});await area.getByRole('button',{name:'Adicionar planilhas',exact:true}).click();
 await area.locator('input[type=file]').setInputFiles(sheets);
 await page.getByText(/Planilhas originais e fonte guardadas/).waitFor({timeout:60000});
 if(assets.length!==11||sets.length!==1||sets[0].payload.inventario.length!==11)throw Error('Source set incomplete');
 await page.screenshot({path:resolve(out,'eleven-real-sheets.png'),fullPage:true});
 const download=page.waitForEvent('download');await area.getByRole('button',{name:'Baixar arquivo',exact:true}).first().click();await download;
 await area.getByRole('button',{name:'Guardar estado atual da revisão',exact:true}).click();await page.getByText('Estado atual registrado com fontes e decisões disponíveis.',{exact:true}).waitFor();
 if(snapshots.length!==1||snapshots[0].source_scope!=='persisted_set'||snapshots[0].source_set_id!==sets[0].id)throw Error('Snapshot source linkage failed');
 await page.reload({waitUntil:'networkidle'});await page.getByRole('region',{name:'Materiais persistidos'}).getByRole('button',{name:'Baixar arquivo',exact:true}).first().waitFor();
 if(paid.length||errors.length)throw Error(JSON.stringify({paid,errors}));
 writeFileSync(resolve(out,'result.json'),JSON.stringify({scope:'11 Excel brutos reais de CJ; browser e extração reais, armazenamento/auth/Postgres simulados',assets:assets.map(a=>({name:a.original_name,sha256:a.sha256,bytes:a.bytes})),sourceFiles:sets[0].file_ids.length,blocks:sets[0].payload.blocos.length,snapshots:snapshots.length,snapshotSourceScope:snapshots[0].source_scope,recoveryHashChecked:true,reload:true,paid,errors},null,2));console.log(out);
}catch(error){writeFileSync(resolve(out,'failure.json'),JSON.stringify({error:String(error),errors,assets:assets.length,sets:sets.length,paid,text:await page.locator('body').innerText()},null,2));await page.screenshot({path:resolve(out,'failure.png'),fullPage:true});throw error;}
finally{await browser.close();}
