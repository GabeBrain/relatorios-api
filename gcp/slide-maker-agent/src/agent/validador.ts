import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { JobRow } from '../repo/tipos.js';
import type { ValidadorDeck } from './ferramentas.js';

/**
 * Validação do deck no `entregar_deck` (§5.1): roda `lib/lint_pptx.py` sobre o arquivo entregue, com
 * o briefing, as fontes e o relatório do trabalho, e recusa se houver qualquer falha 🔒. A E3 do lint
 * confere o slide final do responsável pelos pixels da imagem oficial.
 *
 * Não confia no `qa` informado pelo agente: o lint roda de novo aqui, fora do controle do modelo.
 * O processo recebe ambiente mínimo (sem as chaves do serviço).
 */

export interface OpcoesLint {
  python: string;
  lint: string;
  marca: string;
  dirFontes: string;
  timeoutMs?: number;
}

export type RodarProcesso = (cmd: string, args: string[], o: { timeoutMs: number }) => Promise<{ codigo: number; saida: string }>;

const rodarReal: RodarProcesso = (cmd, args, o) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: o.timeoutMs, maxBuffer: 10 * 1024 * 1024, env: { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin', HOME: '/tmp', LANG: 'C.UTF-8', PYTHONDONTWRITEBYTECODE: '1' } },
    (erro, stdout, stderr) => {
      const codigo = erro ? (typeof erro.code === 'number' ? erro.code : -1) : 0;
      resolve({ codigo, saida: `${stdout}${stderr}` });
    });
});

interface ItemQa { id: string; nivel: string; slide: number | null; mensagem: string }

export function validadorLint(o: OpcoesLint, rodar: RodarProcesso = rodarReal): ValidadorDeck {
  return async (arquivo: string, job: JobRow, raiz: string) => {
    const args = [o.lint, arquivo, '--saida', join(raiz, 'trabalho', 'qa_entrega.json'), '--marca', o.marca, '--dir-fontes', o.dirFontes];
    const opcional = (flag: string, rel: string) => {
      if (existsSync(join(raiz, rel))) args.push(flag, join(raiz, rel));
    };
    opcional('--briefing', 'briefing.yaml');
    opcional('--fontes', join('trabalho', 'fontes.json'));
    opcional('--relatorio', join('saida', 'relatorio.md'));
    if (job.responsavel) args.push('--responsavel', job.responsavel);

    const r = await rodar(o.python, args, { timeoutMs: o.timeoutMs ?? 180_000 });
    if (r.codigo === 0) return null;
    if (r.codigo === 1) {
      const falhas = r.saida.split('\n').filter((l) => l.startsWith('🔒'));
      return `O lint encontrou ${falhas.length} falha(s) 🔒. Corrija e entregue de novo:\n${falhas.slice(0, 20).join('\n')}`;
    }
    return `Não foi possível validar o deck (lint terminou com código ${r.codigo}). Confira se o arquivo abre e tente de novo.`;
  };
}

/** Lê os itens do qa.json gravado pelo lint (para testes e diagnóstico). */
export function falhasDoQa(qa: { itens: ItemQa[] }): ItemQa[] {
  return qa.itens.filter((i) => i.nivel === 'FALHA');
}
