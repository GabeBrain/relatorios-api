/**
 * Servidor LOCAL de desenvolvimento e E2E (§13): a API real (`criarApp` + `Orquestrador`), com banco,
 * Storage e fila em memória e o agente SIMULADO. Sem Supabase, sem Google, sem modelo, sem custo.
 * A fila executa cada fase no próprio processo, logo depois de enfileirar.
 *
 *   npm run build && DEV_PORT=8787 node dist/dev-local.js
 *
 * Recusa subir no Cloud Run (K_SERVICE definido): não é um modo de produção.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarApp } from './app.js';
import { AgenteSimulado, roteiroPadrao } from './agent/simulado.js';
import { validadorBasico } from './agent/ferramentas.js';
import type { Despachante } from './dispatch/despachante.js';
import { EventosMemoria } from './eventos.js';
import { Orquestrador } from './orquestrador.js';
import { RepoMemoria } from './repo/memoria.js';
import { ArmazenamentoMemoria, type Bucket } from './storage/armazenamento.js';

if (process.env.K_SERVICE) {
  console.error('dev-local não roda no Cloud Run.');
  process.exit(1);
}

const porta = Number(process.env.DEV_PORT ?? 8787);
const base = `http://localhost:${porta}`;
/** Atraso de cada fase simulada, para a interface mostrar o progresso. */
const atrasoMs = Number(process.env.DEV_ATRASO_MS ?? 1500);

class ArmazenamentoLocal extends ArmazenamentoMemoria {
  override async urlAssinada(b: Bucket, c: string) {
    if (!this.objetos.has(`${b}/${c}`)) throw new Error('objeto inexistente');
    return `${base}/dev/arquivo?chave=${encodeURIComponent(`${b}/${c}`)}`;
  }
  override async urlEnvio(b: Bucket, c: string) {
    return `${base}/dev/envio?chave=${encodeURIComponent(`${b}/${c}`)}`;
  }
}

const repo = new RepoMemoria();
const arm = new ArmazenamentoLocal();
let orquestrador: Orquestrador | null = null;
const despachante: Despachante = {
  async enfileirar(faseId) {
    setTimeout(() => { void orquestrador?.executarFase(faseId); }, 200);
    return `dev/${faseId}`;
  },
};
orquestrador = new Orquestrador({
  repo, arm, despachante, eventos: new EventosMemoria(),
  agente: new AgenteSimulado(async (p) => {
    await p.ferramentas.chamar('informar_etapa', { etapa: p.fase === 'F1' ? 'Lendo arquivos' : p.fase === 'F2' ? 'Montando a narrativa' : 'Produzindo slides' });
    await new Promise((r) => setTimeout(r, atrasoMs));
    return roteiroPadrao(p);
  }),
  validadorDeck: validadorBasico,
  workRoot: mkdtempSync(join(tmpdir(), 'slide-maker-dev-')),
  faseTimeoutMs: 60_000,
  log: (m) => console.log(m),
});

const app = await criarApp({ repo, arm, orquestrador, oidc: { verificar: async () => false }, saude: async () => ({ agente: 'simulado (dev-local)' }) });
app.get('/dev/arquivo', async (req, reply) => {
  const chave = String((req.query as { chave?: string }).chave ?? '');
  const dados = arm.objetos.get(chave);
  if (!dados) return reply.status(404).send({ erro: 'não encontrado' });
  return reply
    .header('content-type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    .header('content-disposition', `attachment; filename="${chave.split('/').at(-1)}"`)
    .send(Buffer.from(dados));
});
// Envio direto (o papel da URL assinada do Storage): PUT com o corpo bruto do arquivo.
app.addContentTypeParser('*', { parseAs: 'buffer', bodyLimit: 250 * 1024 * 1024 }, (_req, corpo, feito) => feito(null, corpo));
app.put('/dev/envio', async (req, reply) => {
  const chave = String((req.query as { chave?: string }).chave ?? '');
  arm.objetos.set(chave, new Uint8Array(req.body as Buffer));
  return reply.status(200).send({ Key: chave });
});
await app.listen({ host: '127.0.0.1', port: porta });
console.log(`slide-maker dev-local em ${base}`);
