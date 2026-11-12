import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarApp } from '../src/app.js';
import type { VerificadorOidc } from '../src/auth/oidc.js';
import { AgenteSimulado, roteiroPadrao, type Roteiro } from '../src/agent/simulado.js';
import { validadorBasico } from '../src/agent/ferramentas.js';
import { DespachanteRegistro } from '../src/dispatch/despachante.js';
import { EventosMemoria } from '../src/eventos.js';
import { Orquestrador } from '../src/orquestrador.js';
import { RepoMemoria } from '../src/repo/memoria.js';
import { ArmazenamentoMemoria } from '../src/storage/armazenamento.js';

export const OIDC_VALIDO = 'Bearer token-oidc-de-teste';

export class OidcFalso implements VerificadorOidc {
  async verificar(authorization: string | undefined) {
    return authorization === OIDC_VALIDO;
  }
}

export interface OpcoesMontagem {
  roteiro?: Roteiro;
  faseTimeoutMs?: number;
}

export async function montar(o: OpcoesMontagem = {}) {
  const repo = new RepoMemoria();
  const arm = new ArmazenamentoMemoria();
  const eventos = new EventosMemoria();
  const despachante = new DespachanteRegistro();
  const workRoot = mkdtempSync(join(tmpdir(), 'slide-maker-teste-'));
  let roteiro: Roteiro = o.roteiro ?? roteiroPadrao;
  const orquestrador = new Orquestrador({
    repo, arm, eventos, despachante,
    agente: new AgenteSimulado((p) => roteiro(p)),
    validadorDeck: validadorBasico,
    workRoot,
    faseTimeoutMs: o.faseTimeoutMs ?? 10_000,
    verificacaoCancelamentoMs: 20,
    chaveAnthropic: 'sk-ant-teste',
  });
  const app = await criarApp({ repo, arm, orquestrador, oidc: new OidcFalso() });

  const api = {
    app, repo, arm, eventos, despachante, workRoot,
    trocarRoteiro(r: Roteiro) { roteiro = r; },

    async criar(dados: Record<string, unknown> = {}) {
      const r = await app.inject({ method: 'POST', url: '/jobs', payload: { colaborador_email: 'diego@brain.srv.br', titulo: 'Retrofit ADIT', ...dados } });
      if (r.statusCode !== 201) throw new Error(`criar: ${r.statusCode} ${r.body}`);
      return r.json() as { jobId: string; token: string };
    },

    get(url: string, token?: string) {
      return app.inject({ method: 'GET', url, headers: token ? { 'x-job-token': token } : {} });
    },

    post(url: string, token: string | undefined, payload?: unknown) {
      return app.inject({ method: 'POST', url, headers: token ? { 'x-job-token': token } : {}, payload: payload as object });
    },

    enviarArquivos(jobId: string, token: string, arquivos: { nome: string; dados: Uint8Array }[], contexto?: string) {
      const { corpo, tipo } = multipart(arquivos, contexto);
      return app.inject({ method: 'POST', url: `/jobs/${jobId}/arquivos`, headers: { 'x-job-token': token, 'content-type': tipo }, payload: corpo });
    },

    /** Executa a última fase enfileirada, como o Cloud Tasks faria. */
    async rodarFase(faseId = despachante.enfileiradas.at(-1)) {
      const r = await app.inject({ method: 'POST', url: '/internal/fase', headers: { authorization: OIDC_VALIDO }, payload: { faseId } });
      if (r.statusCode !== 200) throw new Error(`fase: ${r.statusCode} ${r.body}`);
      return r.json() as { resultado: string };
    },

    async estado(jobId: string) {
      return (await repo.obterJob(jobId))!;
    },
  };
  return api;
}

export const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
export const XLSX = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

export function multipart(arquivos: { nome: string; dados: Uint8Array }[], contexto?: string) {
  const fronteira = '----slidemakerteste';
  const partes: Buffer[] = [];
  if (contexto !== undefined) {
    partes.push(Buffer.from(`--${fronteira}\r\nContent-Disposition: form-data; name="contexto"\r\n\r\n${contexto}\r\n`));
  }
  for (const a of arquivos) {
    partes.push(Buffer.from(`--${fronteira}\r\nContent-Disposition: form-data; name="arquivos"; filename="${a.nome}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
    partes.push(Buffer.from(a.dados));
    partes.push(Buffer.from('\r\n'));
  }
  partes.push(Buffer.from(`--${fronteira}--\r\n`));
  return { corpo: Buffer.concat(partes), tipo: `multipart/form-data; boundary=${fronteira}` };
}

/** Resposta padrão para o card de perguntas do roteiro simulado. */
export const RESPOSTAS = { respostas: { 'Quem será o responsável pela apresentação?': 'Fábio Tadeu Araújo' } };
