import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { LIMITES, ORIGENS_PERMITIDAS } from './config.js';
import { TransicaoInvalida, type Evento } from './shared/state-machine.js';
import { gerarToken, hashToken, tokenConfere } from './auth/token.js';
import type { VerificadorOidc } from './auth/oidc.js';
import { ConflitoDeEstado, LimiteExcedido, type Orquestrador } from './orquestrador.js';
import { FaseAtivaExistente, type JobRow, type Repo } from './repo/tipos.js';
import { BUCKETS, type Armazenamento } from './storage/armazenamento.js';
import { BYTES_ASSINATURA, UploadInvalido, desduplicar, nomeSeguro, validarArquivo, validarConteudo, validarDeclarado, validarTotal } from './uploads.js';

export interface DependenciasApp {
  repo: Repo;
  arm: Armazenamento;
  orquestrador: Orquestrador;
  oidc: VerificadorOidc;
  /** Diagnóstico de isolamento exposto no /healthz (§15.1 item 7). */
  saude?: () => Promise<Record<string, unknown>>;
  logger?: boolean;
}

const EMAIL = z.string().trim().toLowerCase().regex(/^[^@\s]+@brain\.srv\.br$/, 'Use seu e-mail @brain.srv.br.');

const CorpoCriar = z.strictObject({
  colaborador_email: EMAIL,
  titulo: z.string().trim().min(3, 'Dê um nome à apresentação.').max(200),
  contexto: z.string().trim().max(500).optional(),
});
const CorpoRespostas = z.strictObject({
  respostas: z.record(z.string().max(500), z.union([z.string().trim().min(1).max(2000), z.array(z.string().trim().min(1).max(2000)).min(1).max(4)])),
});
const CorpoNarrativa = z.discriminatedUnion('acao', [
  z.strictObject({ acao: z.literal('aprovar') }),
  z.strictObject({ acao: z.literal('ajustar'), texto: z.string().trim().min(1).max(4000) }),
]);
const CorpoEnvios = z.strictObject({
  arquivos: z.array(z.strictObject({ nome: z.string().min(1).max(255), bytes: z.number().int().positive() })).min(1, 'Nenhum arquivo enviado.'),
});
const CorpoConcluirEnvios = z.strictObject({
  nomes: z.array(z.string().min(1).max(255)).min(1, 'Nenhum arquivo enviado.'),
  contexto: z.string().max(2000).optional(),
});
const CorpoMensagem = z.strictObject({ texto: z.string().trim().min(1).max(4000) });
const CorpoListar = z.strictObject({
  itens: z.array(z.strictObject({ jobId: z.uuid(), token: z.string().min(1).max(128) })).max(LIMITES.itensListar),
});
const CorpoFase = z.strictObject({ faseId: z.uuid() });
const ParamId = z.object({ id: z.uuid() });

class ErroHttp extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem);
  }
}

function validar<T extends z.ZodType>(esquema: T, valor: unknown): z.infer<T> {
  const r = esquema.safeParse(valor);
  if (!r.success) throw new ErroHttp(400, r.error.issues[0]?.message ?? 'Dados inválidos.');
  return r.data;
}

/** Campo de formulário multipart: string direta ou objeto `{ value }`, conforme a versão do plugin. */
function valorTexto(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'value' in v && typeof (v as { value: unknown }).value === 'string') return (v as { value: string }).value;
  return '';
}

/** Metadados de "Todos os trabalhos" (§15.1 item 3). Nada de mensagens, arquivos ou deck. */
export function resumo(j: JobRow) {
  return {
    id: j.id, titulo: j.titulo, colaborador_email: j.colaborador_email, responsavel: j.responsavel,
    estado: j.estado, versao_atual: j.versao_atual, created_at: j.created_at, updated_at: j.updated_at,
  };
}

/** Trabalho visto pelo autor: tudo menos o hash do token. */
function publico(j: JobRow) {
  const { token_acesso_hash: _hash, ...resto } = j;
  return resto;
}

export async function criarApp(d: DependenciasApp): Promise<FastifyInstance> {
  const app = Fastify({
    logger: d.logger ? { redact: ['req.headers["x-job-token"]', 'req.headers.authorization'] } : false,
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });

  await app.register(cors, {
    origin: (origem, cb) => cb(null, !origem || ORIGENS_PERMITIDAS.test(origem)),
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['content-type', 'x-job-token', 'x-upsert'],
  });
  await app.register(multipart, {
    limits: { fileSize: LIMITES.maxBytesArquivo, files: LIMITES.maxArquivos, fields: 5, fieldSize: 2000 },
  });

  app.setErrorHandler((erro, _req, reply) => {
    if (erro instanceof ErroHttp) return reply.status(erro.status).send({ erro: erro.message });
    if (erro instanceof UploadInvalido) return reply.status(400).send({ erro: erro.message });
    if (erro instanceof TransicaoInvalida) return reply.status(409).send({ erro: 'Esta ação não está disponível no estado atual do trabalho.' });
    if (erro instanceof ConflitoDeEstado || erro instanceof FaseAtivaExistente) return reply.status(409).send({ erro: erro.message });
    if (erro instanceof LimiteExcedido) return reply.status(429).send({ erro: erro.message });
    const e = erro as { code?: string; statusCode?: number };
      if (e.code === 'rate_limit') return reply.status(429).send({ erro: 'Limite de etapas atingido. Aguarde e tente novamente.' });
    if (e.code === 'FST_REQ_FILE_TOO_LARGE') return reply.status(413).send({ erro: 'Cada arquivo pode ter no máximo 50 MB.' });
    if (e.code === 'FST_FILES_LIMIT') return reply.status(413).send({ erro: `Envie no máximo ${LIMITES.maxArquivos} arquivos.` });
    if (e.statusCode && e.statusCode < 500) return reply.status(e.statusCode).send({ erro: 'Requisição inválida.' });
    app.log.error({ codigo: e.code }, 'erro interno');
    return reply.status(500).send({ erro: 'Erro interno. Tente novamente.' });
  });

  const origem = (req: FastifyRequest) => ({ ip: req.ip || null });

  /** Carrega o trabalho e confere o token. 404 tanto para inexistente quanto para token errado. */
  async function autorizado(req: FastifyRequest): Promise<JobRow> {
    const { id } = validar(ParamId, req.params);
    const job = await d.repo.obterJob(id);
    const token = req.headers['x-job-token'];
    if (!job || typeof token !== 'string' || !tokenConfere(token, job.token_acesso_hash)) {
      throw new ErroHttp(404, 'Trabalho não encontrado.');
    }
    return job;
  }

  const responder = (reply: FastifyReply, job: JobRow, status = 202) => reply.status(status).send({ trabalho: publico(job) });

  // Com o agente real, isolamento reprovado = serviço não saudável (503): nenhuma fase roda (§15.1 item 7).
  // Cloud Run reserves some paths ending in z. Keep the local alias for compatibility.
  for (const url of ['/health', '/healthz']) app.get(url, async (_req, reply) => {
    const s = d.saude ? await d.saude() : {};
    const ok = s.ok !== false;
    return reply.status(ok ? 200 : 503).send({ ...s, ok });
  });

  app.post('/jobs', async (req, reply) => {
    const corpo = validar(CorpoCriar, req.body);
    const token = gerarToken();
    const job = await d.repo.criarJob({
      colaborador_email: corpo.colaborador_email, titulo: corpo.titulo,
      contexto: corpo.contexto || null, token_acesso_hash: hashToken(token),
    });
    return reply.status(201).send({ jobId: job.id, token });
  });

  app.get('/jobs/equipe', async () => ({ itens: (await d.repo.listarJobsEquipe(LIMITES.itensEquipe)).map(resumo) }));

  app.post('/jobs/listar', async (req) => {
    const { itens } = validar(CorpoListar, req.body);
    const jobs = new Map((await d.repo.obterJobs(itens.map((i) => i.jobId))).map((j) => [j.id, j]));
    const validos = itens.flatMap((i) => {
      const j = jobs.get(i.jobId);
      return j && tokenConfere(i.token, j.token_acesso_hash) ? [resumo(j)] : [];
    });
    return { itens: validos };
  });

  app.get('/jobs/:id', async (req) => {
    const job = await autorizado(req);
    const [mensagens, versoes] = await Promise.all([d.repo.listarMensagens(job.id), d.repo.listarVersoes(job.id)]);
    return {
      trabalho: publico(job),
      mensagens,
      versoes: versoes.map((v) => ({ versao: v.versao, created_at: v.created_at, mudancas: v.mudancas, qa: v.qa })),
    };
  });

  /** Registra os arquivos já gravados em entrada/, informa no chat e inicia a F1. */
  async function registrarArquivos(req: FastifyRequest, reply: FastifyReply, job: JobRow,
    arquivos: { nome: string; mime: string; bytes: number }[], contextoBruto: unknown) {
    const contextoExtra = valorTexto(contextoBruto).trim().slice(0, 500);
    const registrados = [];
    for (const a of arquivos) {
      registrados.push(await d.repo.inserirArquivo({
        job_id: job.id, nome: a.nome, mime: a.mime, bytes: a.bytes, storage_path: `${BUCKETS.entrada}/${job.id}/${a.nome}`, origem: 'entrada',
      }));
    }
    await d.repo.inserirMensagem({
      job_id: job.id, autor: 'usuario', tipo: 'arquivos',
      conteudo: { arquivos: registrados.map((r) => ({ id: r.id, nome: r.nome, mime: r.mime, bytes: r.bytes })), ...(contextoExtra ? { contexto: contextoExtra } : {}) },
    });
    const patch = contextoExtra ? { contexto: [job.contexto, contextoExtra].filter(Boolean).join(' · ').slice(0, 500) } : {};
    return responder(reply, await d.orquestrador.eventoDoUsuario(job, 'arquivos_enviados', origem(req), patch));
  }

  async function rascunho(req: FastifyRequest): Promise<JobRow> {
    const job = await autorizado(req);
    if (job.estado !== 'rascunho') throw new ErroHttp(409, 'Os arquivos já foram enviados para este trabalho.');
    return job;
  }

  // Multipart pelo próprio serviço: só cabe abaixo de 32 MiB (limite de corpo do Cloud Run). A interface usa /envios.
  app.post('/jobs/:id/arquivos', async (req, reply) => {
    const job = await rascunho(req);
    if (!req.isMultipart()) throw new ErroHttp(400, 'Envie os arquivos como multipart/form-data.');

    try {
      const { files: salvos, values } = await req.saveRequestFiles({ tmpdir: tmpdir() });
      if (!salvos.length) throw new ErroHttp(400, 'Nenhum arquivo enviado.');
      const lidos = await Promise.all(salvos.map(async (s) => ({ original: s.filename, dados: await readFile(s.filepath) })));
      const validados = lidos.map((l) => ({ ...validarArquivo(l.original, l.dados), dados: l.dados }));
      validarTotal(validados.map((v) => v.dados.length));
      const nomes = desduplicar(validados.map((v) => v.nome));
      for (const [i, v] of validados.entries()) await d.arm.gravar(BUCKETS.entrada, `${job.id}/${nomes[i]}`, v.dados, v.mime);
      return await registrarArquivos(req, reply, job,
        validados.map((v, i) => ({ nome: nomes[i]!, mime: v.mime, bytes: v.dados.length })), (values as Record<string, unknown>).contexto);
    } finally {
      await req.cleanRequestFiles().catch(() => {});
    }
  });

  // Envio direto ao Storage (até 200 MB por arquivo): 1) URLs assinadas; 2) o navegador grava; 3) concluir.
  app.post('/jobs/:id/envios', async (req) => {
    const job = await rascunho(req);
    const { arquivos } = validar(CorpoEnvios, req.body);
    if (arquivos.length > LIMITES.maxArquivos) throw new UploadInvalido(`Envie no máximo ${LIMITES.maxArquivos} arquivos.`);
    const declarados = arquivos.map((a) => validarDeclarado(a.nome, a.bytes));
    validarTotal(arquivos.map((a) => a.bytes));
    const nomes = desduplicar(declarados.map((v) => v.nome));
    const envios = [];
    for (const [i, nome] of nomes.entries()) {
      envios.push({ original: arquivos[i]!.nome, nome, contentType: declarados[i]!.mime, url: await d.arm.urlEnvio(BUCKETS.entrada, `${job.id}/${nome}`) });
    }
    return { envios, validadeSegundos: LIMITES.urlEnvioSegundos };
  });

  app.post('/jobs/:id/envios/concluir', async (req, reply) => {
    const job = await rascunho(req);
    const corpo = validar(CorpoConcluirEnvios, req.body);
    const nomes = [...new Set(corpo.nomes)];
    if (nomes.length > LIMITES.maxArquivos) throw new UploadInvalido(`Envie no máximo ${LIMITES.maxArquivos} arquivos.`);
    // Só nomes que a própria rota de envios poderia ter gerado: nada de caminho ou caractere fora do padrão.
    if (nomes.some((n) => nomeSeguro(n) !== n)) throw new ErroHttp(400, 'Nome de arquivo inválido.');

    const arquivos = [];
    for (const nome of nomes) {
      const insp = await d.arm.inspecionar(BUCKETS.entrada, `${job.id}/${nome}`, BYTES_ASSINATURA);
      if (!insp) throw new UploadInvalido(`"${nome}" não chegou ao armazenamento. Envie de novo.`);
      try {
        arquivos.push({ ...validarConteudo(nome, insp.bytes, insp.inicio), bytes: insp.bytes });
      } catch (e) {
        await d.arm.remover(BUCKETS.entrada, [`${job.id}/${nome}`]).catch(() => {});
        throw e;
      }
    }
    validarTotal(arquivos.map((a) => a.bytes));
    // O workspace baixa tudo sob o prefixo do trabalho: envio abandonado ou repetido não pode entrar na F1.
    const confirmados = new Set(nomes.map((n) => `${job.id}/${n}`));
    const sobras = (await d.arm.listar(BUCKETS.entrada, job.id)).filter((c) => !confirmados.has(c));
    if (sobras.length) await d.arm.remover(BUCKETS.entrada, sobras);
    return registrarArquivos(req, reply, job, arquivos, corpo.contexto);
  });

  app.post('/jobs/:id/respostas', async (req, reply) => {
    const job = await autorizado(req);
    const { respostas } = validar(CorpoRespostas, req.body);
    if (job.estado !== 'aguardando_respostas') throw new TransicaoInvalida(job.estado, 'respostas_enviadas');
    // Toda pergunta do último card precisa de resposta (§9: botão habilitado só com tudo respondido).
    const ultimo = (await d.repo.listarMensagens(job.id)).filter((m) => m.tipo === 'perguntas').at(-1);
    const perguntas = ((ultimo?.conteudo.perguntas ?? []) as { pergunta: string }[]).map((p) => p.pergunta);
    const faltando = perguntas.filter((p) => !(p in respostas));
    if (faltando.length) throw new ErroHttp(400, 'Responda todas as perguntas antes de enviar.');
    await d.repo.inserirMensagem({ job_id: job.id, autor: 'usuario', tipo: 'respostas', conteudo: { respostas } });
    return responder(reply, await d.orquestrador.eventoDoUsuario(job, 'respostas_enviadas', origem(req)));
  });

  app.post('/jobs/:id/narrativa', async (req, reply) => {
    const job = await autorizado(req);
    const corpo = validar(CorpoNarrativa, req.body);
    const evento: Evento = corpo.acao === 'aprovar' ? 'narrativa_aprovada' : 'ajuste_narrativa_pedido';
    if (job.estado !== 'aguardando_aprovacao') throw new TransicaoInvalida(job.estado, evento);
    await d.repo.inserirMensagem({ job_id: job.id, autor: 'usuario', tipo: 'aprovacao', conteudo: corpo.acao === 'aprovar' ? { acao: 'aprovar' } : { acao: 'ajustar', texto: corpo.texto } });
    return responder(reply, await d.orquestrador.eventoDoUsuario(job, evento, origem(req)));
  });

  app.post('/jobs/:id/mensagens', async (req, reply) => {
    const job = await autorizado(req);
    const { texto } = validar(CorpoMensagem, req.body);
    if (job.estado === 'cancelado') throw new TransicaoInvalida(job.estado, 'ajuste_pedido');
    // Texto livre sempre fica no histórico; com o deck entregue, vira um pedido de ajuste (F4).
    await d.repo.inserirMensagem({ job_id: job.id, autor: 'usuario', tipo: 'texto', conteudo: { texto } });
    if (job.estado !== 'entregue') return responder(reply, job, 200);
    return responder(reply, await d.orquestrador.eventoDoUsuario(job, 'ajuste_pedido', origem(req)));
  });

  app.post('/jobs/:id/retomar', async (req, reply) => {
    const job = await autorizado(req);
    return responder(reply, await d.orquestrador.eventoDoUsuario(job, 'retomar', origem(req)));
  });

  app.post('/jobs/:id/cancelar', async (req, reply) => {
    const job = await autorizado(req);
    return responder(reply, await d.orquestrador.eventoDoUsuario(job, 'cancelar', origem(req)), 200);
  });

  app.get('/jobs/:id/versoes/:n/download', async (req) => {
    const job = await autorizado(req);
    const n = Number((req.params as { n?: string }).n);
    if (!Number.isInteger(n) || n < 1) throw new ErroHttp(400, 'Versão inválida.');
    const versao = (await d.repo.listarVersoes(job.id)).find((v) => v.versao === n);
    if (!versao) throw new ErroHttp(404, 'Versão não encontrada.');
    return { url: await d.arm.urlAssinada(BUCKETS.saida, versao.storage_path, LIMITES.urlAssinadaSegundos) };
  });

  /** Chamada só pelo Cloud Tasks. Fica aberta durante toda a fase (§8 item 2). */
  app.post('/internal/fase', async (req, reply) => {
    if (!(await d.oidc.verificar(req.headers.authorization))) return reply.status(403).send({ erro: 'Proibido.' });
    const { faseId } = validar(CorpoFase, req.body);
    return reply.send(await d.orquestrador.executarFase(faseId));
  });

  return app;
}
