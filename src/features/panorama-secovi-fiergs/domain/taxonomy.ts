/**
 * Taxonomias canônicas do Panorama. A ordem aqui é a ordem exigida pela analista no retorno de
 * Jundiaí (slides 34–39) e vale para tabela, gráfico e derivados — nunca reordenar no JSX.
 */

export const UNCLASSIFIED = 'Não classificado';

export type TypologyLabel = '1 Dormitório' | '2 Dormitórios' | '3 Dormitórios' | '4 ou + Dormitórios' | typeof UNCLASSIFIED;
export type StandardLabel = 'Compacto' | 'Econômico' | 'Standard' | 'Médio' | 'Médio-Alto' | 'Alto' | 'Luxo' | typeof UNCLASSIFIED;

export const TYPOLOGY_ORDER: TypologyLabel[] = ['1 Dormitório', '2 Dormitórios', '3 Dormitórios', '4 ou + Dormitórios'];
export const STANDARD_ORDER: StandardLabel[] = ['Compacto', 'Econômico', 'Standard', 'Médio', 'Médio-Alto', 'Alto', 'Luxo'];

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Canoniza tipologia. Aceita as grafias da API (`1 dorm`, `Studio`, `4+ dormitórios`, `4 ou mais`)
 * e devolve exatamente um dos rótulos oficiais; desconhecido vira `Não classificado`, nunca é
 * descartado silenciosamente.
 */
export function canonicalTypology(value: unknown): TypologyLabel {
  const raw = normalizeText(value);
  if (!raw) return UNCLASSIFIED;
  if (/(studio|kitnet|kitchenette|loft|conjugad)/.test(raw)) return '1 Dormitório';
  const found = [...raw.matchAll(/(\d+)/g)].map((match) => Number(match[1])).filter((value) => Number.isInteger(value) && value >= 1);
  if (!found.length) return UNCLASSIFIED;
  // "4+", "4 ou mais", "3 a 4" e "acima de 4" caem todos na última faixa aberta.
  const upperBound = found[found.length - 1];
  if (upperBound >= 4) return '4 ou + Dormitórios';
  return TYPOLOGY_ORDER[upperBound - 1] ?? UNCLASSIFIED;
}

/**
 * Canoniza padrão construtivo aos sete padrões Secovi. "Especial" é alias editorial de Compacto
 * (PRE-008) e "Super Luxo"/"Altíssimo" colapsam em Luxo — a analista pediu exatamente sete linhas.
 */
export function canonicalStandard(value: unknown): StandardLabel {
  const raw = normalizeText(value);
  if (!raw) return UNCLASSIFIED;
  if (/(super\s*luxo|altissimo|luxo)/.test(raw)) return 'Luxo';
  if (/medio\s*[-\s]*alto|medio alto/.test(raw)) return 'Médio-Alto';
  if (/^alto|(^|\s)alto(\s|$)/.test(raw)) return 'Alto';
  if (/medio/.test(raw)) return 'Médio';
  if (/standard|padrao medio|normal/.test(raw)) return 'Standard';
  if (/econom|mcmv|popular|social/.test(raw)) return 'Econômico';
  if (/compacto|especial|super\s*economico/.test(raw)) return 'Compacto';
  return UNCLASSIFIED;
}

/** Ordena rótulos já canonizados; desconhecidos vão para o fim, em ordem alfabética estável. */
function orderBy<T extends string>(order: readonly T[]) {
  return <L extends T>(labels: Iterable<L>): L[] => {
    const seen = [...new Set(labels)];
    const known = seen.filter((label) => order.includes(label)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const rest = seen.filter((label) => !order.includes(label)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [...known, ...rest];
  };
}

export const orderTypologies = orderBy(TYPOLOGY_ORDER);
export const orderStandards = orderBy(STANDARD_ORDER);

/* -------------------------------------------------------------------------- */
/* Coortes por ano de lançamento (slide 33, replicado em 41, 42 e 48)          */
/* -------------------------------------------------------------------------- */

export const COHORT_LEGACY_LABEL = 'Até 2022';
export const COHORT_SUBTOTAL_LABEL = 'Subtotal até 2024';
export const COHORT_TOTAL_LABEL = 'Total geral';

export type CohortRowKind = 'cohort' | 'subtotal' | 'total';

export interface CohortBucket {
  label: string;
  kind: CohortRowKind;
  /** Anos concretos que a linha soma; vazio em subtotal/total, que reagregam outras linhas. */
  years: number[];
}

/**
 * Constrói a lista de linhas exigida: `Até 2022`, `2023`, `2024`, `Subtotal até 2024`, anos
 * posteriores individualmente e `Total geral`. Só cria linha para ano com dados, exceto os
 * marcos 2023/2024 quando existir qualquer coorte, para que o subtotal seja legível.
 */
export function cohortBuckets(years: Iterable<number>): CohortBucket[] {
  const present = [...new Set([...years].filter((year) => Number.isInteger(year)))].sort((a, b) => a - b);
  if (!present.length) return [];
  const legacy = present.filter((year) => year <= 2022);
  const buckets: CohortBucket[] = [];
  if (legacy.length) buckets.push({ label: COHORT_LEGACY_LABEL, kind: 'cohort', years: legacy });
  for (const year of [2023, 2024]) if (present.includes(year)) buckets.push({ label: String(year), kind: 'cohort', years: [year] });
  const untilSubtotal = buckets.flatMap((bucket) => bucket.years);
  if (untilSubtotal.length) buckets.push({ label: COHORT_SUBTOTAL_LABEL, kind: 'subtotal', years: untilSubtotal });
  for (const year of present.filter((year) => year > 2024)) buckets.push({ label: String(year), kind: 'cohort', years: [year] });
  buckets.push({ label: COHORT_TOTAL_LABEL, kind: 'total', years: present });
  return buckets;
}

/** Rótulo da coorte a que um ano pertence, sem subtotal/total. */
export function cohortLabelOf(year: number): string {
  return year <= 2022 ? COHORT_LEGACY_LABEL : String(year);
}

/* -------------------------------------------------------------------------- */
/* Maturidade (slides 43–46)                                                   */
/* -------------------------------------------------------------------------- */

export const MATURITY_ORDER = ['Planta', 'Construção', 'Pronto'] as const;
export type MaturityLabel = (typeof MATURITY_ORDER)[number];

/** PRE-007: faixas 0–6 / 7–36 / 37+ meses desde o lançamento até o fechamento. */
export function maturityOfMonths(months: number | null): MaturityLabel | null {
  if (months === null || !Number.isFinite(months) || months < 0) return null;
  if (months <= 6) return 'Planta';
  if (months <= 36) return 'Construção';
  return 'Pronto';
}
