import { normalizeText } from './taxonomy';
import type { Segment } from '../types';

/**
 * Política de universo por entidade contratante.
 *
 * G-03 do retorno de Jundiaí: o universo Secovi é *todos* os empreendimentos verticais mais,
 * no horizontal, **somente** o subtipo Condomínio de Casas. A premissa PRE-002 — "Horizontal da
 * API representa Condomínio de Casas" — foi explicitamente rejeitada pela analista: loteamentos e
 * demais horizontais existem na base e não podem entrar rotulados como condomínio.
 */
export type EntityId = 'secovi-sp' | 'fiergs-rs';

/**
 * Rótulo editorial do único horizontal que o Panorama Secovi aceita. Aparece nas tabelas e nos
 * gráficos para que a página responda sozinha à pergunta do p12 — "os horizontais são só
 * condomínios de casas, correto?" — sem depender do dossiê técnico.
 */
export const SECOVI_HORIZONTAL_LABEL = 'Condomínio de Casas';

export type HorizontalSubtype = 'condominio_casas' | 'loteamento' | 'outro' | 'indefinido';

export interface UniverseCandidate {
  segment: Segment | null;
  /** Texto bruto de subtipo/tipo do empreendimento, como devolvido pela API. */
  rawSubtype?: unknown;
  rawType?: unknown;
  rawName?: unknown;
  /** Campos oficiais do contrato v2; V3 não usa nome para inferir tipologia. */
  standard?: unknown;
  historicalPatterns?: unknown[];
}

export type UniverseRejectionReason = 'segmento_desconhecido' | 'horizontal_fora_da_politica' | 'subtipo_horizontal_indefinido';

export interface UniverseDecision {
  accepted: boolean;
  segment: Segment | null;
  horizontalSubtype: HorizontalSubtype | null;
  /** Preenchido apenas quando `accepted` é `false`. */
  reason: UniverseRejectionReason | null;
}

export interface EntityPolicy {
  id: EntityId;
  label: string;
  /** Rótulo editorial do bloco horizontal aceito; `null` quando a entidade não aceita horizontal. */
  horizontalLabel: string | null;
  classify(candidate: UniverseCandidate): UniverseDecision;
}

const CONDO_PATTERN = /(condominio|cond\.?\s|casas em condominio|cond de casas|casa em condominio|horizontal fechado|condominio fechado)/;
const LOT_PATTERN = /(loteamento|lote|gleba|desmembramento|chacara|sitio)/;

/**
 * `Horizontal` sozinho é o segmento repetido, não uma informação de subtipo: a API sempre devolve
 * `building_type`, então tratá-lo como evidência tornaria `indefinido` inalcançável e reintroduziria
 * a premissa PRE-002 pela porta dos fundos.
 */
const SEGMENT_ONLY = /^(horizontal|residencial horizontal|vertical|residencial vertical)$/;

/**
 * Classifica o subtipo horizontal a partir dos campos textuais disponíveis. Retorna `indefinido`
 * quando nada no payload permite afirmar o subtipo — caso em que a política Secovi recusa o
 * registro em vez de assumir que é condomínio de casas.
 */
export function classifyHorizontalSubtype(candidate: UniverseCandidate): HorizontalSubtype {
  const fields = [candidate.rawSubtype, candidate.rawType, candidate.rawName]
    .map(normalizeText)
    .filter((field) => field && !SEGMENT_ONLY.test(field));
  if (!fields.length) return 'indefinido';
  for (const field of fields) {
    if (LOT_PATTERN.test(field)) return 'loteamento';
    if (CONDO_PATTERN.test(field)) return 'condominio_casas';
  }
  // Há texto, mas nenhum termo reconhecido: é um horizontal de outra natureza, não um condomínio.
  return 'outro';
}

export const SECOVI_SP_POLICY: EntityPolicy = {
  id: 'secovi-sp',
  label: 'Secovi-SP',
  horizontalLabel: 'Casas em Cond. Fechado',
  classify(candidate) {
    if (candidate.segment === 'Vertical') return { accepted: true, segment: 'Vertical', horizontalSubtype: null, reason: null };
    if (candidate.segment !== 'Horizontal') return { accepted: false, segment: null, horizontalSubtype: null, reason: 'segmento_desconhecido' };
    const subtype = classifyHorizontalSubtype(candidate);
    if (subtype === 'condominio_casas') return { accepted: true, segment: 'Horizontal', horizontalSubtype: subtype, reason: null };
    if (subtype === 'indefinido') return { accepted: false, segment: 'Horizontal', horizontalSubtype: subtype, reason: 'subtipo_horizontal_indefinido' };
    return { accepted: false, segment: 'Horizontal', horizontalSubtype: subtype, reason: 'horizontal_fora_da_politica' };
  },
};

/**
 * PRE-026 — vocabulário oficial de **produto** horizontal, exatamente como a API v2 o escreve em
 * `data[].standard` e `data[].typologies_history[].pattern`. A grafia canônica da fonte é
 * `Condomínio de Casas/Sobrados`, com barra: a varredura de 24 municípios não produziu nenhuma
 * outra forma. As variantes aceitas abaixo existem só para grafias já observadas em recortes
 * antigos — nenhuma delas é inferência por semelhança.
 */
const V3_ACCEPTED_PRODUCTS = new Set([
  'condominio de casas/sobrados',
  'condominio de casas e sobrados',
  'condominio de casas',
  'casas em condominio fechado',
]);

/** Produtos horizontais explicitamente fora do universo Secovi (§4.3 do mapeamento). */
const V3_EXCLUDED_PRODUCTS = new Set([
  'loteamento fechado',
  'loteamento aberto',
  'loteamento comercial',
  'condominio de chacaras',
  'terreno',
]);

/**
 * Rótulos socioeconômicos são o recorte temporal confirmado para os horizontais de Jundiaí.
 * Marcadores de período continuam sem significado de produto.
 */
const V3_SOCIOECONOMIC = new Set(['compacto', 'economico', 'standard', 'medio', 'medio-alto', 'alto', 'luxo', 'futuro']);

export type HorizontalLabelAxis = 'produto_aceito' | 'produto_excluido' | 'socioeconomico' | 'desconhecido';

/** Classifica um rótulo isolado nos eixos da taxonomia. Nunca casa por semelhança textual. */
export function classifyHorizontalLabel(label: unknown): HorizontalLabelAxis {
  const normalized = normalizeText(label);
  if (!normalized) return 'desconhecido';
  if (V3_ACCEPTED_PRODUCTS.has(normalized)) return 'produto_aceito';
  if (V3_EXCLUDED_PRODUCTS.has(normalized)) return 'produto_excluido';
  if (V3_SOCIOECONOMIC.has(normalized)) return 'socioeconomico';
  return 'desconhecido';
}

export type TemporalHorizontalDecision = 'keep' | 'exclude' | 'unknown';

/**
 * Regra única para os contratos temporais agrupados por Padrão. O contrato devolve o produto e o
 * padrão socioeconômico no mesmo campo `group`; para Secovi-SP, o segundo é o recorte validado
 * pela Juliana e o primeiro continua sendo uma exclusão explícita.
 */
export function classifySecoviTemporalRow(segment: Segment | null, group: unknown): TemporalHorizontalDecision {
  if (segment === 'Vertical') return 'keep';
  if (segment !== 'Horizontal') return 'unknown';
  const axis = classifyHorizontalLabel(group);
  if (axis === 'produto_excluido') return 'exclude';
  if (axis === 'produto_aceito' || axis === 'socioeconomico') return 'keep';
  return 'unknown';
}

/**
 * Rótulos novos precisam falhar de forma ruidosa: a taxonomia da API cresce sem aviso e foi
 * exatamente a classificação silenciosa por nome que produziu o erro de 100% medido em Jundiaí.
 * O coletor lê esta lista e a leva para o dossiê.
 */
export const unmappedHorizontalLabels = new Set<string>();

/** PRE-026: somente rótulo explícito do payload oficial. Sem regex em nome, sem inferência. */
export const SECOVI_SP_V3_POLICY: EntityPolicy = {
  ...SECOVI_SP_POLICY,
  classify(candidate) {
    if (candidate.segment === 'Vertical') return { accepted: true, segment: 'Vertical', horizontalSubtype: null, reason: null };
    if (candidate.segment !== 'Horizontal') return { accepted: false, segment: null, horizontalSubtype: null, reason: 'segmento_desconhecido' };
    // O nome comercial nunca entra: é a heurística que a PRE-026 substituiu.
    const labels = [candidate.rawSubtype, candidate.rawType, candidate.standard, ...(candidate.historicalPatterns ?? [])]
      .map(normalizeText).filter((label) => label && !SEGMENT_ONLY.test(label));
    if (!labels.length) return { accepted: false, segment: 'Horizontal', horizontalSubtype: 'indefinido', reason: 'subtipo_horizontal_indefinido' };
    const axes = labels.map(classifyHorizontalLabel);
    // Produto explicitamente excluído vence qualquer padrão socioeconômico visto em outro período.
    if (axes.includes('produto_excluido')) return { accepted: false, segment: 'Horizontal', horizontalSubtype: 'outro', reason: 'horizontal_fora_da_politica' };
    if (axes.includes('produto_aceito') || axes.includes('socioeconomico')) return { accepted: true, segment: 'Horizontal', horizontalSubtype: 'condominio_casas', reason: null };
    for (const [index, axis] of axes.entries()) if (axis === 'desconhecido') unmappedHorizontalLabels.add(labels[index]);
    return { accepted: false, segment: 'Horizontal', horizontalSubtype: 'indefinido', reason: 'subtipo_horizontal_indefinido' };
  },
};

/**
 * FIERGS ainda não tem regra de universo entregue. O ponto de extensão existe e é explícito: até a
 * regra chegar, a entidade não é selecionável e não herda silenciosamente a regra Secovi.
 */
export const ENTITY_POLICIES: Record<EntityId, EntityPolicy | null> = {
  'secovi-sp': SECOVI_SP_POLICY,
  'fiergs-rs': null,
};

export function entityPolicy(id: EntityId = 'secovi-sp', version: 'v2' | 'v3' | 'v4' = 'v2'): EntityPolicy {
  const policy = id === 'secovi-sp' && (version === 'v3' || version === 'v4') ? SECOVI_SP_V3_POLICY : ENTITY_POLICIES[id];
  if (!policy) throw new Error(`Política de universo não definida para a entidade ${id}.`);
  return policy;
}
