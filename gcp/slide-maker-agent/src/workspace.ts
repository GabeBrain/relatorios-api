import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { BUCKETS, type Armazenamento } from './storage/armazenamento.js';

/**
 * Workspace de um trabalho (§3.3, §6.3): o estado entre fases está nos arquivos, não na sessão.
 * No início da fase, `restaurar` monta `/work/<jobId>/` a partir do Storage; no fim de uma fase bem
 * sucedida, `salvar` grava tudo de volta, exceto `entrada/`, que é somente leitura e vem do bucket
 * de entrada.
 */
export class Workspace {
  readonly dir: string;

  constructor(raiz: string, readonly jobId: string, private readonly arm: Armazenamento) {
    this.dir = resolve(raiz, jobId);
  }

  /** Caminho absoluto de um arquivo do workspace; recusa qualquer coisa fora dele. */
  caminho(relativo: string): string {
    const alvo = resolve(this.dir, relativo);
    if (alvo !== this.dir && !alvo.startsWith(this.dir + sep)) throw new Error('Caminho fora do workspace.');
    return alvo;
  }

  async restaurar(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true });
    await mkdir(join(this.dir, 'entrada'), { recursive: true });
    await mkdir(join(this.dir, 'trabalho'), { recursive: true });
    await mkdir(join(this.dir, 'saida'), { recursive: true });

    const prefixoTrabalho = `${this.jobId}/`;
    for (const objeto of await this.arm.listar(BUCKETS.trabalho, this.jobId)) {
      const rel = objeto.slice(prefixoTrabalho.length);
      if (!rel || rel.startsWith('entrada/')) continue;
      await this.gravarLocal(rel, await this.arm.ler(BUCKETS.trabalho, objeto));
    }
    for (const objeto of await this.arm.listar(BUCKETS.entrada, this.jobId)) {
      const rel = objeto.slice(prefixoTrabalho.length);
      if (rel) await this.gravarLocal(join('entrada', rel), await this.arm.ler(BUCKETS.entrada, objeto));
    }
  }

  async salvar(): Promise<void> {
    const locais = (await listarArquivos(this.dir)).filter((rel) => !rel.startsWith('entrada/'));
    for (const rel of locais) {
      await this.arm.gravar(BUCKETS.trabalho, `${this.jobId}/${rel}`, await readFile(join(this.dir, rel)));
    }
    // Arquivos apagados pelo agente também somem do Storage, para a próxima fase ver o mesmo estado.
    const remotos = await this.arm.listar(BUCKETS.trabalho, this.jobId);
    const manter = new Set(locais.map((rel) => `${this.jobId}/${rel}`));
    const sobras = remotos.filter((r) => !manter.has(r));
    if (sobras.length) await this.arm.remover(BUCKETS.trabalho, sobras);
  }

  async gravarLocal(rel: string, dados: Uint8Array | string): Promise<void> {
    const alvo = this.caminho(rel);
    await mkdir(dirname(alvo), { recursive: true });
    await writeFile(alvo, dados);
  }

  async limpar(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true });
  }
}

/** Caminhos relativos (com "/") de todos os arquivos sob `dir`. */
export async function listarArquivos(dir: string): Promise<string[]> {
  const saida: string[] = [];
  async function andar(atual: string) {
    for (const e of await readdir(atual, { withFileTypes: true })) {
      const p = join(atual, e.name);
      if (e.isDirectory()) await andar(p);
      else if (e.isFile()) saida.push(relative(dir, p).split(sep).join('/'));
    }
  }
  await andar(dir);
  return saida.sort();
}
