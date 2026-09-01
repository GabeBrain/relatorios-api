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

/** PRE-026: somente rótulo explícito do payload oficial. Sem regex em nome, sem inferência. */
export const SECOVI_SP_V3_POLICY: EntityPolicy = {
  ...SECOVI_SP_POLICY,
  classify(candidate) {
    if (candidate.segment === 'Vertical') return { accepted: true, segment: 'Vertical', horizontalSubtype: null, reason: null };
    if (candidate.segment !== 'Horizontal') return { accepted: false, segment: null, horizontalSubtype: null, reason: 'segmento_desconhecido' };
    const labels = [candidate.rawSubtype, candidate.rawType, candidate.standard, ...(candidate.historicalPatterns ?? [])]
      .map(normalizeText).filter(Boolean);
    if (!labels.length) return { accepted: false, segment: 'Horizontal', horizontalSubtype: 'indefinido', reason: 'subtipo_horizontal_indefinido' };
    const allowed = labels.some((label) => /^(condominio de casas|condominio de casas e sobrados|casas em condominio fechado)$/.test(label));
    return allowed
      ? { accepted: true, segment: 'Horizontal', horizontalSubtype: 'condominio_casas', reason: null }
      : { accepted: false, segment: 'Horizontal', horizontalSubtype: 'outro', reason: 'horizontal_fora_da_politica' };
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

export function entityPolicy(id: EntityId = 'secovi-sp', version: 'v2' | 'v3' = 'v2'): EntityPolicy {
  const policy = id === 'secovi-sp' && version === 'v3' ? SECOVI_SP_V3_POLICY : ENTITY_POLICIES[id];
  if (!policy) throw new Error(`Política de universo não definida para a entidade ${id}.`);
  return policy;
}
