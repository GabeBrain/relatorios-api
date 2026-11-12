import type { Estado, Fase } from '../shared/state-machine.js';

/** Linhas das tabelas de `supabase/migrations/20261112160000_slide_maker.sql`. */

export type Responsavel = 'fabio' | 'guilherme' | 'finoti' | 'outro';
export type StatusFase = 'enfileirada' | 'executando' | 'concluida' | 'erro' | 'cancelada';
export type AutorMensagem = 'usuario' | 'agente' | 'sistema';
export type TipoMensagem =
  | 'texto' | 'arquivos' | 'perguntas' | 'respostas' | 'narrativa' | 'aprovacao' | 'progresso' | 'entrega' | 'erro';

export interface JobRow {
  id: string;
  created_at: string;
  updated_at: string;
  titulo: string | null;
  contexto: string | null;
  colaborador_email: string;
  responsavel: Responsavel | null;
  estado: Estado;
  fase_em_curso: Fase | null;
  erro_fase: Fase | null;
  versao_atual: number;
  token_acesso_hash: string;
  erro: string | null;
  arquivos_expurgados_em: string | null;
}

export interface MensagemRow {
  id: string;
  job_id: string;
  created_at: string;
  autor: AutorMensagem;
  tipo: TipoMensagem;
  conteudo: Record<string, unknown>;
}

export interface ArquivoRow {
  id: string;
  job_id: string;
  created_at: string;
  nome: string;
  mime: string;
  bytes: number;
  storage_path: string;
  origem: 'entrada' | 'saida';
}

export interface VersaoRow {
  id: string;
  job_id: string;
  versao: number;
  created_at: string;
  storage_path: string;
  deck_spec: unknown;
  mudancas: string[];
  qa: unknown;
}

export interface RelatorioRow {
  job_id: string;
  versao: number;
  markdown: string;
  fontes: unknown;
  created_at: string;
}

export interface FaseRow {
  id: string;
  job_id: string;
  fase: Fase;
  status: StatusFase;
  colaborador_email: string;
  ip: string | null;
  tarefa_nome: string | null;
  criada_em: string;
  iniciada_em: string | null;
  finalizada_em: string | null;
  erro: string | null;
}

/** Já existe uma fase enfileirada ou executando para o trabalho (índice único parcial). */
export class FaseAtivaExistente extends Error {
  constructor() {
    super('Já existe uma etapa em andamento para este trabalho.');
    this.name = 'FaseAtivaExistente';
  }
}

type Patch<T> = Partial<Omit<T, 'id' | 'created_at'>>;

/**
 * Acesso ao banco. As atualizações de estado são compare-and-set: só aplicam se o estado (ou
 * status) atual for o esperado, e devolvem `null` quando outra requisição chegou antes.
 */
export interface Repo {
  criarJob(dados: { colaborador_email: string; titulo: string; contexto: string | null; token_acesso_hash: string }): Promise<JobRow>;
  obterJob(id: string): Promise<JobRow | null>;
  obterJobs(ids: string[]): Promise<JobRow[]>;
  atualizarJob(id: string, estadoEsperado: Estado, patch: Patch<JobRow>): Promise<JobRow | null>;
  /** "Todos os trabalhos": recentes primeiro, sem os cancelados. */
  listarJobsEquipe(limite: number): Promise<JobRow[]>;

  inserirMensagem(m: Omit<MensagemRow, 'id' | 'created_at'>): Promise<MensagemRow>;
  listarMensagens(jobId: string): Promise<MensagemRow[]>;

  inserirArquivo(a: Omit<ArquivoRow, 'id' | 'created_at'>): Promise<ArquivoRow>;
  listarArquivos(jobId: string): Promise<ArquivoRow[]>;

  inserirVersao(v: Omit<VersaoRow, 'id' | 'created_at'>): Promise<VersaoRow>;
  listarVersoes(jobId: string): Promise<VersaoRow[]>;
  salvarRelatorio(r: Omit<RelatorioRow, 'created_at'>): Promise<void>;

  /** Lança `FaseAtivaExistente` se o trabalho já tiver fase enfileirada ou executando. */
  criarFase(f: { job_id: string; fase: Fase; colaborador_email: string; ip: string | null }): Promise<FaseRow>;
  obterFase(id: string): Promise<FaseRow | null>;
  atualizarFase(id: string, statusEsperados: StatusFase[], patch: Patch<FaseRow>): Promise<FaseRow | null>;
  faseAtiva(jobId: string): Promise<FaseRow | null>;
  contarFasesDesde(filtro: { colaborador_email?: string; ip?: string }, desde: Date): Promise<number>;
  contarFasesAtivasPorEmail(colaborador_email: string): Promise<number>;
}
