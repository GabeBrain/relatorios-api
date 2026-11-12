import { LIMITES } from './config.js';
import { emExecucao, estadoDaFase, transicionar, type Evento, type Fase } from './shared/state-machine.js';
import { ambienteDoAgente, type Agente, type ResultadoAgente } from './agent/agente.js';
import { SessaoFase, type Terminal, type ValidadorDeck } from './agent/ferramentas.js';
import type { Despachante } from './dispatch/despachante.js';
import type { Eventos } from './eventos.js';
import type { FaseRow, JobRow, Repo } from './repo/tipos.js';
import type { Armazenamento } from './storage/armazenamento.js';
import { Workspace } from './workspace.js';

export const MENSAGENS_ERRO = {
  orcamento: 'O processamento excedeu o limite desta etapa. Tente novamente ou simplifique o pedido.',
  tempo: 'O processamento passou do tempo limite desta etapa. Tente novamente ou simplifique o pedido.',
  semEntrega: 'A etapa terminou sem resultado. Tente novamente.',
  falha: 'Não foi possível concluir esta etapa. Tente novamente.',
  fila: 'Não foi possível iniciar o processamento. Tente novamente.',
} as const;

export class LimiteExcedido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'LimiteExcedido';
  }
}

export class ConflitoDeEstado extends Error {
  constructor() {
    super('O trabalho mudou de estado. Atualize a página e tente novamente.');
    this.name = 'ConflitoDeEstado';
  }
}

export interface DependenciasOrquestrador {
  repo: Repo;
  arm: Armazenamento;
  eventos: Eventos;
  despachante: Despachante;
  agente: Agente;
  validadorDeck: ValidadorDeck;
  workRoot: string;
  faseTimeoutMs: number;
  chaveAnthropic?: string;
  verificacaoCancelamentoMs?: number;
  agora?: () => Date;
  log?: (msg: string) => void;
}

export interface Origem {
  ip: string | null;
}

const contexto = (j: JobRow) => ({ versaoAtual: j.versao_atual, erroFase: j.erro_fase });

export class Orquestrador {
  private readonly agora: () => Date;
  private readonly log: (msg: string) => void;

  constructor(private readonly d: DependenciasOrquestrador) {
    this.agora = d.agora ?? (() => new Date());
    this.log = d.log ?? (() => {});
  }

  /**
   * Aplica um evento disparado pelo usuário. Se ele iniciar uma fase, confere os limites (§12),
   * registra a fase e a enfileira. Lança `TransicaoInvalida`, `LimiteExcedido` ou `ConflitoDeEstado`.
   */
  async eventoDoUsuario(job: JobRow, evento: Evento, origem: Origem, patchExtra: Partial<JobRow> = {}): Promise<JobRow> {
    const t = transicionar(job.estado, evento, contexto(job));
    if (t.iniciaFase) await this.verificarLimites(job, origem);

    const patch: Partial<JobRow> = {
      ...patchExtra,
      estado: t.estado,
      fase_em_curso: t.iniciaFase ?? (emExecucao(t.estado) ? job.fase_em_curso : null),
      erro_fase: null,
      erro: null,
    };
    if (t.iniciaFase && this.d.repo.reservarEvento) {
      const reserva = await this.d.repo.reservarEvento({ job_id: job.id, estado_esperado: job.estado, patch, fase: t.iniciaFase, ip: origem.ip });
      if (!reserva) throw new ConflitoDeEstado();
      const final = await this.iniciarFase(reserva.job, t.iniciaFase, origem, reserva.fase);
      await this.emitir(final);
      return final;
    }
    const atualizado = await this.d.repo.atualizarJob(job.id, job.estado, patch);
    if (!atualizado) throw new ConflitoDeEstado();

    if (evento === 'cancelar') {
      const ativa = await this.d.repo.faseAtiva(job.id);
      if (ativa) {
        await this.d.repo.atualizarFase(ativa.id, ['enfileirada', 'executando'], { status: 'cancelada', finalizada_em: this.agora().toISOString() });
      }
    }

    const final = t.iniciaFase ? await this.iniciarFase(atualizado, t.iniciaFase, origem) : atualizado;
    await this.emitir(final);
    return final;
  }

  private async verificarLimites(job: JobRow, origem: Origem) {
    const umaHora = new Date(this.agora().getTime() - 60 * 60 * 1000);
    const email = job.colaborador_email;
    if ((await this.d.repo.contarFasesAtivasPorEmail(email)) >= LIMITES.trabalhosSimultaneosPorEmail) {
      throw new LimiteExcedido(`Você já tem ${LIMITES.trabalhosSimultaneosPorEmail} trabalhos em processamento. Aguarde um deles terminar.`);
    }
    if ((await this.d.repo.contarFasesDesde({ colaborador_email: email }, umaHora)) >= LIMITES.fasesPorHoraPorEmail) {
      throw new LimiteExcedido('Limite de etapas por hora atingido para este e-mail. Tente novamente mais tarde.');
    }
    if (origem.ip && (await this.d.repo.contarFasesDesde({ ip: origem.ip }, umaHora)) >= LIMITES.fasesPorHoraPorIp) {
      throw new LimiteExcedido('Limite de etapas por hora atingido nesta rede. Tente novamente mais tarde.');
    }
  }

  /** Registra a fase e a enfileira. Se a fila falhar, o trabalho vai para `erro` com "Tentar novamente". */
  private async iniciarFase(job: JobRow, fase: Fase, origem: Origem, reservada?: FaseRow): Promise<JobRow> {
    let registro: FaseRow;
    try {
      registro = reservada ?? await this.d.repo.criarFase({ job_id: job.id, fase, colaborador_email: job.colaborador_email, ip: origem.ip });
    } catch (error) {
      // A reserva atômica pode recusar uma corrida entre instâncias após o preflight.
      // Nunca deixar o trabalho em processamento sem uma fase registrada.
      const ativa = await this.d.repo.faseAtiva(job.id);
      if (!ativa) await this.falhar(job, fase, 'Não foi possível reservar esta etapa. Tente novamente mais tarde.');
      throw error;
    }
    try {
      const tarefa = await this.d.despachante.enfileirar(registro.id);
      await this.d.repo.atualizarFase(registro.id, ['enfileirada'], { tarefa_nome: tarefa });
      this.log(`fase enfileirada job=${job.id} fase=${fase}`);
      return job;
    } catch {
      this.log(`fila falhou job=${job.id} fase=${fase}`);
      await this.d.repo.atualizarFase(registro.id, ['enfileirada'], { status: 'erro', erro: 'fila', finalizada_em: this.agora().toISOString() });
      return (await this.falhar(job, fase, MENSAGENS_ERRO.fila)) ?? job;
    }
  }

  /**
   * Executa uma fase dentro da requisição `POST /internal/fase` (§8): só responde quando o agente
   * termina. Idempotente: uma fase que não está `enfileirada` é ignorada.
   */
  async executarFase(faseId: string): Promise<{ resultado: 'ignorada' | 'concluida' | 'erro' | 'cancelada' }> {
    const fase = await this.d.repo.obterFase(faseId);
    if (!fase || fase.status !== 'enfileirada') return { resultado: 'ignorada' };
    const inicio = this.agora();
    const emExecucaoAgora = await this.d.repo.atualizarFase(faseId, ['enfileirada'], { status: 'executando', iniciada_em: inicio.toISOString() });
    if (!emExecucaoAgora) return { resultado: 'ignorada' };

    const job = await this.d.repo.obterJob(fase.job_id);
    if (!job || job.estado !== estadoDaFase(fase.fase)) {
      await this.finalizarFase(fase, 'cancelada', null);
      return { resultado: 'cancelada' };
    }

    const ws = new Workspace(this.d.workRoot, job.id, this.d.arm);
    const controlador = new AbortController();
    let motivoAborto: 'terminal' | 'tempo' | 'cancelada' | null = null;
    const abortar = (m: NonNullable<typeof motivoAborto>) => {
      if (!motivoAborto) {
        motivoAborto = m;
        controlador.abort(m);
      }
    };
    const sessao = new SessaoFase(
      { repo: this.d.repo, arm: this.d.arm, eventos: this.d.eventos, workspace: ws, validadorDeck: this.d.validadorDeck },
      job.id, fase.fase, () => abortar('terminal'),
    );
    const relogio = setTimeout(() => abortar('tempo'), this.d.faseTimeoutMs);
    const vigia = setInterval(() => {
      void this.d.repo.obterFase(faseId).then((f) => { if (f?.status === 'cancelada') abortar('cancelada'); }).catch(() => {});
    }, this.d.verificacaoCancelamentoMs ?? LIMITES.verificacaoCancelamentoMs);

    let resultado: ResultadoAgente;
    try {
      await ws.restaurar();
      await ws.gravarLocal('trabalho/historico_chat.json', JSON.stringify(await this.historico(job.id), null, 2));
      resultado = await this.d.agente.executar({
        job, fase: fase.fase, cwd: ws.dir, sinal: controlador.signal, ferramentas: sessao,
        env: ambienteDoAgente(this.d.chaveAnthropic),
      });
    } catch (erro) {
      // Depois de uma ferramenta terminal, o abort pode chegar como exceção: não é falha (§5.1).
      resultado = sessao.terminal ? { tipo: 'fim' } : { tipo: 'erro', detalhe: erro instanceof Error ? erro.name : 'erro' };
    } finally {
      clearTimeout(relogio);
      clearInterval(vigia);
    }

    const duracao = this.agora().getTime() - inicio.getTime();
    try {
      if (motivoAborto === 'cancelada' || (await this.d.repo.obterFase(faseId))?.status === 'cancelada') {
        this.log(`fase cancelada job=${job.id} fase=${fase.fase} ms=${duracao}`);
        return { resultado: 'cancelada' };
      }
      if (sessao.terminal) {
        // Só uma fase bem-sucedida grava o workspace; numa falha vale o da última fase (§3.3, §8 item 4).
        await ws.salvar();
        await this.concluir(fase, job.id, sessao.terminal);
        this.log(`fase concluída job=${job.id} fase=${fase.fase} ms=${duracao}`);
        return { resultado: 'concluida' };
      }
      const mensagem = motivoAborto === 'tempo' ? MENSAGENS_ERRO.tempo
        : resultado.tipo === 'orcamento_excedido' ? MENSAGENS_ERRO.orcamento
        : resultado.tipo === 'fim' ? MENSAGENS_ERRO.semEntrega
        : MENSAGENS_ERRO.falha;
      const motivo = motivoAborto === 'tempo' ? 'tempo' : resultado.tipo === 'fim' ? 'sem_entrega' : resultado.tipo;
      this.log(`fase com erro job=${job.id} fase=${fase.fase} motivo=${motivo} ms=${duracao}`);
      await this.finalizarFase(fase, 'erro', motivo);
      const atual = await this.d.repo.obterJob(job.id);
      if (atual && emExecucao(atual.estado)) await this.falhar(atual, fase.fase, mensagem);
      return { resultado: 'erro' };
    } finally {
      await ws.limpar();
    }
  }

  private async concluir(fase: FaseRow, jobId: string, terminal: Terminal) {
    await this.finalizarFase(fase, 'concluida', null);
    const job = await this.d.repo.obterJob(jobId);
    if (!job) return;
    const t = transicionar(job.estado, terminal.evento, contexto(job));
    const patch: Partial<JobRow> = { estado: t.estado, fase_em_curso: t.iniciaFase };
    if (terminal.evento === 'deck_entregue') patch.versao_atual = terminal.versao;
    if (terminal.evento === 'narrativa_submetida') patch.responsavel = terminal.responsavel;
    const atualizado = await this.d.repo.atualizarJob(job.id, job.estado, patch);
    if (!atualizado) return;
    // F1 sem perguntas encadeia a F2 sem esperar o usuário.
    const final = t.iniciaFase ? await this.iniciarFase(atualizado, t.iniciaFase, { ip: null }) : atualizado;
    await this.emitir(final);
  }

  private async falhar(job: JobRow, fase: Fase, mensagem: string): Promise<JobRow | null> {
    const t = transicionar(job.estado, 'falhou', contexto(job));
    const atualizado = await this.d.repo.atualizarJob(job.id, job.estado, { estado: t.estado, erro_fase: fase, fase_em_curso: null, erro: mensagem });
    if (!atualizado) return null;
    await this.d.repo.inserirMensagem({ job_id: job.id, autor: 'sistema', tipo: 'erro', conteudo: { mensagem, fase } });
    await this.emitir(atualizado);
    return atualizado;
  }

  private async finalizarFase(fase: FaseRow, status: 'concluida' | 'erro' | 'cancelada', erro: string | null) {
    await this.d.repo.atualizarFase(fase.id, ['executando', 'enfileirada'], { status, erro, finalizada_em: this.agora().toISOString() });
  }

  /** O que o usuário escreveu no chat (fora dos cards também) vai para o agente na próxima fase (§5). */
  private async historico(jobId: string) {
    const mensagens = await this.d.repo.listarMensagens(jobId);
    return mensagens
      .filter((m) => m.autor === 'usuario')
      .map((m) => ({ quando: m.created_at, tipo: m.tipo, conteudo: m.conteudo }));
  }

  private async emitir(job: JobRow) {
    await this.d.eventos.emitir(job.id, { estado: job.estado, fase: job.fase_em_curso, versao_atual: job.versao_atual });
  }
}
