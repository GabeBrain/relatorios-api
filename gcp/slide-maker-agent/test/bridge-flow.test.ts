import { it, expect } from 'vitest';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { BridgeClient } from '../src/bridge/client.js';
import { repoBridge, StorageBridge, EventsBridge } from '../src/bridge/adapters.js';
import { handler, REPO_OPERATIONS } from '../src/bridge/shared/handler.js';
import { Orquestrador } from '../src/orquestrador.js';
import { AgenteSimulado } from '../src/agent/simulado.js';
import { validadorBasico } from '../src/agent/ferramentas.js';
import { DespachanteRegistro } from '../src/dispatch/despachante.js';
import { criarApp } from '../src/app.js';
import { PDF, RESPOSTAS, multipart } from './ajuda.js';

it('API → assinatura HTTP → handler → PostgreSQL local → fases simuladas → v1/v2 e downloads', async () => {
  const root = resolve('../..');
  const { PGlite } = await import(pathToFileURL(resolve('node_modules/@electric-sql/pglite/dist/index.js')).href);
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
  for (const name of ['20261112160000_slide_maker.sql','20261112200554_slide_maker_bridge.sql']) await db.exec(readFileSync(join(root,'supabase/migrations',name),'utf8'));
  await db.exec('set role service_role');
  const objects = new Map<string, Uint8Array>();
  const notices: unknown[] = [];
  const secret = 'fixture-'.padEnd(64, 'x'), url = 'https://fixture.supabase.co/functions/v1/slide-maker-bridge';
  const serve = handler({ async execute(op,args,key,hash,nonce) {
    if ((REPO_OPERATIONS as readonly string[]).includes(op)) {
      return (await db.query('select public.slide_maker_bridge_dispatch($1,$2,$3,$4,$5) result',[op,JSON.stringify(args),key,hash,nonce])).rows[0].result;
    }
    const accepted = (await db.query('select public.slide_maker_bridge_nonce($1) ok',[nonce])).rows[0].ok;
    if (!accepted) throw new Error('replay');
    if (op === 'emitir') { notices.push(args[1]); return null; }
    const [bucket,path] = args as [string,string];
    if (op === 'upload' || op === 'download') {
      const signed = `https://fixture.supabase.co/storage/v1/object/${bucket}/${path}?token=${randomUUID()}`;
      return op === 'upload' ? { signedUrl: signed } : signed;
    }
    if (op === 'listarObjetos') return [...objects.keys()].filter(k=>k.startsWith(`${bucket}/${path}/`)).map(k=>k.slice(bucket.length+1));
    if (op === 'removerObjetos') { for (const p of args[1] as string[]) objects.delete(`${bucket}/${p}`); return null; }
    throw new Error('invalid_arguments');
  } }, secret);
  let loseCreateResponse = true;
  const client = new BridgeClient(url,secret,async (target,init) => {
    const u = new URL(String(target));
    if (u.pathname.startsWith('/storage/v1/object/')) {
      const key = u.pathname.slice('/storage/v1/object/'.length);
      if (init?.method === 'PUT') { objects.set(key,new Uint8Array(init.body as Uint8Array)); return new Response('{}'); }
      return objects.has(key) ? new Response(Buffer.from(objects.get(key)!)) : new Response('',{status:404});
    }
    const response = await serve(new Request(target,init));
    if (loseCreateResponse && JSON.parse(String(init?.body)).operation === 'criarJob') {
      loseCreateResponse = false;
      throw new Error('Resposta perdida após commit SQL');
    }
    return response;
  });
  const repo=repoBridge(client), arm=new StorageBridge(client), eventos=new EventsBridge(client,()=>{}), despachante=new DespachanteRegistro();
  const orquestrador=new Orquestrador({repo,arm,eventos,despachante,agente:new AgenteSimulado(),validadorDeck:validadorBasico,workRoot:mkdtempSync(join(tmpdir(),'bridge-flow-')),faseTimeoutMs:20000});
  const app=await criarApp({repo,arm,orquestrador,oidc:{verificar:async()=>true}});
  try {
    const created=await app.inject({method:'POST',url:'/jobs',payload:{colaborador_email:'teste@brain.srv.br',titulo:'Ponte'}});
    expect(created.statusCode).toBe(201);
    expect((await db.query('select count(*) n from public.slide_maker_jobs')).rows[0].n).toBe(1);
    const {jobId,token}=created.json(); const headers={'x-job-token':token};
    const upload=multipart([{nome:'estudo.pdf',dados:PDF}]);
    expect((await app.inject({method:'POST',url:`/jobs/${jobId}/arquivos`,headers:{...headers,'content-type':upload.tipo},payload:upload.corpo})).statusCode).toBe(202);
    const run=async()=> { const task=despachante.enfileiradas.shift()!; expect(task).toBeTruthy(); expect(await orquestrador.executarFase(task)).toEqual({resultado:'concluida'}); };
    await run();
    expect((await repo.obterJob(jobId))?.estado).toBe('aguardando_respostas');
    expect((await app.inject({method:'POST',url:`/jobs/${jobId}/respostas`,headers,payload:RESPOSTAS})).statusCode).toBe(202); await run();
    expect((await app.inject({method:'POST',url:`/jobs/${jobId}/narrativa`,headers,payload:{acao:'aprovar'}})).statusCode).toBe(202); await run();
    expect((await repo.obterJob(jobId))?.versao_atual).toBe(1);
    expect((await app.inject({method:'POST',url:`/jobs/${jobId}/mensagens`,headers,payload:{texto:'Ajuste'}})).statusCode).toBe(202); await run();
    const detail=await app.inject({method:'GET',url:`/jobs/${jobId}`,headers});
    expect(detail.json().versoes.map((v:{versao:number})=>v.versao)).toEqual([1,2]);
    expect(detail.body).not.toContain('Relatório simulado');
    expect(detail.body).not.toContain('token_acesso_hash');
    expect((await app.inject({method:'GET',url:`/jobs/${jobId}`})).statusCode).toBe(404);
    expect(notices.length).toBeGreaterThan(0);
    const download=await app.inject({method:'GET',url:`/jobs/${jobId}/versoes/1/download`,headers});
    expect(download.statusCode).toBe(200);
    expect(objects.has(`slide-maker-saida/${jobId}/v1/relatorio.md`)).toBe(true);
  } finally { await app.close(); await db.close(); }
},60000);
