import { randomUUID } from 'node:crypto';
import type { Estado } from '../shared/state-machine.js';
import {
  FaseAtivaExistente,
  type ArquivoRow, type FaseRow, type JobRow, type MensagemRow, type RelatorioRow, type Repo, type StatusFase, type VersaoRow,
} from './tipos.js';

/**
 * Repositório em memória para testes e desenvolvimento local. Reproduz as restrições da migration
 * que o código depende: uma fase ativa por trabalho, versão única por trabalho e compare-and-set.
 */
export class RepoMemoria implements Repo {
  jobs = new Map<string, JobRow>();
  mensagens: MensagemRow[] = [];
  arquivos: ArquivoRow[] = [];
  versoes: VersaoRow[] = [];
  relatorios: RelatorioRow[] = [];
  fases = new Map<string, FaseRow>();
  private ultimo = 0;

  /** Hora real, mas estritamente crescente: ordem estável mesmo em operações no mesmo milissegundo. */
  private agora(): string {
    this.ultimo = Math.max(Date.now(), this.ultimo + 1);
    return new Date(this.ultimo).toISOString();
  }

  async criarJob(d: { colaborador_email: string; titulo: string; contexto: string | null; token_acesso_hash: string }) {
    const t = this.agora();
    const job: JobRow = {
      id: randomUUID(), created_at: t, updated_at: t, titulo: d.titulo, contexto: d.contexto,
      colaborador_email: d.colaborador_email, responsavel: null, estado: 'rascunho', fase_em_curso: null,
      erro_fase: null, versao_atual: 0, token_acesso_hash: d.token_acesso_hash, erro: null, arquivos_expurgados_em: null,
    };
    this.jobs.set(job.id, job);
    return { ...job };
  }

  async obterJob(id: string) {
    const j = this.jobs.get(id);
    return j ? { ...j } : null;
  }

  async obterJobs(ids: string[]) {
    return ids.map((id) => this.jobs.get(id)).filter((j): j is JobRow => Boolean(j)).map((j) => ({ ...j }));
  }

  async atualizarJob(id: string, esperado: Estado, patch: Partial<JobRow>) {
    const j = this.jobs.get(id);
    if (!j || j.estado !== esperado) return null;
    const novo = { ...j, ...patch, updated_at: this.agora() };
    if ((novo.estado === 'erro') !== (novo.erro_fase !== null)) throw new Error('violação: estado erro ⇔ erro_fase');
    this.jobs.set(id, novo);
    return { ...novo };
  }

  async listarJobsEquipe(limite: number) {
    return [...this.jobs.values()]
      .filter((j) => j.estado !== 'cancelado')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limite)
      .map((j) => ({ ...j }));
  }

  async inserirMensagem(m: Omit<MensagemRow, 'id' | 'created_at'>) {
    const row = { ...m, id: randomUUID(), created_at: this.agora() };
    this.mensagens.push(row);
    return row;
  }

  async listarMensagens(jobId: string) {
    return this.mensagens.filter((m) => m.job_id === jobId);
  }

  async inserirArquivo(a: Omit<ArquivoRow, 'id' | 'created_at'>) {
    if (this.arquivos.some((x) => x.storage_path === a.storage_path)) throw new Error('violação: storage_path único');
    const row = { ...a, id: randomUUID(), created_at: this.agora() };
    this.arquivos.push(row);
    return row;
  }

  async listarArquivos(jobId: string) {
    return this.arquivos.filter((a) => a.job_id === jobId);
  }

  async inserirVersao(v: Omit<VersaoRow, 'id' | 'created_at'>) {
    if (this.versoes.some((x) => x.job_id === v.job_id && x.versao === v.versao)) throw new Error('violação: versão única');
    const row = { ...v, id: randomUUID(), created_at: this.agora() };
    this.versoes.push(row);
    return row;
  }

  async listarVersoes(jobId: string) {
    return this.versoes.filter((v) => v.job_id === jobId).sort((a, b) => a.versao - b.versao);
  }

  async salvarRelatorio(r: Omit<RelatorioRow, 'created_at'>) {
    this.relatorios = this.relatorios.filter((x) => !(x.job_id === r.job_id && x.versao === r.versao));
    this.relatorios.push({ ...r, created_at: this.agora() });
  }

  async criarFase(f: { job_id: string; fase: FaseRow['fase']; colaborador_email: string; ip: string | null }) {
    if ([...this.fases.values()].some((x) => x.job_id === f.job_id && (x.status === 'enfileirada' || x.status === 'executando'))) {
      throw new FaseAtivaExistente();
    }
    const row: FaseRow = {
      id: randomUUID(), job_id: f.job_id, fase: f.fase, status: 'enfileirada', colaborador_email: f.colaborador_email,
      ip: f.ip, tarefa_nome: null, criada_em: this.agora(), iniciada_em: null, finalizada_em: null, erro: null,
    };
    this.fases.set(row.id, row);
    return { ...row };
  }

  async obterFase(id: string) {
    const f = this.fases.get(id);
    return f ? { ...f } : null;
  }

  async atualizarFase(id: string, esperados: StatusFase[], patch: Partial<FaseRow>) {
    const f = this.fases.get(id);
    if (!f || !esperados.includes(f.status)) return null;
    const novo = { ...f, ...patch };
    this.fases.set(id, novo);
    return { ...novo };
  }

  async faseAtiva(jobId: string) {
    const f = [...this.fases.values()].find((x) => x.job_id === jobId && (x.status === 'enfileirada' || x.status === 'executando'));
    return f ? { ...f } : null;
  }

  async contarFasesDesde(filtro: { colaborador_email?: string; ip?: string }, desde: Date) {
    const limite = desde.toISOString();
    return [...this.fases.values()].filter((f) =>
      f.criada_em >= limite
      && (filtro.colaborador_email === undefined || f.colaborador_email === filtro.colaborador_email)
      && (filtro.ip === undefined || f.ip === filtro.ip)).length;
  }

  async contarFasesAtivasPorEmail(email: string) {
    return [...this.fases.values()].filter((f) => f.colaborador_email === email && (f.status === 'enfileirada' || f.status === 'executando')).length;
  }
}
