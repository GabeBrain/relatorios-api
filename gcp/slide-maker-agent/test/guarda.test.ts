import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { avaliar } from '../src/agent/guarda.js';

/** §12: as ferramentas de arquivo do CLI (fora do sandbox) só alcançam o trabalho e as pastas de apoio. */

const raiz = mkdtempSync(join(tmpdir(), 'guarda-'));
const ws = join(raiz, 'work', 'job-1');
const kb = join(raiz, 'app', 'kb');
const segredo = join(raiz, 'fora');
for (const d of [join(ws, 'entrada'), join(ws, 'trabalho'), join(ws, 'saida'), kb, segredo, join(raiz, 'work', 'job-2')]) mkdirSync(d, { recursive: true });
writeFileSync(join(segredo, 'environ'), 'ANTHROPIC_API_KEY=sk-ant');
writeFileSync(join(kb, '02.md'), 'kb');
const areas = { workspace: ws, leitura: [kb] };

const pode = async (f: string, e: unknown) => (await avaliar(f, e, areas)).permitir;

describe('guarda de caminhos', () => {
  it('leitura: workspace e kb sim; fora, outro trabalho e /proc não', async () => {
    expect(await pode('Read', { file_path: 'trabalho/narrativa.md' })).toBe(true);
    expect(await pode('Read', { file_path: join(ws, 'entrada', 'a.pdf') })).toBe(true);
    expect(await pode('Read', { file_path: join(kb, '02.md') })).toBe(true);
    expect(await pode('Read', { file_path: join(segredo, 'environ') })).toBe(false);
    expect(await pode('Read', { file_path: '../job-2/trabalho/x' })).toBe(false);
    expect(await pode('Read', { file_path: '/proc/self/environ' })).toBe(false);
    expect(await pode('Read', { file_path: '/etc/passwd' })).toBe(false);
  });

  it('escrita: só no workspace e nunca em entrada/', async () => {
    expect(await pode('Write', { file_path: 'trabalho/deck_spec.json', content: '{}' })).toBe(true);
    expect(await pode('Edit', { file_path: 'saida/relatorio.md', old_string: 'a', new_string: 'b' })).toBe(true);
    expect(await pode('Write', { file_path: 'entrada/a.pdf', content: '' })).toBe(false);
    expect(await pode('Write', { file_path: join(kb, '02.md'), content: '' })).toBe(false);
    expect(await pode('Write', { file_path: '../../app/kb/novo.md', content: '' })).toBe(false);
    const r = await avaliar('Write', { file_path: 'entrada/a.pdf', content: '' }, areas);
    expect(r).toEqual({ permitir: false, motivo: 'Os arquivos de entrada/ são somente leitura.' });
  });

  it('Glob e Grep: path e padrões absolutos também passam pela guarda', async () => {
    expect(await pode('Glob', { pattern: '**/*.json' })).toBe(true);
    expect(await pode('Glob', { pattern: '*.md', path: kb })).toBe(true);
    expect(await pode('Glob', { pattern: '/etc/**' })).toBe(false);
    expect(await pode('Glob', { pattern: '../../**/*' })).toBe(false);
    expect(await pode('Grep', { pattern: 'KEY', path: '/proc/1' })).toBe(false);
    expect(await pode('Grep', { pattern: 'KEY', glob: `${segredo}/*` })).toBe(false);
    expect(await pode('Grep', { pattern: 'tese' })).toBe(true);
  });

  it('link criado dentro do workspace é julgado pelo destino real', async () => {
    // Um comando do agente (no sandbox) poderia criar trabalho/atalho → pasta com segredo.
    symlinkSync(segredo, join(ws, 'trabalho', 'atalho'), 'junction');
    expect(await pode('Read', { file_path: 'trabalho/atalho/environ' })).toBe(false);
    expect(await pode('Write', { file_path: 'trabalho/atalho/novo.txt', content: 'x' })).toBe(false);
    expect(await pode('Grep', { pattern: 'KEY', path: 'trabalho/atalho' })).toBe(false);
  });

  it('outras ferramentas não são afetadas', async () => {
    expect(await pode('mcp__brain__executar', { comando: 'cat /etc/passwd' })).toBe(true); // isolado pelo sandbox
    expect(await pode('WebSearch', { query: 'x' })).toBe(true);
  });
});
