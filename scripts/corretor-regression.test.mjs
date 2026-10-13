import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareResults } from './corretor-regression.mjs';
const before = { summary: { achados: 2, tabelas: '1/2' }, findings: [{ id: 'real', detail: '87 ≠ 184', type: 'SOURCE_CROSSCHECK' }, { id: 'format', detail: 'ano 2.023' }] };
test('não perde erro real quando a contagem permanece igual', () => {
  const diff = compareResults(before,{ ...before,findings:[before.findings[1],{id:'new'}] });
  assert.deepEqual(diff.removed,['real']); assert.deepEqual(diff.added,['new']); assert.equal(diff.equal,false);
});
test('mudança de números e cobertura exige revisão; ordem dos achados não', () => {
  assert.equal(compareResults(before,{...before,findings:[...before.findings].reverse()}).equal,true);
  assert.deepEqual(compareResults(before,{...before,findings:[{...before.findings[0],detail:'87 ≠ 180'},before.findings[1]]}).changed,['real']);
  assert.equal(compareResults(before,{...before,summary:{...before.summary,tabelas:'0/2'}}).equal,false);
});
test('resultado incompleto ou IDs duplicados não passa por baseline verde', () => {
  assert.throws(()=>compareResults(before,null));
  assert.throws(()=>compareResults(before,{...before,findings:[before.findings[0],before.findings[0]]}));
});
