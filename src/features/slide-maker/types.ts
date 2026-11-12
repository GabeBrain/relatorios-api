/**
 * Contratos do Slide Maker (INSTRUCOES_DESENVOLVIMENTO.md §5.1, §7 e §15.1).
 * Os nomes de campo seguem as colunas de `supabase/migrations/20261112160000_slide_maker.sql`
 * e o JSON trocado com o serviço `gcp/slide-maker-agent`.
 */
import type { Estado, Fase } from './lib/state-machine';

export type { Estado, Fase };

export const RESPONSAVEIS = ['fabio', 'guilherme', 'finoti', 'outro'] as const;
export type Responsavel = (typeof RESPONSAVEIS)[number];

export const RESPONSAVEL_ROTULO: Record<Responsavel, string> = {
  fabio: 'Fábio Tadeu Araújo',
  guilherme: 'Guilherme Werner',
  finoti: 'Lucas Finoti',
  outro: 'Outro',
};

export const DOMINIO_EMAIL = '@brain.srv.br';

/** Extensões aceitas no upload (§1, §8). */
export const EXTENSOES_ENTRADA = ['.pptx', '.xlsx', '.pdf', '.docx', '.png', '.jpg', '.jpeg'] as const;
export const MAX_ARQUIVOS = 10;
export const MAX_BYTES_ARQUIVO = 50 * 1024 * 1024;

/** Trabalho visto pelo autor (rotas com `x-job-token`). */
export interface Trabalho {
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
  erro: string | null;
}

/**
 * Linha de "Todos os trabalhos" (§15.1 item 3): visível a qualquer colaborador, para evitar
 * trabalho duplicado. Só metadados; nada de mensagens, arquivos ou deck.
 */
export interface ResumoTrabalho {
  id: string;
  titulo: string | null;
  colaborador_email: string;
  responsavel: Responsavel | null;
  estado: Estado;
  versao_atual: number;
  created_at: string;
  updated_at: string;
}

// ---------- Mensagens do chat (§7.1 slide_maker_mensagens) ----------

export type AutorMensagem = 'usuario' | 'agente' | 'sistema';

export interface OpcaoPergunta {
  rotulo: string;
  descricao: string;
  recomendada?: boolean;
}

export interface Pergunta {
  pergunta: string;
  /** ≤ 12 caracteres (§5.1). */
  cabecalho: string;
  multipla: boolean;
  /** 2 a 4 opções; a interface acrescenta "Outro" com campo livre. */
  opcoes: OpcaoPergunta[];
}

export interface SlideNarrativa {
  n: number;
  bloco: string;
  titulo: string;
  apoio?: string;
  visual: string;
  fonte?: string;
  minutos: number;
}

export interface Narrativa {
  tese: string;
  /** ≤ 5 linhas. */
  resumo_diagnostico: string;
  atualizacoes: string[];
  slides: SlideNarrativa[];
  tempo_total_min: number;
}

export interface QaEntrega {
  falhas_bloqueantes: number;
  alertas: string[];
  notas_rubrica: Record<string, number>;
}

export interface Entrega {
  versao: number;
  /** ≤ 3 itens. */
  mudancas: string[];
  qa: QaEntrega;
}

export interface ArquivoEnviado {
  id: string;
  nome: string;
  mime: string;
  bytes: number;
}

/** Etapas mostradas no CardProgresso (§9), vindas dos eventos do serviço. */
export const ETAPAS_PROGRESSO = [
  'Lendo arquivos',
  'Pesquisando dados',
  'Montando a narrativa',
  'Produzindo slides',
  'Revisando o visual',
] as const;
export type EtapaProgresso = (typeof ETAPAS_PROGRESSO)[number];

/** Conteúdo de cada tipo de mensagem: `conteudo jsonb` discriminado por `tipo`. */
export type ConteudoMensagem =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'arquivos'; arquivos: ArquivoEnviado[]; contexto?: string }
  | { tipo: 'perguntas'; perguntas: Pergunta[] }
  | { tipo: 'respostas'; respostas: Record<string, string | string[]> }
  | { tipo: 'narrativa'; narrativa: Narrativa }
  | { tipo: 'aprovacao'; acao: 'aprovar' | 'ajustar'; texto?: string }
  | { tipo: 'progresso'; etapa: EtapaProgresso; fase: Fase }
  | { tipo: 'entrega'; entrega: Entrega }
  | { tipo: 'erro'; mensagem: string; fase: Fase | null };

export type TipoMensagem = ConteudoMensagem['tipo'];

export interface Mensagem<C extends ConteudoMensagem = ConteudoMensagem> {
  id: string;
  job_id: string;
  created_at: string;
  autor: AutorMensagem;
  tipo: C['tipo'];
  conteudo: Omit<C, 'tipo'>;
}

export interface VersaoDeck {
  versao: number;
  created_at: string;
  mudancas: string[];
  qa: QaEntrega | null;
}

/** Resposta de `GET /jobs/:id` (§8): estado, mensagens e versões, sem relatório. */
export interface DetalheTrabalho {
  trabalho: Trabalho;
  mensagens: Mensagem[];
  versoes: VersaoDeck[];
}

/** Resposta única de `POST /jobs`: o token só aparece aqui (§8). */
export interface TrabalhoCriado {
  jobId: string;
  token: string;
}

/** Evento de Broadcast `slide-maker:<jobId>`: só sinaliza; o conteúdo vem do GET com token. */
export interface EventoTrabalho {
  estado: Estado;
  fase: Fase | null;
  etapa?: EtapaProgresso;
  versao_atual: number;
}
