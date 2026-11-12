/**
 * Regras puras do chat (§9): que card está ativo, qual a etapa em andamento, desde quando a fase
 * roda (cronômetro real, sem ETA) e como apresentar cada estado. Sem React, para testar isoladamente.
 */
import { emExecucao, type Estado } from './state-machine';
import {
  EXTENSOES_ENTRADA, MAX_ARQUIVOS, MAX_BYTES_ARQUIVO,
  type DetalheTrabalho, type EtapaProgresso, type Mensagem,
} from '../types';

export const ROTULO_ESTADO: Record<Estado, string> = {
  rascunho: 'Aguardando arquivos',
  analisando: 'Analisando',
  aguardando_respostas: 'Aguardando suas respostas',
  pesquisando_e_narrando: 'Montando a narrativa',
  aguardando_aprovacao: 'Aguardando aprovação',
  produzindo: 'Produzindo',
  revisando: 'Revisando',
  entregue: 'Entregue',
  ajustando: 'Ajustando',
  erro: 'Erro',
  cancelado: 'Cancelado',
};

/** Etapa padrão de cada estado em execução, até o serviço informar a etapa real. */
const ETAPA_PADRAO: Partial<Record<Estado, EtapaProgresso>> = {
  analisando: 'Lendo arquivos',
  pesquisando_e_narrando: 'Montando a narrativa',
  produzindo: 'Produzindo slides',
  revisando: 'Revisando o visual',
  ajustando: 'Produzindo slides',
};

/** Mensagens que iniciam uma fase: o cronômetro começa na mais recente delas. */
const INICIA_FASE = new Set(['arquivos', 'respostas', 'aprovacao', 'texto']);

export interface SituacaoChat {
  emExecucao: boolean;
  /** Mensagem cujo card aceita ação agora (perguntas ou narrativa), se houver. */
  idCardAtivo: string | null;
  etapa: EtapaProgresso | null;
  /** Início da fase em curso (ms), para o tempo decorrido real. */
  inicioFase: number | null;
  /** O composer de texto livre envia um pedido de ajuste (F4). */
  podeAjustar: boolean;
}

export function situacao(d: DetalheTrabalho): SituacaoChat {
  const { estado } = d.trabalho;
  const msgs = d.mensagens;
  const rodando = emExecucao(estado);
  const ultimaDoTipo = (tipo: Mensagem['tipo']) => [...msgs].reverse().find((m) => m.tipo === tipo) ?? null;

  let idCardAtivo: string | null = null;
  if (estado === 'aguardando_respostas') idCardAtivo = ultimaDoTipo('perguntas')?.id ?? null;
  if (estado === 'aguardando_aprovacao') idCardAtivo = ultimaDoTipo('narrativa')?.id ?? null;

  let inicioFase: number | null = null;
  let etapa: EtapaProgresso | null = null;
  if (rodando) {
    // A fase começa na última ação do usuário (ou na retomada, depois de um erro).
    // Retomada não grava mensagem: depois de um erro, vale o horário da transição (updated_at).
    const ini = [...msgs].reverse().find((m) => (m.autor === 'usuario' && INICIA_FASE.has(m.tipo)) || m.tipo === 'erro');
    inicioFase = Date.parse(!ini || ini.tipo === 'erro' ? d.trabalho.updated_at : ini.created_at);
    const progresso = [...msgs].reverse().find((m) => m.tipo === 'progresso' && Date.parse(m.created_at) >= inicioFase!);
    etapa = (progresso?.conteudo as { etapa?: EtapaProgresso } | undefined)?.etapa ?? ETAPA_PADRAO[estado] ?? null;
  }
  return { emExecucao: rodando, idCardAtivo, etapa, inicioFase, podeAjustar: estado === 'entregue' };
}

/** Mensagens exibidas no chat: progresso vira o card de progresso (não aparece no histórico). */
export function mensagensVisiveis(msgs: Mensagem[]): Mensagem[] {
  return msgs.filter((m) => m.tipo !== 'progresso');
}

// ------------------------------------------------------------------ upload

export interface ProblemaArquivo { nome: string; motivo: string }

export function validarArquivos(arquivos: File[]): ProblemaArquivo[] {
  const problemas: ProblemaArquivo[] = [];
  if (arquivos.length > MAX_ARQUIVOS) problemas.push({ nome: '', motivo: `Envie no máximo ${MAX_ARQUIVOS} arquivos.` });
  for (const a of arquivos) {
    const ext = a.name.slice(a.name.lastIndexOf('.')).toLowerCase();
    if (!(EXTENSOES_ENTRADA as readonly string[]).includes(ext)) problemas.push({ nome: a.name, motivo: 'Tipo de arquivo não aceito.' });
    else if (a.size > MAX_BYTES_ARQUIVO) problemas.push({ nome: a.name, motivo: 'Maior que 50 MB.' });
    else if (a.size === 0) problemas.push({ nome: a.name, motivo: 'Arquivo vazio.' });
  }
  return problemas;
}

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

// ------------------------------------------------------------------ perguntas

export const OUTRO = '__outro__';

export type Selecao = { opcoes: string[]; outro: string };

/** Respostas no formato do serviço; null se alguma pergunta ainda não tem resposta. */
export function montarRespostas(
  perguntas: { pergunta: string; multipla: boolean }[],
  selecoes: Record<string, Selecao | undefined>,
): Record<string, string | string[]> | null {
  const r: Record<string, string | string[]> = {};
  for (const p of perguntas) {
    const s = selecoes[p.pergunta];
    if (!s) return null;
    const valores = s.opcoes.flatMap((o) => (o === OUTRO ? (s.outro.trim() ? [s.outro.trim()] : []) : [o]));
    if (s.opcoes.includes(OUTRO) && !s.outro.trim()) return null;
    if (!valores.length) return null;
    r[p.pergunta] = p.multipla ? valores : valores[0]!;
  }
  return r;
}
