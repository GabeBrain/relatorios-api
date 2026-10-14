import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { collectPreflight, permissionSummary, repositoryRoot } from './relatorios-preflight.mjs';

test('permissões usam whitelist; inválido não vira acesso aprovado', () => {
  assert.equal(permissionSummary('invalid'), null);
  assert.deepEqual(permissionSummary('{"push":true,"pull":true,"secret":"do-not-print"}'), { pull:true,push:true,admin:false,maintain:false,triage:false });
});

test('offline não roda instalação, rede, API, leitura env ou mutação git', () => {
  const commands=[];
  const result=collectPreflight({run:(program,args)=>{commands.push([program,...args]);return {status:0,stdout:args[0]==='branch'?'main':args[0]==='rev-parse'?'abcdef0':args[0]==='rev-list'?'0\t0':''};},exists:()=>true});
  assert.equal(result.git.sha,'abcdef0');
  assert.equal(result.git.localChanges,0);
  assert.equal(result.github.status,'NÃO TESTADO; opcional --github');
  assert.ok(commands.every(c=>c[0]==='git'&&!c.some(a=>['fetch','pull','push','config','reset','checkout'].includes(a))));
});

test('falha não vaza stdout/stderr sensível nem presume OK', () => {
  const result=collectPreflight({github:true,run:()=>({status:1,stdout:'private-token',stderr:'private-password'}),exists:()=>false});
  assert.equal(result.git.readable,false);
  assert.equal(result.github.status,'FALHA/NÃO VERIFICADO');
  assert.ok(!JSON.stringify(result).includes('private-'));
});

test('catálogo e links locais do pacote são resolvíveis', () => {
  const folder=resolve(repositoryRoot,'docs/handoffs/lucas-relatorios-2026-10-14');
  const catalog=JSON.parse(readFileSync(resolve(folder,'fontes/modelos.json'),'utf8'));
  assert.equal(catalog.models.length,9);
  assert.equal(new Set(catalog.models.map(m=>m.id)).size,9);
  assert.ok(catalog.models.every(m=>m.url===`https://docs.google.com/presentation/d/${m.id}/edit`));
  const matrix=readFileSync(resolve(folder,'templates/MATRIZ_INDICADORES.csv'),'utf8').trim().split(/\r?\n/);
  assert.ok(matrix.every(row=>row.split(';').length===23));
  for(const name of ['README.md','01_ACESSOS_E_AMBIENTE.md','02_BASELINE_E_MOTOR.md','03_FONTES_E_MODELOS.md','04_VALIDACAO_E_ENTREGA.md','05_PILOTO_SP_E_FECHAMENTO.md','06_CTA_CODEX_E_MENSAGEM.md','STATUS.md']) {
    const path=resolve(folder,name);
    for(const match of readFileSync(path,'utf8').matchAll(/\]\(([^)]+)\)/g)) {
      if(!/^https?:|^#/.test(match[1]))assert.ok(existsSync(resolve(dirname(path),decodeURIComponent(match[1].split('#')[0]))),`${name}: ${match[1]}`);
    }
  }
});
