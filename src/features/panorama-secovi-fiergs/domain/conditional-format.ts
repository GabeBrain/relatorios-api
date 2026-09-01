/**
 * Regra semântica única de formatação condicional do Panorama.
 *
 * JG-20, JG-21, JG-23, JG-24, JG-28, JG-29 e JG-31 pedem a mesma coisa em sete páginas diferentes.
 * O portão transversal da matriz é explícito: a comparação numérica mora aqui, não espalhada pelo
 * JSX, e **cor não pode ser o único sinal** — todo estado carrega símbolo e texto acessível, que
 * sobrevivem ao PDF e ao PPT porque são conteúdo, não estilo.
 *
 * Os cinco estados são fechados e nomeados: `positive`, `negative`, `neutral`, `null` (a medida
 * existe mas não foi informada) e `unavailable` (a fonte não respondeu). `null` e `unavailable`
 * são diferentes de propósito: o primeiro é ausência no registro, o segundo é ausência de contrato.
 */

export type ConditionalState = 'positive' | 'negative' | 'neutral' | 'null' | 'unavailable';

/**
 * Métricas com semântica própria. `variation` julga pelo sinal; as demais julgam pela posição
 * relativa a uma referência do próprio recorte (média geral, total ou período anterior).
 */
export type ConditionalMetric =
  | 'variation'        // variação entre períodos: positivo cresce
  | 'share'            // participação percentual: acima da fatia média destaca
  | 'availability'     // oferta final / oferta lançada: quanto maior, pior o giro
  | 'ivv'              // índice de velocidade de vendas: quanto maior, melhor
  | 'pricePerMeter'    // R$/m²: acima da média geral destaca
  | 'ticket'           // preço médio: acima da média geral destaca
  | 'units';           // contagens: acima da referência destaca

/** Métricas em que o valor alto é o resultado ruim. */
const HIGHER_IS_WORSE: ReadonlySet<ConditionalMetric> = new Set<ConditionalMetric>(['availability']);

/** Faixa morta ao redor da referência, em pontos percentuais relativos. Evita ▲/▼ por arredondamento. */
const NEUTRAL_BAND = 0.02;

export interface ConditionalInput {
  /** Valor observado. `null`/`undefined` produz o estado `null`. */
  value: number | null | undefined;
  /**
   * Referência do recorte: média geral, total da coluna ou período anterior. Sem referência
   * utilizável, o valor é exibido sem julgamento (`neutral`) — nunca com um sinal inventado.
   */
  reference?: number | null;
  /** Teto da escala para o comprimento da barra. Sem teto, a barra não é desenhada. */
  max?: number | null;
  /** `true` quando o contrato não respondeu: vence qualquer valor. */
  unavailable?: boolean;
}

export interface ConditionalVerdict {
  state: ConditionalState;
  /** Classe do tema; sempre acompanhada de símbolo e rótulo, nunca sozinha. */
  className: string;
  /** Sinal gráfico redundante à cor. Vazio em `neutral` para não poluir a tabela. */
  symbol: string;
  /** Texto lido por leitor de tela e preservado na exportação. */
  srLabel: string;
  /** 0–100: comprimento da barra de dados. Zero quando não há escala. */
  intensity: number;
}

const VERDICTS: Record<ConditionalState, { className: string; symbol: string; srLabel: string }> = {
  positive: { className: 'panorama-cf-positive', symbol: '▲', srLabel: 'acima da referência' },
  negative: { className: 'panorama-cf-negative', symbol: '▼', srLabel: 'abaixo da referência' },
  neutral: { className: 'panorama-cf-neutral', symbol: '', srLabel: 'na referência' },
  null: { className: 'panorama-cf-null', symbol: '—', srLabel: 'não informado' },
  unavailable: { className: 'panorama-cf-unavailable', symbol: '⊘', srLabel: 'indisponível' },
};

function stateOf(metric: ConditionalMetric, input: ConditionalInput): ConditionalState {
  if (input.unavailable) return 'unavailable';
  const { value } = input;
  if (value === null || value === undefined || !Number.isFinite(value)) return 'null';
  if (metric === 'variation') {
    if (value > 0) return HIGHER_IS_WORSE.has(metric) ? 'negative' : 'positive';
    if (value < 0) return HIGHER_IS_WORSE.has(metric) ? 'positive' : 'negative';
    return 'neutral';
  }
  const reference = input.reference;
  if (reference === null || reference === undefined || !Number.isFinite(reference) || reference === 0) return 'neutral';
  const delta = (value - reference) / Math.abs(reference);
  if (Math.abs(delta) <= NEUTRAL_BAND) return 'neutral';
  const above = delta > 0;
  return above === HIGHER_IS_WORSE.has(metric) ? 'negative' : 'positive';
}

/** Julga um valor e devolve estado, sinal redundante e intensidade da barra. */
export function conditionalFormat(metric: ConditionalMetric, input: ConditionalInput): ConditionalVerdict {
  const state = stateOf(metric, input);
  const base = VERDICTS[state];
  const { value, max } = input;
  const intensity = state === 'null' || state === 'unavailable' || value === null || value === undefined || !max || max <= 0
    ? 0
    : Math.min(100, Math.abs(value) / max * 100);
  const srLabel = metric === 'variation' && state === 'positive' ? 'variação positiva'
    : metric === 'variation' && state === 'negative' ? 'variação negativa'
    : metric === 'variation' && state === 'neutral' ? 'sem variação'
    : base.srLabel;
  return { state, className: base.className, symbol: base.symbol, srLabel, intensity };
}

/**
 * Participações que precisam fechar 100% (JG-30/31). Divide cada parcela pelo **mesmo** total e
 * devolve `null` onde a base não existe — nunca soma médias percentuais nem normaliza por linha.
 */
export function shareOf(value: number | null | undefined, total: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (total === null || total === undefined || !Number.isFinite(total) || total === 0) return null;
  return value / total * 100;
}

/** Soma das parcelas fecha 100% dentro da tolerância de arredondamento? Usado em teste e no dossiê. */
export function sharesCloseTo100(shares: (number | null)[], tolerance = 0.5): boolean {
  const present = shares.filter((share): share is number => share !== null && Number.isFinite(share));
  if (!present.length) return false;
  return Math.abs(present.reduce((sum, share) => sum + share, 0) - 100) <= tolerance;
}
