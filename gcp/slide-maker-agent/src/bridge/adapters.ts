import type { Repo } from '../repo/tipos.js';
import type { Armazenamento, Bucket } from '../storage/armazenamento.js';
import type { EventoTrabalho, Eventos } from '../eventos.js';
import { BridgeClient } from './client.js';

/** A lista é explícita; nenhuma tabela/SQL é enviada pelo cliente. */
export function repoBridge(client: BridgeClient): Repo {
  return {
    reservarEvento: d => client.call('reservarEvento', [d]),
    criarJob: d => client.call('criarJob', [d]), obterJob: id => client.call('obterJob', [id]),
    obterJobs: ids => client.call('obterJobs', [ids]), atualizarJob: (id, estado, patch) => client.call('atualizarJob', [id, estado, patch]),
    listarJobsEquipe: limite => client.call('listarJobsEquipe', [limite]),
    inserirMensagem: m => client.call('inserirMensagem', [m]), listarMensagens: id => client.call('listarMensagens', [id]),
    inserirArquivo: a => client.call('inserirArquivo', [a]), listarArquivos: id => client.call('listarArquivos', [id]),
    inserirVersao: v => client.call('inserirVersao', [v]), listarVersoes: id => client.call('listarVersoes', [id]),
    salvarRelatorio: r => client.call('salvarRelatorio', [r]),
    criarFase: f => client.call('criarFase', [f]), obterFase: id => client.call('obterFase', [id]),
    atualizarFase: (id, status, patch) => client.call('atualizarFase', [id, status, patch]), faseAtiva: id => client.call('faseAtiva', [id]),
    contarFasesDesde: (filtro, desde) => client.call('contarFasesDesde', [filtro, desde.toISOString()]),
    contarFasesAtivasPorEmail: email => client.call('contarFasesAtivasPorEmail', [email]),
  };
}
export class StorageBridge implements Armazenamento {
  constructor(private readonly client: BridgeClient) {}
  async gravar(bucket: Bucket, path: string, data: Uint8Array, contentType = 'application/octet-stream') {
    const { signedUrl } = await this.client.call<{ signedUrl: string }>('upload', [bucket, path]);
    await this.client.transfer(signedUrl, { method: 'PUT', headers: { 'content-type': contentType, 'x-upsert': 'true' }, body: Buffer.from(data) });
  }
  async ler(bucket: Bucket, path: string) {
    const url = await this.urlAssinada(bucket, path, 600);
    return new Uint8Array(await (await this.client.transfer(url)).arrayBuffer());
  }
  listar(bucket: Bucket, prefix: string): Promise<string[]> { return this.client.call('listarObjetos', [bucket, prefix]); }
  async remover(bucket: Bucket, paths: string[]): Promise<void> {
    for (let i = 0; i < paths.length; i += 500) await this.client.call('removerObjetos', [bucket, paths.slice(i, i + 500)]);
  }
  urlAssinada(bucket: Bucket, path: string, seconds: number): Promise<string> { return this.client.call('download', [bucket, path, seconds]); }
}
export class EventsBridge implements Eventos {
  constructor(private readonly client: BridgeClient, private readonly log: (message: string) => void) {}
  async emitir(jobId: string, event: EventoTrabalho) {
    try { await this.client.call('emitir', [jobId, event]); }
    catch { this.log(`broadcast job=${jobId} indisponivel`); }
  }
}
