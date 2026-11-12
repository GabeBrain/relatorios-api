import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validadorLint, type RodarProcesso } from '../src/agent/validador.js';
import type { JobRow } from '../src/repo/tipos.js';

/** §5.1: a entrega roda o lint de novo, com os arquivos do trabalho, e recusa qualquer falha 🔒. */

const job = { id: 'j', responsavel: 'guilherme' } as JobRow;
const opcoes = { python: 'python3', lint: '/app/lib/lint_pptx.py', marca: '/app/marca', dirFontes: '/fontes' };

function raiz(arquivos: string[]) {
  const r = mkdtempSync(join(tmpdir(), 'val-'));
  for (const d of ['trabalho', 'saida']) mkdirSync(join(r, d));
  for (const a of arquivos) writeFileSync(join(r, a), 'x');
  return r;
}

describe('validadorLint', () => {
  it('passa briefing, fontes, relatório e responsável quando existem; aceita com código 0', async () => {
    let visto: string[] = [];
    const rodar: RodarProcesso = async (_c, args) => { visto = args; return { codigo: 0, saida: '0 falha(s)' }; };
    const r = raiz(['briefing.yaml', 'trabalho/fontes.json', 'saida/relatorio.md']);
    expect(await validadorLint(opcoes, rodar)(join(r, 'saida', 'd.pptx'), job, r)).toBeNull();
    expect(visto[0]).toBe('/app/lib/lint_pptx.py');
    for (const flag of ['--briefing', '--fontes', '--relatorio', '--marca', '--dir-fontes', '--saida']) expect(visto).toContain(flag);
    expect(visto.slice(visto.indexOf('--responsavel'), visto.indexOf('--responsavel') + 2)).toEqual(['--responsavel', 'guilherme']);
  });

  it('sem os arquivos opcionais, não passa as flags', async () => {
    let visto: string[] = [];
    const r = raiz([]);
    await validadorLint(opcoes, async (_c, a) => { visto = a; return { codigo: 0, saida: '' }; })(join(r, 'saida', 'd.pptx'), { ...job, responsavel: null }, r);
    for (const flag of ['--briefing', '--fontes', '--relatorio', '--responsavel']) expect(visto).not.toContain(flag);
  });

  it('código 1 recusa com as falhas 🔒; outro código recusa como erro de validação', async () => {
    const saida = '🔒 E3 slide 12: slide final ausente\n⚠ T3 slide 2: 50 palavras\n🔒 D1 slide 4: sem fonte\n2 falha(s) 🔒, 1 alerta(s)';
    const r = raiz([]);
    const recusa = await validadorLint(opcoes, async () => ({ codigo: 1, saida }))(join(r, 'saida', 'd.pptx'), job, r);
    expect(recusa).toContain('2 falha(s) 🔒');
    expect(recusa).toContain('E3 slide 12');
    expect(recusa).not.toContain('T3');
    expect(await validadorLint(opcoes, async () => ({ codigo: 2, saida: 'Traceback' }))(join(r, 'saida', 'd.pptx'), job, r)).toContain('Não foi possível validar');
  });
});
