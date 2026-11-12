/**
 * Máquina de estados de um trabalho do Slide Maker (INSTRUCOES_DESENVOLVIMENTO.md §4).
 *
 * Módulo PURO e sem imports: é usado pelo frontend e copiado para dentro da imagem do serviço
 * `gcp/slide-maker-agent` (contexto de build na raiz do repositório, §15.1 item 10). Não importe
 * nada aqui.
 *
 * Fases do agente (§5): F1 intake · F2 pesquisa e narrativa · F3 produção e QA · F4 ajuste.
 * "revisando" é a etapa de QA dentro de F3 ou F4; a fase em curso fica registrada no trabalho.
 */

export const ESTADOS = [
  'rascunho',
  'analisando',
  'aguardando_respostas',
  'pesquisando_e_narrando',
  'aguardando_aprovacao',
  'produzindo',
  'revisando',
  'entregue',
  'ajustando',
  'erro',
  'cancelado',
] as const;
export type Estado = (typeof ESTADOS)[number];

export const FASES = ['F1', 'F2', 'F3', 'F4'] as const;
export type Fase = (typeof FASES)[number];

export const EVENTOS = [
  'arquivos_enviados', //  usuário enviou os arquivos → F1
  'perguntas_feitas', //   agente chamou perguntar_usuario (F1, ou F4 com pedido ambíguo)
  'intake_concluido', //   F1 terminou sem perguntas → F2
  'respostas_enviadas', // usuário respondeu ao card → F2 (ou F4, se já houve entrega)
  'narrativa_submetida', // agente chamou submeter_narrativa (F2, ou F4 que muda a tese)
  'narrativa_aprovada', // usuário aprovou → F3
  'ajuste_narrativa_pedido', // usuário pediu ajuste na narrativa → F2 de novo
  'revisao_iniciada', //  agente entrou no QA (F3/F4)
  'deck_entregue', //     agente chamou entregar_deck com sucesso
  'ajuste_pedido', //     usuário pediu ajuste depois da entrega → F4
  'falhou', //            fase caiu (erro, timeout, trava de orçamento, encerrou sem entregar)
  'retomar', //           usuário clicou em "Tentar novamente" → repete a fase que falhou
  'cancelar', //          usuário cancelou
] as const;
export type Evento = (typeof EVENTOS)[number];

/** Dados do trabalho necessários para decidir algumas transições. */
export interface ContextoTransicao {
  /** Versão vigente do deck; 0 = nenhuma entrega ainda. */
  versaoAtual: number;
  /** Fase que falhou, registrada quando o estado foi para `erro`. */
  erroFase: Fase | null;
}

export interface ResultadoTransicao {
  estado: Estado;
  /** Fase que o orquestrador deve enfileirar agora; `null` = nenhuma. */
  iniciaFase: Fase | null;
}

export class TransicaoInvalida extends Error {
  constructor(public readonly estado: Estado, public readonly evento: Evento) {
    super(`Transição inválida: ${evento} em ${estado}`);
    this.name = 'TransicaoInvalida';
  }
}

/** Estados em que uma fase do agente está rodando. */
const EM_EXECUCAO: ReadonlySet<Estado> = new Set<Estado>([
  'analisando',
  'pesquisando_e_narrando',
  'produzindo',
  'revisando',
  'ajustando',
]);

const ESTADO_DA_FASE: Record<Fase, Estado> = {
  F1: 'analisando',
  F2: 'pesquisando_e_narrando',
  F3: 'produzindo',
  F4: 'ajustando',
};

export function emExecucao(estado: Estado): boolean {
  return EM_EXECUCAO.has(estado);
}

export function terminal(estado: Estado): boolean {
  return estado === 'cancelado';
}

/** O compositor de ajustes do chat só fica ativo com o deck entregue (§9). */
export function aceitaAjuste(estado: Estado): boolean {
  return estado === 'entregue';
}

export function estadoDaFase(fase: Fase): Estado {
  return ESTADO_DA_FASE[fase];
}

function inicia(fase: Fase): ResultadoTransicao {
  return { estado: ESTADO_DA_FASE[fase], iniciaFase: fase };
}

function para(estado: Estado): ResultadoTransicao {
  return { estado, iniciaFase: null };
}

/**
 * Aplica um evento ao estado atual. Lança `TransicaoInvalida` quando o evento não é aceito
 * naquele estado: o chamador (API ou orquestrador) deve recusar a ação, nunca forçar o estado.
 */
export function transicionar(estado: Estado, evento: Evento, ctx: ContextoTransicao): ResultadoTransicao {
  const jaEntregue = ctx.versaoAtual > 0;
  switch (evento) {
    case 'arquivos_enviados':
      if (estado === 'rascunho') return inicia('F1');
      break;
    case 'perguntas_feitas':
      if (estado === 'analisando' || estado === 'ajustando') return para('aguardando_respostas');
      break;
    case 'intake_concluido':
      if (estado === 'analisando') return inicia('F2');
      break;
    case 'respostas_enviadas':
      // Perguntas feitas num ajuste (F4) voltam ao ajuste; as do intake seguem para a narrativa.
      if (estado === 'aguardando_respostas') return inicia(jaEntregue ? 'F4' : 'F2');
      break;
    case 'narrativa_submetida':
      if (estado === 'pesquisando_e_narrando' || estado === 'ajustando') return para('aguardando_aprovacao');
      break;
    case 'narrativa_aprovada':
      if (estado === 'aguardando_aprovacao') return inicia('F3');
      break;
    case 'ajuste_narrativa_pedido':
      if (estado === 'aguardando_aprovacao') return inicia('F2');
      break;
    case 'revisao_iniciada':
      if (estado === 'produzindo' || estado === 'ajustando') return para('revisando');
      break;
    case 'deck_entregue':
      if (estado === 'produzindo' || estado === 'revisando' || estado === 'ajustando') return para('entregue');
      break;
    case 'ajuste_pedido':
      if (estado === 'entregue') return inicia('F4');
      break;
    case 'falhou':
      if (emExecucao(estado)) return para('erro');
      break;
    case 'retomar':
      if (estado === 'erro') {
        if (!ctx.erroFase) throw new TransicaoInvalida(estado, evento);
        return inicia(ctx.erroFase);
      }
      break;
    case 'cancelar':
      // Cancelar descarta a fase em curso. Com um deck já entregue, o trabalho volta à última
      // versão válida em vez de ser encerrado.
      if (!terminal(estado) && estado !== 'entregue') return para(jaEntregue ? 'entregue' : 'cancelado');
      break;
  }
  throw new TransicaoInvalida(estado, evento);
}

/** Versão sem exceção, para a interface decidir se um botão fica habilitado. */
export function podeTransicionar(estado: Estado, evento: Evento, ctx: ContextoTransicao): boolean {
  try {
    transicionar(estado, evento, ctx);
    return true;
  } catch (erro) {
    if (erro instanceof TransicaoInvalida) return false;
    throw erro;
  }
}
