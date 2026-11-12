import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';

/**
 * Guarda de caminhos das ferramentas de arquivo do CLI (§12, §15.1 item 7).
 *
 * Read, Write, Edit, Glob e Grep rodam dentro do processo do CLI, fora do sandbox dos comandos, e o
 * processo do CLI tem a chave da Anthropic no ambiente. Por isso cada chamada passa por aqui (hook
 * PreToolUse) antes de executar:
 *  · leitura só no workspace do trabalho e nas pastas de apoio (kb, marca, lib);
 *  · escrita só no workspace, nunca em `entrada/` (arquivos do cliente, somente leitura);
 *  · o caminho é resolvido com realpath: um link simbólico criado por um comando do agente dentro do
 *    workspace (ex.: para /proc/self/environ) é julgado pelo destino real, não pelo nome.
 */

export interface Areas {
  workspace: string;
  /** Pastas somente leitura além do workspace. */
  leitura: string[];
}

export type Decisao = { permitir: true } | { permitir: false; motivo: string };

const LEITURA = new Set(['Read', 'Glob', 'Grep']);
const ESCRITA = new Set(['Write', 'Edit']);

function dentro(alvo: string, raiz: string): boolean {
  const r = relative(raiz, alvo);
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
}

/** realpath do caminho; se ainda não existe (Write de arquivo novo), do ancestral mais próximo que existe. */
async function real(caminho: string): Promise<string> {
  let atual = caminho;
  const resto: string[] = [];
  for (;;) {
    try {
      const r = await realpath(atual);
      return resto.length ? resolve(r, ...resto.reverse()) : r;
    } catch {
      const pai = dirname(atual);
      if (pai === atual) return caminho;
      resto.push(basename(atual));
      atual = pai;
    }
  }
}

/** Parte fixa de um padrão glob (até o primeiro curinga). */
function baseDoGlob(padrao: string): string {
  const partes = padrao.split(/[\\/]/);
  const i = partes.findIndex((p) => /[*?[\]{}]/.test(p));
  return (i < 0 ? partes : partes.slice(0, i)).join('/') || '/';
}

export async function avaliar(ferramenta: string, entrada: unknown, areas: Areas): Promise<Decisao> {
  if (!LEITURA.has(ferramenta) && !ESCRITA.has(ferramenta)) return { permitir: true };
  const e = (entrada ?? {}) as Record<string, unknown>;
  const ws = await real(areas.workspace);
  const leitura = [ws, ...(await Promise.all(areas.leitura.map(real)))];

  const candidatos: string[] = [];
  if (typeof e.file_path === 'string') candidatos.push(e.file_path);
  if (typeof e.path === 'string') candidatos.push(e.path);
  if (ferramenta === 'Glob' && typeof e.pattern === 'string' && isAbsolute(e.pattern)) candidatos.push(baseDoGlob(e.pattern));
  if (ferramenta === 'Grep' && typeof e.glob === 'string' && isAbsolute(e.glob)) candidatos.push(baseDoGlob(e.glob));
  if (ferramenta === 'Glob' && typeof e.pattern === 'string' && e.pattern.split(/[\\/]/).includes('..')) {
    return { permitir: false, motivo: 'Padrões com ".." não são permitidos.' };
  }
  if (!candidatos.length) candidatos.push(areas.workspace); // Glob/Grep sem path: o cwd

  for (const c of candidatos) {
    const alvo = await real(resolve(areas.workspace, c));
    if (ESCRITA.has(ferramenta)) {
      if (!dentro(alvo, ws)) return { permitir: false, motivo: 'Só é permitido escrever dentro do diretório do trabalho.' };
      if (dentro(alvo, resolve(ws, 'entrada'))) return { permitir: false, motivo: 'Os arquivos de entrada/ são somente leitura.' };
    } else if (!leitura.some((r) => dentro(alvo, r))) {
      return { permitir: false, motivo: 'Fora das pastas permitidas (diretório do trabalho, /app/kb, /app/marca, /app/lib).' };
    }
  }
  return { permitir: true };
}
